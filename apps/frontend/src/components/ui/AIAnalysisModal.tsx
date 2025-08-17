import React, { useState, useEffect } from 'react';
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle?: string;
  companyName?: string;
  analysisStep?: 'analyzing' | 'complete' | 'error';
  matchScore?: number;
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  isOpen,
  onClose,
  jobTitle = "this position",
  companyName = "the company",
  analysisStep = 'analyzing',
  matchScore
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messages = [
    `Hello! I'm analyzing your application for ${jobTitle} at ${companyName}...`,
    "Let me examine your resume and the job requirements in detail...",
    "I'm comparing your skills and experience with what they're looking for...",
    "Analyzing keywords, qualifications, and cultural fit indicators...",
    "Almost done! Calculating your compatibility score...",
    analysisStep === 'complete' && matchScore 
      ? `Great! I've completed the analysis. Your match score is ${matchScore}%!`
      : analysisStep === 'error'
      ? "I encountered an issue during analysis. Please try again."
      : "Finalizing your personalized match report..."
  ];

  // Typewriter effect
  useEffect(() => {
    if (!isOpen) {
      setCurrentMessageIndex(0);
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const currentMessage = messages[currentMessageIndex] || '';
    let charIndex = 0;
    setDisplayedText('');

    const typeInterval = setInterval(() => {
      if (charIndex < currentMessage.length) {
        setDisplayedText(currentMessage.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        
        // Move to next message after a pause (except for the last message)
        if (currentMessageIndex < messages.length - 1 && analysisStep === 'analyzing') {
          setTimeout(() => {
            setCurrentMessageIndex(prev => prev + 1);
          }, 2000);
        }
      }
    }, 50); // Typing speed

    return () => clearInterval(typeInterval);
  }, [isOpen, currentMessageIndex, analysisStep, matchScore]);

  // Reset when analysis step changes
  useEffect(() => {
    if (analysisStep === 'complete' || analysisStep === 'error') {
      setCurrentMessageIndex(messages.length - 1);
    }
  }, [analysisStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={analysisStep !== 'analyzing' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="
        relative w-full max-w-lg
        bg-gradient-to-br from-dark-secondary/95 to-dark-tertiary/95
        backdrop-blur-xl border border-dark-accent/30
        rounded-2xl shadow-2xl
        transform transition-all duration-500 ease-out
        animate-scale-in
      ">
        {/* Close button - only show when not analyzing */}
        {analysisStep !== 'analyzing' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-700/80 hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-dark-text-secondary" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {/* AI Avatar with pulsing animation */}
              <div className="
                w-12 h-12 rounded-full 
                bg-gradient-to-r from-blue-500 to-purple-600
                flex items-center justify-center
                animate-pulse-slow
              ">
                <SparklesIcon className="w-6 h-6 text-white animate-spin-slow" />
              </div>
              
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/20 animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white">AI Career Coach</h3>
              <p className="text-sm text-dark-text-secondary">Analyzing your application...</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-dark-text-secondary mb-2">
              <span>Analysis Progress</span>
              <span>{Math.min(((currentMessageIndex + 1) / messages.length) * 100, 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.min(((currentMessageIndex + 1) / messages.length) * 100, 100)}%` 
                }}
              />
            </div>
          </div>

          {/* AI Message with typewriter effect */}
          <div className="
            bg-gray-700/50 rounded-xl p-4 min-h-[80px]
            border border-dark-accent/20
          ">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-dark-text-primary leading-relaxed">
                  {displayedText}
                  {isTyping && (
                    <span className="inline-block w-0.5 h-5 bg-dark-accent ml-1 animate-blink" />
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            {analysisStep === 'analyzing' && (
              <>
                <div className="flex items-center space-x-2 text-teal-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span>Reading resume</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <span>Matching skills</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                  <span>Calculating score</span>
                </div>
              </>
            )}
            
            {analysisStep === 'complete' && matchScore && (
              <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-lg px-4 py-2 border border-green-400/30">
                <div className="flex items-center space-x-2">
                  <SparklesIcon className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Analysis Complete!</span>
                  <span className="text-white font-bold text-lg">{matchScore}% Match</span>
                </div>
              </div>
            )}

            {analysisStep === 'error' && (
              <div className="bg-red-500/20 rounded-lg px-4 py-2 border border-red-400/30">
                <div className="flex items-center space-x-2">
                  <XMarkIcon className="w-5 h-5 text-red-400" />
                  <span className="text-red-400">Analysis failed - please try again</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisModal;