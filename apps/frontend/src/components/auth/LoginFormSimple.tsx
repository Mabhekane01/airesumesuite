import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { authAPI } from '../../services/api';
import { toast } from 'sonner';
import { validateLoginForm, getFieldError } from '../../utils/validation';
import { useEnterpriseRecaptcha } from '../../hooks/useEnterpriseRecaptcha';
import { RECAPTCHA_CONFIG } from '../../services/recaptchaService';
import { motion } from 'framer-motion';

interface LoginFormProps {
  onToggleMode: () => void;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginFormSimple({ onToggleMode, onClose, onSuccess }: LoginFormProps) {
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
  
  const {
    isReady: isRecaptchaLoaded,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
    executeRecaptcha
  } = useEnterpriseRecaptcha();

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

    if (!isRecaptchaLoaded) {
      toast.error('Security verification is loading. Please wait a moment.');
      return;
    }

    setIsRecaptchaProcessing(true);
    
    try {
      const recaptchaToken = await executeRecaptcha(RECAPTCHA_CONFIG.actions.LOGIN);
      if (!recaptchaToken) throw new Error('Security verification failed.');
      
      await login(email, password, null, recaptchaToken);
      toast.success('Welcome back!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Login failed.');
    } finally {
      setIsRecaptchaProcessing(false);
    }
  };

  const handleGoogleLogin = () => {
    googleLogin();
  };

  if (showForgotPassword) {
    return (
      <div className="w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-brand-dark tracking-tight">
            Recover <span className="text-brand-blue">Access.</span>
          </h2>
          <p className="text-text-secondary mt-3 font-semibold">Enter your email to receive recovery instructions.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); /* ... */ }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-dark uppercase tracking-widest ml-1">Email Protocol</label>
            <input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
              className="input-resume py-4"
              placeholder="name@company.com"
            />
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-blue/20">
            Initialize Recovery
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-sm font-bold text-text-tertiary hover:text-brand-blue transition-colors uppercase tracking-widest"
          >
            Return to Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-brand-dark tracking-tight">
          System <span className="text-brand-blue">Login.</span>
        </h2>
        <p className="text-text-secondary mt-3 font-semibold tracking-tight">Enter credentials to access your career dashboard.</p>
      </div>

      <div className="space-y-6">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-surface-200 py-4 px-6 rounded-2xl font-bold text-brand-dark shadow-sm hover:bg-surface-50 hover:border-surface-300 transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center gap-4">
          <div className="flex-1 h-px bg-surface-200"></div>
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Institutional Auth</span>
          <div className="flex-1 h-px bg-surface-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Identity Endpoint</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`input-resume py-4 ${
                  emailExists === false ? 'border-orange-300 focus:ring-orange-100' : ''
                }`}
                placeholder="name@company.com"
              />
              {emailCheckLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Secret Key</label>
              <button 
                type="button" 
                onClick={() => setShowForgotPassword(true)}
                className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
              >
                Reset Passkey
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(password)}
                onInput={(e: any) => setPassword(e.target.value)}
                required
                className="input-resume py-4 pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-brand-blue transition-colors"
              >
                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center px-1 pt-2">
            <label className="flex items-center gap-3 group cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded-lg border-surface-300 text-brand-blue focus:ring-brand-blue/20 transition-all cursor-pointer" />
              <span className="text-sm font-bold text-text-secondary group-hover:text-brand-dark transition-colors">Maintain active session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || isRecaptchaProcessing || !email || !password}
            className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-blue/20 mt-4 disabled:opacity-50 disabled:grayscale"
          >
            {isLoading || isRecaptchaProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
              </div>
            ) : 'Access Dashboard'}
          </button>
        </form>
      </div>

      <div className="mt-10 pt-8 border-t border-surface-100 text-center">
        <p className="text-sm font-bold text-text-secondary">
          Not yet deployed?{' '}
          <button
            onClick={onToggleMode}
            className="text-brand-blue hover:underline font-black"
          >
            Initialize free account
          </button>
        </p>
      </div>
    </div>
  );
}