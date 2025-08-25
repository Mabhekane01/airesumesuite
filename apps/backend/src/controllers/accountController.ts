import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UserSession } from '../models/UserSession';
import { AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

export const getUserAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id).select('-password -refreshTokens -twoFactorSecret -twoFactorBackupCodes -passwordResetToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get active sessions count
    const activeSessions = await UserSession.countDocuments({ 
      userId: user._id, 
      isActive: true 
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
          provider: user.provider,
          twoFactorEnabled: user.twoFactorEnabled || false,
          tier: user.tier || 'free',
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          activeSessions
        }
      }
    });
  } catch (error) {
    console.error('Get account error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to get account information' 
    });
  }
};

export const updatePersonalInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { firstName, lastName } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    await user.save();

    return res.json({
      success: true,
      message: 'Personal information updated successfully',
      data: {
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Update personal info error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update personal information' 
    });
  }
};

export const updateEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { email, password } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For local users, verify current password
    if (user.provider === 'local') {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false,
          message: 'Current password is incorrect' 
        });
      }
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already in use' 
      });
    }

    user.email = email;
    user.isEmailVerified = false; // Require re-verification
    await user.save();

    return res.json({
      success: true,
      message: 'Email updated successfully. Please verify your new email address.',
      data: {
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Update email error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update email' 
    });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow password change for local users
    if (user.provider !== 'local') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change password for social login accounts' 
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to change password' 
    });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { password, confirmText } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ 
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm' 
      });
    }

    // For local users, verify password
    if (user.provider === 'local') {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false,
          message: 'Password is incorrect' 
        });
      }
    }

    // Delete all user sessions
    await UserSession.deleteMany({ userId: user._id });

    // Delete the user account
    await User.findByIdAndDelete(user._id);

    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to delete account' 
    });
  }
};

export const getActiveSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const sessions = await UserSession.find({ 
      userId: req.user.id, 
      isActive: true 
    }).sort({ loginTime: -1 });

    const sessionData = sessions.map(session => ({
      id: session.sessionId,
      loginTime: session.loginTime,
      location: session.location,
      browser: session.userAgent?.browser || 'Unknown',
      isCurrent: session.sessionId === req.user?.sessionId
    }));

    return res.json({
      success: true,
      data: { sessions: sessionData }
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to get active sessions' 
    });
  }
};

export const terminateSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { sessionId } = req.params;

    await UserSession.findOneAndUpdate(
      { sessionId, userId: req.user.id, isActive: true },
      { 
        isActive: false, 
        logoutTime: new Date(),
        refreshTokens: []
      }
    );

    return res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to terminate session' 
    });
  }
};

// Validation middleware
export const updatePersonalInfoValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
];

export const updateEmailValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Current password is required')
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

export const deleteAccountValidation = [
  body('confirmText')
    .equals('DELETE MY ACCOUNT')
    .withMessage('Please type "DELETE MY ACCOUNT" to confirm'),
  body('password')
    .optional()
    .notEmpty()
    .withMessage('Password is required for local accounts')
];