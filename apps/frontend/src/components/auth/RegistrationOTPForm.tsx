import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface RegistrationOTPFormProps {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function RegistrationOTPForm({ email, onBack, onSuccess }: RegistrationOTPFormProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const { verifyRegistrationOTP, resendRegistrationOTP, isLoading, error, clearError } = useAuthStore();

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Remove non-digits
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (otpValue?: string) => {
    const otpCode = otpValue || otp.join('');
    
    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    clearError();
    
    try {
      await verifyRegistrationOTP(email, otpCode);
      toast.success('Registration completed successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Registration OTP verification failed:', error);
      
      // Clear the OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
      
      // Show specific error message
      if (error.message?.includes('attempts')) {
        toast.error(error.message);
      } else {
        toast.error('Invalid verification code. Please try again.');
      }
    }
  };

  const handleResend = async () => {
    try {
      await resendRegistrationOTP(email);
      toast.success('New verification code sent!');
      setTimeLeft(600); // Reset timer
      setCanResend(false);
      setOtp(['', '', '', '', '', '']); // Clear inputs
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium dark-text-primary mb-3 text-center">
            Enter Verification Code
          </label>
          <div className="flex justify-center space-x-3" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isLoading || otp.some(digit => !digit)}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className="btn-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Completing Registration...
            </div>
          ) : (
            'Complete Registration'
          )}
        </motion.button>

        {/* Back to Login / Cancel Button */}
        <motion.button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className="w-full flex items-center justify-center px-4 py-2 border border-dark-border text-gray-300 bg-transparent rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Cancel & Back to Login
        </motion.button>

        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="dark-text-secondary">
              {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
            </span>
          </div>

          <div>
            {canResend || timeLeft === 0 ? (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
              >
                Send New Code
              </button>
            ) : (
              <span className="text-gray-500 text-sm">
                Resend available in {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-700 border border-dark-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2">
            ✨ Almost there!
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Check your spam/junk folder if you don't see the email</li>
            <li>• You can paste the 6-digit code directly</li>
            <li>• Code will auto-submit when all digits are entered</li>
            <li>• After verification, please log in with your credentials</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}