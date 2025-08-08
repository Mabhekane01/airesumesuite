import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { UserSession } from '../models/UserSession';
import { EmailOTP } from '../models/EmailVerification';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { notificationService } from '../services/notificationService';
import { INotification } from '../models/Notification';
import { recaptchaService, RecaptchaVerificationResult } from '../services/recaptchaService';
import { otpService } from '../services/otpService';
import * as crypto from 'crypto';

// Step 1: Send OTP for email verification BEFORE registration
export const sendRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, location, recaptchaToken } = req.body;
    
    console.log('📧 Registration OTP request:', { 
      email: email?.toLowerCase(), 
      hasLocation: !!location, 
      hasRecaptcha: !!recaptchaToken 
    });

    // Input validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: ['Email, password, first name, and last name are required']
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format',
        errors: ['Please provide a valid email address']
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password too weak',
        errors: ['Password must be at least 8 characters long']
      });
    }

    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordStrengthRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password too weak',
        errors: ['Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character']
      });
    }

    // Enhanced enterprise reCAPTCHA verification
    if (recaptchaService.isConfigured()) {
      if (!recaptchaToken) {
        return res.status(400).json({ 
          message: 'Security verification required',
          errors: ['Please complete the security verification to continue']
        });
      } else {
        // Use enterprise fraud analysis for registration
        const recaptchaResult = await recaptchaService.verifyWithFraudAnalysis(
          recaptchaToken,
          'signup',
          req.ip || req.socket.remoteAddress,
          req.get('User-Agent'),
          {
            email: email.toLowerCase(),
            registrationStep: 'otp_request',
            location: location
          }
        );

        if (!recaptchaResult.success) {
          console.warn('❌ Enterprise reCAPTCHA verification failed for registration OTP:', {
            email: email.toLowerCase(),
            errors: recaptchaResult.errors,
            score: recaptchaResult.score,
            riskAnalysis: recaptchaResult.riskAnalysis
          });
          
          // Different error messages based on risk level
          const riskLevel = recaptchaResult.riskAnalysis?.riskLevel || 'high';
          let errorMessage = 'Security verification failed. Please try again.';
          
          if (riskLevel === 'critical') {
            errorMessage = 'Security verification failed. Please contact support if you continue to experience issues.';
          } else if (riskLevel === 'high') {
            errorMessage = 'Security verification failed. Please refresh the page and try again.';
          }
          
          return res.status(400).json({ 
            message: 'Security verification failed',
            errors: [errorMessage],
            riskLevel // For frontend to handle appropriately
          });
        }

        console.log('✅ Enterprise reCAPTCHA verification passed for registration OTP:', {
          email: email.toLowerCase(),
          score: recaptchaResult.score,
          action: recaptchaResult.action,
          riskLevel: recaptchaResult.riskAnalysis?.riskLevel
        });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Registration failed',
        errors: ['An account with this email already exists']
      });
    }

    // Store user data temporarily and send OTP
    const userData = {
      email: normalizedEmail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      location,
      provider: 'local'
    };

    const { otp, expiresIn } = await otpService.createOTP(
      normalizedEmail,
      'registration',
      req.ip || req.socket.remoteAddress,
      req.get('User-Agent'),
      userData
    );

    // Send OTP email
    const emailSent = await emailService.sendOTPEmail(
      normalizedEmail,
      otp,
      firstName.trim()
    );

    console.log('📧 Registration OTP sent:', {
      email: normalizedEmail,
      emailSent,
      expiresIn
    });

    return res.status(200).json({
      message: 'Verification code sent to your email',
      email: normalizedEmail,
      expiresIn,
      step: 'email_verification'
    });

  } catch (error) {
    console.error('❌ Registration OTP error:', error);
    
    if (error instanceof Error && error.message.includes('wait')) {
      return res.status(429).json({ 
        message: 'Too many requests',
        errors: [error.message]
      });
    }
    
    return res.status(500).json({ 
      message: 'Failed to send verification code',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

// Step 2: Verify OTP and complete registration
export const verifyRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and verification code are required',
        errors: ['Please provide both email and verification code']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP and get stored user data
    const result = await otpService.verifyOTP(normalizedEmail, otp, 'registration');

    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid verification code',
        errors: [`Incorrect code. ${result.attemptsLeft} attempts remaining.`],
        attemptsLeft: result.attemptsLeft
      });
    }

    // OTP verified - now create the user
    const userData = result.userData;
    if (!userData) {
      return res.status(400).json({
        message: 'Registration data not found',
        errors: ['Please restart the registration process.']
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create verified user (OTP verification = email verification)
    const user = new User({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      provider: 'local',
      isEmailVerified: true, // OTP verification confirms email ownership
      emailVerificationAttempts: 0
    });

    await user.save();
    console.log('✅ User registered and email verified via OTP:', user._id);

    // Send welcome email
    await emailService.sendWelcomeEmail(user);

    // --- BEGIN AUTHENTICATION ---
    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user._id,
      sessionId,
      loginTime: new Date(),
      location: {
        ipAddress: req.ip || req.socket.remoteAddress || null
      },
      userAgent: {
        browser: req.get('User-Agent') || 'Unknown'
      },
      isActive: true,
      refreshTokens: [refreshToken]
    };
    
    const userSession = new UserSession(sessionData);
    await userSession.save();
    
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();
    // --- END AUTHENTICATION ---

    // Send registration completion notification
    try {
      await notificationService.sendAuthNotification(
        user._id.toString(),
        'registration_complete'
      );
    } catch (notificationError) {
      console.warn('⚠️ Failed to send registration notification:', notificationError);
    }

    return res.status(201).json({
      message: 'Registration successful! Welcome to AI Job Suite!',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        provider: user.provider,
        isEmailVerified: true
      },
      accessToken,
      refreshToken,
      sessionId
    });

  } catch (error) {
    console.error('❌ Registration OTP verification error:', error);
    
    if (error instanceof Error && error.message.includes('attempts exceeded')) {
      return res.status(429).json({
        message: 'Too many attempts',
        errors: [error.message]
      });
    }
    
    if (error instanceof Error && error.message.includes('expired')) {
      return res.status(400).json({
        message: 'Verification code expired',
        errors: ['Please request a new verification code.']
      });
    }
    
    return res.status(500).json({
      message: 'Registration failed',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

// Resend OTP for registration
export const resendRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        errors: ['Please provide your email address']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's a pending registration OTP
    const hasPending = await otpService.hasPendingOTP(normalizedEmail, 'registration');
    if (!hasPending) {
      return res.status(400).json({
        message: 'No pending registration found',
        errors: ['Please restart the registration process.']
      });
    }

    // Check cooldown
    const cooldown = await otpService.getResendCooldown(normalizedEmail, 'registration');
    if (cooldown > 0) {
      return res.status(429).json({
        message: 'Too many requests',
        errors: [`Please wait ${Math.ceil(cooldown / 60)} minutes before requesting another code.`]
      });
    }

    // This will create a new OTP and reset cooldown
    // Note: User data should still be in Redis from previous attempt
    const { otp, expiresIn } = await otpService.createOTP(
      normalizedEmail,
      'registration',
      req.ip || req.socket.remoteAddress,
      req.get('User-Agent')
    );

    // Send new OTP email
    const emailSent = await emailService.sendOTPEmail(
      normalizedEmail,
      otp,
      'User' // We don't have firstName stored separately, but service should handle this
    );

    console.log('📧 Registration OTP resent:', {
      email: normalizedEmail,
      emailSent,
      expiresIn
    });

    return res.status(200).json({
      message: 'New verification code sent to your email',
      email: normalizedEmail,
      expiresIn
    });

  } catch (error) {
    console.error('❌ Resend registration OTP error:', error);
    
    if (error instanceof Error && error.message.includes('wait')) {
      return res.status(429).json({
        message: 'Too many requests',
        errors: [error.message]
      });
    }
    
    return res.status(500).json({
      message: 'Failed to resend verification code',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, location, recaptchaToken } = req.body;
    
    console.log('👤 Enterprise registration attempt:', { 
      email: email?.toLowerCase(), 
      hasLocation: !!location, 
      hasRecaptcha: !!recaptchaToken 
    });

    // Input validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: ['Email, password, first name, and last name are required']
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format',
        errors: ['Please provide a valid email address']
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password too weak',
        errors: ['Password must be at least 8 characters long']
      });
    }

    // Advanced password strength check
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordStrengthRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password too weak',
        errors: ['Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character']
      });
    }

    // reCAPTCHA verification
    if (recaptchaService.isConfigured()) {
      if (!recaptchaToken) {
        return res.status(400).json({ 
          message: 'reCAPTCHA verification required',
          errors: ['Please complete the reCAPTCHA verification']
        });
      }

      const recaptchaResult: RecaptchaVerificationResult = await recaptchaService.verifyToken(
        recaptchaToken,
        'signup',
        req.ip || req.socket.remoteAddress
      );

      if (!recaptchaResult.success) {
        console.warn('❌ reCAPTCHA verification failed for registration:', {
          email: email.toLowerCase(),
          errors: recaptchaResult.errors,
          score: recaptchaResult.score
        });
        
        return res.status(400).json({ 
          message: 'Security verification failed',
          errors: ['Please try again or contact support if the problem persists']
        });
      }

      console.log('✅ reCAPTCHA verification passed:', {
        email: email.toLowerCase(),
        score: recaptchaResult.score,
        action: recaptchaResult.action
      });
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      // Security: Don't reveal if email verification is pending
      return res.status(400).json({ 
        message: 'Registration failed',
        errors: ['An account with this email already exists or is pending verification']
      });
    }

    // Check for any pending OTP verifications for this email
    const pendingOTP = await EmailOTP.findOne({
      email: normalizedEmail,
      purpose: 'login_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (pendingOTP) {
      return res.status(400).json({ 
        message: 'Registration failed',
        errors: ['A verification is already in progress. Please complete login verification or try again later.']
      });
    }

    // Hash password with high cost factor for enterprise security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user but don't activate yet - requires OTP verification
    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      provider: 'local',
      isEmailVerified: false, // Will be verified via OTP
      emailVerificationAttempts: 0
    });

    await user.save();
    console.log('✅ User created (pending OTP verification):', user._id);

    // Log registration event for security monitoring
    console.log('📊 Registration Event:', {
      userId: user._id,
      email: normalizedEmail,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
      location: location || null,
      timestamp: new Date().toISOString(),
      recaptchaScore: recaptchaService.isConfigured() ? 'verified' : 'skipped'
    });

    // Return success - user should use OTP registration flow
    return res.status(201).json({
      message: 'User created successfully! Please use the modern OTP registration flow for verification.',
      email: normalizedEmail,
      nextStep: 'use_otp_registration',
      recommendation: 'Use /send-registration-otp endpoint for better user experience'
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        message: 'Registration failed',
        errors: ['An internal error occurred. Please try again later.']
      });
    } else {
      return res.status(500).json({ 
        message: 'Registration failed',
        errors: ['An unknown error occurred. Please try again later.']
      });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, location, recaptchaToken } = req.body;
    console.log('🔐 Login attempt:', { email, hasLocation: !!location, hasRecaptcha: !!recaptchaToken });

    // Enterprise reCAPTCHA verification for login
    const recaptchaStatus = recaptchaService.getStatus();
    console.log('🔍 reCAPTCHA Service Status:', recaptchaStatus);
    
    if (recaptchaService.isConfigured()) {
      if (!recaptchaToken) {
        console.warn('⚠️ Login attempted without reCAPTCHA token');
        return res.status(400).json({ 
          message: 'Security verification required',
          errors: ['Please complete the security verification to continue']
        });
      } else {
        // Use enterprise fraud analysis for login
        const recaptchaResult = await recaptchaService.verifyWithFraudAnalysis(
          recaptchaToken,
          'login',
          req.ip || req.socket.remoteAddress,
          req.get('User-Agent'),
          {
            email: email.toLowerCase(),
            loginAttempt: true,
            location: location
          }
        );

        if (!recaptchaResult.success) {
          console.warn('❌ Enterprise reCAPTCHA verification failed for login:', {
            email: email.toLowerCase(),
            errors: recaptchaResult.errors,
            score: recaptchaResult.score,
            riskAnalysis: recaptchaResult.riskAnalysis
          });
          
          // Different error messages based on risk level
          const riskLevel = recaptchaResult.riskAnalysis?.riskLevel || 'high';
          let errorMessage = 'Security verification failed. Please try again.';
          
          if (riskLevel === 'critical') {
            errorMessage = 'Security verification failed. Please contact support if you continue to experience issues.';
          } else if (riskLevel === 'high') {
            errorMessage = 'Security verification failed. Please refresh the page and try again.';
          }
          
          return res.status(400).json({
            message: errorMessage,
            errors: recaptchaResult.errors || ['Security verification failed'],
            riskLevel
          });
        }

        console.log('✅ Enterprise reCAPTCHA verification successful for login:', {
          email: email.toLowerCase(),
          score: recaptchaResult.score,
          action: recaptchaResult.action,
          riskLevel: recaptchaResult.riskAnalysis?.riskLevel
        });
      }
    }

    // Find user - no email verification required
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      provider: 'local'
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      });
    }

    console.log('✅ User login successful:', user.email);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user._id,
      sessionId,
      loginTime: new Date(),
      location: {
        city: location?.city || null,
        country: location?.country || null,
        coordinates: location?.coordinates || null,
        ipAddress: req.ip || req.socket.remoteAddress || null
      },
      userAgent: {
        browser: req.get('User-Agent') || 'Unknown'
      },
      isActive: true,
      refreshTokens: [refreshToken]
    };
    
    const userSession = new UserSession(sessionData);
    await userSession.save();
    
    // Update user's last login
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    let loginNotification: INotification | null = null;
    try {
      loginNotification = await notificationService.sendAuthNotification(
        user._id.toString(),
        'login_success',
        {
          loginTime: new Date(),
          location: location?.city || 'Unknown location',
          userAgent: req.get('User-Agent') || 'Unknown browser'
        }
      );
      
      if (loginNotification) {
        console.log('✅ Login notification created successfully:', loginNotification._id);
      } else {
        console.warn('⚠️ Login notification was not created (returned null)');
      }
    } catch (notificationError) {
      console.error('❌ Failed to send login notification:', notificationError);
    }

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified || false
      },
      accessToken,
      refreshToken,
      sessionId,
      loginNotification
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      message: 'Login failed',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
    
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { refreshToken, sessionId } = req.body;
    const userId = req.user?.id;

    if (refreshToken && userId) {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
        await user.save();
      }
      
      // End the session
      if (sessionId) {
        await UserSession.findOneAndUpdate(
          { sessionId, userId, isActive: true },
          { 
            isActive: false, 
            logoutTime: new Date(),
            $pull: { refreshTokens: refreshToken }
          }
        );
      } else {
        // If no sessionId provided, end sessions with this refresh token
        await UserSession.updateMany(
          { userId, refreshTokens: refreshToken, isActive: true },
          { 
            isActive: false, 
            logoutTime: new Date(),
            $pull: { refreshTokens: refreshToken }
          }
        );
      }
    }

    return res.json({ message: 'Logout successful' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
      
      // End all active sessions for this user
      await UserSession.updateMany(
        { userId, isActive: true },
        { 
          isActive: false, 
          logoutTime: new Date(),
          refreshTokens: []
        }
      );
    }

    return res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const googleAuth = (req: Request, res: Response) => {
  // This will be handled by passport middleware
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth/error?message=authentication_failed`);
    }
    
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    // Create session (consistent with local auth)
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user._id,
      sessionId,
      loginTime: new Date(),
      location: {
        ipAddress: req.ip || req.socket.remoteAddress || null
      },
      userAgent: {
        browser: req.get('User-Agent') || 'Unknown'
      },
      isActive: true,
      refreshTokens: [refreshToken]
    };
    
    const userSession = new UserSession(sessionData);
    await userSession.save();
    
    // Update user tokens and login time
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    // Send login notification (consistent with local auth)
    let loginNotification: INotification | null = null;
    try {
      loginNotification = await notificationService.sendAuthNotification(
        user._id.toString(),
        'login_success',
        {
          loginTime: new Date(),
          location: 'Google OAuth',
          userAgent: req.get('User-Agent') || 'Unknown browser'
        }
      );
      
      if (loginNotification) {
        console.log('✅ Google OAuth login notification created successfully:', loginNotification._id);
      } else {
        console.warn('⚠️ Google OAuth login notification was not created (returned null)');
      }
    } catch (notificationError) {
      console.warn('⚠️ Failed to send Google OAuth login notification:', notificationError);
    }

    console.log('✅ Google OAuth login successful:', user.email);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Check for stored redirect URL from session
    const redirectUrl = req.session?.redirectAfterLogin;
    let callbackUrl = `${frontendUrl}/auth/success?token=${accessToken}&refresh=${refreshToken}&sessionId=${sessionId}`;
    
    if (redirectUrl) {
      callbackUrl += `&redirect=${encodeURIComponent(redirectUrl)}`;
      // Clear the redirect URL from session
      delete req.session.redirectAfterLogin;
    }
    
    return res.redirect(callbackUrl);
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth/error?message=server_error`);
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        message: 'Email and OTP are required',
        errors: ['Email and OTP must be provided']
      });
    }

    // Find the verification record
    const verification = await EmailOTP.findOne({
      email: email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ 
        message: 'Invalid or expired OTP',
        errors: ['The OTP is invalid or has expired. Please request a new one.']
      });
    }

    // Use the verify method from EmailOTP
    const isValid = verification.verify(otp);
    
    if (!isValid) {
      await verification.save(); // Save incremented attempts
      return res.status(400).json({ 
        message: 'Invalid OTP',
        errors: ['The OTP is incorrect or has been used.']
      });
    }

    // Find the user by email since EmailOTP doesn't have userId
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ 
        message: 'User not found',
        errors: ['The user associated with this verification token could not be found.']
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Email already verified',
        errors: ['This email address has already been verified.']
      });
    }

    // Mark verification as used
    verification.isUsed = true;
    await verification.save();

    // Update user as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();

    console.log('✅ Email verification successful:', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user);

    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: user._id,
      sessionId,
      loginTime: new Date(),
      location: {
        ipAddress: req.ip || req.socket.remoteAddress || null
      },
      userAgent: {
        browser: req.get('User-Agent') || 'Unknown'
      },
      isActive: true,
      refreshTokens: [refreshToken]
    };
    
    const userSession = new UserSession(sessionData);
    await userSession.save();
    
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    // Send welcome and email verification notifications
    try {
      await notificationService.sendAuthNotification(
        user._id.toString(),
        'email_verified'
      );
      await notificationService.sendSystemNotification(
        user._id.toString(),
        'welcome'
      );
    } catch (notificationError) {
      console.warn('⚠️ Failed to send verification notifications:', notificationError);
    }

    return res.json({
      message: 'Email verified successfully! Welcome to AI Job Suite!',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: true
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    
    return res.status(500).json({ 
      message: 'Verification failed',
      errors: ['An internal error occurred during verification. Please try again later.']
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        errors: ['Please provide your email address']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Security: Don't reveal if user exists
      return res.json({
        message: 'If an account with this email exists and is unverified, a new verification email has been sent.'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Email already verified',
        errors: ['This email address has already been verified.']
      });
    }

    // Check rate limiting (max 3 attempts per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentVerifications = await EmailOTP.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentVerifications >= 3) {
      return res.status(429).json({ 
        message: 'Too many requests',
        errors: ['Too many verification emails sent. Please wait an hour before requesting another.']
      });
    }

    // Mark any existing verification tokens as used
    await EmailOTP.updateMany(
      { userId: user._id, isUsed: false },
      { isUsed: true }
    );

    // Create new OTP verification record
    const emailVerification = await EmailOTP.createOTP(
      normalizedEmail,
      'login_verification',
      req.ip,
      req.get('User-Agent')
    );

    // Send verification email with OTP
    const emailSent = await emailService.sendVerificationEmail(user, emailVerification.otp);

    console.log('📧 Verification email resent:', {
      userId: user._id,
      email: normalizedEmail,
      emailSent,
      timestamp: new Date().toISOString()
    });

    return res.json({
      message: 'If an account with this email exists and is unverified, a new verification email has been sent.',
      verificationEmailSent: emailSent
    });

  } catch (error) {
    console.error('❌ Resend verification email error:', error);
    
    return res.status(500).json({ 
      message: 'Failed to resend verification email',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, location } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and OTP are required',
        errors: ['Please provide both email and verification code']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find the most recent unused OTP for this email
    const otpRecord = await EmailOTP.findOne({
      email: normalizedEmail,
      purpose: 'login_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'Invalid or expired verification code',
        errors: ['The verification code is invalid or has expired. Please request a new one.']
      });
    }

    // Verify the OTP
    const isValid = otpRecord.verify(otp);
    await otpRecord.save();

    if (!isValid) {
      const attemptsLeft = otpRecord.maxAttempts - otpRecord.attempts;
      
      if (attemptsLeft <= 0) {
        return res.status(429).json({
          message: 'Too many attempts',
          errors: ['Maximum verification attempts exceeded. Please request a new code.']
        });
      }

      return res.status(400).json({
        message: 'Invalid verification code',
        errors: [`Incorrect code. ${attemptsLeft} attempts remaining.`],
        attemptsLeft
      });
    }

    // OTP is valid, find and verify the user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        errors: ['The user associated with this email was not found.']
      });
    }

    // Mark user as verified
    user.isEmailVerified = true;
    user.emailVerificationAttempts = 0;
    await user.save();

    // Generate tokens and create session
    const { accessToken, refreshToken } = generateTokenPair(user);
    
    const sessionId = crypto.randomUUID();
    
    const sessionData = {
      userId: user._id,
      sessionId,
      loginTime: new Date(),
      location: {
        city: location?.city || null,
        country: location?.country || null,
        coordinates: location?.coordinates || null,
        ipAddress: req.ip || req.socket.remoteAddress || null
      },
      userAgent: {
        browser: req.get('User-Agent') || 'Unknown'
      },
      isActive: true,
      refreshTokens: [refreshToken]
    };
    
    const userSession = new UserSession(sessionData);
    await userSession.save();
    
    // Update user's last login and add refresh token
    user.refreshTokens.push(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    console.log('✅ OTP verified and user logged in:', user.email);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        provider: user.provider,
        isEmailVerified: true,
        lastLoginAt: user.lastLoginAt
      },
      accessToken,
      refreshToken,
      sessionId
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    return res.status(500).json({
      message: 'Verification failed',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        errors: ['Please provide your email address']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting - prevent spam
    const recentOTP = await EmailOTP.findOne({
      email: normalizedEmail,
      purpose: 'login_verification',
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // Last 2 minutes
    });

    if (recentOTP) {
      return res.status(429).json({
        message: 'Too many requests',
        errors: ['Please wait 2 minutes before requesting another verification code.']
      });
    }

    // Find the user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        message: 'If an account with this email exists, a new verification code has been sent.',
        email: normalizedEmail
      });
    }

    // Generate and send new OTP
    const otpRecord = await EmailOTP.createOTP(
      normalizedEmail,
      'login_verification',
      req.ip || req.socket.remoteAddress,
      req.get('User-Agent')
    );

    const emailSent = await emailService.sendOTPEmail(
      normalizedEmail,
      otpRecord.otp,
      user.firstName
    );

    console.log('📧 OTP resent to:', user.email, 'Success:', emailSent);

    return res.status(200).json({
      message: 'A new verification code has been sent to your email.',
      email: normalizedEmail,
      otpSent: emailSent,
      expiresIn: 600
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    return res.status(500).json({
      message: 'Failed to resend verification code',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const checkEmailExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        errors: ['Please provide an email address']
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists with local provider (matching login logic)
    const existingUser = await User.findOne({ 
      email: normalizedEmail,
      provider: 'local'
    });

    return res.status(200).json({
      exists: !!existingUser,
      verified: existingUser?.isEmailVerified || false,
      provider: existingUser?.provider || null
    });

  } catch (error) {
    console.error('❌ Check email error:', error);
    return res.status(500).json({
      message: 'Failed to check email',
      errors: ['An internal error occurred. Please try again later.']
    });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    console.log('Profile request for user ID:', req.user.id);
    const user = await User.findById(req.user.id).select('-password -refreshTokens');
    
    if (!user) {
      console.log('User not found for ID:', req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Returning profile data:', {
      id: user._id,
      tier: user.tier,
      subscriptionStatus: user.subscription_status
    });

    return res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      return res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
