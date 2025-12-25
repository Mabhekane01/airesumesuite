import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { useFormValidation } from '../../hooks/useFormValidation';
import { AutoSaveIndicator } from '../../components/ui/AutoSaveIndicator';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect, ValidatedDateInput } from '../../components/forms/ValidatedInput';
import { JobTitleInput, CompanyInput, LocationInput, JobSourceInput, ApplicationMethodInput, PriorityInput } from '../../components/forms/SpecializedInputs';
import { EnhancedSalaryInput } from '../../components/forms/EnhancedSalaryInput';
import ResumeSelector from '../../components/career-coach/ResumeSelector';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  StarIcon,
  LinkIcon,
  UserIcon,
  SparklesIcon,
  RocketLaunchIcon,
  CommandLineIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';
import { ResumeData } from '../../services/resumeService';
import AIAnalysisModal from '../../components/ui/AIAnalysisModal';
import { motion, AnimatePresence } from 'framer-motion';

interface JobApplicationForm {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl?: string;
  jobSource: string;
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  compensation: {
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
      period: string;
    };
    benefits?: string[];
  };
  applicationMethod: string;
  priority: string;
  documentsUsed?: {
    resumeId?: string;
    resumeContent?: string;
    selectedResume?: ResumeData;
  };
  applicationStrategy: {
    whyInterested: string;
    keySellingPoints: string[];
    uniqueValueProposition: string;
  };
}

const initialFormData: JobApplicationForm = {
    jobTitle: '',
    companyName: '',
    jobDescription: '',
    jobUrl: '',
    jobSource: 'manual',
    jobLocation: { city: '', state: '', country: 'United States', remote: false, hybrid: false },
    compensation: { salaryRange: { min: 0, max: 0, currency: 'USD', period: 'yearly' }, benefits: [] },
    applicationMethod: 'online',
    priority: 'medium',
    applicationStrategy: { whyInterested: '', keySellingPoints: [], uniqueValueProposition: '' },
};

export default function CreateJobApplication() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'analyzing' | 'complete' | 'error'>('analyzing');
  const [matchScore, setMatchScore] = useState<number | undefined>();

  const {
    data: formData,
    updateData: setFormData,
    clearSavedData,
    handleSubmit: persistentSubmit,
    isRestored,
    lastSaved,
    isDirty
  } = useFormPersistence(initialFormData, {
    key: 'job_application_form',
    debounceMs: 1000,
    clearOnSubmit: true,
    onRestore: () => setShowRestoreDialog(true)
  });

  const [validationState, validationActions] = useFormValidation({ validateOnChange: true });

  const updateFormData = (field: string, value: any) => setFormData({ ...formData, [field]: value });
  const updateNestedFormData = (parent: string, field: string, value: any) => setFormData({ ...formData, [parent]: { ...formData[parent as keyof JobApplicationForm], [field]: value } });

  const addSellingPoint = () => {
    if (newSellingPoint.trim()) {
      setFormData({ applicationStrategy: { ...formData.applicationStrategy, keySellingPoints: [...formData.applicationStrategy.keySellingPoints, newSellingPoint.trim()] } });
      setNewSellingPoint('');
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({ compensation: { ...formData.compensation, benefits: [...(formData.compensation.benefits || []), newBenefit.trim()] } });
      setNewBenefit('');
    }
  };

  const handleSubmit = persistentSubmit(async () => {
    const isValid = await validationActions.validateForm(formData);
    if (!isValid) {
      toast.error('Protocol Violation: Resolve validation errors.');
      return;
    }

    try {
      setLoading(true);
      const hasResumeData = formData.documentsUsed?.resumeId || formData.documentsUsed?.resumeContent;
      const hasJobDescription = formData.jobDescription && formData.jobDescription.length >= 50;
      
      if (hasResumeData && hasJobDescription) {
        setShowAIAnalysis(true);
        setAnalysisStep('analyzing');
      }

      const response = await jobApplicationAPI.createApplication(formData);
      if (response.success) {
        const score = response.data?.application.metrics?.applicationScore;
        if (showAIAnalysis && score) {
          setMatchScore(score);
          setAnalysisStep('complete');
          setTimeout(() => navigate('/dashboard/applications'), 3000);
        } else {
          toast.success('Architecture deployed successfully.');
          navigate('/dashboard/applications');
        }
      }
    } catch (error) {
      setAnalysisStep('error');
      toast.error('Deployment failed.');
    } finally {
      setLoading(false);
    }
  });

  const totalSteps = 5;

  const renderStep1 = () => (
    <div className="space-y-8 animate-slide-up-soft">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-brand-dark tracking-tight">Deployment Parameters.</h3>
        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Base identification data</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JobTitleInput name="jobTitle" label="Target Role" value={formData.jobTitle} onChange={(v) => updateFormData('jobTitle', v)} required />
        <CompanyInput name="companyName" label="Host Entity" value={formData.companyName} onChange={(v) => updateFormData('companyName', v)} required />
        <JobSourceInput name="jobSource" label="Deployment Source" value={formData.jobSource} onChange={(v) => updateFormData('jobSource', v)} />
        <ValidatedInput name="jobUrl" label="Reference URL" type="url" value={formData.jobUrl} onChange={(v) => updateFormData('jobUrl', v)} placeholder="https://..." />
      </div>
      <div className="pt-4 border-t border-surface-100">
        <ValidatedTextarea name="jobDescription" label="Job Architecture (Description)" value={formData.jobDescription} onChange={(v) => updateFormData('jobDescription', v)} rows={8} required placeholder="Paste full technical specifications..." />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-slide-up-soft text-center md:text-left">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-brand-dark tracking-tight">Identity Mapping.</h3>
        <p className="text-sm font-bold text-text-secondary opacity-70">Synchronize your professional DNA with this deployment node.</p>
      </div>
      <div className="bg-surface-50 border border-surface-200 rounded-[2rem] p-8 shadow-inner relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
          <DocumentTextIcon className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <ResumeSelector 
            onSelectResume={(resume) => {
              setFormData({ ...formData, documentsUsed: { resumeId: resume._id, resumeContent: JSON.stringify(resume), selectedResume: resume } });
              toast.success("Identity Layer Active.");
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-slide-up-soft">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-brand-dark tracking-tight">Logistics & Yield.</h3>
        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Geographic and financial calibration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LocationInput name="city" type="city" label="Node City" value={formData.jobLocation.city || ''} onChange={(v) => updateNestedFormData('jobLocation', 'city', v)} />
        <LocationInput name="state" type="state" label="Node State" value={formData.jobLocation.state || ''} onChange={(v) => updateNestedFormData('jobLocation', 'state', v)} />
        <LocationInput name="country" type="country" label="Node Country" value={formData.jobLocation.country || ''} onChange={(v) => updateNestedFormData('jobLocation', 'country', v)} />
      </div>
      <div className="flex gap-4 p-4 bg-surface-50 border border-surface-200 rounded-2xl">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input type="checkbox" checked={formData.jobLocation.remote} onChange={(e) => updateNestedFormData('jobLocation', 'remote', e.target.checked)} className="w-5 h-5 rounded-lg border-surface-300 text-brand-blue" />
          <span className="text-sm font-bold text-text-secondary group-hover:text-brand-dark transition-colors">Remote Protocol</span>
        </label>
      </div>
      <div className="pt-4 border-t border-surface-100">
        <EnhancedSalaryInput name="compensation" label="Yield Projection" minValue={formData.compensation.salaryRange?.min || 0} maxValue={formData.compensation.salaryRange?.max || 0} currency={formData.compensation.salaryRange?.currency || 'USD'} period={formData.compensation.salaryRange?.period || 'yearly'} onMinChange={(v) => updateNestedFormData('compensation', 'salaryRange', { ...formData.compensation.salaryRange, min: v })} onMaxChange={(v) => updateNestedFormData('compensation', 'salaryRange', { ...formData.compensation.salaryRange, max: v })} onCurrencyChange={(v) => updateNestedFormData('compensation', 'salaryRange', { ...formData.compensation.salaryRange, currency: v })} onPeriodChange={(v) => updateNestedFormData('compensation', 'salaryRange', { ...formData.compensation.salaryRange, period: v })} />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-slide-up-soft">
      {/* Restore Dialog */}
      <AnimatePresence>
        {showRestoreDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRestoreDialog(false)} className="absolute inset-0 bg-brand-dark/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white border border-surface-200 p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto mb-6 shadow-inner">
                <CommandLineIcon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-brand-dark tracking-tighter mb-2">Sync Draft?</h3>
              <p className="text-text-secondary font-bold mb-8 opacity-80">Previous session data detected in the cache layer. Re-initialize?</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { clearSavedData(); setFormData(initialFormData); setShowRestoreDialog(false); }} className="px-6 py-3 rounded-xl border-2 border-surface-200 text-[10px] font-black uppercase tracking-widest hover:bg-surface-50 transition-all">Flush Cache</button>
                <button onClick={() => setShowRestoreDialog(false)} className="btn-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg">Restore Node</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/dashboard/applications')} className="w-12 h-12 rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue shadow-sm group">
            <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl md:text-4xl font-display font-black text-brand-dark tracking-tighter leading-none">Initialization Terminal.</h1>
              <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />
            </div>
            <p className="text-lg text-text-secondary font-bold opacity-70">Register a new recruitment architecture.</p>
          </div>
        </div>
      </div>

      {/* Progress Architecture */}
      <div className="bg-white border border-surface-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
                <RocketLaunchIcon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-widest">Protocol Stage 0{currentStep}</h3>
            </div>
            <span className="text-xs font-black text-brand-blue bg-brand-blue/5 px-3 py-1 rounded-lg border border-brand-blue/10 uppercase tracking-widest">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          
          <div className="flex gap-2 mb-12">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i + 1 <= currentStep ? 'bg-brand-blue shadow-[0_0_10px_rgba(26,145,240,0.4)]' : 'bg-surface-100'}`} />
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="min-h-[400px]">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && <div className="animate-slide-up-soft space-y-8"><div className="space-y-2"><h3 className="text-2xl font-black text-brand-dark tracking-tight">Strategic Metadata.</h3><p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Methodology and priority levels</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><ApplicationMethodInput name="method" label="Protocol" value={formData.applicationMethod} onChange={(v) => updateFormData('applicationMethod', v)} /><PriorityInput name="priority" label="Urgency" value={formData.priority} onChange={(v) => updateFormData('priority', v)} /></div></div>}
              {currentStep === 5 && <div className="animate-slide-up-soft space-y-8"><div className="space-y-2"><h3 className="text-2xl font-black text-brand-dark tracking-tight">Directives.</h3><p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Mission strategy and value props</p></div><div className="space-y-6"><ValidatedTextarea name="why" label="Deployment Motivation" value={formData.applicationStrategy.whyInterested} onChange={(v) => updateNestedFormData('applicationStrategy', 'whyInterested', v)} rows={4} placeholder="Protocol rationale..." /></div></div>}
            </div>

            <div className="mt-12 pt-8 border-t border-surface-100 flex items-center justify-between">
              <button type="button" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-dark disabled:opacity-30 transition-all flex items-center gap-2">
                ← Previous Stage
              </button>
              
              {currentStep < totalSteps ? (
                <button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="btn-primary px-10 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-3 group">
                  Next Stage <ChevronRightIcon className="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="btn-primary px-12 py-4 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-3">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RocketLaunchIcon className="w-5 h-5" />}
                  Finalize Deployment
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <AIAnalysisModal isOpen={showAIAnalysis} onClose={() => setShowAIAnalysis(false)} jobTitle={formData.jobTitle} companyName={formData.companyName} analysisStep={analysisStep} matchScore={matchScore} />
    </div>
  );
}