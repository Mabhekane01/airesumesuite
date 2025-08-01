import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import { toast } from 'sonner';
import { validateLoginForm, getFieldError } from '../../utils/validation';
import { useEnterpriseRecaptcha } from '../../hooks/useEnterpriseRecaptcha';
import { RECAPTCHA_CONFIG } from '../../services/recaptchaService';

interface LoginFormProps {
  onToggleMode: () => void;
  onClose: () => void;
}

export default function LoginFormSimple({ onToggleMode, onClose }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [isRecaptchaProcessing, setIsRecaptchaProcessing] = useState(false);
  
  const { login, googleLogin, isLoading, error, clearError } = useAuthStore();
  
  // Enterprise reCAPTCHA integration
  const {
    isReady: isRecaptchaLoaded,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
    executeRecaptcha,
    getStatus
  } = useEnterpriseRecaptcha();

  // Real-time email validation and existence check
  useEffect(() => {
    const checkEmail = async () => {
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailCheckLoading(true);
        try {
          const result = await authAPI.checkEmailExists(email);
          setEmailExists(result.exists);
        } catch (error) {
          console.error('Email check failed:', error);
        } finally {
          setEmailCheckLoading(false);
        }
      } else {
        setEmailExists(null);
      }
    };

    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [email]);

  // Real-time form validation
  useEffect(() => {
    if (email || password) {
      const validation = validateLoginForm(email, password);
      setValidationErrors(validation.errors);
    }
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix the validation errors');
      return;
    }

    if (emailExists === false) {
      toast.error('This email is not registered. Please sign up first.');
      return;
    }

    // reCAPTCHA verification
    if (!RECAPTCHA_CONFIG.SITE_KEY) {
      console.error('❌ reCAPTCHA site key is missing');
      toast.error('reCAPTCHA configuration error. Please contact support.');
      return;
    }

    if (!isRecaptchaLoaded) {
      console.error('❌ reCAPTCHA not loaded yet for login');
      toast.error('Security verification is loading. Please wait a moment and try again.');
      return;
    }

    setIsRecaptchaProcessing(true);
    
    try {
      // Execute reCAPTCHA v3 for login action
      console.log('🔒 Executing reCAPTCHA for login...');
      const recaptchaToken = await executeRecaptcha(RECAPTCHA_CONFIG.actions.LOGIN);
      
      console.log('🔍 Login reCAPTCHA result:', {
        tokenLength: recaptchaToken?.length || 0,
        hasToken: !!recaptchaToken,
        tokenType: typeof recaptchaToken
      });
      
      if (!recaptchaToken) {
        throw new Error('Security verification failed. Please refresh the page and try again.');
      }

      console.log('✅ reCAPTCHA token obtained for login');
      
      await login(email, password, null, recaptchaToken);
      toast.success('Welcome back!');
      onClose();
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      if (error.message?.includes('Security verification failed')) {
        toast.error('Security verification failed. Please refresh the page and try again.');
      } else if (error.message?.includes('reCAPTCHA')) {
        toast.error('Security verification error. Please try again.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.';
        toast.error(errorMessage);
      }
    } finally {
      setIsRecaptchaProcessing(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    
    try {
      await authAPI.forgotPassword(forgotPasswordEmail);
      toast.success('Password reset link sent to your email');
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    googleLogin();
  };

  if (showForgotPassword) {
    return (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text-dark">
            Reset Password 🔒
          </h2>
          <p className="text-dark-text-secondary mt-2">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div>
            <label htmlFor="resetEmail" className="block text-sm font-medium text-dark-text-primary mb-2">
              Email Address
            </label>
            <input
              id="resetEmail"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
              className="input-field-dark"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={forgotPasswordLoading}
            className="btn-primary-dark w-full py-3"
          >
            {forgotPasswordLoading ? (
              <div className="flex items-center justify-center">
                <div className="spinner-dark mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Reset Link ✨'
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-dark-text-secondary hover:text-accent-primary transition-all duration-300"
          >
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text-dark animate-slide-up-soft">
          Welcome Back 👋
        </h2>
        <p className="text-dark-text-secondary mt-2 animate-slide-up-soft" style={{ animationDelay: '0.1s' }}>Sign in to continue to AI Job Suite</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-dark-text-primary mb-2">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`input-field-dark pr-10 ${
                getFieldError(validationErrors, 'email') 
                  ? 'border-red-300 focus:ring-red-500' 
                  : emailExists === false 
                    ? 'border-accent-quaternary/50 focus:ring-accent-quaternary'
                    : emailExists === true 
                      ? 'border-accent-tertiary/50 focus:ring-accent-tertiary'
                      : 'border-dark-border'
              }`}
              placeholder="Enter your email"
            />
            
            {emailCheckLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!emailCheckLoading && email && emailExists === true && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 bg-accent-tertiary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
            
            {!emailCheckLoading && email && emailExists === false && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <ExclamationCircleIcon className="w-5 h-5 text-accent-quaternary" />
              </div>
            )}
          </div>
          
          {getFieldError(validationErrors, 'email') && (
            <p className="mt-1 text-sm text-accent-danger">{getFieldError(validationErrors, 'email')}</p>
          )}
          
          {emailExists === false && (
            <p className="mt-1 text-sm text-accent-quaternary">
              This email is not registered. 
              <button 
                type="button" 
                onClick={onToggleMode}
                className="ml-1 text-accent-primary hover:text-accent-primary/80 font-medium"
              >
                Sign up instead?
              </button>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-dark-text-primary mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`input-field-dark pr-12 ${
                getFieldError(validationErrors, 'password') ? 'border-accent-danger/50 focus:ring-accent-danger' : 'border-dark-border'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-text-muted hover:text-dark-text-primary"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          
          {getFieldError(validationErrors, 'password') && (
            <p className="mt-1 text-sm text-accent-danger">{getFieldError(validationErrors, 'password')}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-dark-border rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-text-primary">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-medium text-accent-primary hover:text-accent-primary/80"
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {(error || recaptchaError) && (
          <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-lg text-accent-danger text-sm flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            {error || recaptchaError}
          </div>
        )}

        {/* Debug reCAPTCHA state in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded mb-4">
            reCAPTCHA Debug: loaded={isRecaptchaLoaded ? '✅' : '❌'} | loading={isRecaptchaLoading ? '🔄' : '✅'} | error={recaptchaError || 'none'}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isRecaptchaProcessing || isRecaptchaLoading || !isRecaptchaLoaded || emailExists === false || !email || !password}
          className="btn-primary-dark w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isRecaptchaLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading Security...
            </div>
          ) : !isRecaptchaLoaded ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Initializing Security...
            </div>
          ) : isRecaptchaProcessing ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Verifying Security...
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing In...
            </div>
          ) : (
            'Sign In'
          )}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-dark-primary text-dark-text-muted">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full border border-dark-border text-dark-text-primary py-3 px-4 rounded-lg font-medium hover:bg-dark-quaternary/50 transition-all duration-200 flex items-center justify-center transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-dark-text-secondary">
          New to AI Job Suite?{' '}
          <button
            onClick={onToggleMode}
            className="text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
          >
            Create your free account
          </button>
        </p>
      </div>
    </div>
  );
}