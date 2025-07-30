import { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, ChatBubbleBottomCenterTextIcon, EyeIcon } from '@heroicons/react/24/outline';
import ResumeSelector from '../../components/career-coach/ResumeSelector';
import ResumeDisplay from '../../components/career-coach/ResumeDisplay';
import ChatModal from '../../components/career-coach/ChatModal';
import SubscriptionGate from '../../components/subscription/SubscriptionGate';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCareerCoachStore } from '../../stores/careerCoachStore';
import { useResumeStore } from '../../stores/resumeStore';

export default function CareerCoachPage() {
  const { selectedResume, selectResume, checkBackendHealth, isBackendHealthy } = useCareerCoachStore();
  const { resumes, loadingState, error } = useResumeStore();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume'>('resume');

  // Perform health check on component mount
  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  return (
    <SubscriptionGate 
      feature="AI Career Coach" 
      description="Get personalized career advice and resume optimization powered by AI. Unlock unlimited coaching sessions, interview prep, and career guidance."
      requiresEnterprise={true}
    >
      <div className="min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-primary">
      {/* Header */}
      <div className="bg-dark-secondary/50 border-b border-dark-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Career Coach</h1>
                <p className="text-sm text-dark-text-secondary">
                  Get personalized career advice based on your resume
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {selectedResume && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <DocumentTextIcon className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">
                    {selectedResume.title}
                  </span>
                </div>
              )}
              <Button
                onClick={() => setIsChatModalOpen(true)}
                disabled={!selectedResume}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                Start Coaching Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Actions */}
      <div className="lg:hidden bg-dark-secondary border-b border-dark-border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-dark-text-secondary">
            {selectedResume ? `Selected: ${selectedResume.title}` : 'Select a resume to start'}
          </div>
          <Button
            onClick={() => setIsChatModalOpen(true)}
            disabled={!selectedResume}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
            Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Left Column: Resume Selection */}
          <div className="lg:col-span-1">
            <Card className="card-dark h-full overflow-hidden">
              <div className="p-4 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-md flex-shrink-0">
                    <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-lg font-bold text-white">Select Resume</h2>
                    <p className="text-xs text-dark-text-secondary">
                      Choose a resume for AI coaching
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <ResumeSelector onSelectResume={selectResume} />
                
                {/* Quick Start Guide */}
                {!selectedResume && (
                  <div className="mt-4 p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-400 mb-3">Quick Start</h3>
                    <ol className="text-xs text-dark-text-secondary space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-semibold min-w-[16px]">1.</span>
                        Select a resume from above
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-semibold min-w-[16px]">2.</span>
                        Review it in the preview panel
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-semibold min-w-[16px]">3.</span>
                        Click "Start Coaching Chat"
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-semibold min-w-[16px]">4.</span>
                        Ask any career question!
                      </li>
                    </ol>
                  </div>
                )}

                {/* Chat Status */}
                {selectedResume && (
                  <div className="mt-4 p-4 bg-green-600/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-green-400">AI Coach Ready</span>
                    </div>
                    <p className="text-xs text-dark-text-secondary mb-3">
                      Ready to help with:
                    </p>
                    <div className="text-xs text-dark-text-muted space-y-1 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        Resume optimization
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        Interview preparation
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        Career advancement
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        Skill development
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        Salary negotiation
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsChatModalOpen(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 text-sm"
                    >
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-2" />
                      Start Chat
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Resume Preview */}
          <div className="lg:col-span-2">
            <Card className="card-dark h-full overflow-hidden">
              <div className="p-6 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EyeIcon className="w-5 h-5 text-purple-400" />
                    <div>
                      <h2 className="text-lg font-bold text-white">Resume Preview</h2>
                      <p className="text-sm text-dark-text-secondary">
                        {selectedResume ? `Viewing: ${selectedResume.title}` : 'No resume selected'}
                      </p>
                    </div>
                  </div>
                  {selectedResume && (
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-dark-text-muted">
                        Template: {selectedResume.template || 'Default'}
                      </div>
                      <Button
                        onClick={() => setIsChatModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Get AI Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-full overflow-y-auto bg-gray-100">
                {selectedResume ? (
                  <div className="w-full h-full bg-white">
                    <ResumeDisplay resume={selectedResume} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="p-6 bg-dark-secondary rounded-full mb-6">
                      <DocumentTextIcon className="w-12 h-12 text-dark-text-muted" />
                    </div>
                    <h3 className="text-xl font-semibold text-dark-text-primary mb-3">
                      Resume Preview
                    </h3>
                    <p className="text-dark-text-secondary max-w-md mb-6">
                      Select a resume from the left sidebar to see it here. The AI coach will analyze every detail to provide personalized career guidance.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-dark-text-muted max-w-md">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        Template styling preserved
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Real-time AI analysis
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        Professional formatting
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        Interactive coaching
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatModalOpen} 
        onClose={() => setIsChatModalOpen(false)}
        resumeTitle={selectedResume?.title}
      />
      </div>
    </SubscriptionGate>
  );
}
