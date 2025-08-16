import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PersonalInfoForm } from '../../components/resume/PersonalInfoForm';
import { ProfessionalSummaryForm } from '../../components/resume/ProfessionalSummaryForm';
import { WorkExperienceForm } from '../../components/resume/WorkExperienceForm';
import { EducationForm } from '../../components/resume/EducationForm';
import { SkillsForm } from '../../components/resume/SkillsForm';
import { useResumeStore } from '../../stores/resumeStore';
import { ResumeData } from '../../services/resumeService';
import { toast } from 'sonner';

const steps = [
  { id: 'personal', title: 'Personal Information', component: PersonalInfoForm },
  { id: 'summary', title: 'Professional Summary', component: ProfessionalSummaryForm },
  { id: 'experience', title: 'Work Experience', component: WorkExperienceForm },
  { id: 'education', title: 'Education', component: EducationForm },
  { id: 'skills', title: 'Skills', component: SkillsForm },
];

const resumeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone is required'),
    location: z.string().min(1, 'Location is required'),
    linkedinUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
    githubUrl: z.string().optional(),
  }),
  professionalSummary: z.string().min(1, 'Professional summary is required'),
  workExperience: z.array(z.object({
    jobTitle: z.string().min(1, 'Job title is required'),
    company: z.string().min(1, 'Company is required'),
    location: z.string().min(1, 'Location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    isCurrentJob: z.boolean(),
    responsibilities: z.array(z.string()),
    achievements: z.array(z.string()),
  })),
  education: z.array(z.object({
    institution: z.string().min(1, 'Institution is required'),
    degree: z.string().min(1, 'Degree is required'),
    fieldOfStudy: z.string().min(1, 'Field of study is required'),
    graduationDate: z.string().min(1, 'Graduation date is required'),
    gpa: z.string().optional(),
    honors: z.array(z.string()).optional(),
  })),
  skills: z.array(z.object({
    name: z.string().min(1, 'Skill name is required'),
    category: z.enum(['technical', 'soft', 'language', 'certification']),
    proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  })),
  certifications: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    expirationDate: z.string().optional(),
    credentialId: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  languages: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    proficiency: z.enum(['native', 'fluent', 'conversational', 'basic']),
  })).optional(),
  projects: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.array(z.string()),
    technologies: z.array(z.string()),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).optional(),
  templateId: z.string().default('modern-1'),
  isPublic: z.boolean().default(false),
});

type ResumeFormData = z.infer<typeof resumeSchema>;

export default function CreateResume() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const { createResume, loadingState } = useResumeStore();

  const form = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      title: 'My Resume',
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        linkedinUrl: '',
        portfolioUrl: '',
        githubUrl: '',
      },
      professionalSummary: '',
      workExperience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      templateId: 'modern-1',
      isPublic: false,
    },
  });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: ResumeFormData) => {
    try {
      const resume = await createResume({
        title: data.title || 'My Resume',
        ...data
      } as any);
      toast.success('Resume created successfully!');
      navigate(`/resume/${resume._id}`);
    } catch (error) {
      toast.error('Failed to create resume. Please try again.');
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen gradient-dark py-8 animate-slide-up-soft">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/resume-builder')}
            className="flex items-center text-dark-text-secondary hover:text-dark-text-primary mb-4 transition-colors duration-200"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Back to Resume Builder
          </button>
          
          <h1 className="text-3xl font-bold gradient-text-dark mb-2">Create Your Resume</h1>
          <p className="text-dark-text-secondary">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-tertiary text-dark-text-muted'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-dark-tertiary'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="card-dark p-6 mb-8">
            <CurrentStepComponent
              form={form}
              data={form.watch('professionalSummary')}
              onChange={(value: string) => form.setValue('professionalSummary', value)}
              resumeData={form.getValues()}
            />
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="btn-secondary-dark"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                type="submit"
                isLoading={loadingState === 'loading'}
                className="btn-primary-dark"
              >
                Create Resume
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                className="btn-primary-dark"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}