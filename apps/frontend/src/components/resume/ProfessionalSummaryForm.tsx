import React, { useState } from 'react';
import { SparklesIcon, ArrowPathIcon, CheckCircleIcon, CommandLineIcon, BoltIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useResume } from '../../contexts/ResumeContext';
import { resumeService } from '../../services/resumeService';
import PremiumFeatureGate from '../subscription/PremiumFeatureGate'; // Changed import
import AILoadingOverlay from '../ui/AILoadingOverlay';
import { useAIProgress } from '../../hooks/useAIProgress';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function ProfessionalSummaryForm() {
  const { resumeData, handleDataChange, updateAIData } = useResume();
  const { professionalSummary } = resumeData;
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const aiProgress = useAIProgress('professional-summary');

  const updateSummary = (newSummary: string) => handleDataChange('professionalSummary', newSummary);

  const generateAISummary = async () => {
    if (!resumeData?.workExperience?.length && !resumeData?.skills?.length) {
      toast.error('Data Conflict: Populate experience nodes first.');
      return;
    }
    aiProgress.startProgress();
    try {
      const options = await resumeService.generateProfessionalSummary(resumeData.id, resumeData);
      aiProgress.completeProgress();
      setGeneratedOptions(Array.isArray(options) ? options : [options]);
      setShowOptions(true);
      toast.success('Synthesis Complete. New options deployed.');
    } catch (error) {
      aiProgress.cancelProgress();
      toast.error('Synthesis Failure.');
    }
  };

  const selectAIOption = (option: string) => {
    updateSummary(option);
    // Track AI usage for subscription logic
    updateAIData({ wasSummaryGenerated: true });
    setShowOptions(false);
    toast.success('Architecture Updated.');
  };

  const wordCount = professionalSummary?.split(/\s+/).filter(word => word.length > 0).length || 0;
  const isOptimalLength = wordCount >= 25 && wordCount <= 60;

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Executive Abstract.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          High-impact distillation of your professional trajectory and core value proposition.
        </p>
      </div>

      {/* Manual Input Console (Unrestricted) */}
      <div className="space-y-4">
        <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Manual Deployment</label>
        <textarea
          value={professionalSummary || ''}
          onChange={(e) => updateSummary(e.target.value)}
          placeholder="Write your professional narrative or execute AI synthesis above..."
          rows={6}
          className="input-resume py-6 rounded-[2rem] text-base font-bold leading-relaxed focus:border-brand-blue/30 transition-all shadow-inner placeholder:italic"
        />

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOptimalLength ? 'bg-brand-success' : 'bg-brand-orange'}`} />
              <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{wordCount} / 60 Words</span>
            </div>
            {isOptimalLength && (
              <div className="flex items-center gap-2 text-brand-success">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Optimal Length Verified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Synthesis Layer (Now Unrestricted for preview) */}
      <div className="bg-white border border-surface-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner group-hover:rotate-6 transition-transform duration-500">
                <BoltIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-brand-dark tracking-tight">Cognitive Synthesis.</h3>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-none">AI Optimization Layer Active (Free Preview)</p>
              </div>
            </div>
            <button
              onClick={generateAISummary}
              disabled={aiProgress.isLoading}
              className="btn-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20"
            >
              {aiProgress.isLoading ? 'Synthesizing...' : 'Initialize AI Synthesis'}
            </button>
          </div>

          <AnimatePresence>
            {showOptions && generatedOptions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-8 border-t border-surface-100"
              >
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">Detected Optimizations:</p>
                <div className="grid grid-cols-1 gap-4">
                  {generatedOptions.map((option, index) => (
                    <div
                      key={index}
                      className="group p-6 bg-surface-50 border border-surface-200 rounded-[1.5rem] cursor-pointer hover:border-brand-blue/30 hover:bg-white hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                      onClick={() => selectAIOption(option)}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <p className="text-sm font-bold text-text-secondary leading-relaxed group-hover:text-brand-dark transition-colors">
                          {option}
                        </p>
                        <div className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-text-tertiary group-hover:text-brand-blue group-hover:border-brand-blue/30 transition-all opacity-0 group-hover:opacity-100">
                          <CheckCircleIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Logic Guidelines */}
      <div className="grid md:grid-cols-2 gap-8 pt-10 border-t border-surface-100">
        <div className="p-8 bg-brand-success/[0.03] border border-brand-success/10 rounded-[2rem] space-y-4">
          <h4 className="text-[10px] font-black text-brand-success uppercase tracking-[0.2em] flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" /> Recommended Vectors
          </h4>
          <ul className="text-xs font-bold text-text-secondary space-y-3 leading-relaxed">
            <li>• Current architecture title & deployment duration.</li>
            <li>• High-yield technical proficiency tags.</li>
            <li>• Quantifiable mission impact & data yield.</li>
            <li>• Core professional value proposition.</li>
          </ul>
        </div>

        <div className="p-8 bg-red-50/50 border border-red-100 rounded-[2rem] space-y-4">
          <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <CommandLineIcon className="w-4 h-4" /> Logic Constraints
          </h4>
          <ul className="text-xs font-bold text-text-secondary space-y-3 leading-relaxed">
            <li>• Generic behavioral descriptors.</li>
            <li>• Non-quantifiable objective statements.</li>
            <li>• Institutional jargon without context.</li>
            <li>• Personal metadata (age, marital status).</li>
          </ul>
        </div>
      </div>

      <AILoadingOverlay
        isVisible={aiProgress.isLoading}
        title="🤖 Synthesizing Narrative"
        description="Executing cognitive mapping protocols to generate high-fidelity summary nodes."
        progress={aiProgress.progress}
        currentStep={aiProgress.currentStep}
        estimatedTime={aiProgress.estimatedTime}
        onCancel={aiProgress.cancelProgress}
      />
    </div>
  );
}
