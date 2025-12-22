import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { resumeService } from '../../services/resumeService';
import { useResume } from '../../contexts/ResumeContext';
import { api } from '../../services/api';
import { useSubscription } from '../../hooks/useSubscription';
import { JobOptimizationReviewModal } from './JobOptimizationReviewModal';
import { 
  SparklesIcon, 
  GlobeAltIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface JobOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData?: any;
  onOptimize?: (optimizedData: any) => void;
  onSwitchToPreview?: () => void;
}

type OptimizationMethod = 'url';

export default function JobOptimizationModal({ 
  isOpen, 
  onClose, 
  resumeData,
  onOptimize,
  onSwitchToPreview
}: JobOptimizationModalProps) {
  const { 
    resumeData: contextResumeData, 
    updateResumeData,
    updateAIData,
    setOptimizedLatexCode,
    clearOptimizedContent,
    setCachedPdf
  } = useResume();
  const activeResumeData = resumeData || contextResumeData;
  const { hasActiveSubscription } = useSubscription();
  
  const [method, setMethod] = useState<OptimizationMethod>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [step, setStep] = useState<'input' | 'analysis' | 'results'>('input');
  const [showOptimizationReview, setShowOptimizationReview] = useState(false);
  const [optimizationPreviewData, setOptimizationPreviewData] = useState<any>(null);

  const analyzeJobUrl = async () => {
    if (!jobUrl.trim()) {
      toast.error('Please enter a valid job URL');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await resumeService.analyzeJobFromUrl({ 
        jobUrl,
        resumeData: activeResumeData 
      });
      setJobAnalysis(analysis);
      setJobTitle(analysis?.jobDetails?.jobTitle || analysis?.jobDetails?.title || '');
      setCompanyName(analysis?.jobDetails?.companyName || analysis?.jobDetails?.company || '');
      setStep('analysis');
      toast.success('Job posting analyzed successfully!');
    } catch (error: any) {
      console.error('Failed to analyze job URL:', error);
      
      if (error.response?.status === 429) {
        toast.error('AI Quota Exceeded', {
          description: 'You have reached your daily limit of 20 AI job analyses. Please try again tomorrow or upgrade your Gemini API plan.',
          duration: 8000
        });
      } else {
        toast.error('Failed to analyze job posting. Please check the URL and try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimizePreview = async () => {
    if (!jobAnalysis?.jobDetails?.jobDescription) {
      toast.error('Job description not available for optimization');
      return;
    }

    setIsLoading(true);
    
    // Inform user about preview generation
    toast.info('Generating job optimization preview...', {
      description: 'AI is analyzing your resume for this job. This may take 30-60 seconds.',
      duration: 5000
    });
    
    try {
      console.log('🎯 Getting job optimization preview...');
      const previewData = await resumeService.optimizeForJobPreview(
        activeResumeData,
        jobAnalysis?.jobDetails?.jobDescription,
        jobTitle,
        companyName,
        activeResumeData.template || activeResumeData.templateId || 'template01'
      );
      
      setOptimizationPreviewData(previewData);
      setShowOptimizationReview(true);
      
      toast.success('Job optimization preview ready!', {
        description: 'Review the suggested optimizations before generating your PDF.'
      });
    } catch (error) {
      console.error('Failed to generate job optimization preview:', error);
      toast.error('Failed to generate optimization preview. Please try again.');
    } finally {
      setIsLoading(false);
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
    setShowOptimizationReview(false);
    setOptimizationPreviewData(null);
  };

  const renderInputStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Choose Optimization Method</h3>
        <div className="p-4 border border-accent-primary bg-accent-primary/10 rounded-lg">
          <div className="flex items-center mb-2">
            <GlobeAltIcon className="w-5 h-5 mr-2 text-accent-primary" />
            <span className="font-medium text-accent-primary">Job URL Only</span>
          </div>
          <p className="text-sm text-text-secondary">Job description input has been removed. Only URL-based optimization is supported.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
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


      <div className="flex justify-between pt-4">
        <Button onClick={onClose} variant="outline" className="btn-secondary-dark">
          Cancel
        </Button>
        <Button
          onClick={analyzeJobUrl}
          disabled={isAnalyzing || !jobUrl.trim()}
          className="btn-primary-dark"
        >
          {isAnalyzing ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <GlobeAltIcon className="w-4 h-4 mr-2" />
              Analyze Job & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
            <MagnifyingGlassIcon className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">Job Analysis Results</h3>
        </div>
        <div className="flex items-center text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
          <CheckCircleIcon className="w-4 h-4 mr-2" />
          <span className="text-xs font-bold uppercase tracking-wider">Analysis Complete</span>
        </div>
      </div>

      {jobAnalysis && (
        <div className="space-y-6">
          {/* Detailed Job Profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="card-glass-dark p-5 border border-surface-200/50 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-black text-brand-blue uppercase tracking-widest mb-1">Position Profile</h4>
                    <h2 className="text-2xl font-bold text-text-primary">{jobAnalysis?.jobDetails?.jobTitle || jobAnalysis?.jobDetails?.title || 'Not available'}</h2>
                    <p className="text-text-secondary font-medium">{jobAnalysis?.jobDetails?.companyName || jobAnalysis?.jobDetails?.company || 'Not available'}</p>
                  </div>
                  {jobAnalysis?.jobDetails?.location && (
                    <Badge variant="secondary" className="bg-surface-100 text-text-primary border-surface-200">
                      {jobAnalysis.jobDetails.location}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-4 text-base text-text-secondary leading-relaxed font-medium">
                  {jobAnalysis?.jobDetails?.jobDescription?.split('\n\n').map((para: string, i: number) => (
                    <p key={i} className="mb-4">{para}</p>
                  )) || 'No description available'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Company & Meta Info */}
              <div className="card-glass-dark p-5 border border-surface-200/50 rounded-xl">
                <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-4">Institutional Context</h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Industry</div>
                    <div className="text-sm font-semibold text-text-primary">{jobAnalysis?.jobDetails?.companyInfo?.industry || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Organization Size</div>
                    <div className="text-sm font-semibold text-text-primary">{jobAnalysis?.jobDetails?.companyInfo?.size || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Deployment Type</div>
                    <div className="text-sm font-semibold text-text-primary capitalize">{jobAnalysis?.jobDetails?.employmentType || 'Not specified'}</div>
                  </div>
                  {jobAnalysis?.jobDetails?.salary && (
                    <div>
                      <div className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Compensation</div>
                      <div className="text-sm font-bold text-emerald-400">{jobAnalysis.jobDetails.salary}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="card-glass-dark p-5 border border-surface-200/50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Analysis Confidence</span>
                  <span className="text-sm font-black text-teal-400">{jobAnalysis?.jobDetails?.confidence || 85}%</span>
                </div>
                <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${jobAnalysis?.jobDetails?.confidence || 85}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Insights & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-glass-dark p-6 border border-brand-blue/30 rounded-2xl bg-brand-blue/5 shadow-glow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
                    <SparklesIcon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-black text-brand-dark uppercase tracking-tight">Market Intelligence</h4>
                </div>
                <Badge variant="success" className="bg-brand-blue/10 text-brand-blue border-brand-blue/20">High Priority</Badge>
              </div>
              <ul className="space-y-4">
                {(jobAnalysis?.jobDetails?.strategicInsights || jobAnalysis?.recommendations || []).map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-4 group">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(26,145,240,0.6)] shrink-0 transition-transform group-hover:scale-125" />
                    <span className="text-sm text-text-primary leading-relaxed font-bold opacity-90">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-glass-dark p-6 border border-emerald-500/20 rounded-2xl bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                  <CpuChipIcon className="h-5 w-5" />
                </div>
                <h4 className="text-base font-black text-brand-dark uppercase tracking-tight">Technical Mastery</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {(jobAnalysis?.jobDetails?.skills || jobAnalysis?.jobDetails?.requirements || jobAnalysis?.jobDetails?.keywords || []).slice(0, 20).map((skill: string, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1.5 bg-white border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 shadow-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements & Responsibilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] ml-1">Key Requirements</h4>
              <div className="card-glass-dark p-5 border border-surface-200/50 rounded-xl space-y-3">
                {(jobAnalysis?.jobDetails?.requirements || []).slice(0, 8).map((req: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-4 w-4 text-brand-blue mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary font-medium">{req}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] ml-1">Mission Criticals</h4>
              <div className="card-glass-dark p-5 border border-surface-200/50 rounded-xl space-y-3">
                {(jobAnalysis?.jobDetails?.responsibilities || []).slice(0, 8).map((resp: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <ArrowPathIcon className="h-4 w-4 text-teal-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-text-secondary font-medium">{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t border-surface-100">
        <Button onClick={resetModal} variant="outline" className="btn-secondary-dark px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px]">
          Start Over
        </Button>
        <div className="flex gap-4">
          <Button 
            onClick={handleOptimizePreview} 
            disabled={isLoading} 
            className="btn-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow-sm"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <EyeIcon className="w-4 h-4 mr-2" />
                Preview Optimizations
              </>
            )}
          </Button>
          <Button 
            onClick={handleOptimize} 
            disabled={isLoading} 
            variant="outline" 
            className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px]"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                Direct Deploy
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Optimization Complete</h3>
        <div className="flex items-center text-green-400">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          <span className="text-sm">Success</span>
        </div>
      </div>

      {optimizationResult && (
        <div className="space-y-4">
          <div className="card-glass-dark p-4 border border-surface-200 rounded-lg">
            <h4 className="font-semibold text-text-primary mb-3">Improvements Applied</h4>
            <ul className="space-y-2">
              {optimizationResult.improvements?.map((improvement: any, index: number) => {
                // Handle both string and object improvement formats
                if (typeof improvement === 'string') {
                  return (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-text-secondary">{improvement}</span>
                    </li>
                  );
                } else if (improvement && improvement.changes) {
                  // Handle object format with category and changes
                  return (
                    <li key={index} className="mb-3">
                      <div className="flex items-start text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-text-primary font-medium">{improvement.category}:</span>
                          <ul className="ml-4 mt-1 space-y-1">
                            {improvement.changes.map((change: string, changeIndex: number) => (
                              <li key={changeIndex} className="text-text-secondary">• {change}</li>
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
            <div className="card-glass-dark p-4 border border-surface-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-text-primary">ATS Compatibility</h4>
                <div className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 text-teal-400 mr-1" />
                  <span className="text-lg font-bold text-teal-400">
                    {optimizationResult.atsAnalysis.score}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-surface-50 rounded-full h-2">
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
    <>
      <Modal
        isOpen={isOpen && !showOptimizationReview}
        onClose={() => {
          resetModal();
          onClose();
        }}
        title="AI Job Optimization"
        size={step === 'analysis' ? 'full' : 'lg'}
      >
        {step === 'input' && renderInputStep()}
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'results' && renderResultsStep()}
      </Modal>

      {/* Job Optimization Review Modal */}
      {optimizationPreviewData && (
        <JobOptimizationReviewModal
          isOpen={showOptimizationReview}
          onClose={() => setShowOptimizationReview(false)}
          optimizationData={optimizationPreviewData}
          onApplySelected={(finalResumeData) => {
            // Apply the job-optimized resume data to the form
            updateResumeData(finalResumeData);
            
            // Track AI usage for subscription logic
            updateAIData({ 
              wasOptimizationApplied: true,
              // Also keep the optimized latex code if it was generated
              optimizedLatexCode: optimizationResult?.optimizedLatexCode
            });
            
            // Close review modal and main modal
            setShowOptimizationReview(false);
            resetModal();
            onClose();
            
            // Switch to preview tab to show updated resume
            if (onSwitchToPreview) {
              onSwitchToPreview();
            }
            
            toast.success('Job optimization applied! Check your updated resume in the preview.');
          }}
        />
      )}
    </>
  );
}
