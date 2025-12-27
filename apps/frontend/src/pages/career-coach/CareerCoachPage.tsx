import { useState, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, ChatBubbleBottomCenterTextIcon, EyeIcon, RocketLaunchIcon, ChevronRightIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ResumeSelector from '../../components/career-coach/ResumeSelector';
import ResumeDisplay from '../../components/career-coach/ResumeDisplay';
import ChatModal from '../../components/career-coach/ChatModal';
import PremiumFeatureGate from '../../components/subscription/PremiumFeatureGate'; // Changed import
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useCareerCoachStore } from '../../stores/careerCoachStore';
import { useResumeStore } from '../../stores/resumeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function CareerCoachPage() {
  const { selectedResume, selectResume, checkBackendHealth } = useCareerCoachStore();
  const { resumes, loadingState, error } = useResumeStore();
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  return (
    <PremiumFeatureGate // Changed component name
      feature="AI Career Coach" 
      description="Personalized career trajectory optimization based on your unique professional DNA."
      actionButtonLabel="Upgrade to Enterprise"
    >
      {(isAccessGranted, openUpgradeModal) => (
        <div className="min-h-screen bg-[#FAFAFB] space-y-6 md:space-y-8 pb-20">
          {/* --- DYNAMIC HEADER --- */}
          <div className="bg-white border-b border-surface-200 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6 md:py-10 relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cognitive Intelligence Layer</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-black text-brand-dark tracking-tighter">AI Career Coach.</h1>
                  <p className="text-base md:text-lg text-text-secondary font-bold opacity-70">Personalized career trajectory optimization based on your unique professional DNA.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  {selectedResume && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 px-4 md:px-5 py-2.5 md:py-3 bg-brand-success/5 border border-brand-success/20 rounded-xl md:rounded-2xl shadow-inner"
                    >
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-brand-success/10 flex items-center justify-center text-brand-success">
                        <DocumentTextIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] md:text-[10px] font-black text-brand-success uppercase tracking-widest leading-none mb-1">Architecture Active</p>
                        <p className="text-xs md:text-sm font-bold text-brand-dark truncate max-w-[150px] md:max-w-[180px]">{selectedResume.title}</p>
                      </div>
                    </motion.div>
                  )}
                  <button
                    onClick={isAccessGranted ? () => setIsChatModalOpen(true) : openUpgradeModal} // Conditional action
                    disabled={!selectedResume && isAccessGranted} // Disable only if no resume selected AND allowed to access
                    className="flex-1 sm:flex-none btn-primary px-6 md:px-8 py-3.5 md:py-4 text-[11px] md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                    Initialize <span className="hidden sm:inline">Coaching Session</span><span className="sm:hidden">Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
              
              {/* Left Column: Repository & Status */}
              <div className="lg:col-span-4 space-y-6 md:space-y-8">
                <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 md:p-8 border-b border-surface-100 bg-surface-50/50">
                    <h2 className="text-lg md:text-xl font-black text-brand-dark tracking-tight flex items-center gap-3 uppercase">
                      <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                      Archive Explorer
                    </h2>
                  </div>
                  <div className="p-6 md:p-8 flex-1">
                    <ResumeSelector onSelectResume={selectResume} />
                    
                    {/* Status Module */}
                    <AnimatePresence mode="wait">
                      {selectedResume ? (
                        <motion.div 
                          key="ready"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 md:mt-8 p-5 md:p-6 bg-brand-success/[0.03] border border-brand-success/10 rounded-2xl md:rounded-3xl space-y-5 md:space-y-6"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-success/10 flex items-center justify-center text-brand-success">
                              <RocketLaunchIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-brand-dark uppercase tracking-widest leading-none mb-1">System Ready</p>
                              <p className="text-[10px] font-bold text-brand-success uppercase tracking-widest">Awaiting Command</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 pt-4 border-t border-brand-success/10">
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Session Capabilities:</p>
                            {[
                              "Architecture Optimization",
                              "Interview Simulation",
                              "Salary Delta Analysis",
                              "Semantic Gap Detection"
                            ].map((cap, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                                <CheckIcon className="w-3 h-3 text-brand-success stroke-[3]" />
                                {cap}
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={isAccessGranted ? () => setIsChatModalOpen(true) : openUpgradeModal} // Conditional action
                            className="w-full bg-brand-dark text-white py-4 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 group"
                          >
                            Access Terminal <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 md:mt-8 p-6 md:p-8 bg-surface-50 border border-dashed border-surface-200 rounded-2xl md:rounded-3xl text-center space-y-4"
                        >
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border border-surface-200 flex items-center justify-center mx-auto shadow-sm">
                            <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-text-tertiary opacity-40" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] md:text-[11px] font-black text-brand-dark uppercase tracking-widest">Null selection</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary leading-relaxed">Please choose a professional architecture to initialize the cognitive coach.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Preview */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="bg-white border border-surface-200 rounded-[2rem] md:rounded-[2.5rem] shadow-sm flex-1 flex flex-col overflow-hidden relative group">
                  <div className="p-6 md:p-8 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 relative z-10 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                        <EyeIcon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg md:text-xl font-black text-brand-dark tracking-tight leading-none mb-1">Architecture Preview.</h2>
                        <p className="text-[10px] md:text-xs font-bold text-text-tertiary uppercase tracking-widest">
                          {selectedResume ? `Active Module: ${selectedResume.title}` : 'System Standby'}
                        </p>
                      </div>
                    </div>
                    {selectedResume && (
                      <button
                        onClick={isAccessGranted ? () => setIsChatModalOpen(true) : openUpgradeModal} // Conditional action
                        className="inline-flex items-center justify-center gap-3 px-5 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-brand-blue text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:scale-105 transition-all"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Semantic Analysis
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-surface-100 min-h-[400px] md:min-h-[600px] relative">
                    {selectedResume ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full h-full bg-white"
                      >
                        <ResumeDisplay resume={selectedResume} />
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-12 space-y-6 md:space-y-8">
                        <div className="relative">
                          <div className="absolute inset-0 bg-brand-blue/10 rounded-full blur-3xl animate-pulse" />
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-white border border-surface-200 shadow-xl flex items-center justify-center relative z-10 text-text-tertiary opacity-30">
                            <DocumentTextIcon className="w-10 h-10 md:w-12 md:h-12" />
                          </div>
                        </div>
                        <div className="space-y-2 md:space-y-3 max-w-sm">
                          <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tighter uppercase opacity-40">Ready for Deployment.</h3>
                          <p className="text-xs md:text-text-secondary font-bold md:font-bold leading-relaxed opacity-60">
                            The AI coach is waiting to analyze your technical and leadership narrative. 
                            Select a cluster from the sidebar to begin the extraction.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-md w-full">
                          {["Typeset Integrity", "Real-time Metrics", "Industry Mapping", "Persona Engine"].map((tag, i) => (
                            <div key={i} className="px-4 py-2.5 md:py-3 bg-white border border-surface-200 rounded-xl md:rounded-2xl flex items-center gap-3 shadow-sm opacity-40">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                              <span className="text-[9px] md:text-[10px] font-black text-brand-dark uppercase tracking-widest">{tag}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Modal */}
          <AnimatePresence>
            {isChatModalOpen && (
              <ChatModal 
                isOpen={isChatModalOpen} 
                onClose={() => setIsChatModalOpen(false)}
                resumeTitle={selectedResume?.title}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </PremiumFeatureGate>
  );
}