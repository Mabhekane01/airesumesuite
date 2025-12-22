import React, { useState } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CogIcon,
  LightBulbIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Resume, Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import ResumeDownloadManager from './ResumeDownloadManager';
import JobOptimizationModal from './JobOptimizationModal';
import ATSCompatibilityChecker from './ATSCompatibilityChecker';
import EnhancementFeedbackModal from './EnhancementFeedbackModal';
import { useResume } from '../../contexts/ResumeContext';
import TemplateRenderer from './TemplateRenderer';
import CoverLetterIntegration from './CoverLetterIntegration';
import PDFPreview from './PDFPreview';
import { resumeService } from '../../services/resumeService';
import { useSubscriptionModal } from '../../hooks/useSubscriptionModal';
import SubscriptionModal from '../subscription/SubscriptionModal';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedResumePreviewProps {
  resume: Resume;
  templateId?: string;
  isLatexTemplate?: boolean;
  onAIImprovement?: () => void;
  onATSCheck?: () => void;
  onJobOptimization?: () => void;
  onResumeUpdate?: (updatedResume: Resume) => void;
  atsScore?: number;
  aiGenerated?: boolean;
}

export default function EnhancedResumePreview({ 
  resume, 
  templateId,
  isLatexTemplate = false,
  onAIImprovement,
  onATSCheck,
  onJobOptimization,
  onResumeUpdate,
  atsScore,
  aiGenerated = false
}: EnhancedResumePreviewProps) {
  const { 
    aiData, 
    updateAIData, 
    updateResumeData,
    generateResumeHash,
    isCacheValid,
    setCachedPdf
  } = useResume();
  const { checkAIFeature, isModalOpen, modalProps, closeModal } = useSubscriptionModal();
  const [activeTab, setActiveTab] = useState<'preview' | 'ai-insights' | 'ats-analysis' | 'downloads'>('preview');
  const [isJobOptimizationOpen, setIsJobOptimizationOpen] = useState(false);
  const [isATSCheckerOpen, setIsATSCheckerOpen] = useState(false);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [originalResume, setOriginalResume] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(aiData.aiSuggestions || []);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  
  const template = getTemplateById(resume.template) || resumeTemplates[0];
  const currentAtsScore = atsScore || aiData.atsScore;

  const handleATSCheck = async () => {
    setIsATSCheckerOpen(true);
    onATSCheck?.();
  };

  const handleAIImprovement = async (enhancementType: string = 'comprehensive') => {
    try {
      setAiLoading(enhancementType);
      toast.loading('🤖 Initializing Cognitive Enhancement...', { id: 'ai-enhance' });
      setOriginalResume({ ...resume });

      const result = await resumeService.enhanceResumeWithAI(resume, {
        improvementLevel: enhancementType as 'basic' | 'comprehensive' | 'expert'
      });
      
      setEnhancementResult(result);
      updateAIData({ lastEnhanced: new Date().toISOString(), enhancementType, qualityScore: result.qualityScore.after });
      
      toast.success('🤖 Synthesis complete. Optimized layer applied.', { id: 'ai-enhance' });
      setShowEnhancementModal(true);
    } catch (error) {
      toast.error('Failed to initialize AI layer.', { id: 'ai-enhance' });
    } finally {
      setAiLoading(null);
    }
  };

  const tabs = [
    { id: 'preview', label: 'Architecture', icon: EyeIcon },
    { id: 'ai-insights', label: 'Intelligence', icon: SparklesIcon },
    { id: 'ats-analysis', label: 'Validation', icon: ShieldCheckIcon },
    { id: 'downloads', label: 'Deployment', icon: ArrowDownTrayIcon }
  ];

  return (
    <div className="space-y-8">
      {/* --- TAB NAVIGATION --- */}
      <div className="flex flex-wrap gap-2 bg-surface-50 border border-surface-200 p-2 rounded-2xl shadow-inner max-w-fit mx-auto md:mx-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-brand-blue shadow-lg border border-surface-200'
                : 'text-text-tertiary hover:text-brand-dark hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT AREA --- */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'preview' && (
              <div className="relative group">
                <div className="absolute -inset-4 bg-brand-blue/[0.02] rounded-[3rem] -z-10 blur-xl group-hover:bg-brand-blue/[0.04] transition-colors duration-700" />
                <PDFPreview 
                  pdfUrl={isCacheValid(generateResumeHash()) ? aiData.cachedPdfUrl : null}
                  pdfBlob={aiData.pdfBlob}
                  templateId={templateId || resume.template}
                  resumeData={resume}
                  title="Architecture Deployment Preview"
                  className="w-full rounded-[2.5rem] shadow-2xl border border-surface-200 overflow-hidden"
                  onPdfGenerated={(url, blob) => setCachedPdf(url, generateResumeHash(), blob)}
                />
                {aiGenerated && (
                  <div className="absolute top-8 right-8 bg-brand-success/10 border border-brand-success/20 backdrop-blur-md rounded-xl px-4 py-2 flex items-center gap-2 z-20 shadow-xl animate-pulse">
                    <SparklesIcon className="w-4 h-4 text-brand-success" />
                    <span className="text-[10px] font-black text-brand-success uppercase tracking-widest">Optimized Layer Active</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai-insights' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-surface-200 p-10 rounded-[2.5rem] shadow-sm space-y-8">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-6 shadow-inner">
                      <CpuChipIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-brand-dark tracking-tight">Intelligence Console.</h3>
                    <p className="text-sm font-bold text-text-secondary opacity-70">Execute AI-driven trajectory optimizations.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'summary', title: 'Smart Abstract', icon: SparklesIcon, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
                      { id: 'jobOptimization', title: 'Role Calibration', icon: ArrowPathIcon, color: 'text-brand-success', bg: 'bg-brand-success/10' },
                      { id: 'comprehensive', title: 'Full Architecture Sync', icon: BeakerIcon, color: 'text-brand-orange', bg: 'bg-brand-orange/10' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => handleAIImprovement(f.id)}
                        disabled={!!aiLoading}
                        className="p-6 bg-surface-50 border border-surface-200 rounded-[1.5rem] flex items-center justify-between group hover:border-brand-blue/30 hover:bg-white transition-all shadow-sm hover:shadow-lg disabled:opacity-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${f.bg} ${f.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <f.icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black text-brand-dark uppercase tracking-widest">{f.title}</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-text-tertiary group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-brand-dark rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.15),transparent_60%)]" />
                  <div className="relative z-10 space-y-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-blue">
                      <LightBulbIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-display font-black tracking-tight">Strategic Protocols.</h3>
                    <div className="space-y-4">
                      {aiSuggestions.map((s, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 flex-shrink-0" />
                          <p className="text-sm font-bold text-surface-300 leading-relaxed">{s}</p>
                        </div>
                      ))}
                      {aiSuggestions.length === 0 && (
                        <p className="text-sm font-bold text-surface-400 italic">Initialize analyzer to receive strategic directives.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ats-analysis' && (
              <div className="bg-white border border-surface-200 rounded-[3rem] p-12 md:p-20 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
                <div className="relative z-10 text-center max-w-2xl mx-auto space-y-10">
                  <div className="w-20 h-20 rounded-[2rem] bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto shadow-sm animate-float">
                    <ShieldCheckIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-display font-black text-brand-dark tracking-tighter leading-none">Institutional <br />ATS Validation.</h3>
                    <p className="text-lg text-text-secondary font-bold opacity-70">Execute a deep-scan against 200+ global parsing protocols to ensure zero-loss deployment.</p>
                  </div>
                  <button 
                    onClick={handleATSCheck}
                    className="btn-primary px-12 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 transition-all active:scale-95"
                  >
                    Initialize Validation Scan
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="bg-white border border-surface-200 rounded-[3rem] p-10 shadow-sm">
                <ResumeDownloadManager 
                  resumeData={resume} 
                  templateId={templateId}
                  isLatexTemplate={isLatexTemplate}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --- QUICK ACTION BAR --- */}
      <div className="bg-white border border-surface-200 p-6 rounded-[2.5rem] shadow-lg relative overflow-hidden group">
        <div className="absolute inset-0 bg-brand-blue/[0.01] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-brand-success/5 border border-brand-success/20 rounded-xl">
              <CheckCircleIcon className="w-5 h-5 text-brand-success" />
              <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Logic Integrity Verified</span>
            </div>
            {currentAtsScore && (
              <div className="flex items-center gap-3 px-4 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-xl">
                <ChartBarIcon className="w-5 h-5 text-brand-blue" />
                <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">ATS INDEX: {currentAtsScore}%</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setActiveTab('downloads')}
              className="px-6 py-3 rounded-xl border-2 border-surface-200 text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-surface-50 transition-all shadow-sm"
            >
              Rapid Export
            </button>
            <button 
              onClick={() => setActiveTab('ai-insights')}
              className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 active:scale-95 transition-all"
            >
              Initialize AI Layer
            </button>
            <button 
              onClick={() => setShowCoverLetterModal(true)}
              className="px-6 py-3 rounded-xl bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Generate Correspondence
            </button>
          </div>
        </div>
      </div>

      <JobOptimizationModal
        isOpen={isJobOptimizationOpen}
        onClose={() => setIsJobOptimizationOpen(false)}
        resumeData={resume}
        onOptimize={(optimizedResume) => {
          updateResumeData(optimizedResume);
          onResumeUpdate?.(optimizedResume);
          setIsJobOptimizationOpen(false);
          toast.success('System: Architecture optimized for target node.');
        }}
      />

      <ATSCompatibilityChecker
        isOpen={isATSCheckerOpen}
        onClose={() => setIsATSCheckerOpen(false)}
        resumeData={resume}
        onResumeUpdate={(updatedResume) => {
          updateResumeData(updatedResume);
          onResumeUpdate?.(updatedResume);
        }}
      />

      <EnhancementFeedbackModal
        isOpen={showEnhancementModal}
        onClose={() => setShowEnhancementModal(false)}
        result={enhancementResult}
        onApplyChanges={() => {
          updateResumeData(enhancementResult.optimizedResume || enhancementResult.enhancedResume);
          onResumeUpdate?.(enhancementResult.optimizedResume || enhancementResult.enhancedResume);
          updateAIData({ ...aiData, isEnhanced: true, lastApplied: new Date().toISOString() });
          toast.success('✅ optimized Layer Applied Successfully.');
          setShowEnhancementModal(false);
        }}
        onViewComparison={() => {
          setShowComparison(true);
          setShowEnhancementModal(false);
        }}
      />

      <CoverLetterIntegration
        resume={resume}
        isOpen={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
      />

      <SubscriptionModal isOpen={isModalOpen} onClose={closeModal} {...modalProps} />
    </div>
  );
}