import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { locationService } from '../../services/locationService';
import JobOptimizationModal from '../../components/resume/JobOptimizationModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

// Form Components
import { PersonalInfoForm } from '../../components/resume/PersonalInfoForm';
import { ProfessionalSummaryForm } from '../../components/resume/ProfessionalSummaryForm';
import { WorkExperienceForm } from '../../components/resume/WorkExperienceForm';
import { EducationForm } from '../../components/resume/EducationForm';
import { SkillsForm } from '../../components/resume/SkillsForm';
import ProjectsForm from '../../components/resume/ProjectsForm';
import CertificationsForm from '../../components/resume/CertificationsForm';
import VolunteerExperienceForm from '../../components/resume/VolunteerExperienceForm';
import AwardsForm from '../../components/resume/AwardsForm';
import HobbiesForm from '../../components/resume/HobbiesForm';
import LanguagesForm from '../../components/resume/LanguagesForm';
import EnterpriseResumeEnhancer from '../../components/resume/EnterpriseResumeEnhancer';
import AILoadingOverlay from '../../components/ui/AILoadingOverlay';
import { useAIProgress } from '../../hooks/useAIProgress';

import { Resume } from '../../types';
import { resumeService } from '../../services/resumeService';
import { ResumeProvider, useResume } from '../../contexts/ResumeContext';
import { toast } from 'sonner';
import { useSubscriptionModal } from '../../hooks/useSubscriptionModal';
import SubscriptionModal from '../../components/subscription/SubscriptionModal';

interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  required: boolean;
  icon: React.ComponentType<any>;
}

const steps: Step[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Basic contact information and professional title',
    component: PersonalInfoForm,
    required: true,
    icon: DocumentTextIcon
  },
  {
    id: 'work-experience',
    title: 'Work Experience',
    description: 'Professional work history and achievements',
    component: WorkExperienceForm,
    required: true,
    icon: DocumentTextIcon
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Academic background and qualifications',
    component: EducationForm,
    required: true,
    icon: DocumentTextIcon
  },
  {
    id: 'skills',
    title: 'Skills',
    description: 'Technical and soft skills relevant to your career',
    component: SkillsForm,
    required: true,
    icon: DocumentTextIcon
  },
  {
    id: 'professional-summary',
    title: 'Professional Summary',
    description: 'Compelling overview of your professional background',
    component: ProfessionalSummaryForm,
    required: true,
    icon: SparklesIcon
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Showcase your key projects and achievements',
    component: ProjectsForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'certifications',
    title: 'Certifications',
    description: 'Professional certifications and credentials',
    component: CertificationsForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'volunteer-experience',
    title: 'Volunteer Experience',
    description: 'Community involvement and volunteer work',
    component: VolunteerExperienceForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'awards',
    title: 'Awards & Honors',
    description: 'Recognition and achievements in your field',
    component: AwardsForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'languages',
    title: 'Languages',
    description: 'Languages you speak and proficiency levels',
    component: LanguagesForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'hobbies',
    title: 'Hobbies & Interests',
    description: 'Personal interests that showcase your personality',
    component: HobbiesForm,
    required: false,
    icon: DocumentTextIcon
  },
  {
    id: 'preview',
    title: 'AI-Powered Resume Enhancement',
    description: 'Enterprise-grade AI analysis, optimization, and benchmarking',
    component: EnterpriseResumeEnhancer,
    required: false,
    icon: EyeIcon
  }
];

const ComprehensiveResumeBuilderContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resumeData, aiData, updateResumeData, updateAIData, handleDataChange, isAutoSaving } = useResume();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<number>(aiData.atsScore);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isJobOptimizationModalOpen, setIsJobOptimizationModalOpen] = useState(false);
  
  // AI Progress for final step improvement
  const aiImprovementProgress = useAIProgress('professional-summary');
  
  // Subscription modal
  const { isModalOpen, modalProps, closeModal, checkAIFeature } = useSubscriptionModal();

  useEffect(() => {
    const templateId = location.state?.templateId;
    if (templateId) {
      updateResumeData({ template: templateId });
    }

    // Check for edit mode
    const urlParams = new URLSearchParams(location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      loadResumeForEditing(editId);
    }
  }, [location.state?.templateId, location.search]); // Removed updateResumeData from dependencies

  const loadResumeForEditing = async (resumeId: string) => {
    try {
      setIsLoading(true);
      const response = await resumeService.getResume(resumeId);
      if (response.success && response.data) {
        // Update the resume context with the loaded data
        updateResumeData(response.data);
        toast.success('Resume loaded for editing');
      } else {
        toast.error('Failed to load resume for editing');
        navigate('/dashboard/documents');
      }
    } catch (error) {
      console.error('Failed to load resume:', error);
      toast.error('Failed to load resume for editing');
      navigate('/dashboard/documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const newCompletedSteps = new Set<number>();
    
    if (resumeData.personalInfo?.firstName && resumeData.personalInfo?.lastName) {
      newCompletedSteps.add(0);
    }
    if (resumeData.professionalSummary) {
      newCompletedSteps.add(1);
    }
    if (resumeData.workExperience && resumeData.workExperience.length > 0) {
      newCompletedSteps.add(2);
    }
    if (resumeData.education && resumeData.education.length > 0) {
      newCompletedSteps.add(3);
    }
    if (resumeData.skills && resumeData.skills.length > 0) {
      newCompletedSteps.add(4);
    }

    setCompletedSteps(newCompletedSteps);
  }, [resumeData]); // Removed completedSteps from dependencies to prevent infinite loop

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleAIImprovement = async () => {
    // Check subscription access first
    if (!checkAIFeature('AI Professional Summary Enhancement')) {
      return; // Modal shown automatically
    }
    
    aiImprovementProgress.startProgress();
    try {
      // Validate resume data before AI enhancement
      if (!resumeData.workExperience?.length && !resumeData.skills?.length) {
        aiImprovementProgress.cancelProgress();
        toast.error('Missing required information', {
          description: 'Please add work experience and skills before using AI enhancement.'
        });
        return;
      }
      
      const summary = await resumeService.generateProfessionalSummary(resumeData.id, resumeData);
      const optimizedSummary = summary[0];
      
      updateResumeData({
        professionalSummary: optimizedSummary,
        aiGenerated: {
          ...resumeData.aiGenerated,
          summary: true
        }
      });
      
      // Save AI enhancement data
      updateAIData({
        optimizedSummary,
        lastOptimized: new Date().toISOString()
      });
      
      aiImprovementProgress.completeProgress();
      
      toast.success('AI enhancement complete!', {
        description: 'Your professional summary has been optimized.'
      });
      
    } catch (error: any) {
      console.error('Failed to generate AI summary:', error);
      aiImprovementProgress.cancelProgress();
      
      // Check if it's a subscription error (handled by API interceptor)
      const isSubscriptionError = error?.response?.status === 403 || 
                                 error?.isSubscriptionError ||
                                 error?.response?.data?.code?.includes('SUBSCRIPTION');
      
      if (!isSubscriptionError) {
        toast.error('AI enhancement failed', {
          description: 'Please check your connection and try again.'
        });
      }
    }
  };

  const handleATSCheck = async () => {
    setIsLoading(true);
    try {
      const analysis = await resumeService.analyzeATSCompatibility(resumeData);
      setAtsScore(analysis.score);
      
      updateResumeData({
        aiGenerated: {
          ...resumeData.aiGenerated,
          atsScore: analysis.score,
          improvements: analysis.recommendations
        }
      });
      
      // Save ATS analysis data
      updateAIData({
        atsScore: analysis.score,
        atsAnalysis: analysis
      });
      
    } catch (error) {
      console.error('Failed to analyze ATS compatibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultLocation = async (): Promise<string> => {
    try {
      // Get user's location from their stored profile location data
      const locationData = await locationService.getLocationForLogin();
      if (locationData?.city && locationData?.country) {
        return `${locationData.city}, ${locationData.country}`;
      }
    } catch (error) {
      console.warn('Could not get user location:', error);
    }
    
    // Global fallback based on timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneParts = timezone.split('/');
    
    if (timezoneParts.length >= 2) {
      const region = timezoneParts[0];
      const city = timezoneParts[1].replace(/_/g, ' ');
      
      // Map regions to countries/continents
      const regionMap: Record<string, string> = {
        'America': 'USA',
        'Europe': 'Europe',
        'Asia': 'Asia',
        'Africa': 'Africa',
        'Australia': 'Australia',
        'Pacific': 'Pacific'
      };
      
      const countryRegion = regionMap[region] || region;
      return `${city}, ${countryRegion}`;
    }
    
    // Final fallback
    return 'Global';
  };

  const handleJobOptimization = async () => {
    setIsJobOptimizationModalOpen(true);
  };

  const handleSaveResume = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
      if (!resumeData.personalInfo?.firstName || !resumeData.personalInfo?.lastName) {
        toast.error('Please fill in your first and last name before saving');
        return;
      }

      const resumeToSave = {
        title: `${resumeData.personalInfo?.firstName || 'My'} ${resumeData.personalInfo?.lastName || 'Resume'}`,
        personalInfo: {
          ...resumeData.personalInfo,
          location: resumeData.personalInfo?.location || await getDefaultLocation()
        },
        professionalSummary: resumeData.professionalSummary,
        workExperience: resumeData.workExperience,
        education: resumeData.education,
        skills: resumeData.skills,
        certifications: resumeData.certifications,
        languages: resumeData.languages,
        projects: resumeData.projects,
        templateId: resumeData.template,
        isPublic: false
      };

      toast.loading('Saving your resume...', { id: 'save-resume' });
      
      const result = await resumeService.createResume(resumeToSave);
      
      if (result.success && result.data?._id) {
        toast.success('Resume saved successfully!', { id: 'save-resume' });
        navigate(`/dashboard/resume/preview/${result.data._id}`);
      } else {
        throw new Error(result.message || 'Failed to save resume');
      }
    } catch (error: any) {
      console.error('Failed to save resume:', error);
      toast.error(error.message || 'Failed to save resume. Please try again.', { id: 'save-resume' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadResume = async (format: 'pdf' | 'docx' | 'txt') => {
    setIsLoading(true);
    try {
      // Add performance timing and user feedback
      const startTime = performance.now();
      console.log(`🚀 Starting ${format.toUpperCase()} download...`);
      
      const blob = await resumeService.downloadResume(resumeData, format);
      
      const endTime = performance.now();
      console.log(`⚡ Download completed in ${(endTime - startTime).toFixed(0)}ms`);
      
      // Generate optimized filename with proper null checks
      const firstName = resumeData.personalInfo?.firstName || '';
      const lastName = resumeData.personalInfo?.lastName || '';
      const sanitizedFirstName = firstName ? firstName.replace(/[^\w\s-]/g, '').trim() : 'Resume';
      const sanitizedLastName = lastName ? lastName.replace(/[^\w\s-]/g, '').trim() : '';
      const fileName = `${sanitizedFirstName}${sanitizedLastName ? `_${sanitizedLastName}` : ''}_Resume.${format}`;
      
      // Optimized download flow
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Async cleanup to avoid blocking UI
      requestAnimationFrame(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
      
    } catch (error) {
      console.error('Failed to download resume:', error);
      // Could add toast notification here for better UX
    } finally {
      setIsLoading(false);
    }
  };

  const currentStepData = steps[currentStep];
  const StepComponent = currentStepData.component;
  const StepIcon = currentStepData.icon;

  const getStepStatus = (index: number) => {
    if (completedSteps.has(index)) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  const getStepProps = (stepId: string) => {
    switch (stepId) {
      case 'personal-info':
        return {
          data: resumeData.personalInfo,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'professional-summary':
        return {
          summary: resumeData.professionalSummary,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'work-experience':
        return {
          workExperience: resumeData.workExperience,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'education':
        return {
          education: resumeData.education,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'skills':
        return {
          skills: resumeData.skills,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'projects':
        return {
          projects: resumeData.projects,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'certifications':
        return {
          certifications: resumeData.certifications,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'volunteer-experience':
        return {
          volunteerExperience: resumeData.volunteerExperience,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'awards':
        return {
          awards: resumeData.awards,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'languages':
        return {
          languages: resumeData.languages,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      case 'hobbies':
        return {
          hobbies: resumeData.hobbies,
          onChange: (data: any) => handleDataChange(stepId, data),
        };
      default:
        return {};
    }
  };

  return (
    <div className="min-h-screen gradient-dark animate-slide-up-soft">
      {/* Header */}
      <div className="card-dark border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard/resume/templates')}
                className="flex items-center text-dark-text-secondary hover:text-dark-text-primary transition-colors duration-200"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-1" />
                Back to Resume Builder
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-dark-text-muted">
                Step {currentStep + 1} of {steps.length}
              </span>
              <div className="w-32 bg-dark-tertiary rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid grid-cols-1 gap-8 ${currentStep === steps.length - 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
          {/* Step Navigation - Hidden when on Preview step */}
          {currentStep !== steps.length - 1 && (
            <div className="lg:col-span-1">
              <Card className="card-dark p-4 sticky top-8">
                <h3 className="font-semibold text-dark-text-primary mb-4">Resume Sections</h3>
                <nav className="space-y-2">
                  {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    const IconComponent = step.icon;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => handleStepClick(index)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                          status === 'current'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : status === 'completed'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'text-dark-text-muted hover:bg-dark-secondary'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          {status === 'completed' ? (
                            <CheckCircleIcon className="w-4 h-4 mr-2 text-green-400" />
                          ) : (
                            <IconComponent className="w-4 h-4 mr-2" />
                          )}
                          <span className="text-left">
                            {step.title}
                            {step.required && <span className="text-red-400 ml-1">*</span>}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </Card>
            </div>
          )}

          {/* Step Content */}
          <div className={currentStep === steps.length - 1 ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <div>
                <Card className="card-dark p-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <StepIcon className="w-6 h-6 text-blue-400 mr-2" />
                        <h2 className="text-2xl font-bold gradient-text-dark">
                          {currentStepData.title}
                        </h2>
                      </div>
                      
                      {/* Auto-save indicator */}
                      <div className="flex items-center space-x-2">
                        {isAutoSaving && (
                          <div className="flex items-center text-green-400 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                            Saving...
                          </div>
                        )}
                        <div className="text-xs text-dark-text-muted">
                          ✓ Auto-save
                        </div>
                      </div>
                    </div>
                    <p className="text-dark-text-secondary">{currentStepData.description}</p>
                  </div>

                  {currentStep === steps.length - 1 ? (
                    <EnterpriseResumeEnhancer
                      resume={resumeData as Resume}
                      onResumeUpdate={updateResumeData}
                    />
                  ) : (
                    <StepComponent {...getStepProps(currentStepData.id)} />
                  )}
                </Card>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex justify-between">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="outline"
                className="btn-secondary-dark"
              >
                <ChevronLeftIcon className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep === steps.length - 1 ? (
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleDownloadResume('pdf')}
                    variant="outline"
                    disabled={isLoading}
                    className="btn-secondary-dark"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => handleDownloadResume('docx')}
                    variant="outline"
                    disabled={isLoading}
                    className="btn-secondary-dark"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download DOCX
                  </Button>
                  <Button
                    onClick={() => handleDownloadResume('txt')}
                    variant="outline"
                    disabled={isLoading}
                    className="btn-secondary-dark"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download TXT
                  </Button>
                  <Button
                    onClick={handleSaveResume}
                    disabled={isLoading}
                    className="btn-primary-dark"
                  >
                    Save Resume
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === steps.length - 1}
                  className="btn-primary-dark"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Loading Overlay for step-by-step improvement */}
      <AILoadingOverlay
        isVisible={aiImprovementProgress.isLoading}
        title="🚀 Final AI Enhancement"
        description="AI is applying final optimizations to create your perfect resume"
        progress={aiImprovementProgress.progress}
        currentStep={aiImprovementProgress.currentStep}
        estimatedTime={aiImprovementProgress.estimatedTime}
        onCancel={aiImprovementProgress.cancelProgress}
      />
      
    <JobOptimizationModal
        isOpen={isJobOptimizationModalOpen}
        onClose={() => setIsJobOptimizationModalOpen(false)}
      />
      
      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        featureName={modalProps.featureName}
        title={modalProps.title}
        description={modalProps.description}
      />
    </div>
  );
}

export default function ComprehensiveResumeBuilder() {
  const location = useLocation();
  const initialData = location.state?.resumeData;
  const templateId = location.state?.templateId || 'modern-1';

  return (
    <ResumeProvider initialData={{ ...initialData, template: templateId }}>
      <ComprehensiveResumeBuilderContent />
    </ResumeProvider>
  );
}