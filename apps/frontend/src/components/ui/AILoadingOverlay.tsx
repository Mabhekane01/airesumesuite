import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, CpuChipIcon, BoltIcon, CogIcon, CheckIcon } from '@heroicons/react/24/outline';

interface AILoadingOverlayProps {
  isVisible: boolean;
  title: string;
  description?: string;
  progress?: number;
  estimatedTime?: number; // in seconds
  currentStep?: string;
  onCancel?: () => void;
}

const AILoadingOverlay: React.FC<AILoadingOverlayProps> = ({
  isVisible,
  title,
  description,
  progress = 0,
  estimatedTime = 30,
  currentStep,
  onCancel
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentIcon, setCurrentIcon] = useState(0);

  const icons = [SparklesIcon, CpuChipIcon, BoltIcon, CogIcon];
  const IconComponent = icons[currentIcon];

  // Animate progress smoothly
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setAnimatedProgress(prev => {
          if (prev < progress) {
            return Math.min(prev + 0.5, progress);
          }
          return prev;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [progress, isVisible]);

  // Rotate icons for visual interest
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setCurrentIcon(prev => (prev + 1) % icons.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  // Reset when overlay closes
  useEffect(() => {
    if (!isVisible) {
      setAnimatedProgress(0);
      setCurrentIcon(0);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-start justify-center pt-16 bg-white/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-white rounded-2xl p-8 shadow-2xl border border-surface-200 w-full max-w-lg mx-4 overflow-hidden group"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-blue/10 rounded-full blur-3xl group-hover:bg-brand-blue/20 transition-colors duration-700" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-success/10 rounded-full blur-3xl group-hover:bg-brand-success/20 transition-colors duration-700" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Icon Animation */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-brand-blue to-brand-success rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
                  <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center space-y-3 mb-8 w-full">
                <h3 className="text-2xl font-bold text-brand-dark tracking-tight">
                  {title}
                </h3>
                <div className="h-5">
                  <p className="text-text-secondary text-sm animate-fade-in">
                    {description}
                  </p>
                </div>
              </div>

              {/* Main Progress Bar */}
              <div className="w-full space-y-4 mb-8">
                <div className="relative h-3 bg-surface-100 rounded-full overflow-hidden border border-surface-200">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-blue via-blue-400 to-brand-success rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {/* Animated Shine Effect */}
                    <motion.div 
                      className="absolute inset-0"
                      style={{ 
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        width: '50%'
                      }}
                      animate={{ 
                        x: ['-100%', '200%']
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                    />
                  </motion.div>
                </div>
                
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-text-tertiary">Progress</span>
                    <span className="text-sm text-brand-blue font-bold">{Math.round(animatedProgress)}%</span>
                  </div>
                  <div className="flex items-center text-text-tertiary text-xs gap-1">
                    <CogIcon className="w-3 h-3 animate-spin" />
                    <span>Est. {estimatedTime}s</span>
                  </div>
                </div>
              </div>

              {/* Step Detail */}
              {currentStep && (
                <div className="w-full bg-surface-50/50 rounded-xl p-4 border border-surface-200 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping" />
                  </div>
                  <span className="text-sm font-medium text-brand-dark">
                    {currentStep}
                  </span>
                </div>
              )}

              {/* Footer Note */}
              <div className="mt-8 flex items-center justify-center text-text-tertiary text-xs gap-2">
                <SparklesIcon className="w-3 h-3 text-brand-blue" />
                <span>Our AI usually takes 10-15 seconds for deep analysis</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AILoadingOverlay;