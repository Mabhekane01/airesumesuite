import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import RegistrationOTPForm from './RegistrationOTPForm';
import { useEnterpriseRecaptcha } from '../../hooks/useEnterpriseRecaptcha';
import { RECAPTCHA_CONFIG } from '../../services/recaptchaService';

interface RegisterFormProps {
  onToggleMode: () => void;
  onClose: () => void;
  onSuccess?: () => void;
  recaptchaState?: {
    isReady: boolean;
    isLoading: boolean;
    error: string | null;
    executeRecaptcha: (action: string) => Promise<string | null>;
    getStatus: () => any;
  };
}

export default function RegisterForm({ onToggleMode, onClose, onSuccess, recaptchaState }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [isRecaptchaProcessing, setIsRecaptchaProcessing] = useState(false);
  
  const { sendRegistrationOTP, verifyRegistrationOTP, resendRegistrationOTP, googleLogin, isLoading, error, clearError, clearOTPState, requiresOTPVerification, pendingVerificationEmail } = useAuthStore();

  // Use reCAPTCHA state from parent or create own hook
  const localRecaptchaState = useEnterpriseRecaptcha();
  const {
    isReady: isRecaptchaLoaded,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
    executeRecaptcha,
    getStatus
  } = recaptchaState || localRecaptchaState;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    // resetRecaptcha() not needed for reCAPTCHA v3 (invisible)
    
    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    // Password strength validation
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordStrengthRegex.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return;
    }

    // Enterprise reCAPTCHA verification
    console.log('🔍 reCAPTCHA Status Check:', {
      isRecaptchaLoaded,
      isRecaptchaLoading,
      recaptchaError,
      siteKey: RECAPTCHA_CONFIG.SITE_KEY,
      siteKeyLength: RECAPTCHA_CONFIG.SITE_KEY.length,
      window_grecaptcha: !!window.grecaptcha
    });

    if (!RECAPTCHA_CONFIG.SITE_KEY) {
      console.error('❌ reCAPTCHA site key is missing');
      toast.error('reCAPTCHA configuration error. Please contact support.');
      return;
    }

    if (!isRecaptchaLoaded) {
      console.error('❌ reCAPTCHA not loaded yet');
      toast.error('Security verification is loading. Please wait a moment and try again.');
      return;
    }

    setIsRecaptchaProcessing(true);
    
    try {
      // Execute reCAPTCHA v3 for signup action
      console.log('🔒 Executing reCAPTCHA for signup...');
      const recaptchaToken = await executeRecaptcha(RECAPTCHA_CONFIG.actions.SIGNUP);
      
      console.log('🔍 reCAPTCHA result:', {
        tokenLength: recaptchaToken?.length || 0,
        siteKey: RECAPTCHA_CONFIG.SITE_KEY,
        hasToken: !!recaptchaToken
      });
      
      if (!recaptchaToken) {
        throw new Error('Security verification failed. Please refresh the page and try again.');
      }

      console.log('✅ reCAPTCHA token obtained for registration');

      // Use modern OTP registration flow with reCAPTCHA
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        recaptchaToken
      };
      
      console.log('📤 Sending registration data:', {
        ...registrationData,
        password: '[HIDDEN]',
        recaptchaToken: recaptchaToken ? `${recaptchaToken.substring(0, 20)}...` : 'MISSING'
      });
      
      await sendRegistrationOTP(registrationData);
      
      // Show OTP verification form
      setShowOTPVerification(true);
      setOtpEmail(formData.email);
      toast.success('Security verified! Verification code sent to your email.');
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      // Handle different types of errors
      if (error.message?.includes('Security verification failed')) {
        toast.error('Security verification failed. Please refresh the page and try again.');
      } else if (error.message?.includes('reCAPTCHA')) {
        toast.error('Security verification error. Please try again.');
      } else {
        toast.error(error.message || 'Registration failed. Please try again.');
      }
      
      // resetRecaptcha() not needed for reCAPTCHA v3 (invisible)
    } finally {
      setIsRecaptchaProcessing(false);
    }
  };

  const handleGoogleLogin = () => {
    googleLogin();
  };

  const handleBackFromOTP = () => {
    // Clear local OTP state
    setShowOTPVerification(false);
    setOtpEmail('');
    
    // Clear auth store OTP state
    clearOTPState();
    
    // Go back to login instead of registration form
    onToggleMode(); // This switches to login mode
  };

  const handleOTPSuccess = () => {
    toast.success('Registration complete! You are now logged in.');
    
    // Clear local OTP state
    setShowOTPVerification(false);
    setOtpEmail('');
    
    // Clear auth store OTP state
    clearOTPState();
    
    // Close modal
    onClose();
    
    // Call success callback for redirect handling
    if (onSuccess) {
      onSuccess();
    }
  };

  // Show OTP verification form if needed
  if (showOTPVerification || (requiresOTPVerification && pendingVerificationEmail)) {
    const emailToUse = otpEmail || pendingVerificationEmail || formData.email;
    
    return (
      <div className="w-full max-w-md">
        <div className="mb-6">
          <button
            onClick={handleBackFromOTP}
            className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            ← Back to Registration
          </button>
        </div>
        
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 mb-4 bg-emerald-600/20 rounded-full flex items-center justify-center">
            <EnvelopeIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold gradient-text-dark mb-2">
            Verify Your Email
          </h2>
          <p className="dark-text-secondary">
            We've sent a 6-digit code to
          </p>
          <p className="text-emerald-400 font-medium">{emailToUse}</p>
        </div>

        <RegistrationOTPForm
          email={emailToUse}
          onBack={handleBackFromOTP}
          onSuccess={handleOTPSuccess}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text-dark">
          Create Your Free Account ✨
        </h2>
        <p className="dark-text-secondary mt-2">Join AI Job Suite and land your dream job</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium dark-text-primary mb-2">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="input-field-dark"
              placeholder="First name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium dark-text-primary mb-2">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="input-field-dark"
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium dark-text-primary mb-2">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-field-dark"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium dark-text-primary mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              className="input-field-dark pr-12"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 dark-text-muted hover:dark-text-secondary"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium dark-text-primary mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="input-field-dark pr-12"
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 dark-text-muted hover:dark-text-secondary"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Security Status Indicator */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className={`w-4 h-4 ${
              isRecaptchaLoaded ? 'text-green-400' : 
              isRecaptchaLoading ? 'text-yellow-400' : 
              'text-gray-400'
            }`} />
            <span className={`text-xs ${
              isRecaptchaLoaded ? 'text-green-400' : 
              isRecaptchaLoading ? 'text-yellow-400' : 
              'text-gray-400'
            }`}>
              {isRecaptchaLoaded ? '🔒 Security Ready' : 
               isRecaptchaLoading ? '⏳ Loading Security...' : 
               '⚠️ Security Loading'}
            </span>
          </div>
          
          {recaptchaError && (
            <span className="text-xs text-red-400">
              Security Error
            </span>
          )}
        </div>

        {(error || recaptchaError) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg accent-danger text-sm"
          >
            {error || recaptchaError}
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={isLoading || isRecaptchaProcessing || !isRecaptchaLoaded}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className="btn-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || isRecaptchaProcessing ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {isRecaptchaProcessing ? 'Verifying Security...' : 'Creating Account...'}
            </div>
          ) : !isRecaptchaLoaded ? (
            <div className="flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-300" />
              Loading Security...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Create Secure Account
            </div>
          )}
        </motion.button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-700 dark-text-muted">Or continue with</span>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={handleGoogleLogin}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-secondary-dark"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </motion.button>

        {/* Enterprise Security Notice */}
        <div className="bg-gray-700 border border-dark-border rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-teal-400 mb-1">
                Enterprise Security
              </h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Advanced bot protection via Google reCAPTCHA</li>
                <li>• Email verification with secure OTP delivery</li>
                <li>• Password strength enforcement</li>
                <li>• Fraud detection and risk analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm dark-text-secondary">
          Already have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
          >
            Sign in here
          </button>
        </p>
        
        <p className="text-xs text-gray-500 mt-3">
          Protected by reCAPTCHA and subject to the Google{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
            Terms of Service
          </a>
        </p>
      </div>
    </motion.div>
  );
}