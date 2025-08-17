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
      <div className="bg-gray-800/50 border-b border-dark-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-4 xs:py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center gap-2 xs:gap-3">
              <div className="p-1.5 xs:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex-shrink-0">
                <SparklesIcon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-white">AI Career Coach</h1>
                <p className="text-xs xs:text-sm text-dark-text-secondary">
                  Get personalized career advice based on your resume
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              {selectedResume && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <DocumentTextIcon className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium truncate max-w-[150px]">
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
      <div className="sm:hidden bg-gray-800 border-b border-dark-border p-3 xs:p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs xs:text-sm text-dark-text-secondary truncate mr-3">
            {selectedResume ? `Selected: ${selectedResume.title}` : 'Select a resume to start'}
          </div>
          <Button
            onClick={() => setIsChatModalOpen(true)}
            disabled={!selectedResume}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 flex-shrink-0"
          >
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
            Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-3 xs:p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xs:gap-6 min-h-[calc(100vh-200px)] lg:h-[calc(100vh-220px)]">
          {/* Left Column: Resume Selection */}
          <div className="lg:col-span-1 order-1 lg:order-1">
            <Card className="card-dark h-full lg:h-full overflow-hidden">
              <div className="p-3 xs:p-4 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary">
                <div className="flex items-center gap-2 xs:gap-3">
                  <div className="p-1.5 bg-teal-500/20 rounded-md flex-shrink-0">
                    <DocumentTextIcon className="w-4 h-4 xs:w-5 xs:h-5 text-teal-400" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h2 className="text-base xs:text-lg font-bold text-white">Select Resume</h2>
                    <p className="text-xs text-dark-text-secondary">
                      Choose a resume for AI coaching
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 xs:p-4">
                <ResumeSelector onSelectResume={selectResume} />
                
                {/* Quick Start Guide */}
                {!selectedResume && (
                  <div className="mt-3 xs:mt-4 p-3 xs:p-4 bg-teal-600/10 border border-teal-500/20 rounded-lg">
                    <h3 className="text-sm font-semibold text-teal-400 mb-2 xs:mb-3">Quick Start</h3>
                    <ol className="text-xs text-dark-text-secondary space-y-1.5 xs:space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 font-semibold min-w-[16px]">1.</span>
                        Select a resume from above
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 font-semibold min-w-[16px]">2.</span>
                        <span className="hidden lg:inline">Review it in the preview panel</span>
                        <span className="lg:hidden">Tap to preview</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 font-semibold min-w-[16px]">3.</span>
                        <span className="hidden xs:inline">Click "Start Coaching Chat"</span>
                        <span className="xs:hidden">Start chat</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-400 font-semibold min-w-[16px]">4.</span>
                        Ask any career question!
                      </li>
                    </ol>
                  </div>
                )}

                {/* Chat Status */}
                {selectedResume && (
                  <div className="mt-3 xs:mt-4 p-3 xs:p-4 bg-green-600/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 xs:mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-green-400">AI Coach Ready</span>
                    </div>
                    <p className="text-xs text-dark-text-secondary mb-2 xs:mb-3">
                      Ready to help with:
                    </p>
                    <div className="text-xs text-dark-text-muted space-y-1 mb-3 xs:mb-4">
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
          <div className="lg:col-span-2 order-2 lg:order-2">
            <Card className="card-dark h-full lg:h-full overflow-hidden">
              <div className="p-3 xs:p-4 sm:p-6 border-b border-dark-border bg-gradient-to-r from-dark-secondary to-dark-tertiary">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-2 xs:gap-3">
                    <EyeIcon className="w-4 h-4 xs:w-5 xs:h-5 text-emerald-400" />
                    <div className="min-w-0">
                      <h2 className="text-base xs:text-lg font-bold text-white">Resume Preview</h2>
                      <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
                        {selectedResume ? `Viewing: ${selectedResume.title}` : 'No resume selected'}
                      </p>
                    </div>
                  </div>
                  {selectedResume && (
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-xs text-dark-text-muted">
                        Template: {selectedResume.template || 'Default'}
                      </div>
                      <Button
                        onClick={() => setIsChatModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm flex-shrink-0"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden xs:inline">Get AI Feedback</span>
                        <span className="xs:hidden">Feedback</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-64 sm:h-96 lg:h-full overflow-y-auto bg-gray-100">
                {selectedResume ? (
                  <div className="w-full h-full bg-white">
                    <ResumeDisplay resume={selectedResume} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 xs:p-6 sm:p-8">
                    <div className="p-4 xs:p-6 bg-gray-800 rounded-full mb-4 xs:mb-6">
                      <DocumentTextIcon className="w-8 h-8 xs:w-12 xs:h-12 text-dark-text-muted" />
                    </div>
                    <h3 className="text-lg xs:text-xl font-semibold text-dark-text-primary mb-2 xs:mb-3">
                      Resume Preview
                    </h3>
                    <p className="text-dark-text-secondary max-w-md mb-4 xs:mb-6 text-sm xs:text-base">
                      <span className="hidden lg:inline">Select a resume from the left sidebar to see it here. The AI coach will analyze every detail to provide personalized career guidance.</span>
                      <span className="lg:hidden">Select a resume above to preview it here and get AI coaching.</span>
                    </p>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-4 text-xs xs:text-sm text-dark-text-muted max-w-md">
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
