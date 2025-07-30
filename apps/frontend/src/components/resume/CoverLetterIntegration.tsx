import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  SparklesIcon,
  LinkIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { coverLetterService } from '../../services/coverLetterService';
import { toast } from 'sonner';

interface CoverLetterIntegrationProps {
  resume: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function CoverLetterIntegration({ 
  resume, 
  isOpen, 
  onClose 
}: CoverLetterIntegrationProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'method' | 'input' | 'generating'>('method');
  const [method, setMethod] = useState<'quick' | 'detailed'>('quick');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickGenerate = async () => {
    if (!jobTitle || !companyName) {
      toast.error('Please fill in job title and company name');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      toast.loading('🤖 Creating intelligent cover letter...', { id: 'cover-letter-gen' });
      
      const coverLetter = await coverLetterService.createFromResumeBuilder({
        resumeData: resume,
        jobTitle,
        companyName,
        jobDescription,
        jobUrl,
        tone: 'professional'
      });

      toast.success('✨ Cover letter created successfully!', { id: 'cover-letter-gen' });
      
      // Navigate to the intelligent cover letter builder with the generated data
      navigate('/cover-letter/intelligent-builder', {
        state: {
          resumeData: resume,
          coverLetter,
          jobTitle,
          companyName,
          jobDescription,
          jobUrl
        }
      });
      
      onClose();
    } catch (error) {
      console.error('Cover letter generation failed:', error);
      toast.error('Failed to create cover letter. Please try again.', { id: 'cover-letter-gen' });
      setStep('method');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetailedBuilder = () => {
    navigate('/cover-letter/intelligent-builder', {
      state: {
        resumeData: resume,
        fromResumeBuilder: true
      }
    });
    onClose();
  };

  const handleJobUrlAnalysis = async () => {
    if (!jobUrl) return;

    setIsGenerating(true);
    try {
      const jobData = await coverLetterService.scrapeJobPosting(jobUrl);
      setJobTitle(jobData.title);
      setCompanyName(jobData.company);
      setJobDescription(jobData.description);
      toast.success('Job posting analyzed successfully!');
    } catch (error) {
      toast.error('Failed to analyze job posting. Please check the URL.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
        <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
          Create Cover Letter from Your Resume
        </h3>
        <p className="text-dark-text-secondary">
          Use your resume data to generate a personalized cover letter
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => {
            setMethod('quick');
            setStep('input');
          }}
          className="p-6 border-2 border-dark-border rounded-lg text-left hover:border-blue-400 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <SparklesIcon className="w-8 h-8 text-blue-400 mr-4" />
              <div>
                <h4 className="font-semibold text-dark-text-primary mb-1">Quick AI Generation</h4>
                <p className="text-sm text-dark-text-secondary">
                  Generate a professional cover letter with minimal input
                </p>
              </div>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-dark-text-muted group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="mt-4 flex items-center text-sm text-green-400">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>Resume data auto-integrated • AI-powered content • Fast generation</span>
          </div>
        </button>

        <button
          onClick={handleDetailedBuilder}
          className="p-6 border-2 border-dark-border rounded-lg text-left hover:border-purple-400 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DocumentTextIcon className="w-8 h-8 text-purple-400 mr-4" />
              <div>
                <h4 className="font-semibold text-dark-text-primary mb-1">Intelligent Builder</h4>
                <p className="text-sm text-dark-text-secondary">
                  Advanced builder with multiple variations and analysis
                </p>
              </div>
            </div>
            <ArrowRightIcon className="w-5 h-5 text-dark-text-muted group-hover:text-purple-400 transition-colors" />
          </div>
          <div className="mt-4 flex items-center text-sm text-purple-400">
            <CheckCircleIcon className="w-4 h-4 mr-2" />
            <span>Multiple AI variations • Match analysis • ATS optimization</span>
          </div>
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 mr-3" />
          <div>
            <h5 className="font-medium text-blue-400 mb-1">Resume Integration</h5>
            <p className="text-sm text-blue-300">
              Your resume data will be automatically used to personalize the cover letter, 
              ensuring consistency and highlighting relevant experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-blue-400" />
        <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
          Quick Cover Letter Generation
        </h3>
        <p className="text-dark-text-secondary">
          Provide basic job details and let AI create your cover letter
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            label="Job Posting URL (Optional)"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="flex-1"
          />
          <div className="pt-6">
            <Button
              onClick={handleJobUrlAnalysis}
              variant="outline"
              size="sm"
              disabled={!jobUrl || isGenerating}
              className="btn-secondary-dark"
            >
              {isGenerating ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Software Engineer"
            required
          />
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Tech Corp"
            required
          />
        </div>

        <Textarea
          label="Job Description (Optional)"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste job description for better AI optimization..."
          rows={4}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button
          onClick={() => setStep('method')}
          variant="outline"
          className="btn-secondary-dark"
        >
          ← Back
        </Button>
        
        <Button
          onClick={handleQuickGenerate}
          disabled={!jobTitle || !companyName || isGenerating}
          className="btn-primary-dark"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Generate Cover Letter
        </Button>
      </div>
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="text-center py-12">
      <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-6"></div>
      <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
        Generating Your Cover Letter
      </h3>
      <p className="text-dark-text-secondary mb-4">
        Our AI is analyzing your resume and creating a personalized cover letter...
      </p>
      <div className="max-w-md mx-auto space-y-2 text-sm text-dark-text-muted">
        <div className="flex items-center justify-center">
          <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
          <span>Resume data integrated</span>
        </div>
        <div className="flex items-center justify-center">
          <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
          <span>Job requirements analyzed</span>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span>Creating personalized content...</span>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Cover Letter"
      size="lg"
    >
      <div className="p-6">
        {step === 'method' && renderMethodSelection()}
        {step === 'input' && renderInputStep()}
        {step === 'generating' && renderGeneratingStep()}
      </div>
    </Modal>
  );
}