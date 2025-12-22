import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
  title?: string;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onDismiss, 
  title = "Operation Failed",
  className = ""
}) => {
  return (
    <div className={`mx-auto max-w-2xl ${className}`}>
      <div className="bg-red-900/30 backdrop-blur-xl border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-red-400 font-semibold mb-2">{title}</h4>
                <p className="text-red-200 text-sm leading-relaxed">{error}</p>
                {onDismiss && (
                  <button 
                    onClick={onDismiss}
                    className="mt-3 text-red-400 hover:text-red-300 text-sm underline transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 ml-4 text-red-400 hover:text-red-300 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
