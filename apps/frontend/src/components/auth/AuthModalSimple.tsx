import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LoginFormSimple from './LoginFormSimple';
import RegisterForm from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthModalSimple({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center animate-slide-up-soft">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      
      {/* Modal */}
      <div className="relative card-glass-dark shadow-dark-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-dark-border animate-glow-pulse">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-dark-text-secondary hover:text-accent-primary transition-all duration-300 hover:bg-accent-primary/10 rounded-lg"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Form */}
        <div className="pt-4">
          {mode === 'login' ? (
            <LoginFormSimple
              onToggleMode={toggleMode}
              onClose={onClose}
            />
          ) : (
            <RegisterForm
              onToggleMode={toggleMode}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}