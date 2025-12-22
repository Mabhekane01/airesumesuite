import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  SparklesIcon,
  LinkIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';
import PremiumFeatureGate from '../subscription/PremiumFeatureGate'; // Changed import
import { useAuthStore } from '../../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';

interface CoverLetterIntegrationProps {
  resume: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CoverLetterIntegration({ 
  resume, 
  isOpen, 
  onClose 
}: CoverLetterIntegrationProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState<'method' | 'input' | 'generating'>('method');
  const [method, setMethod] = useState<'quick' | 'detailed'>('quick');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickGenerate = async () => {
    if (!jobTitle || !companyName) {
      toast.error('Data Incomplete: Job title and company name required.');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      toast.loading('🤖 Initializing Cognitive Correspondence...', { id: 'cover-letter-gen' });
      
      const coverLetter = await coverLetterService.createFromResumeBuilder({
        resumeData: resume,
        jobTitle,
        companyName,
        jobDescription,
        jobUrl,
        tone: 'professional'
      });

      toast.success('✨ Correspondence Generated.', { id: 'cover-letter-gen' });
      
      navigate('/cover-letter/intelligent-builder', {
        state: {
          resumeData: resume,
          coverLetter,
          jobTitle,
          companyName,
          jobDescription,
          jobUrl
        }
      });
      
      onClose();
    } catch (error) {
      toast.error('Generation Protocol Failed.', { id: 'cover-letter-gen' });
      setStep('method');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetailedBuilder = () => {
    navigate('/cover-letter/intelligent-builder', {
      state: {
        resumeData: resume,
        fromResumeBuilder: true
      }
    });
    onClose();
  };

  const handleJobUrlAnalysis = async () => {
    if (!jobUrl) return;

    setIsGenerating(true);
    try {
      const jobData = await coverLetterService.scrapeJobPosting(jobUrl);
      setJobTitle(jobData.title);
      setCompanyName(jobData.company);
      setJobDescription(jobData.description);
      toast.success('Target Node Analyzed.');
    } catch (error) {
      toast.error('Failed to analyze target node. Verify URL.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMethodSelection = (isAccessGranted: boolean, openUpgradeModal: () => void) => (
    <div className="space-y-6">
      <div className="text-center">
        <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-brand-blue opacity-50" />
        <h3 className="text-xl font-black text-brand-dark mb-2">
          Initialize Correspondence
        </h3>
        <p className="text-text-secondary font-bold opacity-70">
          Utilize your architecture manifest to generate tailored correspondence.
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={isAccessGranted ? () => { setMethod('quick'); setStep('input'); } : openUpgradeModal}
          className={`p-6 border-2 rounded-[1.5rem] text-left transition-colors group relative overflow-hidden ${
            isAccessGranted 
              ? 'border-surface-200 hover:border-brand-blue/30 bg-white hover:shadow-lg' 
              : 'border-brand-orange/30 bg-brand-orange/[0.03] hover:border-brand-orange/50 cursor-not-allowed'
          }`}
        >
            {!isAccessGranted && (
              <div className="absolute inset-0 bg-brand-dark/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <LockClosedIcon className="w-8 h-8 text-brand-orange" />
              </div>
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center">
                <SparklesIcon className={`w-8 h-8 mr-4 ${isAccessGranted ? 'text-brand-blue' : 'text-brand-orange'}`} />
                <div>
                  <h4 className="font-black text-brand-dark text-lg mb-1">
                    Quick AI Protocol
                  </h4>
                  <p className="text-sm font-bold text-text-secondary opacity-80">
                    Rapid synthesis with minimal parameter input.
                  </p>
                </div>
              </div>
              <ArrowRightIcon className={`w-5 h-5 text-text-tertiary transition-colors ${
                isAccessGranted ? 'group-hover:text-brand-blue' : ''
              }`} />
            </div>
            <div className={`mt-4 pt-4 border-t border-surface-100 flex items-center text-sm ${isAccessGranted ? 'text-brand-success' : 'text-brand-orange'}`}>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              <span>
                {isAccessGranted 
                  ? 'Architecture auto-integrated • Cognitive synthesis • Rapid deployment'
                  : 'Enterprise Feature • Advanced AI • Optimized results'
                }
              </span>
            </div>
          </button>

        <button
          onClick={isAccessGranted ? handleDetailedBuilder : openUpgradeModal}
          className={`p-6 border-2 rounded-[1.5rem] text-left transition-colors group relative overflow-hidden ${
            isAccessGranted 
              ? 'border-surface-200 hover:border-brand-blue/30 bg-white hover:shadow-lg' 
              : 'border-brand-orange/30 bg-brand-orange/[0.03] hover:border-brand-orange/50 cursor-not-allowed'
          }`}
        >
          {!isAccessGranted && (
              <div className="absolute inset-0 bg-brand-dark/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <LockClosedIcon className="w-8 h-8 text-brand-orange" />
              </div>
            )}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center">
              <CommandLineIcon className={`w-8 h-8 mr-4 ${isAccessGranted ? 'text-brand-dark' : 'text-brand-orange'}`} />
              <div>
                <h4 className="font-black text-brand-dark text-lg mb-1">
                  Intelligent Builder
                </h4>
                <p className="text-sm font-bold text-text-secondary opacity-80">
                  Advanced cognitive engine with semantic mapping and analysis.
                </p>
              </div>
            </div>
            <ArrowRightIcon className={`w-5 h-5 text-text-tertiary transition-colors ${
              isAccessGranted ? 'group-hover:text-brand-dark' : ''
            }`} />
          </div>
          <div className={`mt-4 pt-4 border-t border-surface-100 flex items-center text-sm ${isAccessGranted ? 'text-brand-blue' : 'text-brand-orange'}`}>
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>
              {isAccessGranted 
                ? 'Multiple AI variations • Match analysis • ATS optimization'
                : 'Enterprise feature • Advanced AI • Semantic precision'
              }
            </span>
          </div>
        </button>
      </div>

      <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-[1.5rem] p-6 text-brand-blue relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(26,145,240,0.05),transparent_70%)]" />
        <div className="flex items-start relative z-10">
          <InformationCircleIcon className="w-5 h-5 text-brand-blue mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h5 className="font-bold mb-1 text-brand-dark">Architecture Integration Protocol</h5>
            <p className="text-sm font-medium opacity-80 leading-relaxed">
              Your primary architecture manifest will be integrated for semantic consistency and optimal targeting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-brand-blue" />
        <h3 className="text-lg font-black text-brand-dark mb-2">
          Rapid Generation Protocol
        </h3>
        <p className="text-text-secondary font-bold opacity-70">
          Provide key target node parameters for immediate AI synthesis.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            label="Target Node URL (Optional)"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="flex-1"
          />
          <div className="pt-6">
            <button
              onClick={handleJobUrlAnalysis}
              disabled={!jobUrl || isGenerating}
              className="px-6 py-3 rounded-xl border border-surface-200 text-text-tertiary text-[10px] font-black uppercase tracking-widest hover:bg-surface-50 transition-all shadow-sm"
            >
              {isGenerating ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Target Role"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Principal Architect"
            required
          />
          <Input
            label="Target Entity"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Global Tech Solutions"
            required
          />
        </div>

        <Textarea
          label="Job Description Manifest (Optional)"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste full job manifest for deep semantic analysis..."
          rows={4}
        />
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep('method')}
          className="px-6 py-3 rounded-xl border border-surface-200 text-text-tertiary text-[10px] font-black uppercase tracking-widest hover:bg-surface-50 transition-all shadow-sm"
        >
          ← Back
        </button>
        
        <button
          onClick={handleQuickGenerate}
          disabled={!jobTitle || !companyName || isGenerating}
          className="btn-primary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Generate Correspondence
        </button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="text-center py-12">
      <div className="animate-spin w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full mx-auto mb-6"></div>
      <h3 className="text-xl font-black text-brand-dark mb-2">
        Synthesizing Correspondence
      </h3>
      <p className="text-text-secondary font-bold opacity-70 mb-4">
        AI is processing your architecture manifest and target node parameters...
      </p>
      <div className="max-w-md mx-auto space-y-2 text-sm text-text-tertiary">
        <div className="flex items-center justify-center">
          <CheckCircleIcon className="w-4 h-4 text-brand-success mr-2" />
          <span>Architecture data integrated</span>
        </div>
        <div className="flex items-center justify-center">
          <CheckCircleIcon className="w-4 h-4 text-brand-success mr-2" />
          <span>Target node protocols analyzed</span>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mr-2"></div>
          <span>Generating semantic content...</span>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Cover Letter"
      size="lg"
    >
      <PremiumFeatureGate 
        feature="AI Cover Letter Generation" 
        description="Synthesize high-fidelity cover letters based on your resume and target job."
        requiresEnterprise={true}
      >
        {(isAccessGranted, openUpgradeModal) => (
          <div className="p-6">
            {step === 'method' && renderMethodSelection(isAccessGranted, openUpgradeModal)}
            {step === 'input' && renderInputStep()}
            {step === 'generating' && renderGeneratingStep()}
          </div>
        )}
      </PremiumFeatureGate>
    </Modal>
  );
}