import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { useEnterpriseRecaptcha } from '../../hooks/useEnterpriseRecaptcha';
import { RECAPTCHA_CONFIG } from '../../services/recaptchaService';

interface LoginFormProps {
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

export default function LoginForm({ onToggleMode, onClose, onSuccess, recaptchaState }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useState<{city?: string, country?: string, coordinates?: {latitude: number, longitude: number}} | null>(null);
  const [isRecaptchaProcessing, setIsRecaptchaProcessing] = useState(false);
  
  const authStore = useAuthStore();
  const { login, googleLogin, isLoading, error, clearError } = authStore;

  // Use reCAPTCHA state from parent or create own hook
  const localRecaptchaState = useEnterpriseRecaptcha();
  const {
    isReady: isRecaptchaLoaded,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
    executeRecaptcha,
    getStatus
  } = recaptchaState || localRecaptchaState;


  React.useEffect(() => {
    // Get user location on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Got user coordinates:', { latitude, longitude });
          
          try {
            // Use reverse geocoding to get city/country
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            console.log('🌍 Geocoding response:', data);
            
            const locationData = {
              city: data.city || data.locality,
              country: data.countryName,
              coordinates: { latitude, longitude }
            };
            console.log('✅ Setting location data:', locationData);
            setLocation(locationData);
          } catch (error) {
            console.warn('Failed to get location details:', error);
            const fallbackLocation = {
              coordinates: { latitude, longitude }
            };
            console.log('⚠️ Using fallback location:', fallbackLocation);
            setLocation(fallbackLocation);
          }
        },
        (error) => {
          console.warn('Location access denied:', error);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    // Basic validation
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    // Enterprise reCAPTCHA verification for login
    console.log('🔍 Enterprise reCAPTCHA Status Check for Login:', {
      isRecaptchaLoaded,
      isRecaptchaLoading,
      recaptchaError,
      siteKey: RECAPTCHA_CONFIG.SITE_KEY,
      siteKeyLength: RECAPTCHA_CONFIG.SITE_KEY.length,
      status: getStatus()
    });

    if (!RECAPTCHA_CONFIG.SITE_KEY) {
      console.error('❌ reCAPTCHA site key is missing');
      toast.error('reCAPTCHA configuration error. Please contact support.');
      return;
    }

    if (!isRecaptchaLoaded) {
      console.error('❌ Shared reCAPTCHA not loaded yet for login');
      console.log('🔄 reCAPTCHA loading state:', { isRecaptchaLoading, recaptchaError });
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
        siteKey: RECAPTCHA_CONFIG.SITE_KEY,
        hasToken: !!recaptchaToken,
        action: RECAPTCHA_CONFIG.actions.LOGIN,
        token: recaptchaToken ? `${recaptchaToken.substring(0, 20)}...` : 'NULL',
        tokenType: typeof recaptchaToken,
        tokenValue: recaptchaToken
      });
      
      if (!recaptchaToken) {
        throw new Error('Security verification failed. Please refresh the page and try again.');
      }

      console.log('✅ reCAPTCHA token obtained for login');
      console.log('🔐 Attempting login with security verification and location:', location);
      
      // Pass reCAPTCHA token to login (null if not generated)
      console.log('📤 Sending login request with token details:', {
        hasToken: !!recaptchaToken,
        tokenType: typeof recaptchaToken,
        tokenLength: recaptchaToken?.length || 0,
        tokenPreview: recaptchaToken ? `${recaptchaToken.substring(0, 20)}...` : 'NULL',
        email,
        hasLocation: !!location
      });
      await login(email, password, location, recaptchaToken);
      
      // Login successful
      console.log('✅ Login successful with reCAPTCHA verification');
      toast.success('Welcome back!');
      onClose();
      
      // Call success callback for redirect handling
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Handle different types of errors
      if (error.message?.includes('Security verification failed')) {
        toast.error('Security verification failed. Please refresh the page and try again.');
      } else if (error.message?.includes('reCAPTCHA')) {
        toast.error('Security verification error. Please try again.');
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsRecaptchaProcessing(false);
    }
  };

  const handleGoogleLogin = () => {
    googleLogin();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text-dark">
          Welcome Back
        </h2>
        <p className="dark-text-secondary mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium dark-text-primary mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field-dark pr-12"
              placeholder="Enter your password"
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

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg accent-danger text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Debug reCAPTCHA state */}
        {import.meta.env.DEV && (
          <div className="text-xs text-gray-500 bg-gray-900/50 p-2 rounded mb-4">
            reCAPTCHA Debug: loaded={isRecaptchaLoaded ? '✅' : '❌'} | loading={isRecaptchaLoading ? '🔄' : '✅'} | error={recaptchaError || 'none'}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={isLoading || isRecaptchaProcessing || isRecaptchaLoading || !isRecaptchaLoaded}
          whileHover={{ scale: (isLoading || isRecaptchaProcessing || isRecaptchaLoading || !isRecaptchaLoaded) ? 1 : 1.02 }}
          whileTap={{ scale: (isLoading || isRecaptchaProcessing || isRecaptchaLoading || !isRecaptchaLoaded) ? 1 : 0.98 }}
          className="btn-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
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
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm dark-text-secondary">
          Don't have an account?{' '}
          <button
            onClick={onToggleMode}
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  );
}