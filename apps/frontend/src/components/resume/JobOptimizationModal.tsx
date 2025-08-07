import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { resumeService } from '../../services/resumeService';
import { useResume } from '../../contexts/ResumeContext';
import { api } from '../../services/api';
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

type OptimizationMethod = 'url';
type OptimizationType = 'job-specific' | 'comprehensive' | 'ats' | 'content';

export default function JobOptimizationModal({ 
  isOpen, 
  onClose, 
  resumeData,
  onOptimize 
}: JobOptimizationModalProps) {
  const { 
    resumeData: contextResumeData, 
    updateResumeData,
    setOptimizedLatexCode,
    clearOptimizedContent,
    setCachedPdf
  } = useResume();
  const activeResumeData = resumeData || contextResumeData;
  const { hasActiveSubscription } = useSubscription();
  
  const [method, setMethod] = useState<OptimizationMethod>('url');
  const [optimizationType, setOptimizationType] = useState<OptimizationType>('job-specific');
  const [jobUrl, setJobUrl] = useState('');
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
    
    // Inform user about the expected wait time
    toast.info('Starting job optimization...', {
      description: 'AI analysis and LaTeX compilation may take 3-5 minutes. Please keep this tab open.',
      duration: 8000
    });
    
    try {
      let result;
      
      if (jobUrl) {
        // Get template code for LaTeX optimization like EnterpriseResumeEnhancer does
        let templateCodeToUse = null;
        let templateIdToUse = null;
        
        const templateId = activeResumeData.template || activeResumeData.templateId;
        if (templateId) {
          try {
            console.log('🎯 Fetching template code for job optimization...');
            const response = await api.get("/resumes/latex-templates-with-code");
            const templates = response.data.data || response.data;
            const matchedTemplate = templates.find((t: any) => t.id === templateId);
            
            if (matchedTemplate && matchedTemplate.code) {
              templateCodeToUse = matchedTemplate.code;
              templateIdToUse = templateId;
              console.log('✅ Template code found for optimization');
            } else {
              console.log('⚠️ No template code found, proceeding with standard optimization');
            }
          } catch (error) {
            console.warn('Failed to fetch template code:', error);
          }
        }
        
        // For unsaved resumes, the backend returns PDF directly if successful, JSON if PDF fails
        // So we try PDF first, and if that fails, get analytics data
        try {
          console.log('📄 Getting job optimization PDF directly...');
          const pdfBlob = await resumeService.optimizeResumeWithJobUrlPDF(activeResumeData, jobUrl, {
            templateCode: templateCodeToUse,
            templateId: templateIdToUse
          });
          
          // PDF generation succeeded, now get analytics data separately
          result = await resumeService.optimizeResumeWithJobUrl(activeResumeData, jobUrl, {
            templateCode: templateCodeToUse,
            templateId: templateIdToUse
          });
          
          result.pdfBlob = pdfBlob;
          console.log('✅ PDF blob attached to result, size:', pdfBlob.size);
        } catch (pdfError) {
          console.warn('PDF generation failed, getting analytics data only:', pdfError);
          // Get analytics data without PDF
          result = await resumeService.optimizeResumeWithJobUrl(activeResumeData, jobUrl, {
            templateCode: templateCodeToUse,
            templateId: templateIdToUse
          });
        }
      }

      setOptimizationResult(result);
      setStep('results');
      
      // Handle multiple resume property names for backwards compatibility
      const optimizedResumeData = result.optimizedResume || result.improvedResume || result.enhancedResume;
      
      // Clear previous optimization state when applying new optimization
      clearOptimizedContent();
      
      // Handle PDF blob directly like enhancement service
      if (result.pdfBlob) {
        console.log('📄 Job-optimized PDF generated directly as blob');
        
        const pdfBlob = result.pdfBlob;
        console.log('📦 PDF blob received:', pdfBlob.size, 'bytes, type:', pdfBlob.type);
        
        // Generate a hash for the job-optimized PDF
        const jobOptimizedHash = `job-optimized-${Date.now()}-${method === 'url' ? jobUrl : 'manual'}`;
        
        // Create blob URL for immediate use
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Update the PDF cache with blob URL and blob data (exactly like other services)
        setCachedPdf(blobUrl, jobOptimizedHash, pdfBlob);
        
        toast.success('Job-optimized PDF generated!', {
          description: 'Your resume has been optimized and compiled for this specific job.'
        });
      } else {
        // No PDF generated - show analytics only
        toast.success('Job optimization completed!', {
          description: 'Your resume has been analyzed and optimized for this job.'
        });
      }
      
      // If the result includes optimized LaTeX code, save it for future PDF generation
      if (result.optimizedLatexCode) {
        console.log('📄 Saving optimized LaTeX code for job-specific PDF generation');
        setOptimizedLatexCode(
          result.optimizedLatexCode, 
          activeResumeData.template || 'overleaf-modern',
          {
            jobUrl: method === 'url' ? jobUrl : undefined,
            jobTitle: jobTitle || 'Job Application',
            companyName: companyName || 'Company'
          }
        );
        
        // Add optimized LaTeX code to resume data so PDF generation can use it
        optimizedResumeData.optimizedLatexCode = result.optimizedLatexCode;
      }
      
      if (onOptimize) {
        onOptimize(optimizedResumeData);
      } else {
        updateResumeData(optimizedResumeData);
      }
      
      // Show different success messages based on whether PDF was generated
      if (result.optimizedPdfUrl) {
        toast.success('Resume optimized with PDF generated!', {
          description: 'Job-specific optimization complete with LaTeX PDF compilation.'
        });
      } else {
        toast.success('Resume optimized successfully!', {
          description: 'Job-specific optimization applied. Use template preview for PDF generation.'
        });
      }
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
    setJobTitle('');
    setCompanyName('');
    setJobAnalysis(null);
    setOptimizationResult(null);
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Choose Optimization Method</h3>
        <div className="p-4 border border-accent-primary bg-accent-primary/10 rounded-lg">
          <div className="flex items-center mb-2">
            <GlobeAltIcon className="w-5 h-5 mr-2 text-accent-primary" />
            <span className="font-medium text-accent-primary">Job URL Only</span>
          </div>
          <p className="text-sm text-dark-text-secondary">Job description input has been removed. Only URL-based optimization is supported.</p>
        </div>
      </div>

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
          disabled={isLoading || !jobUrl.trim()}
          className="btn-primary-dark"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Optimizing (3-5 min)...
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
              Optimizing (3-5 min)...
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
      {step === 'input' && renderInputStep()}
      {step === 'analysis' && renderAnalysisStep()}
      {step === 'results' && renderResultsStep()}
    </Modal>
  );
}