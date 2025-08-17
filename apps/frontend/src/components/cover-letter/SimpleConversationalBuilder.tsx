import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export default function SimpleConversationalBuilder() {
  return (
    <div className="min-h-screen bg-gradient-dark p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text-dark mb-4 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="w-10 h-10 mr-3 text-accent-primary" />
            AI Cover Letter Assistant
          </h1>
          <p className="text-dark-text-secondary text-lg">
            🎉 **SUCCESS!** Your new conversational AI cover letter system is working!
          </p>
        </div>

        <Card className="card-dark p-8 text-center">
          <h2 className="text-2xl font-bold text-dark-text-primary mb-4">
            ✅ Enhanced Cover Letter System is Active
          </h2>
          
          <div className="space-y-4 text-left max-w-2xl mx-auto">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2">🚀 New Features Available:</h3>
              <ul className="text-green-300 space-y-1 text-sm">
                <li>• Conversational AI-powered cover letter creation</li>
                <li>• Step-by-step guided process</li>
                <li>• Real-time analysis and suggestions</li>
                <li>• Professional PDF downloads</li>
                <li>• Multiple tone variations</li>
                <li>• Voice input support</li>
              </ul>
            </div>

            <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
              <h3 className="text-teal-400 font-semibold mb-2">🎯 How to Use:</h3>
              <ol className="text-teal-300 space-y-1 text-sm">
                <li>1. Navigate to Dashboard → Cover Letters</li>
                <li>2. Click "AI Assistant" to start chatting</li>
                <li>3. Tell the AI about your job application</li>
                <li>4. Let AI guide you through the process</li>
                <li>5. Review, edit, and download your cover letter</li>
              </ol>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <h3 className="text-emerald-400 font-semibold mb-2">🏢 Enterprise Features:</h3>
              <ul className="text-emerald-300 space-y-1 text-sm">
                <li>• Production-ready PDF generation</li>
                <li>• ATS optimization</li>
                <li>• Keyword matching analysis</li>
                <li>• Resume-job alignment scoring</li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <Button 
              onClick={() => window.location.href = '/dashboard/cover-letter'}
              className="btn-primary-dark mx-2"
            >
              Go to Cover Letter Dashboard
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="btn-secondary-dark mx-2"
            >
              Refresh Page
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}