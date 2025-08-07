import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useEnterpriseRecaptcha } from '../../hooks/useEnterpriseRecaptcha';
import { useNotifications } from '../../contexts/NotificationContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { refreshNotifications } = useNotifications();

  // Update mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);
  
  // Initialize reCAPTCHA at modal level to persist across form switches
  const recaptchaState = useEnterpriseRecaptcha();

  // Enhanced success handler that refreshes notifications
  const handleSuccess = () => {
    // Refresh notifications after successful login/register
    setTimeout(() => {
      refreshNotifications();
    }, 1000);
    
    // Call the original success callback if provided
    if (onSuccess) {
      onSuccess();
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative card-dark rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 dark-text-muted hover:dark-text-secondary transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {/* Form */}
            <div className="pt-4">
              <AnimatePresence mode="wait">
                {mode === 'login' ? (
                  <LoginForm
                    key="login"
                    onToggleMode={toggleMode}
                    onClose={onClose}
                    onSuccess={handleSuccess}
                    recaptchaState={recaptchaState}
                  />
                ) : (
                  <RegisterForm
                    key="register"
                    onToggleMode={toggleMode}
                    onClose={onClose}
                    onSuccess={handleSuccess}
                    recaptchaState={recaptchaState}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}