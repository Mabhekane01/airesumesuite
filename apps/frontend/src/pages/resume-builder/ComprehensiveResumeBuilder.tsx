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
  ArrowDownTrayIcon,
  CloudIcon
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
  const { 
    resumeData, 
    aiData, 
    updateResumeData, 
    updateAIData, 
    handleDataChange, 
    isLoading: isContextLoading,
    // Enhanced PDF management
    savePdfToLibrary,
    downloadPdf,
    deleteSavedPdf,
    generateResumeHash,
    setCachedPdf,
    isCacheValid,
    hasRequiredFields
  } = useResume();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<number>(aiData.atsScore);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isJobOptimizationModalOpen, setIsJobOptimizationModalOpen] = useState(false);
  const [shouldSwitchToPreview, setShouldSwitchToPreview] = useState(false);
  
  // AI Progress for final step improvement
  const aiImprovementProgress = useAIProgress('professional-summary');
  
  // Track if user has made changes since last AI analysis
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState<string>('');

  // Track resume changes and invalidate PDF cache
  useEffect(() => {
    const currentHash = generateResumeHash();
    
    // Check if content has changed since last analysis AND user has required fields
    if (lastAnalyzedHash && currentHash !== lastAnalyzedHash) {
      const hasRequired = hasRequiredFields(resumeData);
      console.log('🔍 Content change detected:', {
        currentHash: currentHash.substring(0, 8),
        lastAnalyzedHash: lastAnalyzedHash.substring(0, 8),
        hasRequiredFields: hasRequired,
        personalInfo: !!resumeData.personalInfo?.firstName,
        summary: !!resumeData.professionalSummary,
        workExperience: resumeData.workExperience?.length || 0
      });
      
      if (hasRequired) {
        console.log('📝 User input changed since last AI analysis (required fields complete)');
      } else {
        console.log('📝 User input changed but required fields incomplete');
      }
    }
    
    // If resume content changed and we have a cached PDF, invalidate it
    if (!isCacheValid(currentHash) && aiData.cachedPdfUrl) {
      console.log('📄 Resume content changed, PDF will regenerate on next preview');
      // Don't clear immediately - let the preview component handle regeneration
    }
  }, [resumeData, aiData.cachedPdfUrl, lastAnalyzedHash]);
  
  // Subscription modal

  useEffect(() => {
    // Get template ID from state or URL parameters
    const urlParams = new URLSearchParams(location.search);
    const templateId = location.state?.templateId || urlParams.get('templateId');
    const isLatexTemplate = location.state?.isLatexTemplate || urlParams.get('isLatexTemplate') === 'true';
    
    if (templateId) {
      updateResumeData({ 
        template: templateId,
        isLatexTemplate: isLatexTemplate 
      });
    }

    // Check for edit mode
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
    // Simply navigate to the preview step where users can explore AI features
    setCurrentStep(steps.findIndex(step => step.id === 'preview'));
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

      toast.loading('Saving resume and generating PDF...', { id: 'save-resume' });
      console.log('💾 Saving resume with PDF to database');

      // Clean and prepare resume data for saving
      const cleanResumeData = {
        ...resumeData,
        // Remove empty certifications
        certifications: (resumeData.certifications || []).filter(cert => 
          cert && cert.name && cert.name.trim() && cert.issuer && cert.issuer.trim()
        ),
        // Remove empty projects  
        projects: (resumeData.projects || []).filter(project => 
          project && project.name && project.name.trim()
        ),
        // Remove empty work experience
        workExperience: (resumeData.workExperience || []).filter(work => 
          work && work.company && work.company.trim() && work.position && work.position.trim()
        ),
        // Remove empty education
        education: (resumeData.education || []).filter(edu => 
          edu && edu.institution && edu.institution.trim()
        ),
        // Remove empty volunteer experience
        volunteerExperience: (resumeData.volunteerExperience || []).filter(vol => 
          vol && vol.organization && vol.organization.trim()
        ),
        // Remove empty awards
        awards: (resumeData.awards || []).filter(award => 
          award && award.title && award.title.trim()
        ),
        // Remove empty languages
        languages: (resumeData.languages || []).filter(lang => 
          lang && lang.name && lang.name.trim()
        ),
        // Remove empty hobbies
        hobbies: (resumeData.hobbies || []).filter(hobby => 
          hobby && hobby.name && hobby.name.trim()
        )
      };

      // First save the resume data
      const resumeToSave = {
        title: `${cleanResumeData.personalInfo?.firstName || 'My'} ${cleanResumeData.personalInfo?.lastName || 'Resume'}`,
        personalInfo: {
          ...cleanResumeData.personalInfo,
          location: cleanResumeData.personalInfo?.location || await getDefaultLocation()
        },
        professionalSummary: cleanResumeData.professionalSummary,
        workExperience: cleanResumeData.workExperience || [],
        education: cleanResumeData.education || [],
        skills: cleanResumeData.skills || [],
        certifications: cleanResumeData.certifications || [],
        languages: cleanResumeData.languages || [],
        projects: cleanResumeData.projects || [],
        volunteerExperience: cleanResumeData.volunteerExperience || [],
        awards: cleanResumeData.awards || [],
        hobbies: cleanResumeData.hobbies || [],
        templateId: resumeData.template,
        isPublic: false,
        isLatexTemplate: resumeData.isLatexTemplate,
        optimizedLatexCode: aiData?.optimizedLatexCode
      };

      const result = await resumeService.createResume(resumeToSave);
      
      if (!result.success || !result.data?._id) {
        throw new Error(result.message || 'Failed to save resume');
      }

      // Properly convert ObjectId to string
      let resumeId = '';
      const rawId = result.data._id;
      
      console.log('🔍 Raw ID received:', rawId, 'Type:', typeof rawId, 'Constructor:', rawId?.constructor?.name);
      
      if (typeof rawId === 'string') {
        resumeId = rawId;
      } else if (rawId && rawId.buffer && rawId.buffer.data && Array.isArray(rawId.buffer.data)) {
        // Handle MongoDB ObjectId Buffer format
        const bytes = Array.from(rawId.buffer.data);
        resumeId = bytes.map((b: number) => b.toString(16).padStart(2, '0')).join('');
      } else if (rawId && rawId.toString && typeof rawId.toString === 'function') {
        const stringResult = rawId.toString();
        if (stringResult !== '[object Object]') {
          resumeId = stringResult;
        } else {
          resumeId = JSON.stringify(rawId);
        }
      } else {
        resumeId = String(rawId);
      }
      
      console.log('✅ Resume saved with ID:', resumeId, 'Type:', typeof resumeId);

      // Update local resume data with saved ID
      updateResumeData({ ...resumeData, _id: resumeId });

      // Now generate and save PDF with the latest resume data
      let pdfBlob: Blob;
      
      // Check if we have cached PDF that matches current data
      const currentHash = generateResumeHash(resumeData);
      const hasCachedPdf = aiData?.cachedPdfUrl && isCacheValid(currentHash) && aiData.pdfBlob;
      
      if (hasCachedPdf) {
        console.log('📄 Using cached PDF for save');
        pdfBlob = aiData.pdfBlob!;
      } else {
        console.log('🔄 Generating fresh PDF for save...');
        
        const templateId = resumeData.template || 'modern-creative-1';
        const isLatexTemplateId = (templateId: string): boolean => {
          return templateId?.startsWith('template') && !templateId.includes('modern-creative');
        };
        const isLatexTemplate = resumeData.isLatexTemplate || isLatexTemplateId(templateId);
        
        // Generate PDF with current resume data
        pdfBlob = await resumeService.downloadResumeWithEngine(resumeData, 'pdf', {
          engine: isLatexTemplate ? 'latex' : 'html',
          templateId: templateId,
          optimizedLatexCode: aiData?.optimizedLatexCode
        });
        
        // Cache the generated PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setCachedPdf(pdfUrl, currentHash, pdfBlob);
      }

      // Save PDF to database
      await resumeService.savePDFToDatabase(resumeId, {
        templateId: resumeData.template || 'modern-creative-1',
        optimizedLatexCode: aiData?.optimizedLatexCode,
        jobOptimized: aiData?.optimizedForJob,
        resumeData: resumeToSave,
        pdfBlob: pdfBlob
      });

      toast.success('✅ Resume and PDF saved successfully!', { id: 'save-resume' });
      console.log('🎉 Complete save successful - resume data + PDF saved');
      
    } catch (error: any) {
      console.error('❌ Failed to save resume:', error);
      toast.error(error.message || 'Failed to save resume. Please try again.', { id: 'save-resume' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadResume = async (format: 'pdf') => {
    setIsLoading(true);
    try {
      const startTime = performance.now();
      console.log(`🚀 Starting ${format.toUpperCase()} download...`);
      
      let blob: Blob;
      
      // Check if we have a cached PDF from preview
      const currentHash = generateResumeHash(resumeData);
      const hasCachedPdf = aiData?.cachedPdfUrl && isCacheValid(currentHash);
      
      if (hasCachedPdf && aiData.pdfBlob) {
        console.log('📄 Using cached preview PDF for download');
        blob = aiData.pdfBlob;
      } else {
        console.log('🔄 Generating fresh PDF with current resume data...');
        
        // Determine if this is a LaTeX template
        const templateId = resumeData.template || 'modern-creative-1';
        const isLatexTemplateId = (templateId: string): boolean => {
          return templateId?.startsWith('template') && !templateId.includes('modern-creative');
        };
        const isLatexTemplate = resumeData.isLatexTemplate || isLatexTemplateId(templateId);
        
        // Get optimized LaTeX code from AI data if available
        const optimizedLatexCode = aiData?.optimizedLatexCode;
        
        console.log('📋 Download context:', {
          templateId,
          isLatexTemplate,
          hasOptimizedLatex: !!optimizedLatexCode,
          format
        });
        
        // Generate PDF with current resume data
        blob = await resumeService.downloadResumeWithEngine(resumeData, format, {
          engine: isLatexTemplate ? 'latex' : 'html',
          templateId: templateId,
          optimizedLatexCode: optimizedLatexCode
        });
        
        // Cache the generated PDF for future downloads
        const pdfUrl = URL.createObjectURL(blob);
        setCachedPdf(pdfUrl, currentHash, blob);
        console.log('💾 PDF cached for future use');
      }
      
      const endTime = performance.now();
      console.log(`⚡ Download completed in ${(endTime - startTime).toFixed(0)}ms`);
      
      // Generate optimized filename with proper null checks
      const firstName = resumeData.personalInfo?.firstName || '';
      const lastName = resumeData.personalInfo?.lastName || '';
      const sanitizedFirstName = firstName ? firstName.replace(/[^\w\s-]/g, '').trim() : 'Resume';
      const sanitizedLastName = lastName ? lastName.replace(/[^\w\s-]/g, '').trim() : '';
      const fileName = `${sanitizedFirstName}${sanitizedLastName ? `_${sanitizedLastName}` : ''}_Resume.${format}`;
      
      // Download the PDF
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup download URL (not the cached one)
      requestAnimationFrame(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      });
      
      toast.success(`${format.toUpperCase()} downloaded successfully!`);
      
    } catch (error) {
      console.error('Failed to download resume:', error);
      toast.error('Failed to download resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePDFToDatabase = async () => {
    if (!resumeData._id || (typeof resumeData._id === 'string' && resumeData._id.includes('temp'))) {
      toast.error('Please save your resume first before saving PDF to database');
      return;
    }

    setIsLoading(true);
    try {
      console.log('💾 Saving PDF to database with current resume data...');
      
      let pdfBlob: Blob;
      
      // Check if we have a cached PDF that matches current data
      const currentHash = generateResumeHash(resumeData);
      const hasCachedPdf = aiData?.cachedPdfUrl && isCacheValid(currentHash) && aiData.pdfBlob;
      
      if (hasCachedPdf) {
        console.log('📄 Using cached PDF for database save');
        pdfBlob = aiData.pdfBlob!;
      } else {
        console.log('🔄 Generating fresh PDF with current resume data for database save...');
        
        const templateId = resumeData.template || 'modern-creative-1';
        const isLatexTemplateId = (templateId: string): boolean => {
          return templateId?.startsWith('template') && !templateId.includes('modern-creative');
        };
        const isLatexTemplate = resumeData.isLatexTemplate || isLatexTemplateId(templateId);
        const optimizedLatexCode = aiData?.optimizedLatexCode;
        
        // Generate PDF with current resume data
        pdfBlob = await resumeService.downloadResumeWithEngine(resumeData, 'pdf', {
          engine: isLatexTemplate ? 'latex' : 'html',
          templateId: templateId,
          optimizedLatexCode: optimizedLatexCode
        });
        
        // Cache the generated PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setCachedPdf(pdfUrl, currentHash, pdfBlob);
        console.log('💾 PDF cached after generation');
      }

      // Save PDF to database with current resume data
      let resumeId = resumeData._id || resumeData.id;
      let stringResumeId = '';
      
      // Convert MongoDB ObjectId/Buffer to string properly
      if (resumeId) {
        if (typeof resumeId === 'string') {
          stringResumeId = resumeId;
        } else if (resumeId.buffer && resumeId.buffer.data) {
          // Handle MongoDB ObjectId Buffer
          const bytes = Array.from(resumeId.buffer.data);
          stringResumeId = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
        } else if (resumeId.toString && typeof resumeId.toString === 'function') {
          stringResumeId = resumeId.toString();
        } else {
          stringResumeId = String(resumeId);
        }
      }
      
      // If resume hasn't been saved yet or ID is invalid, save it first
      if (!stringResumeId || stringResumeId === '[object Object]' || stringResumeId.length < 10) {
        console.log('💾 Resume not saved yet, saving resume first...');
        
        try {
          // Check if required fields are filled
          const personalInfo = resumeData.personalInfo || {};
          const missingFields = [];
          
          if (!personalInfo.firstName) missingFields.push('First Name');
          if (!personalInfo.lastName) missingFields.push('Last Name');
          if (!personalInfo.email) missingFields.push('Email');
          if (!personalInfo.phone) missingFields.push('Phone');
          if (!personalInfo.location) missingFields.push('Location');
          
          if (missingFields.length > 0) {
            throw new Error(`Please fill in required fields: ${missingFields.join(', ')}`);
          }
          
          // Clean resume data before saving - remove empty entries that would fail validation
          const cleanResumeData = {
            ...resumeData,
            // Remove empty certifications
            certifications: (resumeData.certifications || []).filter(cert => 
              cert && cert.name && cert.name.trim() && cert.issuer && cert.issuer.trim()
            ),
            // Remove empty projects  
            projects: (resumeData.projects || []).filter(project => 
              project && project.name && project.name.trim()
            ),
            // Remove empty work experience
            workExperience: (resumeData.workExperience || []).filter(work => 
              work && work.company && work.company.trim() && work.position && work.position.trim()
            ),
            // Remove empty education
            education: (resumeData.education || []).filter(edu => 
              edu && edu.institution && edu.institution.trim()
            ),
            // Remove empty volunteer experience
            volunteerExperience: (resumeData.volunteerExperience || []).filter(vol => 
              vol && vol.organization && vol.organization.trim()
            ),
            // Remove empty awards
            awards: (resumeData.awards || []).filter(award => 
              award && award.title && award.title.trim()
            ),
            // Remove empty languages
            languages: (resumeData.languages || []).filter(lang => 
              lang && lang.name && lang.name.trim()
            ),
            // Remove empty hobbies
            hobbies: (resumeData.hobbies || []).filter(hobby => 
              hobby && hobby.name && hobby.name.trim()
            )
          };

          // Prepare resume data with required title
          const resumeToSave = {
            ...cleanResumeData,
            title: cleanResumeData.title || `${personalInfo.firstName} ${personalInfo.lastName}'s Resume`,
            personalInfo: personalInfo
          };
          
          const saveResult = await resumeService.createResume(resumeToSave);
          if (saveResult.success && saveResult.data?._id) {
            stringResumeId = String(saveResult.data._id);
            // Update resumeData with the new ID
            updateResumeData({ ...resumeData, _id: saveResult.data._id });
            console.log('✅ Resume saved successfully with ID:', stringResumeId);
          } else {
            throw new Error('Failed to save resume');
          }
        } catch (saveError) {
          console.error('❌ Failed to save resume:', saveError);
          throw new Error('Unable to save resume before generating PDF');
        }
      }
      
      // Final validation before API call
      if (!stringResumeId || stringResumeId === '[object Object]' || stringResumeId.includes('[object')) {
        console.error('❌ CRITICAL: stringResumeId is still invalid:', stringResumeId);
        console.error('❌ Original resumeId was:', resumeId);
        console.error('❌ resumeData._id:', resumeData._id);
        console.error('❌ resumeData.id:', resumeData.id);
        throw new Error('Unable to get valid resume ID after all attempts');
      }
      
      console.log('✅ About to save PDF with valid ID:', stringResumeId);
      
      const result = await resumeService.savePDFToDatabase(stringResumeId, {
        templateId: resumeData.template || resumeData.templateId || 'template01',
        optimizedLatexCode: aiData?.optimizedLatexCode,
        jobOptimized: aiData?.optimizedForJob,
        resumeData: resumeData, // Include current resume data
        pdfBlob: pdfBlob // Include the PDF blob
      });

      if (result.success) {
        toast.success('🎉 PDF saved to database successfully!');
        console.log('✅ PDF saved:', { size: result.size });
      } else {
        throw new Error('Failed to save PDF to database');
      }
    } catch (error) {
      console.error('Failed to save PDF to database:', error);
      toast.error('Failed to save PDF to database. Please try again.');
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
                onClick={() => setCurrentStep(0)}
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
              <div className="w-32 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
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
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : status === 'completed'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'text-dark-text-muted hover:bg-gray-800'
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
                        <StepIcon className="w-6 h-6 text-teal-400 mr-2" />
                        <h2 className="text-2xl font-bold gradient-text-dark">
                          {currentStepData.title}
                        </h2>
                      </div>
                      
                      {/* Manual save status */}
                      <div className="flex items-center space-x-2">
                        {resumeData._id && (typeof resumeData._id !== 'string' || !resumeData._id.includes('temp')) ? (
                          <div className="flex items-center text-green-400 text-sm">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Saved to Account
                          </div>
                        ) : (
                          <div className="flex items-center text-yellow-400 text-sm">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                            Not Saved
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-dark-text-secondary">{currentStepData.description}</p>
                  </div>

                  {currentStep === steps.length - 1 ? (
                    <EnterpriseResumeEnhancer
                      resume={resumeData as Resume}
                      onResumeUpdate={updateResumeData}
                      hasUnsavedChanges={false}
                      onAnalysisComplete={() => {
                        const currentHash = generateResumeHash();
                        setLastAnalyzedHash(currentHash);
                        console.log('🔄 AI analysis completed');
                      }}
                      onJobOptimizationClick={() => setIsJobOptimizationModalOpen(true)}
                      onSwitchToPreview={() => {
                        setShouldSwitchToPreview(true);
                      }}
                      shouldSwitchToPreview={shouldSwitchToPreview}
                      onPreviewSwitched={() => setShouldSwitchToPreview(false)}
                    />
                  ) : (
                    <StepComponent {...getStepProps(currentStepData.id)} />
                  )}
                </Card>
            </div>

            {/* Navigation Buttons - Mobile Responsive */}
            <div className="mt-6">
              {/* Mobile: Stack all buttons vertically, Desktop: Split layout */}
              <div className="flex flex-col gap-3 sm:hidden">
                {/* Previous Button - Full width on mobile */}
                <Button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  variant="outline"
                  className="btn-secondary-dark w-full justify-center"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {/* Final step buttons - Stack on mobile */}
                {currentStep === steps.length - 1 && (
                  <>
                    {/* Save Resume Button - For new resumes */}
                    {(!resumeData._id || (typeof resumeData._id === 'string' && resumeData._id.includes('temp'))) && (
                      <Button
                        onClick={handleSaveResume}
                        variant="default"
                        disabled={isLoading || !resumeData.personalInfo?.firstName || !resumeData.personalInfo?.lastName}
                        className="btn-primary-dark w-full justify-center"
                      >
                        <CloudIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        Save Resume to Account
                      </Button>
                    )}

                    {/* PDF Download - Always available */}
                    <Button
                      onClick={() => handleDownloadResume('pdf')}
                      variant="outline"
                      disabled={isLoading}
                      className="btn-secondary-dark w-full justify-center"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {resumeData.isLatexTemplate ? 'Download LaTeX PDF' : 'Download PDF'}
                      </span>
                    </Button>

                    {/* Update Resume with PDF - For existing resumes */}
                    {resumeData._id && (typeof resumeData._id !== 'string' || !resumeData._id.includes('temp')) && (
                      <Button
                        onClick={handleSavePDFToDatabase}
                        variant="outline"
                        disabled={isLoading}
                        className="btn-secondary-dark w-full justify-center"
                      >
                        <CloudIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        Update Resume & PDF
                      </Button>
                    )}

                  </>
                )}
              </div>

              {/* Desktop: Original justify-between layout */}
              <div className="hidden sm:flex justify-between items-center">
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
                  <div className="flex flex-wrap gap-3">
                    {/* Save Resume Button - For new resumes */}
                    {(!resumeData._id || (typeof resumeData._id === 'string' && resumeData._id.includes('temp'))) && (
                      <Button
                        onClick={handleSaveResume}
                        variant="default"
                        disabled={isLoading || !resumeData.personalInfo?.firstName || !resumeData.personalInfo?.lastName}
                        className="btn-primary-dark"
                      >
                        <CloudIcon className="w-4 h-4 mr-2" />
                        Save Resume to Account
                      </Button>
                    )}

                    {/* PDF Download - Always available */}
                    <Button
                      onClick={() => handleDownloadResume('pdf')}
                      variant="outline"
                      disabled={isLoading}
                      className="btn-secondary-dark"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      {resumeData.isLatexTemplate ? 'Download LaTeX PDF' : 'Download PDF'}
                    </Button>

                    {/* Update Resume with PDF - For existing resumes */}
                    {resumeData._id && (typeof resumeData._id !== 'string' || !resumeData._id.includes('temp')) && (
                      <Button
                        onClick={handleSavePDFToDatabase}
                        variant="outline"
                        disabled={isLoading}
                        className="btn-secondary-dark"
                      >
                        <CloudIcon className="w-4 h-4 mr-2" />
                        Update Resume & PDF
                      </Button>
                    )}

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

              {/* Mobile: Next button for non-final steps */}
              {currentStep !== steps.length - 1 && (
                <div className="flex sm:hidden">
                  <Button
                    onClick={handleNext}
                    disabled={currentStep === steps.length - 1}
                    className="btn-primary-dark w-full justify-center"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </div>
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
        onSwitchToPreview={() => setShouldSwitchToPreview(true)}
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