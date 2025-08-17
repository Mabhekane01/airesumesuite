import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GoogleAuthError() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('Authentication failed');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      switch (message) {
        case 'authentication_failed':
          setErrorMessage('Google authentication failed. Please try again.');
          break;
        case 'server_error':
          setErrorMessage('A server error occurred. Please try again later.');
          break;
        case 'missing_tokens':
          setErrorMessage('Authentication tokens were not received. Please try again.');
          break;
        case 'callback_error':
          setErrorMessage('An error occurred while processing your sign-in. Please try again.');
          break;
        default:
          setErrorMessage(decodeURIComponent(message));
      }
    }
  }, [searchParams]);

  const handleRetry = () => {
    navigate('/', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-accent-danger rounded-full opacity-10 animate-float-gentle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="relative glass-dark rounded-xl shadow-dark-xl p-8 max-w-md w-full text-center animate-slide-up-soft">
        {/* Error icon with glow effect */}
        <div className="mb-6 relative">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-accent-danger/20 to-accent-quaternary/20 flex items-center justify-center border border-accent-danger/30 backdrop-blur-sm shadow-glow-md">
            <svg className="w-8 h-8 text-accent-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          {/* Subtle warning indicators */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-danger rounded-full animate-pulse opacity-60"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent-quaternary rounded-full animate-pulse opacity-40" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-bold text-dark-text-primary">
            Sign In Failed 😔
          </h2>
          <div className="p-4 rounded-lg bg-accent-danger/10 border border-accent-danger/20 backdrop-blur-sm">
            <p className="text-dark-text-secondary text-sm leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="space-y-3">
          <button 
            onClick={handleRetry}
            className="btn-primary-dark w-full py-3 flex items-center justify-center space-x-2 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Try Google Sign In Again</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          
          <button 
            onClick={handleGoHome}
            className="btn-secondary-dark w-full py-3 flex items-center justify-center space-x-2 group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to Home</span>
          </button>
        </div>

        {/* Help text */}
        <div className="mt-6 p-3 rounded-lg bg-gray-700/50 border border-dark-border/50 backdrop-blur-sm">
          <p className="text-xs text-dark-text-muted">
            If you continue to experience issues, try clearing your browser cookies or using a different browser.
          </p>
        </div>
      </div>
    </div>
  );
}