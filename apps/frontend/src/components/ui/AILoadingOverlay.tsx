import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, CpuChipIcon, BoltIcon, CogIcon } from '@heroicons/react/24/outline';

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
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 bg-gray-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative max-w-md w-full mx-4 p-8 rounded-3xl glass-premium shadow-glow-xl animate-float-gentle"
            style={{
              background: 'rgba(15, 15, 15, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.4),
                0 0 60px rgba(139, 92, 246, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-cyan-500/20 blur-sm -z-10 animate-gradient-shift" />
            
            {/* Close button */}
            {onCancel && (
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Main content */}
            <div className="text-center">
              {/* Animated AI icon */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-glow-lg animate-pulse-glow"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)'
                  }}
                >
                  <IconComponent className="w-8 h-8 text-white drop-shadow-lg" />
                </motion.div>
                
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                    }}
                    animate={{
                      x: [0, Math.cos(i * 60 * Math.PI / 180) * 40],
                      y: [0, Math.sin(i * 60 * Math.PI / 180) * 40],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-2 text-gradient-premium">
                {title}
              </h3>

              {/* Description */}
              {description && (
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Current step */}
              {currentStep && (
                <motion.p 
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-300 text-sm mb-4 font-medium animate-shimmer"
                  style={{
                    background: 'linear-gradient(90deg, rgba(196, 181, 253, 0.8) 0%, rgba(147, 197, 253, 0.8) 50%, rgba(196, 181, 253, 0.8) 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  {currentStep}
                </motion.p>
              )}

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/60">Progress</span>
                  <span className="text-sm text-white font-bold">{Math.round(animatedProgress)}%</span>
                </div>
                
                <div 
                  className="w-full rounded-full h-3 overflow-hidden glass-dark"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${animatedProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{
                      background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                    }}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 animate-shimmer"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                        width: '50%',
                      }}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Time estimate */}
              <div className="flex items-center justify-center text-white/50 text-xs">
                <CogIcon className="w-4 h-4 mr-1 animate-spin text-emerald-400" />
                <span className="font-medium">Estimated time: {estimatedTime}s</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AILoadingOverlay;