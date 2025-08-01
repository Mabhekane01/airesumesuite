import React, { useState, useEffect, useCallback } from 'react';
import { 
  SparklesIcon, 
  ChartBarIcon,
  BriefcaseIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { Resume } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import TemplateRenderer from './TemplateRenderer';
import { useResume } from '../../contexts/ResumeContext';
import { resumeService } from '../../services/resumeService';
import { api } from '../../services/api';
import AILoadingOverlay from '../ui/AILoadingOverlay';
import { useAIProgress } from '../../hooks/useAIProgress';
import { toast } from 'sonner';
import { useSubscriptionModal } from '../../hooks/useSubscriptionModal';
import SubscriptionModal from '../subscription/SubscriptionModal';

interface AIAnalysis {
  overallScore: number;
  atsCompatibility: number;
  keywordDensity: number;
  contentQuality: number;
  industryAlignment: number;
  strengths: string[];
  improvements: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    suggestions: string[];
    impact: string;
  }>;
  competitorComparison: {
    percentile: number;
    industry: string;
    improvements: string[];
  };
}

interface JobMatchAnalysis {
  matchScore: number;
  keywordAlignment: number;
  skillsMatch: number;
  experienceMatch: number;
  missingKeywords: string[];
  recommendedImprovements: string[];
}

interface EnterpriseResumeEnhancerProps {
  resume: Resume;
  onResumeUpdate?: (updatedResume: Resume) => void;
}

export default function EnterpriseResumeEnhancer({ 
  resume, 
  onResumeUpdate 
}: EnterpriseResumeEnhancerProps) {
  const { updateResumeData, updateAIData } = useResume();
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis' | 'optimization' | 'benchmarking'>('preview');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [jobMatchAnalysis, setJobMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [jobUrl, setJobUrl] = useState('');
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  
  // AI Progress hooks for different operations
  const atsProgress = useAIProgress('ats-analysis');
  const enhancementProgress = useAIProgress('resume-enhancement');
  const jobMatchingProgress = useAIProgress('job-matching');
  const jobOptimizationProgress = useAIProgress('job-optimization');
  
  // Subscription modal
  const { isModalOpen, modalProps, closeModal, checkAIFeature } = useSubscriptionModal();
  
  const template = getTemplateById(resume.template) || resumeTemplates[0];

  // Helper function to check if error is subscription-related
  const isSubscriptionError = (error: any): boolean => {
    return error?.response?.status === 403 || 
           error?.isSubscriptionError ||
           error?.response?.data?.code?.includes('SUBSCRIPTION');
  };

  // REAL AI Analysis - Actually calls backend AI services  
  const runComprehensiveAnalysis = useCallback(async () => {
    if (enhancementProgress.isLoading) return; // Prevent multiple simultaneous calls
    
    // Check subscription access first
    if (!checkAIFeature('AI Resume Enhancement')) {
      return; // Modal shown automatically
    }
    
    enhancementProgress.startProgress();
    
    try {
      // Track successful API calls
      let successfulCalls = 0;
      let totalCalls = 3; // summary, ATS, enhancement
      
      // First, generate REAL AI professional summary
      console.log('📝 Generating REAL AI professional summary...');
      let aiSummary = null;
      try {
        const summaryResponse = await api.post('/resumes/generate-summary', {
          resumeData: resume
        });
        aiSummary = summaryResponse.data.data || summaryResponse.data.summary;
        console.log('✅ REAL AI summary generated:', aiSummary?.substring(0, 50) + '...');
        successfulCalls++;
      } catch (summaryError) {
        console.warn('⚠️ AI summary generation failed:', summaryError.response?.data || summaryError.message);
        if (isSubscriptionError(summaryError)) {
          enhancementProgress.cancelProgress();
          return; // Stop processing - subscription error
        }
      }

      // Second, run ATS analysis with AI
      console.log('🔍 Running AI-powered ATS analysis...');
      let atsResponse;
      try {
        atsResponse = await resumeService.analyzeATSCompatibility(resume);
        console.log('✅ ATS analysis completed. Score:', atsResponse.score);
        successfulCalls++;
      } catch (atsError) {
        console.warn('⚠️ ATS analysis failed:', atsError);
        if (isSubscriptionError(atsError)) {
          enhancementProgress.cancelProgress();
          return; // Stop processing - subscription error
        }
        // Use fallback data
        atsResponse = { score: 70, strengths: [], recommendations: [], improvementAreas: [] };
      }

      // Third, get job alignment score for industry analysis
      console.log('📊 Analyzing industry alignment...');
      let alignmentScore = 75;
      try {
        const alignmentResponse = await resumeService.getJobAlignmentScore(resume, 'Generate a comprehensive analysis of this resume for general business positions, focusing on industry alignment and competitive positioning.');
        alignmentScore = alignmentResponse.score;
        console.log('✅ Industry alignment score:', alignmentScore);
      } catch (alignmentError) {
        console.warn('⚠️ Industry alignment analysis failed, using fallback');
      }

      // Fourth, run REAL comprehensive AI enhancement
      let enhancementData = null;
      console.log('🚀 Running REAL comprehensive AI enhancement...');
      try {
        if (resume._id) {
          // For saved resumes with ID
          const enhanceResponse = await api.post(`/resumes/${resume._id}/enhance`, {
            generateSummary: true,
            improveATS: true,
            enhanceAchievements: true
          });
          enhancementData = enhanceResponse.data.data;
        } else {
          // For unsaved resumes
          const enhanceResponse = await api.post('/resumes/enhance', {
            resumeData: resume,
            generateSummary: true,
            improveATS: true,
            enhanceAchievements: true
          });
          enhancementData = enhanceResponse.data.data;
        }
        console.log('✅ REAL AI comprehensive enhancement completed:', enhancementData);
        successfulCalls++;
      } catch (enhanceError) {
        console.warn('⚠️ AI enhancement failed:', enhanceError.response?.data || enhanceError.message);
        if (isSubscriptionError(enhanceError)) {
          enhancementProgress.cancelProgress();
          return; // Stop processing - subscription error
        }
      }

      // Process all the REAL AI responses
      const analysis: AIAnalysis = {
        overallScore: enhancementData?.qualityScore?.after || atsResponse.score || 75,
        atsCompatibility: atsResponse.score,
        keywordDensity: atsResponse.keywordMatch || calculateKeywordDensity(resume),
        contentQuality: atsResponse.contentScore || assessContentQuality(resume),
        industryAlignment: alignmentScore,
        strengths: atsResponse.strengths || extractStrengths(resume),
        improvements: formatImprovements(atsResponse.recommendations || enhancementData?.improvements || []),
        competitorComparison: {
          percentile: Math.min(Math.round((atsResponse.score / 100) * 85), 95),
          industry: detectIndustry(resume),
          improvements: atsResponse.improvementAreas || ['Add more quantified achievements', 'Improve keyword optimization', 'Enhance professional summary']
        }
      };

      console.log('✅ AI Analysis completed successfully:', {
        overallScore: analysis.overallScore,
        atsScore: analysis.atsCompatibility,
        improvements: analysis.improvements.length
      });

      setAiAnalysis(analysis);
      updateAIData({ 
        atsScore: analysis.atsCompatibility,
        aiSuggestions: analysis.improvements.flatMap(imp => imp.suggestions),
        optimizedSummary: aiSummary
      });

      enhancementProgress.completeProgress();
      
      // Only show success if we had actual AI successes
      if (successfulCalls > 0) {
        toast.success('AI analysis completed successfully', {
          description: `ATS Score: ${analysis.atsCompatibility}% | ${analysis.improvements.length} improvements identified | ${successfulCalls}/${totalCalls} AI services used`
        });
      } else {
        // All AI calls failed - show fallback message
        toast.warning('Analysis completed with limited features', {
          description: 'AI services unavailable. Using basic analysis instead.'
        });
      }

    } catch (error: any) {
      console.error('❌ AI Analysis completely failed:', error);
      enhancementProgress.cancelProgress();
      
      // Show specific error message to help debug
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`AI analysis failed: ${errorMessage}`, {
        description: 'Check console for details. Using local fallback.'
      });
      
      // Only use local fallback if ALL AI calls fail
      const analysis: AIAnalysis = {
        overallScore: calculateOverallScore(resume),
        atsCompatibility: 70,
        keywordDensity: calculateKeywordDensity(resume),
        contentQuality: assessContentQuality(resume),
        industryAlignment: 75,
        strengths: extractStrengths(resume),
        improvements: formatImprovements([]),
        competitorComparison: {
          percentile: 65,
          industry: detectIndustry(resume),
          improvements: ['AI services not configured', 'Check API keys in backend', 'Enable enterprise AI features']
        }
      };
      
      setAiAnalysis(analysis);
    } finally {
      console.log('🏁 AI Analysis process completed');
    }
  }, [resume, updateAIData, enhancementProgress]);

  // Job-Specific Optimization using existing working endpoints
  const optimizeForJob = useCallback(async (jobUrl: string) => {
    if (!jobUrl.trim()) {
      toast.error('Please enter a valid job URL');
      return;
    }
    
    // Check subscription access first
    if (!checkAIFeature('AI Job Optimization')) {
      return; // Modal shown automatically
    }

    jobOptimizationProgress.startProgress();
    try {
      // Use existing working job analysis endpoint
      const jobAnalysis = await resumeService.analyzeJobFromUrl({ jobUrl });
      
      // Use existing working job matching endpoint
      const matchResult = await resumeService.getJobMatchingScore(resume, jobUrl);
      
      setJobMatchAnalysis({
        matchScore: matchResult.matchScore,
        keywordAlignment: calculateAlignment(matchResult.keywordAlignment, matchResult.missingKeywords),
        skillsMatch: calculateSkillsMatch(resume, jobAnalysis.jobDetails),
        experienceMatch: calculateExperienceMatch(resume, jobAnalysis.jobDetails),
        missingKeywords: matchResult.missingKeywords,
        recommendedImprovements: matchResult.recommendations
      });

      // Use existing working optimization endpoint
      const optimizedResult = await resumeService.optimizeResumeWithJobUrl(resume, jobUrl);
      
      if (optimizedResult.enhancedResume || optimizedResult.improvedResume) {
        const optimizedResume = optimizedResult.enhancedResume || optimizedResult.improvedResume;
        updateResumeData(optimizedResume);
        
        if (onResumeUpdate) {
          onResumeUpdate(optimizedResume);
        }

        // Track optimization history
        setOptimizationHistory(prev => [...prev, {
          timestamp: new Date().toISOString(),
          jobUrl,
          jobTitle: jobAnalysis.jobDetails.title,
          company: jobAnalysis.jobDetails.company,
          improvements: optimizedResult.improvements,
          scoreImprovement: optimizedResult.qualityScore
        }]);

        // Handle AI status notifications
        console.log('🔍 DEBUG: Job Optimization Result:', {
          hasAiStatus: !!optimizedResult.aiStatus,
          aiStatus: optimizedResult.aiStatus,
          resultKeys: Object.keys(optimizedResult)
        });
        
        if (optimizedResult.aiStatus) {
          console.log('⚠️ SHOWING JOB OPTIMIZATION FALLBACK WARNING:', optimizedResult.aiStatus);
          toast.warning(`⚠️ ${optimizedResult.aiStatus}`, {
            description: 'Your resume was still optimized, but AI services encountered issues. Contact support for full AI capabilities.',
            duration: 8000
          });
        } else {
          console.log('✅ SHOWING JOB OPTIMIZATION AI SUCCESS MESSAGE');
          jobOptimizationProgress.completeProgress();
          toast.success('🤖 Resume optimized with full AI power!', {
            description: 'Your resume has been enhanced using our advanced AI algorithms.'
          });
        }
      }
    } catch (error) {
      console.error('Job optimization error:', error);
      jobOptimizationProgress.cancelProgress();
      
      // Check if it's a subscription error
      if (isSubscriptionError(error)) {
        // Subscription error already handled by API interceptor/modal
        return;
      }
      
      toast.error('Job optimization failed. Please check the URL and try again.');
    }
  }, [resume, updateResumeData, onResumeUpdate, jobOptimizationProgress]);

  // Run initial analysis only once when component mounts
  useEffect(() => {
    let mounted = true;
    
    const runInitialAnalysis = async () => {
      if (aiAnalysis === null && !enhancementProgress.isLoading && mounted) {
        console.log('🎯 Running initial AI analysis...');
        await runComprehensiveAnalysis();
      }
    };
    
    // Add a small delay to prevent double calls
    const timeoutId = setTimeout(runInitialAnalysis, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array to run only once

  // Helper functions
  const calculateOverallScore = (resume: Resume): number => {
    let score = 50;
    if (resume.professionalSummary && resume.professionalSummary.length > 100) score += 15;
    if (resume.workExperience.length > 0) score += Math.min(resume.workExperience.length * 10, 25);
    if (resume.skills.length >= 5) score += 10;
    return Math.min(score, 100);
  };

  const calculateKeywordDensity = (resume: Resume): number => {
    const keywords = ['leadership', 'management', 'development', 'strategic', 'analytical'];
    const text = [resume.professionalSummary, ...resume.workExperience.flatMap(exp => exp.achievements)].join(' ').toLowerCase();
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    return Math.round((matches / keywords.length) * 100);
  };

  const assessContentQuality = (resume: Resume): number => {
    let score = 0;
    if (resume.professionalSummary && resume.professionalSummary.length > 100) score += 25;
    if (resume.workExperience.some(exp => exp.achievements.some(achievement => /\d+/.test(achievement)))) score += 25;
    if (resume.skills.length >= 8) score += 25;
    if (resume.education.length > 0) score += 25;
    return score;
  };

  const extractStrengths = (resume: Resume): string[] => {
    const strengths = [];
    if (resume.professionalSummary && resume.professionalSummary.length > 100) {
      strengths.push('Comprehensive professional summary');
    }
    if (resume.workExperience.length > 0) {
      strengths.push('Strong work experience documentation');
    }
    if (resume.skills.length >= 5) {
      strengths.push('Diverse skill set coverage');
    }
    if (resume.workExperience.some(exp => exp.achievements.some(achievement => /\d+/.test(achievement)))) {
      strengths.push('Quantified achievements present');
    }
    return strengths.length > 0 ? strengths : ['Professional resume structure', 'Complete contact information'];
  };

  const formatImprovements = (improvements: any[]): AIAnalysis['improvements'] => {
    if (!improvements || improvements.length === 0) {
      return [
        {
          category: 'Professional Summary',
          priority: 'high',
          suggestions: ['Expand summary to highlight key achievements', 'Include industry-specific keywords'],
          impact: 'Significantly improves first impression and ATS compatibility'
        },
        {
          category: 'Work Experience',
          priority: 'high',
          suggestions: ['Add quantified achievements with specific metrics', 'Use stronger action verbs'],
          impact: 'Demonstrates measurable value and impact'
        },
        {
          category: 'Skills',
          priority: 'medium',
          suggestions: ['Include more relevant technical skills', 'Add soft skills valued in your industry'],
          impact: 'Improves keyword matching and skill coverage'
        }
      ];
    }
    
    // Handle ATS recommendations format (array of strings)
    if (Array.isArray(improvements) && typeof improvements[0] === 'string') {
      return improvements.map((recommendation, index) => ({
        category: `ATS Improvement ${index + 1}`,
        priority: 'medium' as const,
        suggestions: [recommendation],
        impact: 'Improves ATS compatibility and scan rate'
      }));
    }
    
    // Handle complex improvement objects
    return improvements.map(imp => ({
      category: imp.category || 'General Enhancement',
      priority: imp.impact === 'high' ? 'high' : imp.impact === 'low' ? 'low' : 'medium',
      suggestions: Array.isArray(imp.changes) ? imp.changes : Array.isArray(imp) ? imp : [imp.changes || imp],
      impact: typeof imp.impact === 'string' ? imp.impact : 'Improves overall resume effectiveness'
    }));
  };

  const detectIndustry = (resume: Resume): string => {
    const text = [resume.professionalSummary || '', ...resume.workExperience.flatMap(exp => [exp.jobTitle, exp.company])].join(' ').toLowerCase();
    if (text.includes('software') || text.includes('developer') || text.includes('engineer')) return 'Technology';
    if (text.includes('marketing') || text.includes('sales')) return 'Marketing & Sales';
    if (text.includes('finance') || text.includes('accounting')) return 'Finance';
    return 'General Business';
  };

  const calculateAlignment = (aligned: string[], missing: string[]): number => {
    const total = aligned.length + missing.length;
    return total > 0 ? Math.round((aligned.length / total) * 100) : 0;
  };

  const calculateSkillsMatch = (resume: Resume, jobDetails: any): number => {
    const resumeSkills = resume.skills.map(skill => (skill.name || skill).toLowerCase());
    const jobSkills = jobDetails.requirements || [];
    const matches = jobSkills.filter((skill: string) =>
      resumeSkills.some(resumeSkill => resumeSkill.includes(skill.toLowerCase()))
    ).length;
    return jobSkills.length > 0 ? Math.round((matches / jobSkills.length) * 100) : 0;
  };

  const calculateExperienceMatch = (resume: Resume, jobDetails: any): number => {
    const totalExperience = resume.workExperience.length;
    const requiredExperience = jobDetails.experienceYears || 3;
    return Math.min(Math.round((totalExperience / requiredExperience) * 100), 100);
  };

  const ScoreCard = ({ title, score, icon: Icon, color }: { title: string; score: number; icon: any; color: string }) => (
    <div className="bg-dark-secondary rounded-lg p-4 border border-dark-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-sm font-medium text-dark-text-primary">{title}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
      <div className="w-full bg-dark-tertiary rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-dark-secondary rounded-lg p-1">
        {[
          { id: 'preview', label: 'Preview', icon: EyeIcon },
          { id: 'analysis', label: 'AI Analysis', icon: SparklesIcon },
          { id: 'optimization', label: 'Job Optimization', icon: BriefcaseIcon },
          { id: 'benchmarking', label: 'Benchmarking', icon: ChartBarIcon }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="card-dark p-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <TemplateRenderer resume={resume} template={template} />
              </div>
            </Card>
          </div>
          
          <div className="space-y-4">
            {aiAnalysis && (
              <>
                <Card className="card-dark p-4">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Quick Scores</h3>
                  <div className="space-y-3">
                    <ScoreCard
                      title="Overall Quality"
                      score={aiAnalysis.overallScore}
                      icon={SparklesIcon}
                      color="text-blue-400"
                    />
                    <ScoreCard
                      title="ATS Compatibility"
                      score={aiAnalysis.atsCompatibility}
                      icon={ShieldCheckIcon}
                      color="text-green-400"
                    />
                    <ScoreCard
                      title="Keyword Density"
                      score={aiAnalysis.keywordDensity}
                      icon={MagnifyingGlassIcon}
                      color="text-purple-400"
                    />
                  </div>
                </Card>

                <Card className="card-dark p-4">
                  <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={runComprehensiveAnalysis}
                      disabled={enhancementProgress.isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {enhancementProgress.isLoading ? 'Analyzing...' : 'Refresh Analysis'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab('optimization')}
                    >
                      Optimize for Job
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && aiAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="card-dark p-6">
              <h3 className="text-xl font-semibold text-dark-text-primary mb-4">AI Analysis Results</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <ScoreCard
                  title="Overall Score"
                  score={aiAnalysis.overallScore}
                  icon={SparklesIcon}
                  color="text-blue-400"
                />
                <ScoreCard
                  title="ATS Score"
                  score={aiAnalysis.atsCompatibility}
                  icon={ShieldCheckIcon}
                  color="text-green-400"
                />
                <ScoreCard
                  title="Content Quality"
                  score={aiAnalysis.contentQuality}
                  icon={DocumentTextIcon}
                  color="text-purple-400"
                />
                <ScoreCard
                  title="Industry Alignment"
                  score={aiAnalysis.industryAlignment}
                  icon={BriefcaseIcon}
                  color="text-yellow-400"
                />
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-dark-text-primary mb-3">Strengths</h4>
                <ul className="space-y-2">
                  {aiAnalysis.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-dark-text-secondary">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-dark-text-primary">AI Recommendations</h3>
              </div>

              <div className="space-y-4">
                {aiAnalysis.improvements.map((improvement, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      improvement.priority === 'high'
                        ? 'border-red-500/30 bg-red-500/10'
                        : improvement.priority === 'medium'
                        ? 'border-yellow-500/30 bg-yellow-500/10'
                        : 'border-blue-500/30 bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-dark-text-primary">{improvement.category}</h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          improvement.priority === 'high'
                            ? 'bg-red-500/20 text-red-400'
                            : improvement.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {improvement.priority.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-dark-text-muted mb-3">{improvement.impact}</p>
                    
                    <ul className="space-y-1">
                      {improvement.suggestions.map((suggestion, suggestionIndex) => (
                        <li key={suggestionIndex} className="text-sm text-dark-text-secondary">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="space-y-6">
          <Card className="card-dark p-6">
            <h3 className="text-xl font-semibold text-dark-text-primary mb-4">Job-Specific Optimization</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-primary mb-2">
                  Job Posting URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://company.com/careers/job-posting"
                    className="flex-1 px-3 py-2 bg-dark-tertiary border border-dark-border rounded-lg text-white placeholder-dark-text-muted focus:border-blue-500 focus:outline-none"
                  />
                  <Button
                    onClick={() => optimizeForJob(jobUrl)}
                    disabled={jobOptimizationProgress.isLoading || !jobUrl.trim()}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    {jobOptimizationProgress.isLoading ? (
                      <>
                        <BoltIcon className="w-4 h-4 animate-pulse" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <BoltIcon className="w-4 h-4" />
                        Optimize
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {jobMatchAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-dark-text-primary">Job Match Analysis</h4>
                    
                    <div className="space-y-3">
                      <ScoreCard
                        title="Overall Match"
                        score={jobMatchAnalysis.matchScore}
                        icon={BriefcaseIcon}
                        color="text-blue-400"
                      />
                      <ScoreCard
                        title="Skills Alignment"
                        score={jobMatchAnalysis.skillsMatch}
                        icon={DocumentTextIcon}
                        color="text-green-400"
                      />
                      <ScoreCard
                        title="Experience Match"
                        score={jobMatchAnalysis.experienceMatch}
                        icon={ChartBarIcon}
                        color="text-purple-400"
                      />
                    </div>

                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-dark-text-primary mb-3">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {jobMatchAnalysis.missingKeywords.slice(0, 10).map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-dark-text-primary mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {jobMatchAnalysis.recommendedImprovements.slice(0, 5).map((improvement, index) => (
                          <li key={index} className="text-sm text-dark-text-secondary flex items-start gap-2">
                            <SparklesIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {optimizationHistory.length > 0 && (
            <Card className="card-dark p-6">
              <h3 className="text-xl font-semibold text-dark-text-primary mb-4">Optimization History</h3>
              <div className="space-y-3">
                {optimizationHistory.slice(0, 5).map((optimization, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-dark-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-dark-text-primary">{optimization.jobTitle}</p>
                      <p className="text-sm text-dark-text-muted">{optimization.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400">
                        +{optimization.scoreImprovement?.improvement || 0} points
                      </p>
                      <p className="text-xs text-dark-text-muted">
                        {new Date(optimization.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'benchmarking' && aiAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-dark p-6">
            <h3 className="text-xl font-semibold text-dark-text-primary mb-4">Industry Benchmarking</h3>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-dark-text-secondary">Your Position in {aiAnalysis.competitorComparison.industry}</span>
                <span className="text-2xl font-bold text-blue-400">
                  {aiAnalysis.competitorComparison.percentile}th percentile
                </span>
              </div>
              <div className="w-full bg-dark-tertiary rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                  style={{ width: `${aiAnalysis.competitorComparison.percentile}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-dark-text-primary mb-3">Areas for Improvement</h4>
                <ul className="space-y-2">
                  {aiAnalysis.competitorComparison.improvements.map((improvement, index) => (
                    <li key={index} className="text-sm text-dark-text-secondary flex items-start gap-2">
                      <ChartBarIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="card-dark p-6">
            <h3 className="text-xl font-semibold text-dark-text-primary mb-4">Competitive Analysis</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-dark-secondary rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{aiAnalysis.overallScore}%</p>
                  <p className="text-xs text-dark-text-muted">Your Score</p>
                </div>
                <div className="text-center p-3 bg-dark-secondary rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">78%</p>
                  <p className="text-xs text-dark-text-muted">Industry Average</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dark-text-secondary">ATS Compatibility</span>
                  <span className="text-sm font-medium text-dark-text-primary">
                    {aiAnalysis.atsCompatibility > 75 ? 'Above Average' : 'Below Average'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dark-text-secondary">Keyword Optimization</span>
                  <span className="text-sm font-medium text-dark-text-primary">
                    {aiAnalysis.keywordDensity > 70 ? 'Excellent' : 'Needs Work'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-dark-text-secondary">Content Quality</span>
                  <span className="text-sm font-medium text-dark-text-primary">
                    {aiAnalysis.contentQuality > 80 ? 'Outstanding' : 'Good'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* AI Loading Overlays */}
      <AILoadingOverlay
        isVisible={enhancementProgress.isLoading}
        title="🤖 AI Resume Enhancement"
        description="AI is comprehensively analyzing and enhancing your resume"
        progress={enhancementProgress.progress}
        currentStep={enhancementProgress.currentStep}
        estimatedTime={enhancementProgress.estimatedTime}
        onCancel={enhancementProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={jobOptimizationProgress.isLoading}
        title="🎯 Job Optimization"
        description="AI is optimizing your resume for the specific job posting"
        progress={jobOptimizationProgress.progress}
        currentStep={jobOptimizationProgress.currentStep}
        estimatedTime={jobOptimizationProgress.estimatedTime}
        onCancel={jobOptimizationProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={atsProgress.isLoading}
        title="🛡️ ATS Analysis"
        description="AI is analyzing your resume's compatibility with ATS systems"
        progress={atsProgress.progress}
        currentStep={atsProgress.currentStep}
        estimatedTime={atsProgress.estimatedTime}
        onCancel={atsProgress.cancelProgress}
      />

      <AILoadingOverlay
        isVisible={jobMatchingProgress.isLoading}
        title="📊 Job Matching Analysis"
        description="AI is calculating how well your resume matches the job requirements"
        progress={jobMatchingProgress.progress}
        currentStep={jobMatchingProgress.currentStep}
        estimatedTime={jobMatchingProgress.estimatedTime}
        onCancel={jobMatchingProgress.cancelProgress}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        featureName={modalProps.featureName}
        title={modalProps.title}
        description={modalProps.description}
      />

    </div>
  );
}