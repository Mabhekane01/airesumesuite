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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';
import { ResumeData } from '../../services/resumeService';
import AIAnalysisModal from '../../components/ui/AIAnalysisModal';

interface JobApplicationForm {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  jobUrl?: string;
  jobSource: string;
  
  // Location
  jobLocation: {
    city?: string;
    state?: string;
    country?: string;
    remote: boolean;
    hybrid?: boolean;
  };
  
  // Compensation
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
  
  // Documents
  documentsUsed?: {
    resumeId?: string;
    resumeContent?: string;
    selectedResume?: ResumeData;
  };
  
  // Strategy
  applicationStrategy: {
    whyInterested: string;
    keySellingPoints: string[];
    uniqueValueProposition: string;
  };
  
  // Referral
  referralContact?: {
    name: string;
    email?: string;
    relationship: string;
    notes?: string;
  };
}

const JOB_SOURCES = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'company_website', label: 'Company Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'recruiter', label: 'Recruiter' },
];

const APPLICATION_METHODS = [
  { value: 'online', label: 'Online Application' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referral' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'career_fair', label: 'Career Fair' },
  { value: 'networking', label: 'Networking' },
];

const PRIORITY_LEVELS = [
  { value: 'dream_job', label: 'Dream Job', color: 'text-purple-400' },
  { value: 'high', label: 'High Priority', color: 'text-red-400' },
  { value: 'medium', label: 'Medium Priority', color: 'text-yellow-400' },
  { value: 'low', label: 'Low Priority', color: 'text-green-400' },
];

const initialFormData: JobApplicationForm = {
    jobTitle: '',
    companyName: '',
    jobDescription: '',
    jobUrl: '',
    jobSource: 'manual',
    jobLocation: {
      city: '',
      state: '',
      country: 'United States',
      remote: false,
      hybrid: false,
    },
    compensation: {
      salaryRange: {
        min: 0,
        max: 0,
        currency: 'USD',
        period: 'yearly',
      },
      benefits: [],
    },
    applicationMethod: 'online',
    priority: 'medium',
    applicationStrategy: {
      whyInterested: '',
      keySellingPoints: [],
      uniqueValueProposition: '',
    },
};

export default function CreateJobApplication() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  
  // AI Analysis Modal state
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'analyzing' | 'complete' | 'error'>('analyzing');
  const [matchScore, setMatchScore] = useState<number | undefined>();

  // Use form persistence hook
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
    debounceMs: 1000, // Save after 1 second of no changes
    clearOnSubmit: true,
    onRestore: (restoredData) => {
      setShowRestoreDialog(true);
    }
  });

  // Use form validation hook
  const [validationState, validationActions] = useFormValidation({
    validateOnChange: true,
    validateOnBlur: true,
    sanitizeInputs: true,
    debounceMs: 500,
  });

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData({
      ...formData,
      [parent]: {
        ...formData[parent as keyof JobApplicationForm],
        [field]: value
      }
    });
  };

  const addSellingPoint = () => {
    if (newSellingPoint.trim()) {
      setFormData({
        applicationStrategy: {
          ...formData.applicationStrategy,
          keySellingPoints: [...formData.applicationStrategy.keySellingPoints, newSellingPoint.trim()]
        }
      });
      setNewSellingPoint('');
    }
  };

  const removeSellingPoint = (index: number) => {
    setFormData({
      applicationStrategy: {
        ...formData.applicationStrategy,
        keySellingPoints: formData.applicationStrategy.keySellingPoints.filter((_, i) => i !== index)
      }
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        compensation: {
          ...formData.compensation,
          benefits: [...(formData.compensation.benefits || []), newBenefit.trim()]
        }
      });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData({
      compensation: {
        ...formData.compensation,
        benefits: formData.compensation.benefits?.filter((_, i) => i !== index) || []
      }
    });
  };

  const handleSubmit = persistentSubmit(async () => {
    // Validate the entire form before submitting
    const isValid = await validationActions.validateForm(formData);
    
    if (!isValid) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    try {
      setLoading(true);
      
      // Show AI analysis modal if we have resume and job description
      const hasResumeData = formData.documentsUsed?.resumeId || formData.documentsUsed?.resumeContent;
      const hasJobDescription = formData.jobDescription && formData.jobDescription.length >= 50;
      
      if (hasResumeData && hasJobDescription) {
        setShowAIAnalysis(true);
        setAnalysisStep('analyzing');
        setMatchScore(undefined);
      }
      
      // Debug logging
      console.log('🚀 Submitting job application:');
      console.log('   Job:', formData.jobTitle, 'at', formData.companyName);
      console.log('   Resume ID:', formData.documentsUsed?.resumeId || 'MISSING!!!');
      console.log('   Resume Content Length:', formData.documentsUsed?.resumeContent?.length || 0);
      console.log('   Full documentsUsed:', formData.documentsUsed);
      console.log('   ENTIRE FORM DATA:', JSON.stringify(formData, null, 2));

      const response = await jobApplicationAPI.createApplication(formData);
      
      if (response.success) {
        console.log('✅ Application created successfully:', {
          applicationId: response.data?.application._id,
          matchScore: response.data?.application.metrics?.applicationScore
        });
        
        const applicationScore = response.data?.application.metrics?.applicationScore;
        
        if (showAIAnalysis && applicationScore) {
          // Update modal to show completion
          setMatchScore(applicationScore);
          setAnalysisStep('complete');
          
          // Auto-close modal after 3 seconds and navigate
          setTimeout(() => {
            setShowAIAnalysis(false);
            validationActions.clearAllErrors();
            toast.success(`Job application created successfully! AI Match Score: ${applicationScore}%`);
            navigate('/dashboard/applications');
          }, 3000);
        } else {
          validationActions.clearAllErrors();
          toast.success('Job application created successfully!');
          navigate('/dashboard/applications');
        }
      } else {
        if (showAIAnalysis) {
          setAnalysisStep('error');
          setTimeout(() => setShowAIAnalysis(false), 3000);
        }
        toast.error(response.message || 'Failed to create application');
      }
    } catch (error) {
      console.error('❌ Failed to create application:', error);
      
      if (showAIAnalysis) {
        setAnalysisStep('error');
        setTimeout(() => setShowAIAnalysis(false), 3000);
      }
      
      toast.error('Failed to create application. Please try again.');
      throw error; // Re-throw to prevent clearing saved data
    } finally {
      setLoading(false);
    }
  });

  const totalSteps = 5;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Basic Job Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <JobTitleInput
            name="jobTitle"
            label="Job Title"
            value={formData.jobTitle}
            onChange={(value) => updateFormData('jobTitle', value)}
            required
            helpText="Start typing to see common job titles or enter a custom one"
          />
          
          <CompanyInput
            name="companyName"
            label="Company Name"
            value={formData.companyName}
            onChange={(value) => updateFormData('companyName', value)}
            required
            helpText="Start typing to see major companies or enter any company"
          />
          
          <JobSourceInput
            name="jobSource"
            label="Job Source"
            value={formData.jobSource}
            onChange={(value) => updateFormData('jobSource', value)}
            helpText="Where did you discover this job opportunity?"
          />
          
          <ValidatedInput
            name="jobUrl"
            label="Job URL"
            type="url"
            value={formData.jobUrl}
            onChange={(value) => updateFormData('jobUrl', value)}
            placeholder="https://company.com/careers/123"
            helpText="Link to the original job posting"
          />
        </div>
        
        <div className="mt-6">
          <ValidatedTextarea
            name="jobDescription"
            label="Job Description"
            value={formData.jobDescription}
            onChange={(value) => updateFormData('jobDescription', value)}
            rows={6}
            placeholder="Paste the complete job description here for AI analysis..."
            required
            helpText="Include requirements, responsibilities, and company info for better matching"
            maxLength={10000}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">📄 Resume Selection</h3>
        <p className="text-dark-text-secondary mb-6">
          Select the resume you want to use for this application. This will enable AI-powered job matching analysis.
        </p>
        
        <ResumeSelector 
          onSelectResume={(resume) => {
            const resumeContent = JSON.stringify(resume);
            setFormData({
              ...formData,
              documentsUsed: {
                resumeId: resume._id,
                resumeContent,
                selectedResume: resume
              }
            });
            console.log('✅ Resume selected:', {
              resumeId: resume._id,
              resumeTitle: resume.title,
              contentLength: resumeContent.length
            });
          }}
        />
        
        {formData.documentsUsed?.selectedResume && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">
                  Resume Selected: {formData.documentsUsed.selectedResume.title || 'Untitled Resume'}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-green-300">
                <SparklesIcon className="w-3 h-3" />
                <span>AI Ready</span>
              </div>
            </div>
            <p className="text-green-300 text-xs mt-2">
              🤖 AI will analyze this resume against the job description to calculate your match score
            </p>
            <div className="mt-2 text-xs text-green-200 opacity-75">
              Resume ID: {formData.documentsUsed.selectedResume._id?.slice(-8)}
            </div>
          </div>
        )}
        
        {!formData.documentsUsed?.selectedResume && (
          <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-orange-400 text-sm font-medium">⚠️ No Resume Selected</span>
            </div>
            <p className="text-orange-300 text-xs mt-1">
              Select a resume above to enable AI-powered job matching and get your compatibility score
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Location & Compensation</h3>
        
        {/* Location */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-dark-text-secondary mb-3">📍 Job Location</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <LocationInput
              name="city"
              label="City"
              type="city"
              value={formData.jobLocation.city || ''}
              onChange={(value) => updateNestedFormData('jobLocation', 'city', value)}
              helpText="Type to search major cities worldwide"
            />
            
            <LocationInput
              name="state"
              label="State/Province"
              type="state"
              value={formData.jobLocation.state || ''}
              onChange={(value) => updateNestedFormData('jobLocation', 'state', value)}
              helpText="Type to search states/provinces"
            />
            
            <LocationInput
              name="country"
              label="Country"
              type="country"
              value={formData.jobLocation.country || 'United States'}
              onChange={(value) => updateNestedFormData('jobLocation', 'country', value)}
              helpText="Type to search countries"
            />
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6 p-3 bg-dark-secondary/10 rounded-lg border border-dark-border/50">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.jobLocation.remote || false}
                onChange={(e) => updateNestedFormData('jobLocation', 'remote', e.target.checked)}
                className="rounded border-dark-border text-dark-accent focus:ring-dark-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-dark-text-primary">🏠 Remote Work Available</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.jobLocation.hybrid || false}
                onChange={(e) => updateNestedFormData('jobLocation', 'hybrid', e.target.checked)}
                className="rounded border-dark-border text-dark-accent focus:ring-dark-accent focus:ring-offset-0"
              />
              <span className="ml-2 text-sm text-dark-text-primary">🏢 Hybrid Options</span>
            </label>
          </div>
        </div>
        
        {/* Compensation */}
        <div>
          <EnhancedSalaryInput
            name="salaryRange"
            label="💰 Compensation Range"
            minValue={formData.compensation.salaryRange?.min || 0}
            maxValue={formData.compensation.salaryRange?.max || 0}
            currency={formData.compensation.salaryRange?.currency || 'USD'}
            period={formData.compensation.salaryRange?.period || 'yearly'}
            onMinChange={(min) => updateNestedFormData('compensation', 'salaryRange', {
              ...formData.compensation.salaryRange,
              min
            })}
            onMaxChange={(max) => updateNestedFormData('compensation', 'salaryRange', {
              ...formData.compensation.salaryRange,
              max
            })}
            onCurrencyChange={(currency) => updateNestedFormData('compensation', 'salaryRange', {
              ...formData.compensation.salaryRange,
              currency
            })}
            onPeriodChange={(period) => updateNestedFormData('compensation', 'salaryRange', {
              ...formData.compensation.salaryRange,
              period
            })}
            helpText="Set your expected salary range with currency and pay period"
          />
          
          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Benefits</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                className="input-field-dark flex-1"
                placeholder="e.g. Health Insurance, 401k"
              />
              <button
                type="button"
                onClick={addBenefit}
                className="btn-secondary-dark px-4 py-2 rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.compensation.benefits?.map((benefit, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-dark-accent/20 text-dark-accent border border-dark-accent/30"
                >
                  {benefit}
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="ml-2 text-dark-accent/70 hover:text-dark-accent"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">📋 Application Details</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <ApplicationMethodInput
            name="applicationMethod"
            label="Application Method"
            value={formData.applicationMethod}
            onChange={(value) => updateFormData('applicationMethod', value)}
            helpText="How are you submitting your application?"
          />
          
          <PriorityInput
            name="priority"
            label="Priority Level"
            value={formData.priority}
            onChange={(value) => updateFormData('priority', value)}
            helpText="How important is this opportunity to you?"
          />
        </div>
        
        {/* Referral Information */}
        {(formData.jobSource === 'referral' || formData.applicationMethod === 'referral') && (
          <div className="mt-6 p-4 bg-dark-secondary/20 rounded-lg border border-dark-border">
            <h4 className="text-md font-medium text-dark-text-secondary mb-3">Referral Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Contact Name</label>
                <input
                  type="text"
                  value={formData.referralContact?.name || ''}
                  onChange={(e) => updateFormData('referralContact', {
                    ...formData.referralContact,
                    name: e.target.value
                  })}
                  className="input-field-dark w-full"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Email</label>
                <input
                  type="email"
                  value={formData.referralContact?.email || ''}
                  onChange={(e) => updateFormData('referralContact', {
                    ...formData.referralContact,
                    email: e.target.value
                  })}
                  className="input-field-dark w-full"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Relationship</label>
                <input
                  type="text"
                  value={formData.referralContact?.relationship || ''}
                  onChange={(e) => updateFormData('referralContact', {
                    ...formData.referralContact,
                    relationship: e.target.value
                  })}
                  className="input-field-dark w-full"
                  placeholder="Former colleague"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Notes</label>
                <textarea
                  value={formData.referralContact?.notes || ''}
                  onChange={(e) => updateFormData('referralContact', {
                    ...formData.referralContact,
                    notes: e.target.value
                  })}
                  className="input-field-dark w-full"
                  rows={3}
                  placeholder="Additional notes about the referral..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Application Strategy</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Why are you interested in this role?
            </label>
            <textarea
              value={formData.applicationStrategy.whyInterested}
              onChange={(e) => updateNestedFormData('applicationStrategy', 'whyInterested', e.target.value)}
              rows={4}
              className="input-field-dark w-full"
              placeholder="Explain your motivation and interest in this specific role and company..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Key Selling Points
            </label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newSellingPoint}
                onChange={(e) => setNewSellingPoint(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSellingPoint())}
                className="input-field-dark flex-1"
                placeholder="e.g. 5+ years React experience"
              />
              <button
                type="button"
                onClick={addSellingPoint}
                className="btn-secondary-dark px-4 py-2 rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.applicationStrategy.keySellingPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-dark-secondary/20 rounded border border-dark-border"
                >
                  <div className="flex items-center space-x-2">
                    <StarIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-dark-text-primary">{point}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSellingPoint(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Unique Value Proposition
            </label>
            <textarea
              value={formData.applicationStrategy.uniqueValueProposition}
              onChange={(e) => updateNestedFormData('applicationStrategy', 'uniqueValueProposition', e.target.value)}
              rows={4}
              className="input-field-dark w-full"
              placeholder="What makes you uniquely qualified for this role? What sets you apart from other candidates?"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 animate-slide-up-soft">
      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
          <div className="card-dark rounded-lg border border-dark-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-text-primary">Restore Draft</h3>
                <p className="text-sm text-dark-text-secondary">
                  {lastSaved && `Saved ${new Date(lastSaved).toLocaleString()}`}
                </p>
              </div>
            </div>
            <p className="text-dark-text-secondary mb-6">
              We found a previously saved draft of this job application. Would you like to restore it?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  clearSavedData();
                  setFormData(initialFormData);
                  setShowRestoreDialog(false);
                }}
                className="btn-secondary-dark flex-1 px-4 py-2 rounded-lg"
              >
                Start Fresh
              </button>
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="btn-primary-dark flex-1 px-4 py-2 rounded-lg"
              >
                Restore Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
          <button
            onClick={() => navigate('/dashboard/applications')}
            className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-secondary/20 transition-all flex-shrink-0 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text-primary break-words">Add New Job Application</h1>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mt-2">
              <p className="text-sm sm:text-base text-dark-text-secondary">Track a new job opportunity</p>
              <AutoSaveIndicator 
                lastSaved={lastSaved} 
                isDirty={isDirty} 
              />
            </div>
            {isRestored && (
              <div className="flex items-center space-x-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded mt-2 w-fit">
                <DocumentTextIcon className="w-3 h-3 flex-shrink-0" />
                <span>Draft restored</span>
                <button
                  onClick={() => {
                    clearSavedData();
                    setFormData(initialFormData);
                  }}
                  className="text-blue-400 hover:text-blue-300 underline whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card-dark rounded-lg border border-dark-border p-4 sm:p-6">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-dark-text-primary">Step {currentStep} of {totalSteps}</h3>
          <span className="text-sm text-dark-text-secondary">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-dark-secondary/20 rounded-full h-2 sm:h-3">
          <div
            className="bg-dark-accent h-2 sm:h-3 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        
        {/* Step indicators for larger screens */}
        <div className="hidden sm:flex items-center justify-between mt-4 px-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex flex-col items-center space-y-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  step <= currentStep
                    ? 'bg-dark-accent text-white'
                    : step === currentStep + 1
                    ? 'bg-dark-accent/30 text-dark-accent border-2 border-dark-accent/50'
                    : 'bg-dark-secondary/20 text-dark-text-muted'
                }`}
              >
                {step}
              </div>
              <span className="text-xs text-dark-text-muted whitespace-nowrap">
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Resume'}
                {step === 3 && 'Location'}
                {step === 4 && 'Details'}
                {step === 5 && 'Strategy'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}>
        <div className="card-dark rounded-lg border border-dark-border p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Navigation */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pt-4 sm:pt-6">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg text-sm sm:text-base transition-all ${
              currentStep === 1
                ? 'text-dark-text-muted cursor-not-allowed bg-dark-secondary/10'
                : 'btn-secondary-dark hover:bg-dark-secondary/40'
            }`}
          >
            Previous
          </button>

          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                className="btn-primary-dark w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg text-sm sm:text-base hover:bg-dark-accent/90 transition-all"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-dark w-full sm:w-auto px-4 sm:px-6 py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2 text-sm sm:text-base transition-all"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                )}
                <span className="truncate">
                  {loading 
                    ? (formData.documentsUsed?.selectedResume ? 'Creating & Calculating AI Match...' : 'Creating...')
                    : 'Create Application'
                  }
                </span>
                {formData.documentsUsed?.selectedResume && !loading && (
                  <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
        jobTitle={formData.jobTitle}
        companyName={formData.companyName}
        analysisStep={analysisStep}
        matchScore={matchScore}
      />
    </div>
  );
}