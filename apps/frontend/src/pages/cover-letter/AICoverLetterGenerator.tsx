import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  SparklesIcon,
  RocketLaunchIcon,
  DocumentTextIcon,
  LinkIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useResumeStore } from '../../stores/resumeStore';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';

const aiCoverLetterSchema = z.object({
  jobUrl: z.string().url('Please enter a valid job URL'),
  resumeId: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'conservative']),
  customInstructions: z.string().optional(),
});

type AICoverLetterFormData = z.infer<typeof aiCoverLetterSchema>;

interface JobAnalysis {
  jobTitle: string;
  companyName: string;
  location: string;
  experienceLevel: string;
  employmentType: string;
  skills: string[];
  requirements: string[];
  confidence: number;
  companyInfo?: {
    industry: string;
    size: string;
    description: string;
  };
}

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  icon: React.ElementType;
}

export default function AICoverLetterGenerator() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<any>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    {
      id: 'fetch',
      title: 'Fetching Job Posting',
      description: 'Retrieving job details from the provided URL',
      status: 'pending',
      icon: LinkIcon
    },
    {
      id: 'analyze',
      title: 'AI Job Analysis',
      description: 'Analyzing job requirements, skills, and company information',
      status: 'pending',
      icon: SparklesIcon
    },
    {
      id: 'match',
      title: 'Resume Matching',
      description: 'Matching your background with job requirements',
      status: 'pending',
      icon: ChartBarIcon
    },
    {
      id: 'generate',
      title: 'Writing Cover Letter',
      description: 'Crafting a personalized, compelling cover letter',
      status: 'pending',
      icon: DocumentTextIcon
    }
  ]);

  const { resumes, fetchResumes } = useResumeStore();

  const form = useForm<AICoverLetterFormData>({
    resolver: zodResolver(aiCoverLetterSchema),
    defaultValues: {
      jobUrl: '',
      resumeId: '',
      tone: 'professional',
      customInstructions: '',
    },
  });

  const { register, handleSubmit, formState: { errors }, watch } = form;

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const updateStepStatus = (stepId: string, status: GenerationStep['status']) => {
    setGenerationSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const simulateStepProgress = async () => {
    const steps = ['fetch', 'analyze', 'match', 'generate'];
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      updateStepStatus(steps[i], 'processing');
      
      // Simulate different processing times
      const delays = [1500, 3000, 2000, 4000]; // Realistic processing times
      await new Promise(resolve => setTimeout(resolve, delays[i]));
      
      if (!isGenerating) break; // Stop if user cancelled
      
      updateStepStatus(steps[i], 'completed');
    }
  };

  const onSubmit = async (data: AICoverLetterFormData) => {
    try {
      setIsGenerating(true);
      setJobAnalysis(null);
      setGeneratedCoverLetter(null);
      
      // Reset all steps to pending
      setGenerationSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));

      // Start the visual progress simulation
      const progressPromise = simulateStepProgress();

      // Make the actual API call
      const apiPromise = coverLetterService.aiGenerateFromUrl({
        jobUrl: data.jobUrl,
        resumeId: data.resumeId,
        tone: data.tone,
        customInstructions: data.customInstructions
      });

      // Wait for both to complete
      const [apiResult] = await Promise.all([apiPromise, progressPromise]);

      if (apiResult.success) {
        setJobAnalysis(apiResult.data.jobAnalysis);
        setGeneratedCoverLetter(apiResult.data.coverLetter);
        
        toast.success(
          `✨ AI Cover Letter Generated! 
           Job Analysis Confidence: ${apiResult.data.jobAnalysis.confidence}%`
        );
      } else {
        throw new Error(apiResult.message || 'Failed to generate cover letter');
      }

    } catch (error: any) {
      console.error('Error generating AI cover letter:', error);
      
      // Mark current step as error
      if (currentStep < generationSteps.length) {
        updateStepStatus(generationSteps[currentStep].id, 'error');
      }
      
      toast.error(error.message || 'Failed to generate cover letter. Please check the URL and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    form.reset();
    setJobAnalysis(null);
    setGeneratedCoverLetter(null);
    setGenerationSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-4 xs:py-6 sm:py-8 px-2 xs:px-3 sm:px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 xs:mb-8 sm:mb-12">
          <div className="flex items-center justify-center space-x-2 mb-3 xs:mb-4">
            <RocketLaunchIcon className="w-6 h-6 xs:w-8 xs:h-8 text-accent-primary" />
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent">
              AI Cover Letter Generator
            </h1>
          </div>
          <p className="text-sm xs:text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Paste any job URL and let our AI analyze the posting, match it with your resume, and create a personalized cover letter in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xs:gap-8">
          {/* Left Column - Form */}
          <div className="space-y-4 xs:space-y-6">
            <Card className="p-4 xs:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 xs:space-y-6">
                {/* Job URL Input */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Job Posting URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      {...register('jobUrl')}
                      placeholder="https://linkedin.com/jobs/view/123456789"
                      className="pl-10"
                      disabled={isGenerating}
                    />
                  </div>
                  {errors.jobUrl && (
                    <p className="text-red-400 text-sm mt-1">{errors.jobUrl.message}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    Works with LinkedIn, Indeed, Glassdoor, and most job sites
                  </p>
                </div>

                {/* Resume Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Select Resume (Optional)
                  </label>
                  <Select
                    {...register('resumeId')}
                    disabled={isGenerating}
                  >
                    <option value="">No specific resume (use profile data)</option>
                    {resumes.map((resume) => (
                      <option key={resume._id} value={resume._id}>
                        {resume.title || `${resume.personalInfo.firstName} ${resume.personalInfo.lastName} Resume`}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Writing Tone
                  </label>
                  <Select
                    {...register('tone')}
                    disabled={isGenerating}
                  >
                    <option value="professional">Professional - Formal and polished</option>
                    <option value="enthusiastic">Enthusiastic - Energetic and passionate</option>
                    <option value="casual">Casual - Conversational yet respectful</option>
                    <option value="conservative">Conservative - Traditional business tone</option>
                  </Select>
                </div>

                {/* Custom Instructions */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Custom Instructions (Optional)
                  </label>
                  <Textarea
                    {...register('customInstructions')}
                    placeholder="Any specific points you want to highlight or mention..."
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col xs:flex-row gap-3">
                  <Button
                    type="submit"
                    className="flex-1 relative overflow-hidden"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <SparklesIcon className="w-4 h-4 mr-2 animate-pulse" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RocketLaunchIcon className="w-4 h-4 mr-2" />
                        Generate AI Cover Letter
                      </>
                    )}
                  </Button>
                  
                  {(jobAnalysis || isGenerating) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={isGenerating}
                      className="xs:w-auto"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            {/* AI Features Highlight */}
            <Card className="p-4 xs:p-6 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border-accent-primary/20">
              <div className="flex items-center space-x-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-accent-primary" />
                <h3 className="text-lg font-semibold text-white">AI-Powered Features</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Smart job posting analysis from any website</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Automatic skills and requirements matching</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Company research and personalization</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>ATS-optimized content generation</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Right Column - Progress & Results */}
          <div className="space-y-4 xs:space-y-6">
            {/* Generation Progress */}
            {(isGenerating || jobAnalysis) && (
              <Card className="p-4 xs:p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generation Progress</h3>
                <div className="space-y-3">
                  {generationSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep && isGenerating;
                    const isCompleted = step.status === 'completed';
                    const hasError = step.status === 'error';
                    
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                          isActive 
                            ? 'bg-accent-primary/20 border-accent-primary/40' 
                            : isCompleted
                            ? 'bg-green-500/20 border-green-500/40'
                            : hasError
                            ? 'bg-red-500/20 border-red-500/40'
                            : 'bg-surface-50/50 border-dark-secondary'
                        }`}
                      >
                        <Icon 
                          className={`w-5 h-5 ${
                            isActive 
                              ? 'text-accent-primary animate-pulse' 
                              : isCompleted
                              ? 'text-green-400'
                              : hasError
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`} 
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">{step.title}</div>
                          <div className="text-xs text-gray-400">{step.description}</div>
                        </div>
                        {isCompleted && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Job Analysis Results */}
            {jobAnalysis && (
              <Card className="p-4 xs:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Job Analysis</h3>
                  <div className="flex items-center space-x-1">
                    <ChartBarIcon className="w-4 h-4 text-accent-tertiary" />
                    <span className="text-sm text-accent-tertiary font-medium">
                      {jobAnalysis.confidence}% Confidence
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-accent-primary">{jobAnalysis.jobTitle}</h4>
                    <p className="text-sm text-gray-300">{jobAnalysis.companyName} • {jobAnalysis.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Experience:</span>
                      <p className="text-white capitalize">{jobAnalysis.experienceLevel.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <p className="text-white capitalize">{jobAnalysis.employmentType.replace('-', ' ')}</p>
                    </div>
                  </div>

                  {jobAnalysis.skills.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-sm">Key Skills Matched:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {jobAnalysis.skills.slice(0, 6).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {jobAnalysis.skills.length > 6 && (
                          <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                            +{jobAnalysis.skills.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {jobAnalysis.companyInfo && (
                    <div className="pt-3 border-t border-dark-secondary">
                      <p className="text-xs text-gray-400">
                        <span className="font-medium">{jobAnalysis.companyInfo.industry}</span> • {jobAnalysis.companyInfo.size} company
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Generated Cover Letter */}
            {generatedCoverLetter && (
              <Card className="p-4 xs:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Cover Letter</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard/cover-letter')}
                    className="text-xs"
                  >
                    View Full <ArrowRightIcon className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                
                <div className="bg-white p-4 rounded-lg text-black text-sm">
                  <div className="whitespace-pre-wrap">
                    {generatedCoverLetter.content.substring(0, 300)}...
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-400">
                  <p>✨ Full cover letter saved to your dashboard</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
