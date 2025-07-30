import React, { useState } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { resumeService } from '../../services/resumeService';
import { toast } from 'sonner';
import EnhancementFeedbackModal from './EnhancementFeedbackModal';

interface ATSCompatibilityCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: any;
  jobDescription?: string;
  onResumeUpdate?: (updatedResume: any) => void;
}

interface ATSAnalysisResult {
  score: number;
  recommendations: string[];
  keywordMatch: number;
  formatScore: number;
  contentScore: number;
  verdict: {
    alignment: 'strong' | 'potential' | 'low';
    message: string;
    recommendation: string;
  };
  keywordAnalysis: {
    presentKeywords: string[];
    missingKeywords: string[];
    keywordDensity: number;
  };
  formatAnalysis: {
    issues: string[];
    strengths: string[];
  };
}

export default function ATSCompatibilityChecker({ 
  isOpen, 
  onClose, 
  resumeData, 
  jobDescription: initialJobDescription,
  onResumeUpdate 
}: ATSCompatibilityCheckerProps) {
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSAnalysisResult | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<'original' | 'improved'>('original');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<any>(null);
  const [optimizedResume, setOptimizedResume] = useState<any>(null);

  if (!isOpen) return null;

  const validateResumeData = (data: any): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (!data) {
      issues.push('No resume data provided');
      return { isValid: false, issues };
    }
    
    if (!data.personalInfo) {
      issues.push('Personal information section is missing');
    } else {
      if (!data.personalInfo.firstName) issues.push('First name is required');
      if (!data.personalInfo.lastName) issues.push('Last name is required');
      if (!data.personalInfo.email) issues.push('Email address is required');
    }
    
    if (!data.professionalSummary || data.professionalSummary.length < 10) {
      issues.push('Professional summary is too short or missing');
    }
    
    return { isValid: issues.length === 0, issues };
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      toast.loading('🛡️ Analyzing ATS compatibility...', { id: 'ats-analysis' });
      
      // Validate resume data first
      const validation = validateResumeData(resumeData);
      if (!validation.isValid) {
        toast.error('Resume incomplete', {
          id: 'ats-analysis',
          description: `Please complete: ${validation.issues.join(', ')}`,
          duration: 5000
        });
        return;
      }
      
      // Step 1: Analyze current resume
      const result = await resumeService.analyzeATSCompatibility(resumeData, jobDescription);
      
      // Enhanced analysis with verdict and detailed insights
      const enhancedResult: ATSAnalysisResult = {
        ...result,
        verdict: generateVerdict(result.score),
        keywordAnalysis: await analyzeKeywords(resumeData, jobDescription),
        formatAnalysis: analyzeFormat(resumeData)
      };
      
      setAnalysisResult(enhancedResult);

      // Step 2: Automatically optimize if score is below 85%
      if (result.score < 85) {
        toast.loading('🤖 Optimizing resume for ATS compatibility...', { id: 'ats-analysis' });
        
        try {
          const optimizationResult = await resumeService.optimizeResumeForATS(resumeData, {
            jobDescription,
            currentScore: result.score,
            issues: enhancedResult.formatAnalysis.issues,
            missingKeywords: enhancedResult.keywordAnalysis.missingKeywords
          });

          setOptimizedResume(optimizationResult.optimizedResume);
          
          // Create enhancement feedback
          const feedbackData = {
            type: 'ats' as const,
            title: 'ATS Compatibility Analysis Complete',
            summary: `Analyzed your resume and improved ATS compatibility from ${result.score}% to ${optimizationResult.newScore}%`,
            improvements: [
              {
                category: 'Keyword Optimization',
                changes: optimizationResult.keywordChanges || ['Added missing industry keywords', 'Improved keyword density'],
                impact: 'high' as const
              },
              {
                category: 'Format Improvements',
                changes: optimizationResult.formatChanges || ['Optimized section headers', 'Improved bullet point structure'],
                impact: 'medium' as const
              },
              {
                category: 'Content Enhancement',
                changes: optimizationResult.contentChanges || ['Enhanced job descriptions', 'Quantified achievements'],
                impact: 'high' as const
              }
            ],
            scores: {
              before: result.score,
              after: optimizationResult.newScore,
              improvement: optimizationResult.newScore - result.score
            },
            keyMetrics: [
              { label: 'ATS Score', value: `${optimizationResult.newScore}%`, improvement: `${optimizationResult.newScore - result.score}%` },
              { label: 'Keywords Added', value: `${optimizationResult.keywordsAdded || 0}` },
              { label: 'Issues Fixed', value: `${optimizationResult.issuesFixed || 0}` }
            ]
          };

          setEnhancementResult(feedbackData);
          toast.success('✅ ATS optimization complete!', { id: 'ats-analysis' });
          setShowFeedbackModal(true);
          
        } catch (optimizationError) {
          console.error('ATS optimization failed:', optimizationError);
          toast.success(`📊 Analysis complete! Score: ${result.score}%`, { id: 'ats-analysis' });
        }
      } else {
        toast.success(`🎉 Excellent ATS score: ${result.score}%!`, { id: 'ats-analysis' });
      }
      
    } catch (error: any) {
      console.error('Error analyzing ATS compatibility:', error);
      
      // Provide more detailed error feedback
      let errorMessage = 'Failed to analyze ATS compatibility';
      if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error - please check your connection and try again';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error - please log in and try again';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests - please wait a moment and try again';
      } else if (error.message?.includes('resume data')) {
        errorMessage = 'Invalid resume data - please complete more sections and try again';
      }
      
      toast.error(errorMessage, { 
        id: 'ats-analysis',
        description: 'The analysis will use a fallback method to provide basic insights.',
        duration: 5000
      });
      
      // Still try to provide some analysis using fallback
      try {
        const fallbackResult = {
          score: 65,
          recommendations: [
            'Complete all resume sections for better analysis',
            'Add more technical skills relevant to your field',
            'Include quantified achievements in work experience',
            'Ensure contact information is complete and professional'
          ],
          keywordMatch: 50,
          formatScore: 80,
          contentScore: 70,
          verdict: {
            alignment: 'potential' as const,
            message: 'Analysis completed with limited data. Complete your resume for more accurate results.',
            recommendation: 'Add more details to your resume sections for improved ATS compatibility analysis.'
          },
          keywordAnalysis: {
            presentKeywords: ['professional', 'experience', 'skills'],
            missingKeywords: ['leadership', 'management', 'results', 'team'],
            keywordDensity: 50
          },
          formatAnalysis: {
            issues: ['Incomplete resume sections'],
            strengths: ['Good basic structure', 'Contact information present']
          }
        };
        
        setAnalysisResult(fallbackResult);
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateVerdict = (score: number) => {
    if (score >= 85) {
      return {
        alignment: 'strong' as const,
        message: 'Excellent fit. Your experience in key areas directly matches the core requirements of this role.',
        recommendation: 'We strongly recommend applying. Your resume demonstrates strong alignment with the job requirements.'
      };
    } else if (score >= 70) {
      return {
        alignment: 'potential' as const,
        message: 'Good fit. You have many of the required skills, but there are some gaps to address.',
        recommendation: 'Consider highlighting your transferable skills in your cover letter and addressing the missing requirements.'
      };
    } else {
      return {
        alignment: 'low' as const,
        message: 'This role may be a stretch. The job requires significant experience in areas not reflected in your resume.',
        recommendation: 'Consider looking for roles that better align with your current strengths, or focus on building the missing skills.'
      };
    }
  };

  const analyzeKeywords = async (resume: any, jobDesc: string) => {
    // Mock implementation - in real app, this would be done by AI
    const jobKeywords = jobDesc.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const resumeText = JSON.stringify(resume).toLowerCase();
    
    const presentKeywords = jobKeywords.filter(keyword => 
      resumeText.includes(keyword)
    ).slice(0, 10);
    
    const missingKeywords = jobKeywords.filter(keyword => 
      !resumeText.includes(keyword)
    ).slice(0, 10);

    return {
      presentKeywords,
      missingKeywords,
      keywordDensity: (presentKeywords.length / jobKeywords.length) * 100
    };
  };

  const analyzeFormat = (resume: any) => {
    const issues = [];
    const strengths = [];

    // Basic format analysis
    if (!resume.personalInfo?.email) issues.push('Missing contact email');
    if (!resume.personalInfo?.phone) issues.push('Missing contact phone');
    if (!resume.workExperience?.length) issues.push('No work experience listed');
    if (!resume.skills?.length) issues.push('No skills section');
    
    if (resume.personalInfo?.email) strengths.push('Contact information present');
    if (resume.workExperience?.length > 0) strengths.push('Work experience included');
    if (resume.skills?.length > 0) strengths.push('Skills section present');
    if (resume.education?.length > 0) strengths.push('Education section included');

    return { issues, strengths };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-tertiary rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-dark-border">
        <div className="sticky top-0 bg-dark-tertiary border-b border-dark-border p-6 flex items-center justify-between">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-6 h-6 text-dark-accent mr-2" />
            <h2 className="text-xl font-semibold text-dark-text-primary">ATS Compatibility Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-dark-text-muted hover:text-dark-text-primary transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {!analysisResult ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold gradient-text-dark mb-2">
                  Analyze Your Resume's ATS Compatibility
                </h3>
                <p className="text-dark-text-secondary">
                  Check how well your resume will perform in Applicant Tracking Systems (ATS) 
                  and get specific recommendations for improvement.
                </p>
              </div>

              <Card className="card-dark p-4">
                <h4 className="font-medium text-dark-text-primary mb-3">Resume Version to Analyze</h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="original"
                      checked={selectedVersion === 'original'}
                      onChange={(e) => setSelectedVersion(e.target.value as 'original' | 'improved')}
                      className="mr-2"
                    />
                    Check My Original Resume
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="improved"
                      checked={selectedVersion === 'improved'}
                      onChange={(e) => setSelectedVersion(e.target.value as 'original' | 'improved')}
                      className="mr-2"
                    />
                    Check My AI-Improved Resume
                  </label>
                </div>
              </Card>

              <Card className="card-dark p-4">
                <Textarea
                  label="Job Description (Optional)"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description to get a more accurate analysis of how well your resume matches the specific role..."
                  rows={6}
                />
                <p className="text-sm text-dark-text-muted mt-2">
                  Including the job description will provide keyword matching analysis and role-specific recommendations.
                </p>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="btn-primary-dark px-8"
                >
                  {isAnalyzing ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ChartBarIcon className="w-4 h-4 mr-2" />
                      Analyze ATS Compatibility
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className={`card-dark p-8 text-center border-2 ${
                analysisResult.score >= 85 ? 'border-green-400/30 bg-green-500/10' :
                analysisResult.score >= 70 ? 'border-yellow-400/30 bg-yellow-500/10' :
                'border-red-400/30 bg-red-500/10'
              }`}>
                <div className={`text-6xl font-bold mb-4 ${getScoreColor(analysisResult.score)}`}>
                  {analysisResult.score}%
                </div>
                <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
                  ATS Compatibility Score
                </h3>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${
                  analysisResult.score >= 85 ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 
                  analysisResult.score >= 70 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' : 
                  'bg-red-500/20 text-red-400 border border-red-400/30'
                }`}>
                  {analysisResult.verdict.alignment === 'strong' ? 'Strong Alignment' :
                   analysisResult.verdict.alignment === 'potential' ? 'Potential Alignment' : 'Low Alignment'}
                </div>
              </Card>

              {/* Detailed Breakdown */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="card-dark p-6">
                  <div className="flex items-center mb-3">
                    <ChartBarIcon className="w-5 h-5 text-dark-accent mr-2" />
                    <h4 className="font-medium text-dark-text-primary">Format Score</h4>
                  </div>
                  <div className="text-3xl font-bold text-dark-text-primary mb-2">
                    {analysisResult.formatScore}%
                  </div>
                  <p className="text-sm text-dark-text-secondary">
                    ATS readability and structure compatibility
                  </p>
                </Card>

                <Card className="card-dark p-6">
                  <div className="flex items-center mb-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                    <h4 className="font-medium text-dark-text-primary">Content Score</h4>
                  </div>
                  <div className="text-3xl font-bold text-dark-text-primary mb-2">
                    {analysisResult.contentScore}%
                  </div>
                  <p className="text-sm text-dark-text-secondary">
                    Content quality and completeness
                  </p>
                </Card>

                <Card className="card-dark p-6">
                  <div className="flex items-center mb-3">
                    <ShieldCheckIcon className="w-5 h-5 text-purple-400 mr-2" />
                    <h4 className="font-medium text-dark-text-primary">Keyword Match</h4>
                  </div>
                  <div className="text-3xl font-bold text-dark-text-primary mb-2">
                    {analysisResult.keywordMatch}%
                  </div>
                  <p className="text-sm text-dark-text-secondary">
                    Job description keyword alignment
                  </p>
                </Card>
              </div>

              {/* Job Alignment Verdict */}
              <Card className="card-dark p-6">
                <div className="flex items-start">
                  <div className={`p-2 rounded-full mr-4 ${
                    analysisResult.verdict.alignment === 'strong' ? 'bg-green-500/20' :
                    analysisResult.verdict.alignment === 'potential' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    {analysisResult.verdict.alignment === 'strong' ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    ) : analysisResult.verdict.alignment === 'potential' ? (
                      <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
                    ) : (
                      <XMarkIcon className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark-text-primary mb-2">Job Alignment Assessment</h4>
                    <p className="text-dark-text-secondary mb-3">{analysisResult.verdict.message}</p>
                    <p className="text-sm text-dark-text-secondary bg-dark-secondary/20 p-3 rounded-lg border border-dark-border">
                      <strong className="text-dark-text-primary">Recommendation:</strong> {analysisResult.verdict.recommendation}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Keyword Analysis */}
              {jobDescription && (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="card-dark p-6">
                    <h4 className="font-medium text-green-400 mb-4 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Keywords Present ({analysisResult.keywordAnalysis.presentKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keywordAnalysis.presentKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-400/30"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </Card>

                  <Card className="card-dark p-6">
                    <h4 className="font-medium text-red-400 mb-4 flex items-center">
                      <XMarkIcon className="w-5 h-5 mr-2" />
                      Missing Keywords ({analysisResult.keywordAnalysis.missingKeywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keywordAnalysis.missingKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-400/30"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Recommendations */}
              <Card className="card-dark p-6">
                <h4 className="font-medium text-dark-text-primary mb-4 flex items-center">
                  <LightBulbIcon className="w-5 h-5 text-yellow-400 mr-2" />
                  Actionable Recommendations
                </h4>
                <div className="space-y-3">
                  {analysisResult.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-dark-accent/20 text-dark-accent rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5 border border-dark-accent/30">
                        {index + 1}
                      </div>
                      <p className="text-dark-text-secondary">{rec}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setAnalysisResult(null)} className="btn-secondary-dark">
                  Analyze Again
                </Button>
                <Button onClick={onClose} className="btn-primary-dark">
                  Close Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhancement Feedback Modal */}
      <EnhancementFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        result={enhancementResult}
        onApplyChanges={() => {
          if (optimizedResume && onResumeUpdate) {
            onResumeUpdate(optimizedResume);
            toast.success('🎉 Resume updated with ATS improvements!', {
              description: 'Changes are now reflected in your resume preview'
            });
          }
          setShowFeedbackModal(false);
          onClose();
        }}
        onViewComparison={() => {
          // TODO: Implement side-by-side comparison view
          toast.info('Comparison view coming soon!');
        }}
      />
    </div>
  );
}