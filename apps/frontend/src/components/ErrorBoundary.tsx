import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { logError } from '../utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, 'React Error Boundary');
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-primary flex items-center justify-center p-4">
          <Card className="card-dark max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-dark-text-primary mb-4">
              Something went wrong
            </h1>
            
            <p className="text-dark-text-secondary mb-6">
              We encountered an unexpected error. Our team has been notified and is working on a fix.
            </p>
            
            <div className="space-y-4">
              <Button onClick={this.handleRetry} className="btn-primary-dark w-full">
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="btn-secondary-dark w-full"
              >
                Reload Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-dark-text-muted hover:text-dark-text-primary">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-dark-secondary/20 p-3 rounded overflow-auto border border-dark-border text-dark-text-secondary">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            {this.state.errorId && (
              <p className="text-xs text-dark-text-muted mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specific error boundary for resume builder
export const ResumeBuilderErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-6 m-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-400 mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Resume Builder Error
              </h3>
              <p className="text-red-400/80 mb-4">
                There was an error with the resume builder. Your data has been preserved.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                size="sm"
                variant="outline"
                className="btn-secondary-dark"
              >
                Restart Builder
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Error boundary for AI features
export const AIFeatureErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">AI Feature Unavailable</p>
              <p className="text-yellow-400/80 text-sm mt-1">
                AI features are temporarily unavailable. You can continue building your resume manually.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};