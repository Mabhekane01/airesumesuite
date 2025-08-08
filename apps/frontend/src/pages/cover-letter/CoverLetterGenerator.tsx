import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  DocumentTextIcon, 
  LinkIcon, 
  SparklesIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  ArrowDownTrayIcon,
  BeakerIcon,
  LightBulbIcon,
  ChartBarIcon,
  ArrowRightIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { useCoverLetterStore } from '../../stores/coverLetterStore';
import { useResumeStore } from '../../stores/resumeStore';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';

const coverLetterSchema = z.object({
  method: z.enum(['manual', 'job-url', 'ai-chat']),
  title: z.string().min(1, 'Title is required'),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(), 
  jobUrl: z.string().url('Valid URL required').optional().or(z.literal('')),
  jobDescription: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'conservative']),
  resumeId: z.string().optional(),
}).refine((data) => {
  // Manual method: requires jobTitle and companyName
  if (data.method === 'manual') {
    return data.jobTitle && data.jobTitle.length > 0 && data.companyName && data.companyName.length > 0;
  }
  // Job URL method: requires jobUrl, AI will extract other info
  if (data.method === 'job-url') {
    return data.jobUrl && data.jobUrl.length > 0;
  }
  // AI Chat method: no specific requirements, handled through chat
  if (data.method === 'ai-chat') {
    return true;
  }
  return true;
}, {
  message: "Please fill in the required fields for your selected method",
  path: ["jobTitle"],
});

type CoverLetterFormData = z.infer<typeof coverLetterSchema>;

export default function CoverLetterGenerator() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'manual' | 'job-url' | 'ai-chat'>('manual');
  const [isScrapingJob, setIsScrapingJob] = useState(false);
  const [scrapedJobData, setScrapedJobData] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    sender: 'user' | 'ai';
    content: string;
    timestamp: string;
  }>>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const { createCoverLetter, generateFromJobUrl, loadingState } = useCoverLetterStore();
  const { resumes, fetchResumes } = useResumeStore();

  const form = useForm<CoverLetterFormData>({
    resolver: zodResolver(coverLetterSchema),
    defaultValues: {
      method: 'manual',
      title: '',
      jobTitle: '',
      companyName: '',
      jobUrl: '',
      jobDescription: '',
      tone: 'professional',
      resumeId: '',
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleJobUrlScrape = async () => {
    const jobUrl = watch('jobUrl');
    if (!jobUrl) return;

    setIsScrapingJob(true);
    try {
      // Use the new AI-powered job analysis instead of hardcoded scraping
      const result = await coverLetterService.aiGenerateFromUrl({
        jobUrl,
        resumeId: watch('resumeId'),
        tone: watch('tone'),
        customInstructions: undefined
      });

      if (result.success) {
        const { jobAnalysis, coverLetter } = result.data;
        setScrapedJobData({
          title: jobAnalysis.jobTitle,
          company: jobAnalysis.companyName,
          description: jobAnalysis.jobDescription,
          location: jobAnalysis.location,
          requirements: jobAnalysis.requirements,
          responsibilities: jobAnalysis.responsibilities,
          skills: jobAnalysis.skills,
          confidence: jobAnalysis.confidence
        });
        
        // Auto-fill form with AI-analyzed data
        setValue('jobTitle', jobAnalysis.jobTitle);
        setValue('companyName', jobAnalysis.companyName);
        setValue('jobDescription', jobAnalysis.jobDescription);
        setValue('title', `Cover Letter - ${jobAnalysis.jobTitle} at ${jobAnalysis.companyName}`);
        
        // Set the generated content immediately
        setGeneratedContent(coverLetter.content);
        
        toast.success(
          `✨ AI Analysis Complete! (${jobAnalysis.confidence}% confidence)\n` +
          `Found ${jobAnalysis.skills.length} matching skills and generated personalized cover letter.`
        );
        
        // Generate AI suggestions based on analyzed data
        generateAISuggestions(jobAnalysis);
      } else {
        throw new Error(result.message || 'AI analysis failed');
      }
    } catch (error: any) {
      console.error('AI job analysis error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to analyze job posting. Please try again.';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'The job site took too long to respond. Please try a different URL or try again later.';
      } else if (error.message?.includes('Failed to fetch job page content')) {
        errorMessage = 'Unable to access the job posting. Please check the URL or try a different job site.';
      } else if (error.message?.includes('Network error') || error.message?.includes('ENOTFOUND')) {
        errorMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'The job site blocked our request. Please try copying the job description manually.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Job posting not found. Please check if the URL is correct.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsScrapingJob(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      sender: 'user' as const,
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsGeneratingAI(true);

    try {
      // Call conversation service for chat response
      const response = await coverLetterService.handleConversation({
        message: userMessage.content,
        context: {
          jobTitle: watch('jobTitle') || '',
          companyName: watch('companyName') || '',
          tone: watch('tone'),
          resumeId: watch('resumeId'),
          jobDescription: watch('jobDescription') || '',
          existingContent: generatedContent || ''
        },
        step: chatMessages.length === 0 ? 'welcome' : 'general'
      });

      if (response.success && response.response) {
        const aiMessage = {
          sender: 'ai' as const,
          content: response.response,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        
        // Only treat as cover letter content if it's explicitly a full cover letter
        if (response.response.includes('Dear') && response.response.includes('Sincerely') && response.response.length > 500) {
          setGeneratedContent(response.response);
        }
      } else {
        throw new Error(response.message || 'AI chat failed');
      }
    } catch (error: any) {
      const errorMessage = {
        sender: 'ai' as const,
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again or provide more specific details.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAISuggestions = async (jobData?: any) => {
    const formData = form.getValues();
    const jobDescription = jobData?.description || formData.jobDescription;
    
    if (!jobDescription) return;

    try {
      const suggestions = [
        `Highlight experience with ${jobData?.requirements?.[0] || 'relevant technologies'}`,
        `Emphasize ${formData.tone} communication style`,
        `Quantify achievements in previous roles`,
        `Research ${formData.companyName || 'the company'} culture and values`
      ];
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
    }
  };

  const generateAIContent = async () => {
    const formData = form.getValues();
    
    if (!formData.jobTitle || !formData.companyName) {
      toast.error('Please fill in job title and company name first');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await coverLetterService.generateAIContent({
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        tone: formData.tone,
        resumeId: formData.resumeId,
        jobDescription: formData.jobDescription
      });

      if (result.success && result.content) {
        setGeneratedContent(result.content);
        toast.success('AI cover letter generated! Review and customize it below.');
      } else {
        toast.error(result.message || 'Failed to generate AI content');
      }
    } catch (error) {
      toast.error('Failed to generate AI content');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const analyzeContent = async () => {
    const formData = form.getValues();
    if (!generatedContent || !formData.jobDescription) {
      toast.error('Need both content and job description for analysis');
      return;
    }

    try {
      const response = await fetch('/api/cover-letters/analyze-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: generatedContent,
          jobDescription: formData.jobDescription
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResults(result.data);
        toast.success(`Analysis complete! Match score: ${result.data.matchScore}%`);
      }
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const downloadCoverLetter = async (format: 'pdf' | 'docx' | 'txt') => {
    const formData = form.getValues();
    
    if (!generatedContent) {
      toast.error('Generate content first before downloading');
      return;
    }

    try {
      const coverLetterData = {
        title: formData.title || `Cover Letter - ${formData.jobTitle} at ${formData.companyName}`,
        content: generatedContent,
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        tone: formData.tone
      };

      const response = await fetch(`/api/cover-letters/download-with-data/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ coverLetterData })
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${coverLetterData.title}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Cover letter downloaded as ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error('Download failed. Please try again.');
    }
  };

  const onSubmit = async (data: CoverLetterFormData) => {
    console.log('🚀 Form submitted with data:', data);
    console.log('🔧 Current method:', method);
    
    try {
      setIsGeneratingAI(true);
      let coverLetter;

      if (method === 'job-url' && data.jobUrl) {
        // Generate content without saving to database
        const result = await coverLetterService.aiGenerateFromUrl({
          jobUrl: data.jobUrl,
          resumeId: data.resumeId,
          tone: data.tone,
          customInstructions: undefined
        });

        if (result.success) {
          const { jobAnalysis, coverLetterContent } = result.data;
          
          // Store job analysis for later saving
          setScrapedJobData({
            title: jobAnalysis.jobTitle,
            company: jobAnalysis.companyName,
            description: jobAnalysis.jobDescription,
            location: jobAnalysis.location,
            requirements: jobAnalysis.requirements,
            responsibilities: jobAnalysis.responsibilities,
            skills: jobAnalysis.skills,
            confidence: jobAnalysis.confidence,
            fullJobAnalysis: jobAnalysis // Store complete analysis for saving
          });
          
          // Update form with analyzed data
          setValue('jobTitle', jobAnalysis.jobTitle);
          setValue('companyName', jobAnalysis.companyName);
          setValue('jobDescription', jobAnalysis.jobDescription);
          setValue('title', `Cover Letter - ${jobAnalysis.jobTitle} at ${jobAnalysis.companyName}`);
          
          // Set generated content for display (not saved yet)
          setGeneratedContent(coverLetterContent);
          
          toast.success(`✨ Cover Letter Generated! (${jobAnalysis.confidence}% confidence) - Click "Save to Account" to store it`);
        } else {
          throw new Error(result.message || 'AI generation failed');
        }
      } else if (method === 'manual') {
        // For manual method, generate content using AI but don't save
        const result = await coverLetterService.generateAIContent({
          jobTitle: data.jobTitle,
          companyName: data.companyName,
          tone: data.tone,
          resumeId: data.resumeId,
          jobDescription: data.jobDescription || '',
        });
        
        if (result.success) {
          setGeneratedContent(result.content);
          toast.success('✨ Cover letter generated! Click "Save to Account" to store it');
        } else {
          throw new Error(result.message || 'Generation failed');
        }
      } else if (method === 'ai-chat') {
        // For AI chat, the generation happens through the chat interface
        toast.info('Please use the chat interface below to generate your cover letter.');
        return;
      }
    } catch (error: any) {
      console.error('Cover letter generation error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to generate cover letter. Please try again.';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Generation timed out. The job site may be slow to respond. Please try again or use manual entry.';
      } else if (error.message?.includes('Failed to fetch job page content')) {
        errorMessage = 'Cannot access the job posting. Please verify the URL is correct and publicly accessible.';
      } else if (error.message?.includes('subscription') || error.message?.includes('limit')) {
        errorMessage = 'You have reached your usage limit. Please upgrade your subscription to continue.';
      } else if (error.message?.includes('AI generation failed')) {
        errorMessage = 'AI service is temporarily unavailable. Please try the manual method or try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsGeneratingAI(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-dark py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text-primary mb-2">Generate Cover Letter</h1>
          <p className="text-dark-text-secondary">
            Create a personalized cover letter that matches the job requirements
          </p>
        </div>


        <form onSubmit={(e) => {
          console.log('📝 Form onSubmit triggered!', e);
          return handleSubmit(onSubmit)(e);
        }} className="space-y-8">
          {/* Method Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-dark-text-primary mb-4">Choose Generation Method</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'manual'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dark-border hover:border-accent-primary/50'
                }`}
                onClick={() => {
                  setMethod('manual');
                  setValue('method', 'manual');
                }}
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="w-8 h-8 text-accent-primary" />
                  <div>
                    <h3 className="font-semibold text-dark-text-primary">Manual Entry</h3>
                    <p className="text-sm text-dark-text-secondary">
                      Enter job details manually for custom generation
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'job-url'
                    ? 'border-accent-tertiary bg-accent-tertiary/10'
                    : 'border-dark-border hover:border-accent-tertiary/50'
                }`}
                onClick={() => {
                  setMethod('job-url');
                  setValue('method', 'job-url');
                }}
              >
                <div className="flex items-center space-x-3">
                  <LinkIcon className="w-8 h-8 text-accent-tertiary" />
                  <div>
                    <h3 className="font-semibold text-dark-text-primary">From Job URL</h3>
                    <p className="text-sm text-dark-text-secondary">
                      AI analyzes job posting from any URL
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'ai-chat'
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-dark-border hover:border-green-400/50'
                }`}
                onClick={() => {
                  setMethod('ai-chat');
                  setValue('method', 'ai-chat' as any);
                }}
              >
                <div className="flex items-center space-x-3">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-400" />
                  <div>
                    <h3 className="font-semibold text-dark-text-primary">Personalize with AI</h3>
                    <p className="text-sm text-dark-text-secondary">
                      Chat with AI for personalized generation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>


          {/* Basic Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Cover Letter Title"
                {...register('title')}
                error={errors.title?.message}
                placeholder="Cover Letter - Software Engineer at TechCorp"
                required
              />

              {/* Job URL Input (for job-url method) */}
              {method === 'job-url' && (
                <div>
                  <Input
                    label="Job Posting URL"
                    placeholder="https://linkedin.com/jobs/view/... (any job site)"
                    {...register('jobUrl')}
                    error={errors.jobUrl?.message}
                  />

                  {scrapedJobData && (
                    <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border border-accent-primary/30 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <SparklesIcon className="w-5 h-5 text-accent-primary" />
                          <h4 className="font-medium text-accent-primary">AI Job Analysis Complete</h4>
                        </div>
                        {scrapedJobData.confidence && (
                          <div className="flex items-center space-x-1">
                            <ChartBarIcon className="w-4 h-4 text-accent-secondary" />
                            <span className="text-sm font-medium text-accent-secondary">
                              {scrapedJobData.confidence}% Confidence
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-white text-sm mb-2">Job Details</h5>
                          <div className="text-sm text-gray-300 space-y-1">
                            <p><span className="text-accent-primary">Title:</span> {scrapedJobData.title}</p>
                            <p><span className="text-accent-primary">Company:</span> {scrapedJobData.company}</p>
                            <p><span className="text-accent-primary">Location:</span> {scrapedJobData.location}</p>
                          </div>
                        </div>
                        
                        {scrapedJobData.skills && scrapedJobData.skills.length > 0 && (
                          <div>
                            <h5 className="font-medium text-white text-sm mb-2">Skills Matched</h5>
                            <div className="flex flex-wrap gap-1">
                              {scrapedJobData.skills.slice(0, 6).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {scrapedJobData.skills.length > 6 && (
                                <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                                  +{scrapedJobData.skills.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {scrapedJobData.requirements && scrapedJobData.requirements.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-accent-primary/20">
                          <h5 className="font-medium text-white text-sm mb-2">Key Requirements Found</h5>
                          <ul className="text-sm text-gray-300 list-disc list-inside">
                            {scrapedJobData.requirements.slice(0, 3).map((req, index) => (
                              <li key={index}>{req}</li>
                            ))}
                            {scrapedJobData.requirements.length > 3 && (
                              <li className="text-accent-secondary">+{scrapedJobData.requirements.length - 3} more requirements analyzed</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Regular form fields for manual and ai-chat methods */}
              {method !== 'job-url' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Job Title"
                    {...register('jobTitle')}
                    error={errors.jobTitle?.message}
                    placeholder="Software Engineer"
                    required
                  />
                  <Input
                    label="Company Name"
                    {...register('companyName')}
                    error={errors.companyName?.message}
                    placeholder="TechCorp Inc."
                    required
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Select Resume"
                  {...register('resumeId')}
                  error={errors.resumeId?.message}
                >
                  <option value="">Choose a resume...</option>
                  {resumes.map((resume) => (
                    <option key={resume._id} value={resume._id}>
                      {resume.title}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Tone"
                  {...register('tone')}
                  error={errors.tone?.message}
                  required
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="conservative">Conservative</option>
                </Select>
              </div>

              {method === 'manual' && (
                <Textarea
                  label="Job Description (Optional)"
                  {...register('jobDescription')}
                  error={errors.jobDescription?.message}
                  placeholder="Paste the job description here for better AI optimization..."
                  rows={6}
                />
              )}
            </div>
          </Card>

          {/* AI Chat Interface (for ai-chat method) */}
          {method === 'ai-chat' && (
            <Card className="p-6 backdrop-blur-xl bg-dark-secondary/20 border border-white/10 shadow-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-full bg-gradient-to-r from-green-400/20 to-blue-400/20 backdrop-blur-sm">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">AI Cover Letter Assistant</h3>
                  <p className="text-sm text-dark-text-muted">Get personalized guidance for your cover letter</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Chat Interface */}
                <div className="bg-dark-primary/40 backdrop-blur-sm rounded-xl border border-white/5 p-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  {!showAIAssistant ? (
                    <div className="text-center py-12">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 animate-pulse">
                          <SparklesIcon className="w-16 h-16 text-green-400/30 mx-auto" />
                        </div>
                        <SparklesIcon className="w-16 h-16 text-green-400 mx-auto relative z-10" />
                      </div>
                      <h4 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                        Ready to create your perfect cover letter?
                      </h4>
                      <p className="text-dark-text-secondary mb-8 max-w-md mx-auto leading-relaxed">
                        I'll guide you through creating a personalized cover letter that stands out. Just tell me about the job you're applying for!
                      </p>
                      <Button
                        type="button"
                        onClick={() => setShowAIAssistant(true)}
                        className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-black font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                        Start Conversation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Chat Messages */}
                      <div className="space-y-4">
                        <div className="flex items-start space-x-4 animate-fade-in">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-500 p-2.5 shadow-lg">
                              <SparklesIcon className="w-5 h-5 text-black" />
                            </div>
                          </div>
                          <div className="flex-1 max-w-lg">
                            <div className="bg-gradient-to-r from-dark-secondary/60 to-dark-secondary/40 backdrop-blur-sm rounded-2xl rounded-tl-md p-4 border border-white/10 shadow-lg">
                              <p className="text-white leading-relaxed">
                                👋 Hi! I'm your AI cover letter assistant. I can help you create a personalized cover letter that gets noticed.
                              </p>
                              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-sm text-green-400 font-medium mb-2">I can help you with:</p>
                                <ul className="text-sm text-dark-text-secondary space-y-1">
                                  <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    <span>Analyzing job URLs for key requirements</span>
                                  </li>
                                  <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    <span>Tailoring content to specific roles</span>
                                  </li>
                                  <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    <span>Adjusting tone and writing style</span>
                                  </li>
                                  <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    <span>Highlighting your unique strengths</span>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Dynamic chat messages */}
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`flex items-start space-x-4 animate-fade-in-up ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full p-2.5 shadow-lg ${
                                message.sender === 'user' 
                                  ? 'bg-gradient-to-r from-accent-primary to-accent-secondary' 
                                  : 'bg-gradient-to-r from-green-400 to-green-500'
                              }`}>
                                {message.sender === 'user' ? 
                                  <UserIcon className="w-5 h-5 text-white" /> : 
                                  <SparklesIcon className="w-5 h-5 text-black" />
                                }
                              </div>
                            </div>
                            <div className="flex-1 max-w-lg">
                              <div className={`backdrop-blur-sm rounded-2xl p-4 border shadow-lg ${
                                message.sender === 'user' 
                                  ? 'bg-gradient-to-l from-accent-primary/30 to-accent-primary/20 border-accent-primary/30 rounded-tr-md' 
                                  : 'bg-gradient-to-r from-dark-secondary/60 to-dark-secondary/40 border-white/10 rounded-tl-md'
                              }`}>
                                <p className="text-white leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                                {message.timestamp && (
                                  <p className="text-xs text-dark-text-muted mt-2 opacity-60">
                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {isGeneratingAI && (
                          <div className="flex items-start space-x-4 animate-fade-in">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-500 p-2.5 shadow-lg animate-pulse">
                                <SparklesIcon className="w-5 h-5 text-black animate-spin" />
                              </div>
                            </div>
                            <div className="flex-1 max-w-lg">
                              <div className="bg-gradient-to-r from-dark-secondary/60 to-dark-secondary/40 backdrop-blur-sm rounded-2xl rounded-tl-md p-4 border border-white/10 shadow-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="text-white text-sm font-medium">
                                    AI is thinking...
                                  </div>
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Chat Input */}
                      <div className="flex space-x-3 pt-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask me anything about your cover letter..."
                            className="w-full bg-dark-primary/60 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-4 pr-12 text-white placeholder-dark-text-muted focus:border-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all duration-300 shadow-lg"
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                            disabled={isGeneratingAI}
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-text-muted">
                            <MicrophoneIcon className="w-5 h-5" />
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={handleChatSubmit}
                          disabled={!chatInput.trim() || isGeneratingAI}
                          className="bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 disabled:from-gray-500 disabled:to-gray-600 text-black p-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
                        >
                          <ArrowRightIcon className="w-5 h-5" />
                        </Button>
                      </div>
                      
                      <div className="text-center pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAIAssistant(false);
                            setChatMessages([]);
                            setChatInput('');
                          }}
                          className="text-sm text-dark-text-muted hover:text-green-400 transition-colors duration-200 flex items-center space-x-2 mx-auto group"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                          <span>Reset Conversation</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Generation Tips */}
          <Card className="p-6 bg-accent-primary/10 border-accent-primary/30">
            <div className="flex items-start space-x-3">
              <ClockIcon className="w-6 h-6 text-accent-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-accent-primary mb-2">Generation Tips</h3>
                <ul className="text-sm text-accent-primary space-y-1">
                  <li>• Selecting a resume helps personalize the cover letter to your experience</li>
                  <li>• Including job descriptions or URLs leads to better optimization</li>
                  <li>• Professional tone works best for corporate roles</li>
                  <li>• Enthusiastic tone is great for startups and creative roles</li>
                </ul>
              </div>
            </div>
          </Card>


          {/* Generated Content Display */}
          {generatedContent && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-dark-text-primary flex items-center">
                  <BeakerIcon className="w-5 h-5 mr-2 text-blue-400" />
                  AI Generated Cover Letter
                </h3>
                {analysisResults && (
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm font-medium ${
                      analysisResults.matchScore >= 80 ? 'text-green-400' :
                      analysisResults.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      Match Score: {analysisResults.matchScore}%
                    </span>
                    <span className="text-sm text-dark-text-muted">
                      {analysisResults.wordCount} words
                    </span>
                  </div>
                )}
              </div>
              
              <div className="bg-dark-secondary/50 p-4 rounded-lg mb-4">
                <textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="w-full h-64 bg-transparent text-dark-text-primary resize-none border-none outline-none"
                  placeholder="Your AI-generated cover letter will appear here..."
                />
              </div>

              {analysisResults && (
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResults.strengths?.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <h4 className="text-green-400 font-medium mb-2">✅ Strengths:</h4>
                      <ul className="text-sm text-green-300 space-y-1">
                        {analysisResults.strengths.map((strength: string, idx: number) => (
                          <li key={idx}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysisResults.suggestions?.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <h4 className="text-yellow-400 font-medium mb-2">💡 Suggestions:</h4>
                      <ul className="text-sm text-yellow-300 space-y-1">
                        {analysisResults.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex space-x-3">
              {generatedContent && (
                <Button
                  type="button"
                  onClick={generateAIContent}
                  variant="outline"
                  className="px-6"
                >
                  🔄 Regenerate Preview
                </Button>
              )}
              {generatedContent && (
                <Button
                  type="button"
                  onClick={async () => {
                    if (!generatedContent) {
                      toast.error('No content to save');
                      return;
                    }
                    
                    try {
                      setIsGeneratingAI(true);
                      const formData = form.getValues();
                      
                      const result = await coverLetterService.createCoverLetter({
                        title: formData.title,
                        jobTitle: formData.jobTitle,
                        companyName: formData.companyName,
                        jobUrl: formData.jobUrl || undefined,
                        jobDescription: formData.jobDescription || undefined,
                        tone: formData.tone,
                        resumeId: formData.resumeId || undefined,
                        content: generatedContent // Save the generated content
                      });
                      
                      if (result.success) {
                        toast.success('✅ Cover letter saved to your account!');
                        setTimeout(() => navigate('/dashboard/documents'), 1500);
                      } else {
                        throw new Error(result.message || 'Failed to save');
                      }
                    } catch (error: any) {
                      console.error('Save error:', error);
                      toast.error(error.message || 'Failed to save cover letter');
                    } finally {
                      setIsGeneratingAI(false);
                    }
                  }}
                  isLoading={isGeneratingAI}
                  disabled={isGeneratingAI}
                  className="px-6 bg-green-600 hover:bg-green-700"
                >
                  💾 Save to Account
                </Button>
              )}
            </div>
            
            {/* Submit button - only show for manual and job-url methods */}
            {method !== 'ai-chat' && (
              <Button
                type="submit"
                onClick={(e) => {
                  console.log('🖱️ Button clicked!', e);
                  console.log('🔍 Form errors:', errors);
                  console.log('📝 Form data:', form.getValues());
                }}
                isLoading={isGeneratingAI || loadingState === 'loading'}
                disabled={isGeneratingAI || loadingState === 'loading'}
                className="px-8"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}