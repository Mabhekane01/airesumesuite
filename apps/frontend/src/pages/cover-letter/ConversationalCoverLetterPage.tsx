import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import ConversationalCoverLetterBuilder from '../../components/cover-letter/ConversationalCoverLetterBuilder';

export default function ConversationalCoverLetterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Navigation Header */}
      <div className="bg-dark-primary/50 border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
                className="btn-secondary-dark"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="text-sm text-dark-text-muted">
                Dashboard &gt; Cover Letters &gt; AI Assistant
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => navigate('/cover-letter/generator')}
                variant="outline"
                size="sm"
                className="btn-secondary-dark"
              >
                Classic Generator
              </Button>
              
              <Button
                onClick={() => navigate('/cover-letter/templates')}
                variant="outline"
                size="sm"
                className="btn-secondary-dark"
              >
                Templates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ConversationalCoverLetterBuilder />
      
      {/* Footer */}
      <div className="bg-dark-primary/30 border-t border-dark-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-dark-text-muted text-sm">
            <p>Powered by Advanced AI • Enterprise-Grade Security • Professional Results</p>
            <div className="mt-2 flex items-center justify-center space-x-4">
              <span>🤖 AI-Powered</span>
              <span>📄 ATS-Optimized</span>
              <span>⚡ Real-time Analysis</span>
              <span>🔒 Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}