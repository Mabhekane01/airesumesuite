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
  ChevronRightIcon,
  EyeIcon
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
    <div className="space-y-10">
      {/* --- TAB NAVIGATION --- */}
      <div className="flex flex-wrap gap-2 bg-surface-50/80 backdrop-blur-md border border-surface-200 p-1.5 rounded-[2rem] shadow-inner max-w-fit mx-auto md:mx-0 relative z-20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[1.7rem] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-brand-blue shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border border-surface-100 transform scale-105'
                : 'text-text-tertiary hover:text-brand-dark hover:bg-white/60'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT AREA --- */}
      <div className="relative min-h-[600px]">
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
                <div className="absolute -inset-6 bg-brand-blue/[0.03] rounded-[3.5rem] -z-10 blur-2xl group-hover:bg-brand-blue/[0.05] transition-colors duration-700" />
                <PDFPreview 
                  pdfUrl={isCacheValid(generateResumeHash()) ? aiData.cachedPdfUrl : null}
                  pdfBlob={aiData.pdfBlob}
                  templateId={templateId || resume.template}
                  resumeData={resume}
                  title="Architecture Deployment Preview"
                  className="w-full rounded-[2.5rem] shadow-2xl border border-surface-200 overflow-hidden bg-white"
                  onPdfGenerated={(url, blob) => setCachedPdf(url, generateResumeHash(), blob)}
                />
                {aiGenerated && (
                  <div className="absolute top-8 right-8 bg-white/80 backdrop-blur-md border border-brand-success/20 rounded-xl px-4 py-2.5 flex items-center gap-2.5 z-20 shadow-xl animate-pulse ring-1 ring-brand-success/10">
                    <SparklesIcon className="w-4 h-4 text-brand-success stroke-[2.5px]" />
                    <span className="text-[10px] font-black text-brand-success uppercase tracking-[0.2em]">Optimized Layer Active</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai-insights' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-surface-200 p-10 rounded-[3rem] shadow-lg space-y-10 relative overflow-hidden group hover:border-brand-blue/20 transition-colors duration-500">
                  <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
                  
                  <div className="relative z-10 space-y-4">
                    <div className="w-14 h-14 rounded-[1.2rem] bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center text-brand-blue mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      <CpuChipIcon className="w-7 h-7 stroke-[1.5px]" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-display font-black text-brand-dark tracking-tight">Intelligence Console.</h3>
                      <p className="text-sm font-medium text-text-secondary opacity-80 leading-relaxed">Execute AI-driven trajectory optimizations to maximize impact.</p>
                    </div>
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-1 gap-4">
                    {[
                      { id: 'summary', title: 'Smart Abstract', icon: SparklesIcon, color: 'text-brand-blue', bg: 'bg-brand-blue/10', border: 'border-brand-blue/20' },
                      { id: 'jobOptimization', title: 'Role Calibration', icon: ArrowPathIcon, color: 'text-brand-success', bg: 'bg-brand-success/10', border: 'border-brand-success/20' },
                      { id: 'comprehensive', title: 'Full Architecture Sync', icon: BeakerIcon, color: 'text-brand-orange', bg: 'bg-brand-orange/10', border: 'border-brand-orange/20' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => handleAIImprovement(f.id)}
                        disabled={!!aiLoading}
                        className="p-5 bg-surface-50 border border-surface-200 rounded-[1.5rem] flex items-center justify-between group/btn hover:border-brand-blue/30 hover:bg-white hover:shadow-xl hover:shadow-brand-blue/5 transition-all duration-300 disabled:opacity-50 active:scale-95"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl ${f.bg} ${f.color} border ${f.border} flex items-center justify-center group-hover/btn:scale-110 transition-transform duration-300`}>
                            <f.icon className="w-6 h-6 stroke-[2px]" />
                          </div>
                          <span className="text-xs font-black text-brand-dark uppercase tracking-[0.15em]">{f.title}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white border border-surface-200 flex items-center justify-center group-hover/btn:bg-brand-blue group-hover/btn:border-brand-blue transition-colors">
                          <ChevronRightIcon className="w-4 h-4 text-text-tertiary group-hover/btn:text-white transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-brand-dark rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.3),transparent_60%)] opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-purple/20 rounded-full blur-3xl opacity-40" />
                  
                  <div className="relative z-10 space-y-10">
                    <div className="w-14 h-14 rounded-[1.2rem] bg-white/10 border border-white/10 flex items-center justify-center text-brand-blue backdrop-blur-md">
                      <LightBulbIcon className="w-7 h-7 stroke-[1.5px]" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-display font-black tracking-tight text-white">Strategic Protocols.</h3>
                      <p className="text-sm font-medium text-white/60">Live feedback from the neural engine.</p>
                    </div>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-dark">
                      {aiSuggestions.map((s, i) => (
                        <div key={i} className="flex gap-5 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-brand-blue mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                          <p className="text-sm font-medium text-surface-200 leading-relaxed">{s}</p>
                        </div>
                      ))}
                      {aiSuggestions.length === 0 && (
                        <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center bg-white/5">
                          <p className="text-sm font-bold text-surface-400 italic">Initialize analyzer to receive strategic directives.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ats-analysis' && (
              <div className="bg-white border border-surface-200 rounded-[3rem] p-12 md:p-24 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.2]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-12">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-white border border-surface-100 flex items-center justify-center text-brand-blue mx-auto shadow-xl animate-float ring-8 ring-brand-blue/5">
                    <ShieldCheckIcon className="w-12 h-12 stroke-[1.5px]" />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-4xl md:text-5xl font-display font-black text-brand-dark tracking-tighter leading-none">
                      Institutional <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">ATS Validation.</span>
                    </h3>
                    <p className="text-xl text-text-secondary font-medium max-w-xl mx-auto leading-relaxed">
                      Execute a deep-scan against 200+ global parsing protocols to ensure zero-loss deployment across enterprise systems.
                    </p>
                  </div>
                  <button 
                    onClick={handleATSCheck}
                    className="btn-primary px-12 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-blue/20 transition-all hover:scale-105 active:scale-95 group/btn"
                  >
                    <span className="group-hover/btn:animate-pulse">Initialize Validation Scan</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-14 shadow-lg">
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
      <div className="bg-white border border-surface-200 p-6 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-brand-blue/[0.02] pointer-events-none group-hover:bg-brand-blue/[0.04] transition-colors duration-500" />
        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-brand-success/5 border border-brand-success/10 rounded-2xl shadow-sm">
              <CheckCircleIcon className="w-5 h-5 text-brand-success stroke-[2.5px]" />
              <span className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em]">Logic Integrity Verified</span>
            </div>
            {currentAtsScore && (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl shadow-sm">
                <ChartBarIcon className="w-5 h-5 text-brand-blue stroke-[2.5px]" />
                <span className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em]">ATS INDEX: {currentAtsScore}%</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4">
            <button 
              onClick={() => setActiveTab('downloads')}
              className="px-8 py-3.5 rounded-xl border-2 border-surface-200 text-[10px] font-black uppercase tracking-[0.15em] text-brand-dark hover:border-brand-dark hover:bg-surface-50 transition-all shadow-sm active:scale-95"
            >
              Rapid Export
            </button>
            <button 
              onClick={() => setActiveTab('ai-insights')}
              className="btn-primary px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] shadow-xl shadow-brand-blue/20 active:scale-95 transition-all hover:-translate-y-1"
            >
              Initialize AI Layer
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

      <SubscriptionModal isOpen={isModalOpen} onClose={closeModal} {...modalProps} />
    </div>
  );
}