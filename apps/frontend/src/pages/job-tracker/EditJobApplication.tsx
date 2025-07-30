import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { useFormValidation } from '../../hooks/useFormValidation';
import { AutoSaveIndicator } from '../../components/ui/AutoSaveIndicator';
import { JobTitleInput, CompanyInput, LocationInput, JobSourceInput, ApplicationMethodInput, PriorityInput } from '../../components/forms/SpecializedInputs';
import { EnhancedSalaryInput } from '../../components/forms/EnhancedSalaryInput';
import { ValidatedTextarea } from '../../components/forms/ValidatedInput';
import ResumeSelector from '../../components/career-coach/ResumeSelector';
import { ResumeData } from '../../services/resumeService';
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
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { jobApplicationAPI } from '../../services/api';
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
    equity?: {
      min: number;
      max: number;
      type: 'options' | 'rsu' | 'percentage';
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
      equity: null,
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

export default function EditJobApplication() {
  const navigate = useNavigate();
  const { applicationId } = useParams<{ applicationId: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [originalResumeId, setOriginalResumeId] = useState<string | null>(null);
  const [resumeChanged, setResumeChanged] = useState(false);
  const [matchScoreRecalculating, setMatchScoreRecalculating] = useState(false);
  
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
    lastSaved,
    isDirty
  } = useFormPersistence(initialFormData, {
    key: `job_application_edit_${applicationId}`,
    debounceMs: 1000,
    clearOnSubmit: true
  });

  // Use form validation hook
  const [validationState, validationActions] = useFormValidation({
    validateOnChange: true,
    validateOnBlur: true,
    sanitizeInputs: true,
    debounceMs: 500,
  });

  useEffect(() => {
    if (applicationId) {
      loadApplication();
    }
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setInitialLoading(true);
      const response = await jobApplicationAPI.getApplication(applicationId!);
      
      if (response.success && response.data) {
        const app = response.data.application;
        // Map the application data to form format
        const mappedData: JobApplicationForm = {
          jobTitle: app.jobTitle || '',
          companyName: app.companyName || '',
          jobDescription: app.jobDescription || '',
          jobUrl: app.jobUrl || '',
          jobSource: app.jobSource || 'manual',
          jobLocation: {
            city: app.jobLocation?.city || '',
            state: app.jobLocation?.state || '',
            country: app.jobLocation?.country || 'United States',
            remote: app.jobLocation?.remote || false,
            hybrid: app.jobLocation?.hybrid || false,
          },
          compensation: {
            salaryRange: app.compensation?.salaryRange || {
              min: 0,
              max: 0,
              currency: 'USD',
              period: 'yearly',
            },
            equity: app.compensation?.equity || null,
            benefits: app.compensation?.benefits || [],
          },
          applicationMethod: app.applicationMethod || 'online',
          priority: app.priority || 'medium',
          documentsUsed: {
            resumeId: app.documentsUsed?.resumeId,
            resumeContent: app.documentsUsed?.resumeContent,
            selectedResume: app.documentsUsed?.resumeContent ? JSON.parse(app.documentsUsed.resumeContent) : undefined,
          },
          applicationStrategy: {
            whyInterested: app.applicationStrategy?.whyInterested || '',
            keySellingPoints: app.applicationStrategy?.keySellingPoints || [],
            uniqueValueProposition: app.applicationStrategy?.uniqueValueProposition || '',
          },
          referralContact: app.referralContact,
        };
        
        setFormData(mappedData);
        setOriginalResumeId(app.documentsUsed?.resumeId || null);
      } else {
        toast.error('Application not found');
        navigate('/dashboard/applications');
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      toast.error('Failed to load application');
      navigate('/dashboard/applications');
    } finally {
      setInitialLoading(false);
    }
  };

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
        ...formData,
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
      ...formData,
      applicationStrategy: {
        ...formData.applicationStrategy,
        keySellingPoints: formData.applicationStrategy.keySellingPoints.filter((_, i) => i !== index)
      }
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
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
      ...formData,
      compensation: {
        ...formData.compensation,
        benefits: formData.compensation.benefits?.filter((_, i) => i !== index) || []
      }
    });
  };

  const handleResumeSelection = (resume: ResumeData) => {
    const resumeContent = JSON.stringify(resume);
    const hasChanged = resume._id !== originalResumeId;
    
    setFormData({
      ...formData,
      documentsUsed: {
        resumeId: resume._id,
        resumeContent,
        selectedResume: resume
      }
    });
    
    console.log('✅ Resume selected in edit mode:', {
      resumeId: resume._id,
      resumeTitle: resume.title,
      contentLength: resumeContent.length,
      hasChanged
    });
    
    setResumeChanged(hasChanged);
    
    if (hasChanged) {
      toast.info('Resume changed - match score will be recalculated upon save', {
        duration: 5000,
      });
    }
  };

  const recalculateMatchScore = async () => {
    if (!applicationId) return;
    
    try {
      setMatchScoreRecalculating(true);
      const result = await jobApplicationAPI.calculateMatchScore(applicationId);
      if (result.success) {
        toast.success('Match score recalculated!');
        // Optionally reload the application data to show updated score
        await loadApplication();
      } else {
        toast.error('Failed to recalculate match score');
      }
    } catch (error) {
      toast.error('Failed to recalculate match score');
    } finally {
      setMatchScoreRecalculating(false);
    }
  };

  const handleSubmit = persistentSubmit(async () => {
    // Validate the entire form before submitting  
    const isValid = await validationActions.validateForm(formData);
    
    if (!isValid) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    if (!formData.jobTitle || !formData.companyName || !formData.jobDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Show AI analysis modal if we have resume and job description and significant changes
      const hasResumeData = formData.documentsUsed?.resumeId || formData.documentsUsed?.resumeContent;
      const hasJobDescription = formData.jobDescription && formData.jobDescription.length >= 50;
      // Consider any form submission as potentially having significant changes for better UX
      const hasSignificantChanges = resumeChanged || true; // Show modal on all updates for better user experience
      
      if (hasResumeData && hasJobDescription && hasSignificantChanges) {
        setShowAIAnalysis(true);
        setAnalysisStep('analyzing');
        setMatchScore(undefined);
      }
      
      // Debug logging
      console.log('🚀 Submitting updated job application:');
      console.log('   Job:', formData.jobTitle, 'at', formData.companyName);
      console.log('   Resume ID:', formData.documentsUsed?.resumeId || 'MISSING!!!');
      console.log('   Resume Content Length:', formData.documentsUsed?.resumeContent?.length || 0);
      console.log('   Resume Changed:', resumeChanged);
      console.log('   Job URL:', formData.jobUrl);
      console.log('   Referral Contact:', formData.referralContact);
      console.log('   ENTIRE FORM DATA:', JSON.stringify(formData, null, 2));

      // Clean the form data to match create format
      const cleanedFormData = {
        jobTitle: formData.jobTitle,
        companyName: formData.companyName, 
        jobDescription: formData.jobDescription,
        jobUrl: formData.jobUrl || '',
        jobSource: formData.jobSource,
        jobLocation: formData.jobLocation,
        compensation: {
          salaryRange: formData.compensation?.salaryRange,
          equity: formData.compensation?.equity || null,
          benefits: formData.compensation?.benefits || []
        },
        applicationMethod: formData.applicationMethod,
        priority: formData.priority,
        documentsUsed: formData.documentsUsed,
        applicationStrategy: formData.applicationStrategy,
        referralContact: formData.referralContact
      };

      console.log('   CLEANED FORM DATA:', JSON.stringify(cleanedFormData, null, 2));
      
      // Also log the exact structure for debugging
      console.log('🔍 DETAILED DATA ANALYSIS:');
      console.log('   jobLocation type:', typeof cleanedFormData.jobLocation, cleanedFormData.jobLocation);
      console.log('   compensation type:', typeof cleanedFormData.compensation, cleanedFormData.compensation);
      console.log('   documentsUsed type:', typeof cleanedFormData.documentsUsed, cleanedFormData.documentsUsed);
      console.log('   applicationStrategy type:', typeof cleanedFormData.applicationStrategy, cleanedFormData.applicationStrategy);

      const response = await jobApplicationAPI.updateApplication(applicationId!, cleanedFormData);
      
      if (response.success) {
        console.log('✅ Application updated successfully:', {
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
            toast.success(`Job application updated successfully! AI Match Score: ${applicationScore}%`);
            navigate(`/dashboard/applications/${applicationId}`);
          }, 3000);
        } else {
          validationActions.clearAllErrors();
          toast.success('Job application updated successfully!');
          navigate(`/dashboard/applications/${applicationId}`);
        }
      } else {
        if (showAIAnalysis) {
          setAnalysisStep('error');
          setTimeout(() => setShowAIAnalysis(false), 3000);
        }
        toast.error(response.message || 'Failed to update application');
      }
    } catch (error: any) {
      console.error('❌ Failed to update application:', error);
      console.error('API Error Details:', error.response?.data);
      console.error('Status:', error.response?.status);
      console.error('Request data that failed:', JSON.stringify(formData, null, 2));
      
      if (showAIAnalysis) {
        setAnalysisStep('error');
        setTimeout(() => setShowAIAnalysis(false), 3000);
      }
      
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        toast.error(`Validation failed: ${error.response.data.errors.map((e: any) => e.msg).join(', ')}`);
      } else {
        toast.error('Failed to update application. Please try again.');
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => updateFormData('jobTitle', e.target.value)}
              className="input-field-dark w-full"
              placeholder="e.g. Senior Software Engineer"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateFormData('companyName', e.target.value)}
              className="input-field-dark w-full"
              placeholder="e.g. Google"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Job Source
            </label>
            <select
              value={formData.jobSource}
              onChange={(e) => updateFormData('jobSource', e.target.value)}
              className="input-field-dark w-full"
            >
              {JOB_SOURCES.map(source => (
                <option key={source.value} value={source.value}>{source.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Job URL
            </label>
            <input
              type="url"
              value={formData.jobUrl}
              onChange={(e) => updateFormData('jobUrl', e.target.value)}
              className="input-field-dark w-full"
              placeholder="https://company.com/jobs/123"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            Job Description *
          </label>
          <textarea
            value={formData.jobDescription}
            onChange={(e) => updateFormData('jobDescription', e.target.value)}
            rows={6}
            className="input-field-dark w-full"
            placeholder="Paste the full job description here..."
            required
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">📄 Resume/CV Management</h3>
        <p className="text-dark-text-secondary mb-6">
          Select or update the resume used for this application. Changing the resume will trigger an AI match score recalculation.
        </p>
        
        {/* Current Resume Status */}
        {formData.documentsUsed?.selectedResume && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-blue-400 font-medium">
                    Current Resume: {formData.documentsUsed.selectedResume.title || 'Untitled Resume'}
                  </h4>
                  <p className="text-blue-300 text-sm">
                    {formData.documentsUsed.selectedResume.updatedAt 
                      ? `Updated ${new Date(formData.documentsUsed.selectedResume.updatedAt).toLocaleDateString()}`
                      : 'Resume attached to application'
                    }
                  </p>
                </div>
              </div>
              {resumeChanged && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
                  <SparklesIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 text-sm font-medium">Will Recalculate Match Score</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Resume Selector */}
        <div className="border border-dark-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-dark-text-primary">Select Resume</h4>
            {formData.documentsUsed?.selectedResume && (
              <button
                onClick={recalculateMatchScore}
                disabled={matchScoreRecalculating}
                className="btn-secondary-dark px-3 py-1 text-sm rounded-md flex items-center space-x-2"
              >
                {matchScoreRecalculating ? (
                  <>
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Recalculating...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-3 h-3" />
                    <span>Recalculate Match Score</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          <ResumeSelector onSelectResume={handleResumeSelection} />
        </div>
        
        {/* Resume Comparison View */}
        {resumeChanged && originalResumeId && formData.documentsUsed?.selectedResume && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <SparklesIcon className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Resume Change Detected</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="text-purple-300 font-medium mb-2">Previous Resume</h5>
                <p className="text-purple-200">Resume ID: {originalResumeId.slice(-8)}</p>
              </div>
              <div>
                <h5 className="text-purple-300 font-medium mb-2">New Resume</h5>
                <p className="text-purple-200">
                  {formData.documentsUsed.selectedResume.title || 'Untitled Resume'}
                </p>
                <p className="text-purple-200 text-xs">
                  Resume ID: {formData.documentsUsed.selectedResume._id?.slice(-8)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-500/20">
              <p className="text-purple-300 text-xs">
                💡 The AI match score will be recalculated based on the new resume when you save the application.
              </p>
            </div>
          </div>
        )}

        {/* Resume Change Warning */}
        {!formData.documentsUsed?.selectedResume && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400 text-sm font-medium">No Resume Selected</span>
            </div>
            <p className="text-yellow-300 text-sm mt-1">
              AI matching features will not be available without a resume. Select a resume above to enable intelligent job matching.
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
          <h4 className="text-md font-medium text-dark-text-secondary mb-3">Location</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">City</label>
              <input
                type="text"
                value={formData.jobLocation.city}
                onChange={(e) => updateNestedFormData('jobLocation', 'city', e.target.value)}
                className="input-field-dark w-full"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">State</label>
              <input
                type="text"
                value={formData.jobLocation.state}
                onChange={(e) => updateNestedFormData('jobLocation', 'state', e.target.value)}
                className="input-field-dark w-full"
                placeholder="CA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">Country</label>
              <input
                type="text"
                value={formData.jobLocation.country}
                onChange={(e) => updateNestedFormData('jobLocation', 'country', e.target.value)}
                className="input-field-dark w-full"
                placeholder="United States"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.jobLocation.remote}
                onChange={(e) => updateNestedFormData('jobLocation', 'remote', e.target.checked)}
                className="rounded border-dark-border text-dark-accent focus:ring-dark-accent"
              />
              <span className="ml-2 text-sm text-dark-text-primary">Remote Work Available</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.jobLocation.hybrid}
                onChange={(e) => updateNestedFormData('jobLocation', 'hybrid', e.target.checked)}
                className="rounded border-dark-border text-dark-accent focus:ring-dark-accent"
              />
              <span className="ml-2 text-sm text-dark-text-primary">Hybrid Options</span>
            </label>
          </div>
        </div>
        
        {/* Compensation */}
        <div>
          <h4 className="text-md font-medium text-dark-text-secondary mb-3">Compensation</h4>
          <div className="mb-4">
            <EnhancedSalaryInput
              name="salary"
              label="Salary Range"
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
              className="mb-4"
              helpText="Set your expected salary range with currency and pay period"
            />
          </div>
          
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
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Application Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Application Method
            </label>
            <select
              value={formData.applicationMethod}
              onChange={(e) => updateFormData('applicationMethod', e.target.value)}
              className="input-field-dark w-full"
            >
              {APPLICATION_METHODS.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-2">
              Priority Level
            </label>
            <select
              value={formData.priority}
              onChange={(e) => updateFormData('priority', e.target.value)}
              className="input-field-dark w-full"
            >
              {PRIORITY_LEVELS.map(priority => (
                <option key={priority.value} value={priority.value}>{priority.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Referral Information */}
        {(formData.jobSource === 'referral' || formData.applicationMethod === 'referral') && (
          <div className="mt-6 p-4 bg-dark-secondary/20 rounded-lg border border-dark-border">
            <h4 className="text-md font-medium text-dark-text-secondary mb-3">Referral Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

  if (initialLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-dark-secondary/20 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          <div className="h-64 bg-dark-secondary/20 rounded-lg"></div>
          <div className="h-48 bg-dark-secondary/20 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up-soft">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/dashboard/applications/${applicationId}`)}
            className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-secondary/20"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-text-primary">Edit Job Application</h1>
            <div className="flex items-center space-x-4">
              <p className="text-dark-text-secondary">Update your job application details</p>
              <AutoSaveIndicator 
                lastSaved={lastSaved} 
                isDirty={isDirty} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card-dark rounded-lg border border-dark-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-text-primary">Step {currentStep} of {totalSteps}</h3>
          <span className="text-sm text-dark-text-secondary">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-dark-secondary/20 rounded-full h-2">
          <div
            className="bg-dark-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
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
        <div className="flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-6 py-2 rounded-lg ${
              currentStep === 1
                ? 'text-dark-text-muted cursor-not-allowed'
                : 'btn-secondary-dark'
            }`}
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                className="btn-primary-dark px-6 py-2 rounded-lg"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-dark px-6 py-2 rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>
                  {loading 
                    ? (formData.documentsUsed?.selectedResume ? 'Updating & Calculating AI Match...' : 'Updating...')
                    : 'Update Application'
                  }
                </span>
                {formData.documentsUsed?.selectedResume && !loading && (
                  <SparklesIcon className="w-4 h-4" />
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