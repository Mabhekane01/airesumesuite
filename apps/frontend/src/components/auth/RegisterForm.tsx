import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, ShieldCheckIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
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
  
  const { sendRegistrationOTP, googleLogin, isLoading, clearError, clearOTPState, requiresOTPVerification, pendingVerificationEmail } = useAuthStore();

  const localRecaptchaState = useEnterpriseRecaptcha();
  const {
    isReady: isRecaptchaLoaded,
    isLoading: isRecaptchaLoading,
    error: recaptchaError,
    executeRecaptcha
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
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Security protocol requires at least 8 characters');
      return;
    }

    if (!isRecaptchaLoaded) {
      toast.error('Security verification is initializing. Please wait.');
      return;
    }

    setIsRecaptchaProcessing(true);
    
    try {
      const recaptchaToken = await executeRecaptcha(RECAPTCHA_CONFIG.actions.SIGNUP);
      if (!recaptchaToken) throw new Error('Security verification failed.');

      await sendRegistrationOTP({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        recaptchaToken
      });
      
      setShowOTPVerification(true);
      setOtpEmail(formData.email);
      toast.success('Security verified. Code sent to your inbox.');
      
    } catch (error: any) {
      toast.error(error.message || 'Registration failed.');
    } finally {
      setIsRecaptchaProcessing(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
    clearOTPState();
    onToggleMode();
  };

  const handleOTPSuccess = () => {
    toast.success('Identity verified. Account active.');
    clearOTPState();
    onClose();
    if (onSuccess) onSuccess();
  };

  if (showOTPVerification || (requiresOTPVerification && pendingVerificationEmail)) {
    const emailToUse = otpEmail || pendingVerificationEmail || formData.email;
    
    return (
      <div className="w-full">
        <button
          onClick={handleBackFromOTP}
          className="flex items-center text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-brand-blue mb-8 transition-colors"
        >
          ← Abort & Return
        </button>
        
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 mb-6 bg-brand-blue/10 border border-brand-blue/20 rounded-3xl flex items-center justify-center shadow-sm">
            <EnvelopeIcon className="w-10 h-10 text-brand-blue" />
          </div>
          <h2 className="text-4xl font-black text-brand-dark tracking-tight mb-3">
            Verify <span className="text-brand-blue">Inbox.</span>
          </h2>
          <p className="text-text-secondary font-semibold">
            Sent a 6-digit authentication key to
          </p>
          <p className="text-brand-blue font-black mt-1 tracking-tight">{emailToUse}</p>
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
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-brand-dark tracking-tight">
          Initialize <span className="text-brand-blue">Account.</span>
        </h2>
                  <p className="text-text-secondary mt-3 font-semibold tracking-tight tracking-tight">Set up your enterprise career profile instantly.</p>      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">First Name</label>
            <input
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="input-resume py-4"
              placeholder="Elon"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Last Name</label>
            <input
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="input-resume py-4"
              placeholder="Musk"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Institutional Email</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="input-resume py-4"
            placeholder="name@organization.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Define Passkey</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              className="input-resume py-4 pr-12"
              placeholder="Min. 8 characters"
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

        <div className="space-y-2">
          <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Confirm Passkey</label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="input-resume py-4 pr-12"
              placeholder="Repeat password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-brand-blue transition-colors"
            >
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 px-1">
          <ShieldCheckIcon className={`w-4 h-4 ${isRecaptchaLoaded ? 'text-brand-success' : 'text-text-tertiary'}`} />
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
            {isRecaptchaLoaded ? 'Security Protocol Active' : 'Initializing Security Layer...'}
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading || isRecaptchaProcessing || !isRecaptchaLoaded}
          className="btn-primary w-full py-4 text-lg shadow-xl shadow-brand-blue/20 mt-4 disabled:opacity-50 disabled:grayscale transition-all"
        >
          {isLoading || isRecaptchaProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Initializing Identity...</span>
            </div>
          ) : 'Deploy Secure Profile'}
        </button>

        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-surface-200"></div>
          <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">OAuth Gateway</span>
          <div className="flex-1 h-px bg-surface-200"></div>
        </div>

        <button
          type="button"
          onClick={() => googleLogin()}
          className="w-full flex items-center justify-center gap-3 bg-white border border-surface-200 py-4 px-6 rounded-2xl font-bold text-brand-dark shadow-sm hover:bg-surface-50 hover:border-surface-300 transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Quick Deploy with Google
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-surface-100 text-center">
        <p className="text-sm font-bold text-text-secondary">
          Existing account?{' '}
          <button
            onClick={onToggleMode}
            className="text-brand-blue hover:underline font-black"
          >
            Access system login
          </button>
        </p>
      </div>
    </div>
  );
}