import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams, useBeforeUnload } from 'react-router-dom';
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
  ArrowDownTrayIcon,
  CloudIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  CommandLineIcon,
  ExclamationTriangleIcon
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
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  required: boolean;
  icon: React.ComponentType<any>;
}

const steps: Step[] = [
  { id: 'personal-info', title: 'Identity Parameters', description: 'Institutional contact and professional identifier', component: PersonalInfoForm, required: true, icon: UserIcon },
  { id: 'work-experience', title: 'Experience Nodes', description: 'Chronological history of professional deployment', component: WorkExperienceForm, required: true, icon: BriefcaseIcon },
  { id: 'education', title: 'Academic Base', description: 'Qualified educational and research background', component: EducationForm, required: true, icon: AcademicCapIcon },
  { id: 'skills', title: 'Technical Stack', description: 'Core competencies and protocol proficiency', component: SkillsForm, required: true, icon: CpuChipIcon },
  { id: 'professional-summary', title: 'Executive Abstract', description: 'High-impact overview of career architecture', component: ProfessionalSummaryForm, required: true, icon: SparklesIcon },
  { id: 'projects', title: 'Technical Assets', description: 'Showcase of specialized project deployments', component: ProjectsForm, required: false, icon: CommandLineIcon },
  { id: 'certifications', title: 'Validations', description: 'Professional credentials and institutional licenses', component: CertificationsForm, required: false, icon: ShieldCheckIcon },
  { id: 'volunteer-experience', title: 'Community Impact', description: 'Pro-bono contributions and social alignment', component: VolunteerExperienceForm, required: false, icon: HeartIcon },
  { id: 'awards', title: 'Recognition', description: 'Merit-based accolades and industry honors', component: AwardsForm, required: false, icon: StarIcon },
  { id: 'languages', title: 'Communication Protocols', description: 'Linguistic dexterity and proficiency levels', component: LanguagesForm, required: false, icon: GlobeAltIcon },
  { id: 'hobbies', title: 'Interests', description: 'Ancillary attributes and personality traits', component: HobbiesForm, required: false, icon: SparklesIcon },
  { id: 'preview', title: 'System Deployment', description: 'Vector rendering and intelligence optimization', component: EnterpriseResumeEnhancer, required: false, icon: RocketLaunchIcon }
];

import {
  UserIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  HeartIcon,
  StarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const ComprehensiveResumeBuilderContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>(); // Get ID from URL path
  const { 
    resumeData, 
    aiData, 
    updateResumeData, 
    updateAIData, 
    handleDataChange, 
    generateResumeHash,
    setCachedPdf,
    isCacheValid,
    isDirty,
    setIsDirty,
    saveToStorage
  } = useResume();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isJobOptimizationModalOpen, setIsJobOptimizationModalOpen] = useState(false);
  const [shouldSwitchToPreview, setShouldSwitchToPreview] = useState(false);
  const aiImprovementProgress = useAIProgress('professional-summary');
  
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(null);
  const [isExternalNavigation, setIsExternalNavigation] = useState(false);

  // Load persisted step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem('resume-builder-current-step');
    if (savedStep !== null) {
      const stepIndex = parseInt(savedStep, 10);
      if (!isNaN(stepIndex) && stepIndex >= 0 && stepIndex < steps.length) {
        setCurrentStep(stepIndex);
      }
    }
  }, []);

  // Persist step on change
  useEffect(() => {
    localStorage.setItem('resume-builder-current-step', currentStep.toString());
  }, [currentStep]);

  // Use React Router's hook for unload protection
  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [isDirty]
    )
  );


  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const templateId = location.state?.templateId || urlParams.get('templateId');
    const isLatexTemplate = location.state?.isLatexTemplate || urlParams.get('isLatexTemplate') === 'true';
    if (templateId) {
      updateResumeData({ template: templateId, isLatexTemplate: isLatexTemplate });
    }
    
    // Check for ID in params (preferred) or query param (legacy/fallback)
    const editId = id || urlParams.get('edit');
    
    if (editId) {
      if (editId === '[object Object]') {
        console.error('Invalid resume ID detected: [object Object]');
        toast.error('Invalid architecture reference detected. Return to dashboard.');
        navigate('/dashboard/documents');
        return;
      }
      loadResumeForEditing(editId);
    }
  }, [location.state?.templateId, location.search, id]);

  const loadResumeForEditing = async (resumeId: string) => {
    try {
      setIsLoading(true);
      const response = await resumeService.getResume(resumeId);
      if (response.success && response.data) {
        updateResumeData(response.data);
        toast.success('Architecture synchronized for editing.');
        setIsDirty(false); // Reset dirty state after loading
      }
    } catch (error) {
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const newCompletedSteps = new Set<number>();
    if (resumeData.personalInfo?.firstName && resumeData.personalInfo?.lastName) newCompletedSteps.add(0);
    if (resumeData.workExperience?.length > 0) newCompletedSteps.add(1);
    if (resumeData.education?.length > 0) newCompletedSteps.add(2);
    if (resumeData.skills?.length > 0) newCompletedSteps.add(3);
    if (resumeData.professionalSummary) newCompletedSteps.add(4);
    setCompletedSteps(newCompletedSteps);
  }, [resumeData]);

  const triggerNavigation = useCallback((action: () => void, isExternal = false) => {
    if (isDirty) {
      setIsExternalNavigation(isExternal);
      setShowCustomPrompt(true);
      setPendingNavigationAction(() => action);
    } else {
      action();
    }
  }, [isDirty]);


  const handleStepClick = useCallback((stepIndex: number) => {
    // For internal step clicks, we auto-save and move
    saveToStorage();
    setCurrentStep(stepIndex);
  }, [saveToStorage]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      // Auto-save when moving to next
      saveToStorage();
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, saveToStorage]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      // Auto-save when moving back
      saveToStorage();
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, saveToStorage]);

  const handleSaveResume = async () => {
    setIsLoading(true);
    try {
      if (!resumeData.personalInfo?.firstName || !resumeData.personalInfo?.lastName) {
        toast.error('Identity Protocol Error: Name required.');
        return;
      }
      toast.loading('Synchronizing architecture...', { id: 'save-resume' });
      
      // Robust cleaning of all resume sections
      const cleanedWorkExperience = (resumeData.workExperience || []).filter(
        (exp) => exp.jobTitle?.trim() && exp.company?.trim()
      );

      const cleanedEducation = (resumeData.education || []).filter(
        (edu) => edu.institution?.trim() && edu.degree?.trim()
      );

      const cleanedSkills = (resumeData.skills || []).filter(
        (skill) => skill.name?.trim()
      );

      const cleanedProjects = (resumeData.projects || []).filter(
        (proj) => proj.name?.trim()
      );

      const cleanedCertifications = (resumeData.certifications || []).filter(
        (cert) => cert.name?.trim() && cert.issuer?.trim()
      );

      const cleanedLanguages = (resumeData.languages || []).filter(
        (lang) => lang.name?.trim()
      );

      const resumeToSave = {
        ...resumeData,
        workExperience: cleanedWorkExperience,
        education: cleanedEducation,
        skills: cleanedSkills,
        projects: cleanedProjects,
        certifications: cleanedCertifications,
        languages: cleanedLanguages,
        title: resumeData.title || `${resumeData.personalInfo.firstName} ${resumeData.personalInfo.lastName} Architecture`,
        template: resumeData.template || resumeData.templateId || 'template01',
        templateId: resumeData.template || resumeData.templateId || 'template01',
        isPublic: resumeData.isPublic ?? false,
        optimizedLatexCode: aiData?.optimizedLatexCode,
        personalInfo: {
          ...resumeData.personalInfo,
          linkedinUrl: resumeData.personalInfo?.linkedinUrl || '',
          portfolioUrl: resumeData.personalInfo?.portfolioUrl || '',
          githubUrl: resumeData.personalInfo?.githubUrl || '',
          websiteUrl: resumeData.personalInfo?.websiteUrl || '',
          professionalTitle: resumeData.personalInfo?.professionalTitle || ''
        }
      };

      const resumeId = resumeData._id || resumeData.id;
      let result;
      
      if (resumeId && !resumeData['temp-id']) {
        const updatedData = await resumeService.updateResume(resumeId, resumeToSave);
        result = { success: true, data: updatedData };
      } else {
        result = await resumeService.createResume(resumeToSave);
      }

      if (result.success) {
        const savedResumeId = result.data?._id || result.data?.id || resumeId;
        
        // Also save the PDF to the database if we have it in cache
        if (aiData.pdfBlob && savedResumeId && !resumeData['temp-id']) {
          try {
            await resumeService.savePDFToDatabase(savedResumeId, {
              templateId: resumeToSave.templateId,
              optimizedLatexCode: aiData.optimizedLatexCode,
              pdfBlob: aiData.pdfBlob,
              resumeData: resumeToSave,
              jobOptimized: aiData.optimizedForJob
            });
            console.log('✅ PDF also finalized and saved to repository.');
          } catch (pdfError) {
            console.warn('⚠️ PDF finalization failed, but JSON architecture saved.', pdfError);
          }
        }

        toast.success('✅ Repository Updated. Architecture Finalized.', { id: 'save-resume' });
        
        // Update local state with the saved data
        if (result.data) {
          updateResumeData(result.data);
        }
        
        setIsDirty(false); // Reset dirty state after successful save
        
        // Clear persistence and navigate back to dashboard after a short delay
        localStorage.removeItem('resume-builder-current-step');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        toast.error(result.message || 'Sync failed.', { id: 'save-resume' });
      }
    } catch (error: any) {
      console.error('Finalize save error:', error);
      toast.error('Sync failed. Please check your connection.', { id: 'save-resume' });
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
    return {
      data: (resumeData as any)[stepId], // Pass data relevant to the step
      onChange: (data: any) => {
        handleDataChange(stepId, data);
        // isDirty is handled by context's handleDataChange
      }
    };
  };

  const handleConfirmDiscard = () => {
    setIsDirty(false); // Discard changes
    setShowCustomPrompt(false);
    if (pendingNavigationAction) {
      pendingNavigationAction();
    }
    setPendingNavigationAction(null);
  };

  const handleCancelNavigation = () => {
    setShowCustomPrompt(false);
    setPendingNavigationAction(null);
  };

  const handleDashboardNavigation = useCallback(() => {
    triggerNavigation(() => {
        // Clear step persistence on explicit exit if confirmed
        localStorage.removeItem('resume-builder-current-step');
        navigate('/dashboard');
    }, true);
  }, [triggerNavigation, navigate]);


  return (
    <div className="min-h-screen bg-[#FAFAFB] space-y-8 pb-20 animate-slide-up-soft">
      {/* --- HEADER ARCHITECTURE --- */}
      <div className="bg-white border-b border-surface-200 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15]" />
        
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-10 h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <button
              onClick={handleDashboardNavigation}
              className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue transition-all shadow-sm group"
            >
              <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em]">Module</span>
                <span className="text-xs font-black text-brand-dark uppercase tracking-widest">Builder Core 4.0</span>
              </div>
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Step {currentStep + 1} of {steps.length}: {currentStepData.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-32 bg-surface-100 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-brand-blue h-full rounded-full shadow-[0_0_10px_rgba(26,145,240,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-brand-dark uppercase tracking-widest">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-3 border-l border-surface-100 pl-6">
              {resumeData._id ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-success/5 border border-brand-success/20 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                  <span className="text-[9px] font-black text-brand-success uppercase tracking-widest">Repository Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-orange/5 border border-brand-orange/20 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest">Local Session</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 md:px-10">
        <div className={`grid grid-cols-1 gap-2 lg:gap-10 ${currentStep === steps.length - 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-12'}`}>
          
          {/* Side Navigation */}
          {currentStep !== steps.length - 1 && (
            <div className="lg:col-span-4 hidden lg:block">
              <div className="bg-white border border-surface-200 rounded-[2.5rem] p-6 shadow-sm sticky top-24">
                <div className="px-4 mb-6">
                  <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Architecture Nodes</h3>
                </div>
                <nav className="space-y-1.5">
                  {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    const Icon = step.icon;
                    return (
                      <button
                        key={step.id}
                        onClick={() => handleStepClick(index)}
                        className={`w-full flex items-center gap-4 px-4 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
                          status === 'current'
                            ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20 scale-[1.02]'
                            : status === 'completed'
                            ? 'bg-brand-success/5 text-brand-success hover:bg-brand-success/10'
                            : 'text-text-secondary hover:bg-surface-50 hover:text-brand-dark'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          status === 'current' ? 'bg-white/20 text-white' : 'bg-surface-50 text-text-tertiary group-hover:text-brand-dark shadow-inner'
                        }`}>
                          {status === 'completed' ? <CheckCircleIcon className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        <span className="flex-1 text-left truncate tracking-tight">{step.title}</span>
                        {step.required && status !== 'completed' && <span className="w-1 h-1 rounded-full bg-red-400" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* Main Content Node */}
          <div className={currentStep === steps.length - 1 ? 'lg:col-span-1' : 'lg:col-span-8'}>
            <div className="bg-white border border-surface-200 rounded-xl md:rounded-[3rem] p-3 md:p-16 shadow-sm relative overflow-hidden group min-h-[500px] flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px:32px] opacity-[0.05] pointer-events-none" />
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 mb-4 md:mb-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <StepIcon className="w-8 h-8" />
                      </div>
                      <h2 className="text-3xl font-black text-brand-dark tracking-tighter uppercase">{currentStepData.title}</h2>
                    </div>
                    <p className="text-text-secondary font-bold opacity-70 ml-1">{currentStepData.description}</p>
                  </div>
                </div>

                <div className="flex-1">
                  {currentStep === steps.length - 1 ? (
                    <EnterpriseResumeEnhancer
                      resume={resumeData as Resume}
                      onResumeUpdate={updateResumeData}
                      hasUnsavedChanges={false}
                      onJobOptimizationClick={() => setIsJobOptimizationModalOpen(true)}
                      onSwitchToPreview={() => setShouldSwitchToPreview(true)}
                      shouldSwitchToPreview={shouldSwitchToPreview}
                      onPreviewSwitched={() => setShouldSwitchToPreview(false)}
                    />
                  ) : (
                    <StepComponent {...getStepProps(currentStepData.id)} />
                  )}
                </div>

                {/* Internal Navigation Buttons */}
                <div className="mt-8 md:mt-16 pt-6 md:pt-10 border-t border-surface-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 sm:gap-0">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="w-full sm:w-auto px-4 py-3 md:px-8 md:py-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary hover:text-brand-dark disabled:opacity-30 transition-all flex items-center justify-center sm:justify-start gap-2"
                  >
                    ← Previous
                  </button>
                  
                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="w-full sm:w-auto btn-primary px-6 py-3 md:px-10 md:py-4 text-xs md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 group active:scale-95 transition-all"
                    >
                      Process & Next <ChevronRightIcon className="w-4 h-4 stroke-[3] group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveResume}
                      disabled={isLoading}
                      className="w-full sm:w-auto btn-primary px-6 py-3 md:px-12 md:py-4 text-xs md:text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      <CloudIcon className="w-5 h-5 stroke-[2.5]" />
                      Finalize
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AILoadingOverlay
        isVisible={aiImprovementProgress.isLoading}
        title="Logic Optimization Active"
        description="Synthesizing final architectural improvements for deployment."
        progress={aiImprovementProgress.progress}
        currentStep={aiImprovementProgress.currentStep}
        estimatedTime={aiImprovementProgress.estimatedTime}
        onCancel={aiImprovementProgress.cancelProgress}
      />
      
      <JobOptimizationModal
        isOpen={isJobOptimizationModalOpen}
        onClose={() => setIsJobOptimizationModalOpen(false)}
        onSwitchToPreview={() => setShouldSwitchToPreview(true)}
      />

      {/* Navigation Confirmation Modal */}
      <AnimatePresence>
        {showCustomPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-dark/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-surface-200 rounded-[3rem] p-10 text-center max-w-lg w-full shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
              <div className="relative z-10 space-y-6">
                <ExclamationTriangleIcon className="w-16 h-16 text-brand-orange mx-auto" />
                <h3 className="text-2xl font-black text-brand-dark">
                  {isExternalNavigation ? "Unsaved Changes Detected." : "Node Completion Verification."}
                </h3>
                <p className="text-text-secondary font-bold opacity-70">
                  {isExternalNavigation 
                    ? "You have unsaved changes in your resume architecture. Are you sure you want to navigate away and discard them?"
                    : "Confirm that you have finalized all data parameters for the current node before proceeding to the next architectural layer."}
                </p>
                <div className="flex justify-center gap-4">
                  <button onClick={handleCancelNavigation} className="btn-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest">
                    {isExternalNavigation ? "Stay & Continue" : "Remain on Node"}
                  </button>
                  <button onClick={handleConfirmDiscard} className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest">
                    {isExternalNavigation ? "Discard & Exit" : "Proceed to Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ComprehensiveResumeBuilder() {
  const location = useLocation();
  const initialData = location.state?.resumeData;
  const templateId = location.state?.templateId || 'template01';
  return (
    <ResumeProvider initialData={{ ...initialData, template: templateId }}>
      <ComprehensiveResumeBuilderContent />
    </ResumeProvider>
  );
}