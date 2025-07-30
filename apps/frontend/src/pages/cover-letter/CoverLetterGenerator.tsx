import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChartBarIcon
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
  method: z.enum(['manual', 'job-url']),
  title: z.string().min(1, 'Title is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  companyName: z.string().min(1, 'Company name is required'),
  jobUrl: z.string().url('Valid URL required').optional().or(z.literal('')),
  jobDescription: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic', 'conservative']),
  resumeId: z.string().optional(),
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
      const jobData = await coverLetterService.scrapeJobPosting(jobUrl);
      setScrapedJobData(jobData);
      
      // Auto-fill form with scraped data
      setValue('jobTitle', jobData.title);
      setValue('companyName', jobData.company);
      setValue('jobDescription', jobData.description);
      setValue('title', `Cover Letter - ${jobData.title} at ${jobData.company}`);
      
      toast.success('Job posting scraped successfully!');
      
      // Generate AI suggestions based on scraped data
      generateAISuggestions(jobData);
    } catch (error) {
      toast.error('Failed to scrape job posting. Please check the URL.');
    } finally {
      setIsScrapingJob(false);
    }
  };

  const generateAISuggestions = async (jobData?: any) => {
    const formData = getValues();
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
    const formData = getValues();
    
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
    const formData = getValues();
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
    const formData = getValues();
    
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
    try {
      let coverLetter;

      if (method === 'job-url' && data.jobUrl && data.resumeId) {
        coverLetter = await generateFromJobUrl({
          jobUrl: data.jobUrl,
          resumeId: data.resumeId,
          tone: data.tone,
        });
      } else {
        coverLetter = await createCoverLetter({
          title: data.title,
          jobTitle: data.jobTitle,
          companyName: data.companyName,
          jobUrl: data.jobUrl || undefined,
          jobDescription: data.jobDescription || undefined,
          tone: data.tone,
          resumeId: data.resumeId || undefined,
        });
      }

      toast.success('Cover letter generated successfully!');
      navigate(`/cover-letter/${coverLetter._id}`);
    } catch (error) {
      toast.error('Failed to generate cover letter. Please try again.');
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                      Paste job posting URL for automatic extraction
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
                    <h3 className="font-semibold text-dark-text-primary">AI Assistant</h3>
                    <p className="text-sm text-dark-text-secondary">
                      Chat with AI for personalized generation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Job URL Section (when job-url method is selected) */}
          {method === 'job-url' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Job Posting URL</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    label="Job Posting URL"
                    placeholder="https://linkedin.com/jobs/view/..."
                    {...register('jobUrl')}
                    error={errors.jobUrl?.message}
                    className="flex-1"
                  />
                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleJobUrlScrape}
                      isLoading={isScrapingJob}
                      disabled={!watch('jobUrl')}
                    >
                      {isScrapingJob ? 'Scraping...' : 'Scrape Job'}
                    </Button>
                  </div>
                </div>

                {scrapedJobData && (
                  <div className="bg-accent-tertiary/10 border border-accent-tertiary/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <SparklesIcon className="w-5 h-5 text-accent-tertiary" />
                      <h4 className="font-medium text-accent-tertiary">Job Details Extracted</h4>
                    </div>
                    <div className="text-sm text-accent-tertiary space-y-1">
                      <p><strong>Title:</strong> {scrapedJobData.title}</p>
                      <p><strong>Company:</strong> {scrapedJobData.company}</p>
                      <p><strong>Location:</strong> {scrapedJobData.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

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

          {/* AI Enhancement Features */}
          <Card className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30">
            <div className="flex items-start space-x-3 mb-4">
              <SparklesIcon className="w-6 h-6 text-green-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-400 mb-2">🤖 AI-Powered Features</h3>
                <p className="text-sm text-green-300 mb-4">
                  Generate, analyze, and optimize your cover letter with advanced AI
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Button
                type="button"
                onClick={generateAIContent}
                isLoading={isGeneratingAI}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!watch('jobTitle') || !watch('companyName')}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
              </Button>

              <Button
                type="button"
                onClick={analyzeContent}
                variant="outline"
                className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                disabled={!generatedContent}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Analyze Match
              </Button>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-medium mb-2 flex items-center">
                  <LightBulbIcon className="w-4 h-4 mr-2" />
                  AI Suggestions:
                </h4>
                <ul className="text-sm text-yellow-300 space-y-1">
                  {aiSuggestions.map((suggestion, idx) => (
                    <li key={idx}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Download Options */}
            {generatedContent && (
              <div className="border-t border-green-500/30 pt-4">
                <h4 className="text-green-400 font-medium mb-3 flex items-center">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download Options:
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => downloadCoverLetter('pdf')}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    📄 PDF
                  </Button>
                  <Button
                    type="button"
                    onClick={() => downloadCoverLetter('docx')}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    📄 DOCX
                  </Button>
                  <Button
                    type="button"
                    onClick={() => downloadCoverLetter('txt')}
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    📄 TXT
                  </Button>
                </div>
              </div>
            )}
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

          {/* Submit Button */}
          <div className="flex justify-between">
            <div className="flex space-x-3">
              {generatedContent && (
                <Button
                  type="button"
                  onClick={generateAIContent}
                  variant="outline"
                  className="px-6"
                >
                  🔄 Regenerate
                </Button>
              )}
            </div>
            
            <Button
              type="submit"
              isLoading={loadingState === 'loading'}
              className="px-8"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              {generatedContent ? 'Save Cover Letter' : 'Generate Cover Letter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}