import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { resumeService } from '../../services/resumeService';
import { useResume } from '../../contexts/ResumeContext';
import SubscriptionGate from '../subscription/SubscriptionGate';
import { useSubscription } from '../../hooks/useSubscription';
import { 
  SparklesIcon, 
  GlobeAltIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface JobOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData?: any;
  onOptimize?: (optimizedData: any) => void;
}

type OptimizationMethod = 'url' | 'description';
type OptimizationType = 'job-specific' | 'comprehensive' | 'ats' | 'content';

export default function JobOptimizationModal({ 
  isOpen, 
  onClose, 
  resumeData,
  onOptimize 
}: JobOptimizationModalProps) {
  const { resumeData: contextResumeData, updateResumeData } = useResume();
  const activeResumeData = resumeData || contextResumeData;
  const { isEnterprise } = useSubscription();
  
  const [method, setMethod] = useState<OptimizationMethod>('url');
  const [optimizationType, setOptimizationType] = useState<OptimizationType>('job-specific');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'analysis' | 'results'>('input');

  const analyzeJobUrl = async () => {
    if (!jobUrl.trim()) {
      toast.error('Please enter a valid job URL');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await resumeService.analyzeJobFromUrl({ jobUrl });
      setJobAnalysis(analysis);
      setJobTitle(analysis.jobDetails.title || '');
      setCompanyName(analysis.jobDetails.company || '');
      setJobDescription(analysis.jobDetails.description || '');
      setStep('analysis');
      toast.success('Job posting analyzed successfully!');
    } catch (error) {
      console.error('Failed to analyze job URL:', error);
      toast.error('Failed to analyze job posting. Please check the URL and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      let result;
      
      if (method === 'url' && jobUrl) {
        // Use job URL optimization
        result = await resumeService.optimizeResumeWithJobUrl(activeResumeData, jobUrl);
      } else {
        // Use job description optimization
        result = await resumeService.optimizeResumeForJob(activeResumeData, {
          jobDescription,
          jobTitle,
          companyName,
          optimizationType
        });
      }

      setOptimizationResult(result);
      setStep('results');
      
      // Handle both improvedResume and enhancedResume for backwards compatibility
      const optimizedResumeData = result.improvedResume || result.enhancedResume;
      
      if (onOptimize) {
        onOptimize(optimizedResumeData);
      } else {
        updateResumeData(optimizedResumeData);
      }
      
      toast.success('Resume optimized successfully!', {
        description: 'Changes are now reflected in your resume preview'
      });
    } catch (error) {
      console.error('Failed to optimize resume:', error);
      toast.error('Failed to optimize resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('input');
    setJobUrl('');
    setJobDescription('');
    setJobTitle('');
    setCompanyName('');
    setJobAnalysis(null);
    setOptimizationResult(null);
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Choose Optimization Method</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMethod('url')}
            className={`p-4 border rounded-lg text-left transition-all ${
              method === 'url'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-dark-border text-dark-text-secondary hover:border-accent-primary/50'
            }`}
          >
            <div className="flex items-center mb-2">
              <GlobeAltIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Job URL</span>
            </div>
            <p className="text-sm">Paste a job posting URL and let AI analyze it</p>
          </button>
          
          <button
            onClick={() => setMethod('description')}
            className={`p-4 border rounded-lg text-left transition-all ${
              method === 'description'
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-dark-border text-dark-text-secondary hover:border-accent-primary/50'
            }`}
          >
            <div className="flex items-center mb-2">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">Job Description</span>
            </div>
            <p className="text-sm">Manually paste the job description</p>
          </button>
        </div>
      </div>

      {method === 'url' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-2">
              Job Posting URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://company.com/jobs/position"
                className="flex-1 input-field-dark"
              />
              <Button
                onClick={analyzeJobUrl}
                disabled={isAnalyzing || !jobUrl.trim()}
                variant="outline"
                className="btn-secondary-dark"
              >
                {isAnalyzing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <GlobeAltIcon className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-dark-text-muted mt-1">
              Enter a direct link to the job posting for automatic analysis
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Senior Software Engineer"
                className="input-field-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Tech Company Inc."
                className="input-field-dark"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-2">
              Job Description
            </label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              placeholder="Paste the complete job description here..."
              className="input-field-dark"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-dark-text-primary mb-3">
          Optimization Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'job-specific', label: 'Job-Specific', desc: 'Tailor to this specific job posting' },
            { value: 'comprehensive', label: 'Comprehensive', desc: 'Full resume enhancement + job alignment' },
            { value: 'ats', label: 'ATS Focus', desc: 'Optimize for applicant tracking systems' },
            { value: 'content', label: 'Content Only', desc: 'Improve writing and achievements' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setOptimizationType(type.value as OptimizationType)}
              className={`p-3 border rounded-lg text-left text-sm transition-all ${
                optimizationType === type.value
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dark-border text-dark-text-secondary hover:border-accent-primary/50'
              }`}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-xs opacity-75">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onClose} variant="outline" className="btn-secondary-dark">
          Cancel
        </Button>
        <Button
          onClick={handleOptimize}
          disabled={isLoading || (method === 'url' ? !jobUrl.trim() : !jobDescription.trim())}
          className="btn-primary-dark"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4 mr-2" />
              Optimize Resume
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-text-primary">Job Analysis Results</h3>
        <div className="flex items-center text-green-400">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          <span className="text-sm">Analysis Complete</span>
        </div>
      </div>

      {jobAnalysis && (
        <div className="space-y-4">
          <div className="card-glass-dark p-4 border border-dark-border rounded-lg">
            <h4 className="font-semibold text-dark-text-primary mb-2">Job Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Title:</span> {jobAnalysis.jobDetails.title}</div>
              <div><span className="font-medium">Company:</span> {jobAnalysis.jobDetails.company}</div>
              <div><span className="font-medium">Requirements:</span> {jobAnalysis.jobDetails.requirements?.length || 0} identified</div>
            </div>
          </div>

          <div className="card-glass-dark p-4 border border-dark-border rounded-lg">
            <h4 className="font-semibold text-dark-text-primary mb-2">AI Recommendations</h4>
            <ul className="space-y-1 text-sm">
              {jobAnalysis.recommendations?.map((rec: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-accent-primary mr-2">•</span>
                  <span className="text-dark-text-secondary">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button onClick={resetModal} variant="outline" className="btn-secondary-dark">
          Start Over
        </Button>
        <Button onClick={handleOptimize} disabled={isLoading} className="btn-primary-dark">
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4 mr-2" />
              Optimize Resume
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-text-primary">Optimization Complete</h3>
        <div className="flex items-center text-green-400">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          <span className="text-sm">Success</span>
        </div>
      </div>

      {optimizationResult && (
        <div className="space-y-4">
          <div className="card-glass-dark p-4 border border-dark-border rounded-lg">
            <h4 className="font-semibold text-dark-text-primary mb-3">Improvements Applied</h4>
            <ul className="space-y-2">
              {optimizationResult.improvements?.map((improvement: any, index: number) => {
                // Handle both string and object improvement formats
                if (typeof improvement === 'string') {
                  return (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-dark-text-secondary">{improvement}</span>
                    </li>
                  );
                } else if (improvement && improvement.changes) {
                  // Handle object format with category and changes
                  return (
                    <li key={index} className="mb-3">
                      <div className="flex items-start text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-dark-text-primary font-medium">{improvement.category}:</span>
                          <ul className="ml-4 mt-1 space-y-1">
                            {improvement.changes.map((change: string, changeIndex: number) => (
                              <li key={changeIndex} className="text-dark-text-secondary">• {change}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>

          {optimizationResult.atsAnalysis && (
            <div className="card-glass-dark p-4 border border-dark-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-dark-text-primary">ATS Compatibility</h4>
                <div className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 text-blue-400 mr-1" />
                  <span className="text-lg font-bold text-blue-400">
                    {optimizationResult.atsAnalysis.score}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-dark-secondary rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${optimizationResult.atsAnalysis.score}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button onClick={resetModal} variant="outline" className="btn-secondary-dark">
          Optimize Another
        </Button>
        <Button onClick={onClose} className="btn-primary-dark">
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetModal();
        onClose();
      }}
      title="AI Job Optimization"
      size="lg"
    >
      <SubscriptionGate 
        feature="AI Job Optimization" 
        description="Optimize your resume for specific job postings using AI. Get tailored keyword suggestions, ATS optimization, and content improvements."
        requiresEnterprise={true}
        showUpgrade={true}
      >
        {step === 'input' && renderInputStep()}
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'results' && renderResultsStep()}
      </SubscriptionGate>
    </Modal>
  );
}