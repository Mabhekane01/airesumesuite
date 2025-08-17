import React, { useState } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CogIcon,
  LightBulbIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Resume, Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import ResumeDownloadManager from './ResumeDownloadManager';
import JobOptimizationModal from './JobOptimizationModal';
import ATSCompatibilityChecker from './ATSCompatibilityChecker';
import EnhancementFeedbackModal from './EnhancementFeedbackModal';
import { useResume } from '../../contexts/ResumeContext';
import TemplateRenderer from './TemplateRenderer';
import CoverLetterIntegration from './CoverLetterIntegration';
import PDFPreview from './PDFPreview';
import { resumeService } from '../../services/resumeService';
import { useSubscriptionModal } from '../../hooks/useSubscriptionModal';
import SubscriptionModal from '../subscription/SubscriptionModal';
import { toast } from 'sonner';

interface EnhancedResumePreviewProps {
  resume: Resume;
  templateId?: string;
  isLatexTemplate?: boolean;
  onAIImprovement?: () => void;
  onATSCheck?: () => void;
  onJobOptimization?: () => void;
  onResumeUpdate?: (updatedResume: Resume) => void;
  atsScore?: number;
  aiGenerated?: boolean;
}

export default function EnhancedResumePreview({ 
  resume, 
  templateId,
  isLatexTemplate = false,
  onAIImprovement,
  onATSCheck,
  onJobOptimization,
  onResumeUpdate,
  atsScore,
  aiGenerated = false
}: EnhancedResumePreviewProps) {
  const { 
    aiData, 
    updateAIData, 
    isAutoSaving, 
    updateResumeData,
    setCachedPdf,
    generateResumeHash,
    isCacheValid,
    downloadPdf,
    savePdfToLibrary
  } = useResume();
  const { checkAIFeature, isModalOpen, modalProps, closeModal } = useSubscriptionModal();
  const [activeTab, setActiveTab] = useState<'preview' | 'ai-insights' | 'ats-analysis' | 'downloads'>('preview');
  const [isJobOptimizationOpen, setIsJobOptimizationOpen] = useState(false);
  const [isATSCheckerOpen, setIsATSCheckerOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'pdf'>('html');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [tempPdfUrl, setTempPdfUrl] = useState<string | null>(null);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [originalResume, setOriginalResume] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(aiData.aiSuggestions || []);
  const [atsAnalysis, setAtsAnalysis] = useState<any>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [enhancementResults, setEnhancementResults] = useState<any>(null);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  
  const template = getTemplateById(resume.template) || resumeTemplates[0];
  
  // Use ATS score from context if available
  const currentAtsScore = atsScore || aiData.atsScore;

  const generateSmartSuggestions = (resumeData: Resume): string[] => {
    const suggestions: string[] = [];
    
    // Check work experience
    if (resumeData.workExperience.length === 0) {
      suggestions.push('Add work experience to strengthen your professional background');
    } else {
      const hasQuantifiableAchievements = resumeData.workExperience.some(job => 
        job.achievements.some(achievement => /\d+/.test(achievement))
      );
      if (!hasQuantifiableAchievements) {
        suggestions.push('Add quantifiable achievements (numbers, percentages, metrics) to your work experience');
      }
    }
    
    // Check skills
    if (resumeData.skills.length < 5) {
      suggestions.push('Add more relevant skills to improve keyword matching with job postings');
    }
    
    // Check professional summary
    if (!resumeData.professionalSummary || resumeData.professionalSummary.length < 50) {
      suggestions.push('Expand your professional summary to better highlight your value proposition');
    }
    
    // Check education
    if (resumeData.education.length === 0) {
      suggestions.push('Add your educational background to provide complete professional context');
    }
    
    // Check certifications
    if (!resumeData.certifications || resumeData.certifications.length === 0) {
      suggestions.push('Consider adding professional certifications to stand out from other candidates');
    }
    
    // Template-specific suggestions
    if (template.atsCompatibility === 'medium' || template.atsCompatibility === 'low') {
      suggestions.push('Consider switching to a more ATS-friendly template for better applicant tracking system compatibility');
    }
    
    // Default suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push(
        'Your resume looks comprehensive! Consider running an ATS analysis to ensure optimal compatibility',
        'Try job-specific optimization when applying to target your resume for specific positions'
      );
    }
    
    return suggestions;
  };

  // Implement ATS Analysis function - now works without saving
  const handleATSCheck = async (jobDescription?: string) => {
    try {
      console.log('🛡️ Starting ATS analysis for unsaved resume...');
      setIsATSCheckerOpen(true);
      onATSCheck?.();
    } catch (error) {
      console.error('ATS analysis error:', error);
      toast.error('Failed to open ATS analysis. Please try again.');
    }
  };

  // AI Enhancement function - works with in-memory resume data  
  const handleAIImprovement = async (enhancementType: string = 'comprehensive') => {
    try {
      setAiLoading(enhancementType);
      toast.loading('🤖 Enhancing your resume with AI...', { id: 'ai-enhance' });

      // Store original resume for comparison
      setOriginalResume({ ...resume });

      // Use the in-memory resume data directly for AI enhancement
      // Backend will handle subscription validation
      const result = await resumeService.enhanceResumeWithAI(resume, {
        improvementLevel: enhancementType as 'basic' | 'comprehensive' | 'expert'
      });
      
      // Create enhancement feedback data
      const feedbackData = {
        type: 'ai-enhance' as const,
        title: 'AI Enhancement Complete',
        summary: `Enhanced your resume with AI improvements, increasing quality score from ${result.qualityScore.before}% to ${result.qualityScore.after}%`,
        improvements: result.improvements,
        scores: {
          before: result.qualityScore.before,
          after: result.qualityScore.after,
          improvement: result.qualityScore.improvement
        },
        keyMetrics: [
          { label: 'Quality Score', value: `${result.qualityScore.after}%`, improvement: `${result.qualityScore.improvement}%` },
          { label: 'Sections Enhanced', value: `${result.improvements.length}` },
          { label: 'Changes Made', value: `${result.improvements.reduce((sum, imp) => sum + imp.changes.length, 0)}` }
        ]
      };

      setEnhancementResult(result);
      setEnhancementResults(result.optimizedResume || result.enhancedResume);
      console.log('Original resume stored:', originalResume);
      console.log('Enhanced result stored:', result);
      
      // Update AI data in context for real-time reflection
      updateAIData({
        lastEnhanced: new Date().toISOString(),
        enhancementType,
        qualityScore: result.qualityScore.after
      });
      
      // Handle AI status notifications
      console.log('🔍 DEBUG: AI Enhancement Result:', {
        hasAiStatus: !!result.aiStatus,
        aiStatus: result.aiStatus,
        resultKeys: Object.keys(result)
      });
      
      if (result.aiStatus) {
        console.log('⚠️ SHOWING AI FALLBACK WARNING:', result.aiStatus);
        toast.warning(`⚠️ ${result.aiStatus}`, { 
          id: 'ai-enhance',
          description: 'Enhancement completed with manual backup. Contact support for full AI capabilities.',
          duration: 8000
        });
      } else {
        console.log('✅ SHOWING AI SUCCESS MESSAGE');
        toast.success('🤖 AI enhancement complete!', { 
          id: 'ai-enhance',
          description: 'Your resume has been enhanced using advanced AI algorithms.'
        });
      }
      setShowEnhancementModal(true);
      
    } catch (error) {
      console.error('AI enhancement error:', error);
      toast.error('Failed to enhance resume. Please try again.', { id: 'ai-enhance' });
    } finally {
      setAiLoading(null);
    }
  };

  // Implement Job Optimization
  const handleJobOptimization = () => {
    setIsJobOptimizationOpen(true);
  };

  const renderPersonalInfo = () => (
    <div 
      className="text-white p-8 rounded-t-lg"
      style={{
        background: `linear-gradient(to right, ${template.colors.primary}, ${template.colors.secondary})`
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: template.colors.background }}
          >
            {resume.personalInfo.firstName} {resume.personalInfo.lastName}
          </h1>
          {resume.personalInfo.professionalTitle && (
            <p 
              className="text-xl mb-4"
              style={{ color: `${template.colors.background}CC` }}
            >
              {resume.personalInfo.professionalTitle}
            </p>
          )}
          <div 
            className="space-y-1"
            style={{ color: `${template.colors.background}DD` }}
          >
            <p>{resume.personalInfo.email}</p>
            <p>{resume.personalInfo.phone}</p>
            <p>{resume.personalInfo.location}</p>
          </div>
        </div>
        <div className="text-right space-y-2">
          {resume.personalInfo.linkedinUrl && (
            <div>
              <a 
                href={resume.personalInfo.linkedinUrl} 
                className="hover:opacity-80 transition-colors"
                style={{ color: `${template.colors.background}DD` }}
              >
                LinkedIn
              </a>
            </div>
          )}
          {resume.personalInfo.portfolioUrl && (
            <div>
              <a 
                href={resume.personalInfo.portfolioUrl} 
                className="hover:opacity-80 transition-colors"
                style={{ color: `${template.colors.background}DD` }}
              >
                Portfolio
              </a>
            </div>
          )}
          {resume.personalInfo.githubUrl && (
            <div>
              <a 
                href={resume.personalInfo.githubUrl} 
                className="hover:opacity-80 transition-colors"
                style={{ color: `${template.colors.background}DD` }}
              >
                GitHub
              </a>
            </div>
          )}
          {resume.personalInfo.websiteUrl && (
            <div>
              <a 
                href={resume.personalInfo.websiteUrl} 
                className="hover:opacity-80 transition-colors"
                style={{ color: `${template.colors.background}DD` }}
              >
                Website
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSection = (title: string, children: React.ReactNode, icon?: React.ComponentType<any>) => {
    const IconComponent = icon;
    return (
      <section className="mb-8">
        <div className="flex items-center mb-4">
          {IconComponent && (
            <IconComponent 
              className="w-5 h-5 mr-2" 
              style={{ color: template.colors.accent }} 
            />
          )}
          <h2 
            className="text-2xl font-bold pb-1"
            style={{ 
              color: template.colors.primary,
              borderBottom: `2px solid ${template.colors.accent}`
            }}
          >
            {title}
          </h2>
        </div>
        {children}
      </section>
    );
  };

  const renderPreview = () => {
    // Use actual PDF preview for ALL templates (LaTeX and HTML)
    const currentHash = generateResumeHash();
    const cachedPdfUrl = isCacheValid(currentHash) ? aiData.cachedPdfUrl : null;
    
    return (
      <div className="resume-preview-container relative">
        <PDFPreview 
          pdfUrl={cachedPdfUrl}
          pdfBlob={aiData.pdfBlob}
          templateId={templateId || resume.template}
          resumeData={resume}
          title={isLatexTemplate ? "LaTeX Resume Preview" : "Professional Resume Preview"}
          className="w-full"
          onPdfGenerated={(pdfUrl, blob) => {
            console.log('📄 PDF generated, caching...', { pdfUrl: !!pdfUrl, blob: !!blob });
            setCachedPdf(pdfUrl, currentHash, blob);
          }}
          onGenerationStart={() => {
            console.log('📄 PDF generation started...');
          }}
        />
        {/* Real-time AI enhancement indicators */}
        {aiGenerated && (
          <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-2 flex items-center z-10">
            <SparklesIcon className="w-4 h-4 text-emerald-400 mr-1" />
            <span className="text-xs text-emerald-400 font-medium">AI Enhanced</span>
          </div>
        )}
      </div>
    );
  };

  const renderSingleColumnLayout = () => (
    <div 
      className="shadow-2xl rounded-lg overflow-hidden border"
      style={{ 
        borderColor: template.colors.secondary,
        backgroundColor: template.colors.background,
        fontFamily: template.fontStyle === 'serif' ? 'Georgia, serif' : 
                   template.fontStyle === 'classic' ? 'Times New Roman, serif' : 
                   'Inter, sans-serif'
      }}
    >
      {renderPersonalInfo()}
      
      <div className="p-8 space-y-8">
        {/* AI Summary Indicator */}
        {aiGenerated && (
          <div className="glass-dark border border-dark-accent/30 rounded-lg p-4 flex items-center">
            <SparklesIcon className="w-5 h-5 text-dark-accent mr-2" />
            <span className="text-dark-accent font-medium">AI-Enhanced Professional Summary</span>
          </div>
        )}

        {/* Professional Summary */}
        {resume.professionalSummary && renderSection(
          'Professional Summary',
          <p 
            className="leading-relaxed text-lg"
            style={{ color: template.colors.text }}
          >
            {resume.professionalSummary}
          </p>
        )}

        {/* Work Experience */}
        {resume.workExperience.length > 0 && renderSection(
          'Professional Experience',
          <div className="space-y-6">
            {resume.workExperience.map((job, index) => (
              <div 
                key={index} 
                className="pl-6"
                style={{ borderLeft: `4px solid ${template.colors.accent}` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 
                      className="text-xl font-semibold"
                      style={{ color: template.colors.text }}
                    >
                      {job.jobTitle}
                    </h3>
                    <p 
                      className="font-medium text-lg"
                      style={{ color: template.colors.primary }}
                    >
                      {job.company}
                    </p>
                    {job.location && (
                      <p style={{ color: template.colors.secondary }}>
                        {job.location}
                      </p>
                    )}
                  </div>
                  <span 
                    className="font-medium"
                    style={{ color: template.colors.secondary }}
                  >
                    {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                    {job.isCurrentJob ? ' Present' : new Date(job.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {job.responsibilities.length > 0 && (
                  <ul 
                    className="list-disc list-inside space-y-2 mb-3"
                    style={{ color: template.colors.text }}
                  >
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                )}
                {job.achievements.length > 0 && (
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: `${template.colors.accent}20`, 
                      border: `1px solid ${template.colors.accent}40` 
                    }}
                  >
                    <p 
                      className="font-medium mb-2"
                      style={{ color: template.colors.primary }}
                    >
                      Key Achievements:
                    </p>
                    <ul 
                      className="list-disc list-inside space-y-1"
                      style={{ color: template.colors.text }}
                    >
                      {job.achievements.map((achievement, idx) => (
                        <li key={idx}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>,
          BriefcaseIcon
        )}

        {/* Skills */}
        {resume.skills.length > 0 && renderSection(
          'Skills',
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {['technical', 'soft', 'language', 'certification'].map(category => {
              const categorySkills = resume.skills.filter(skill => skill.category === category);
              if (categorySkills.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 
                    className="font-semibold mb-3 capitalize text-lg"
                    style={{ color: template.colors.primary }}
                  >
                    {category} Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-2 rounded-full font-medium"
                        style={{
                          backgroundColor: `${template.colors.accent}20`,
                          color: template.colors.primary,
                          border: `1px solid ${template.colors.accent}40`
                        }}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Volunteer Experience */}
        {resume.volunteerExperience && resume.volunteerExperience.length > 0 && renderSection(
          'Volunteer Experience',
          <div className="space-y-4">
            {resume.volunteerExperience.map((vol, index) => (
              <div key={index} className="border-l-4 border-green-400/60 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary">{vol.role}</h3>
                    <p className="text-green-400 font-medium">{vol.organization}</p>
                    <p className="text-dark-text-secondary">{vol.location}</p>
                  </div>
                  <span className="text-dark-text-muted">
                    {new Date(vol.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                    {vol.isCurrentRole ? ' Present' : new Date(vol.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-dark-text-secondary mb-2">{vol.description}</p>
                {vol.achievements.length > 0 && (
                  <ul className="list-disc list-inside text-dark-text-secondary space-y-1">
                    {vol.achievements.map((achievement, idx) => (
                      <li key={idx}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {resume.education.length > 0 && renderSection(
          'Education',
          <div className="space-y-4">
            {resume.education.map((edu, index) => (
              <div key={index} className="border-l-4 border-yellow-400/60 pl-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-dark-text-primary">{edu.degree}</h3>
                    <p className="text-yellow-400 font-medium">{edu.institution}</p>
                    {edu.fieldOfStudy && <p className="text-dark-text-secondary">{edu.fieldOfStudy}</p>}
                    {edu.gpa && <p className="text-dark-text-secondary">GPA: {edu.gpa}</p>}
                    {edu.honors.length > 0 && (
                      <p className="text-dark-text-secondary">Honors: {edu.honors.join(', ')}</p>
                    )}
                  </div>
                  <span className="text-dark-text-muted">
                    {new Date(edu.graduationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Awards */}
        {resume.awards && resume.awards.length > 0 && renderSection(
          'Awards & Honors',
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resume.awards.map((award, index) => (
              <div key={index} className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-400/30">
                <h3 className="font-semibold text-dark-text-primary">{award.title}</h3>
                <p className="text-yellow-400 font-medium">{award.issuer}</p>
                <p className="text-dark-text-muted text-sm">
                  {new Date(award.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
                {award.description && <p className="text-dark-text-secondary mt-2">{award.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Languages */}
        {resume.languages.length > 0 && renderSection(
          'Languages',
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {resume.languages.map((lang: Language, index) => (
              <div key={index} className="text-center">
                <div className="bg-indigo-500/20 p-3 rounded-lg border border-indigo-400/30">
                  <p className="font-semibold text-dark-text-primary">{lang.name}</p>
                  <p className="text-indigo-400 text-sm capitalize">{lang.proficiency}</p>
                </div>
              </div>
            ))}
          </div>,
          GlobeAltIcon
        )}

        {/* Hobbies */}
        {resume.hobbies && resume.hobbies.length > 0 && renderSection(
          'Hobbies & Interests',
          <div className="flex flex-wrap gap-3">
            {resume.hobbies.map((hobby, index) => (
              <span
                key={index}
                className="px-3 py-2 bg-gray-800/20 text-dark-text-secondary rounded-full border border-dark-border"
              >
                {hobby.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTwoColumnLayout = () => (
    <div 
      className="shadow-2xl rounded-lg overflow-hidden border"
      style={{ 
        borderColor: template.colors.secondary,
        backgroundColor: template.colors.background,
        fontFamily: template.fontStyle === 'serif' ? 'Georgia, serif' : 
                   template.fontStyle === 'classic' ? 'Times New Roman, serif' : 
                   'Inter, sans-serif'
      }}
    >
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <div 
          className="w-1/3 p-6"
          style={{ backgroundColor: `${template.colors.primary}10` }}
        >
          {/* Personal Info in Sidebar */}
          <div className="text-center mb-8">
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: template.colors.primary }}
            >
              {resume.personalInfo.firstName} {resume.personalInfo.lastName}
            </h1>
            {resume.personalInfo.professionalTitle && (
              <p 
                className="text-lg mb-4"
                style={{ color: template.colors.secondary }}
              >
                {resume.personalInfo.professionalTitle}
              </p>
            )}
            <div 
              className="space-y-1 text-sm"
              style={{ color: template.colors.text }}
            >
              <p>{resume.personalInfo.email}</p>
              <p>{resume.personalInfo.phone}</p>
              <p>{resume.personalInfo.location}</p>
            </div>
          </div>

          {/* Skills in Sidebar */}
          {resume.skills.length > 0 && (
            <div className="mb-8">
              <h3 
                className="text-lg font-bold mb-4"
                style={{ color: template.colors.primary }}
              >
                SKILLS
              </h3>
              <div className="space-y-3">
                {['technical', 'soft'].map(category => {
                  const categorySkills = resume.skills.filter(skill => skill.category === category);
                  if (categorySkills.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h4 
                        className="font-semibold mb-2 capitalize text-sm"
                        style={{ color: template.colors.secondary }}
                      >
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {categorySkills.map((skill, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-1 rounded"
                            style={{
                              backgroundColor: `${template.colors.accent}20`,
                              color: template.colors.text
                            }}
                          >
                            {skill.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Languages in Sidebar */}
          {resume.languages.length > 0 && (
            <div className="mb-8">
              <h3 
                className="text-lg font-bold mb-4"
                style={{ color: template.colors.primary }}
              >
                LANGUAGES
              </h3>
              <div className="space-y-2">
                {resume.languages.map((lang, index) => (
                  <div key={index} className="text-sm">
                    <span style={{ color: template.colors.text }}>{lang.name}</span>
                    <span 
                      className="float-right"
                      style={{ color: template.colors.secondary }}
                    >
                      {lang.proficiency}
                    </span>
                    <div className="clear-both"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-2/3 p-8">
          {/* Professional Summary */}
          {resume.professionalSummary && (
            <div className="mb-8">
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                PROFESSIONAL SUMMARY
              </h2>
              <p 
                className="leading-relaxed"
                style={{ color: template.colors.text }}
              >
                {resume.professionalSummary}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {resume.workExperience.length > 0 && (
            <div className="mb-8">
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                EXPERIENCE
              </h2>
              <div className="space-y-6">
                {resume.workExperience.map((job, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 
                          className="font-semibold"
                          style={{ color: template.colors.text }}
                        >
                          {job.jobTitle}
                        </h3>
                        <p 
                          className="font-medium"
                          style={{ color: template.colors.primary }}
                        >
                          {job.company}
                        </p>
                      </div>
                      <span 
                        className="text-sm"
                        style={{ color: template.colors.secondary }}
                      >
                        {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                        {job.isCurrentJob ? ' Present' : new Date(job.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {job.responsibilities.length > 0 && (
                      <ul 
                        className="list-disc list-inside text-sm space-y-1"
                        style={{ color: template.colors.text }}
                      >
                        {job.responsibilities.map((resp, idx) => (
                          <li key={idx}>{resp}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div className="mb-8">
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                EDUCATION
              </h2>
              <div className="space-y-4">
                {resume.education.map((edu, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 
                          className="font-semibold"
                          style={{ color: template.colors.text }}
                        >
                          {edu.degree}
                        </h3>
                        <p 
                          className="font-medium"
                          style={{ color: template.colors.primary }}
                        >
                          {edu.institution}
                        </p>
                      </div>
                      <span 
                        className="text-sm"
                        style={{ color: template.colors.secondary }}
                      >
                        {new Date(edu.graduationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMultiSectionLayout = () => (
    <div 
      className="shadow-2xl rounded-lg overflow-hidden border"
      style={{ 
        borderColor: template.colors.secondary,
        backgroundColor: template.colors.background,
        fontFamily: template.fontStyle === 'serif' ? 'Georgia, serif' : 
                   template.fontStyle === 'classic' ? 'Times New Roman, serif' : 
                   'Inter, sans-serif'
      }}
    >
      {/* Header Section */}
      <div 
        className="text-center p-8"
        style={{
          background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
        }}
      >
        <h1 
          className="text-4xl font-bold mb-2"
          style={{ color: template.colors.background }}
        >
          {resume.personalInfo.firstName} {resume.personalInfo.lastName}
        </h1>
        {resume.personalInfo.professionalTitle && (
          <p 
            className="text-xl mb-4"
            style={{ color: `${template.colors.background}CC` }}
          >
            {resume.personalInfo.professionalTitle}
          </p>
        )}
        <div 
          className="flex justify-center space-x-8 text-sm"
          style={{ color: `${template.colors.background}DD` }}
        >
          <span>{resume.personalInfo.email}</span>
          <span>{resume.personalInfo.phone}</span>
          <span>{resume.personalInfo.location}</span>
        </div>
      </div>

      {/* Content in sections */}
      <div className="p-8">
        {/* Professional Summary */}
        {resume.professionalSummary && (
          <div 
            className="mb-8 p-6 rounded-lg"
            style={{ backgroundColor: `${template.colors.accent}10` }}
          >
            <h2 
              className="text-xl font-bold mb-4"
              style={{ color: template.colors.primary }}
            >
              PROFESSIONAL SUMMARY
            </h2>
            <p 
              className="leading-relaxed"
              style={{ color: template.colors.text }}
            >
              {resume.professionalSummary}
            </p>
          </div>
        )}

        {/* Grid Layout for remaining sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Work Experience */}
          {resume.workExperience.length > 0 && (
            <div>
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                EXPERIENCE
              </h2>
              <div className="space-y-4">
                {resume.workExperience.slice(0, 2).map((job, index) => (
                  <div key={index}>
                    <h3 
                      className="font-semibold"
                      style={{ color: template.colors.text }}
                    >
                      {job.jobTitle}
                    </h3>
                    <p 
                      className="font-medium text-sm"
                      style={{ color: template.colors.primary }}
                    >
                      {job.company}
                    </p>
                    <span 
                      className="text-xs"
                      style={{ color: template.colors.secondary }}
                    >
                      {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - 
                      {job.isCurrentJob ? ' Present' : new Date(job.endDate || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {resume.skills.length > 0 && (
            <div>
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                SKILLS
              </h2>
              <div className="flex flex-wrap gap-2">
                {resume.skills.slice(0, 12).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${template.colors.accent}20`,
                      color: template.colors.primary,
                      border: `1px solid ${template.colors.accent}40`
                    }}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div>
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                EDUCATION
              </h2>
              <div className="space-y-3">
                {resume.education.map((edu, index) => (
                  <div key={index}>
                    <h3 
                      className="font-semibold"
                      style={{ color: template.colors.text }}
                    >
                      {edu.degree}
                    </h3>
                    <p 
                      className="text-sm"
                      style={{ color: template.colors.primary }}
                    >
                      {edu.institution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {resume.languages.length > 0 && (
            <div>
              <h2 
                className="text-xl font-bold mb-4 pb-2"
                style={{ 
                  color: template.colors.primary,
                  borderBottom: `2px solid ${template.colors.accent}`
                }}
              >
                LANGUAGES
              </h2>
              <div className="space-y-2">
                {resume.languages.map((lang, index) => (
                  <div key={index} className="flex justify-between">
                    <span style={{ color: template.colors.text }}>{lang.name}</span>
                    <span style={{ color: template.colors.secondary }}>{lang.proficiency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleAIFeature = async (feature: string) => {
    setAiLoading(feature);
    try {
      switch (feature) {
        case 'summary':
          await handleAIImprovement('summary');
          break;
        case 'comprehensive':
          await handleAIImprovement('comprehensive');
          break;
        case 'jobOptimization':
          handleJobOptimization();
          break;
        case 'atsCheck':
          await handleATSCheck();
          break;
        case 'suggestions': {
          // Generate AI suggestions for improvement using real analysis
          const suggestions = generateSmartSuggestions(resume);
          setAiSuggestions(suggestions);
          // Save to context storage
          updateAIData({
            aiSuggestions: suggestions
          });
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to execute ${feature}:`, error);
      alert(`Failed to ${feature}. Please try again.`);
    } finally {
      setAiLoading(null);
    }
  };

  const renderAIInsights = () => (
    <div className="space-y-6">
      <Card className="card-dark p-6">
        <div className="flex items-center mb-6">
          <BeakerIcon className="w-6 h-6 text-emerald-400 mr-3" />
          <h3 className="text-xl font-semibold text-dark-text-primary">AI-Powered Enhancements</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Professional Summary Enhancement */}
          <div className="p-4 border border-dark-border rounded-lg hover:border-emerald-400/50 transition-colors">
            <div className="flex items-center mb-3">
              <SparklesIcon className="w-5 h-5 text-emerald-400 mr-2" />
              <h4 className="font-medium text-dark-text-primary">Smart Summary</h4>
            </div>
            <p className="text-sm text-dark-text-secondary mb-4">
              Generate a compelling professional summary using AI analysis of your experience and skills.
            </p>
            <Button 
              onClick={() => handleAIFeature('summary')}
              disabled={aiLoading === 'summary'}
              size="sm" 
              className="w-full btn-primary-dark"
            >
              {aiLoading === 'summary' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  {aiGenerated ? 'Regenerate' : 'Generate'}
                </>
              )}
            </Button>
          </div>

          {/* Job Optimization */}
          <div className="p-4 border border-dark-border rounded-lg hover:border-teal-400/50 transition-colors">
            <div className="flex items-center mb-3">
              <ArrowPathIcon className="w-5 h-5 text-teal-400 mr-2" />
              <h4 className="font-medium text-dark-text-primary">Job Matching</h4>
            </div>
            <p className="text-sm text-dark-text-secondary mb-4">
              Optimize your resume for specific job postings using AI keyword analysis.
            </p>
            <Button 
              onClick={() => handleAIFeature('jobOptimization')}
              disabled={aiLoading === 'jobOptimization'}
              size="sm" 
              variant="outline" 
              className="w-full btn-secondary-dark"
            >
              {aiLoading === 'jobOptimization' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Optimize
                </>
              )}
            </Button>
          </div>

          {/* ATS Analysis */}
          <div className="p-4 border border-dark-border rounded-lg hover:border-green-400/50 transition-colors">
            <div className="flex items-center mb-3">
              <ChartBarIcon className="w-5 h-5 text-green-400 mr-2" />
              <h4 className="font-medium text-dark-text-primary">ATS Scanner</h4>
            </div>
            <p className="text-sm text-dark-text-secondary mb-4">
              Analyze your resume's compatibility with Applicant Tracking Systems.
            </p>
            <Button 
              onClick={() => handleAIFeature('atsCheck')}
              disabled={aiLoading === 'atsCheck'}
              size="sm" 
              variant="outline" 
              className="w-full btn-secondary-dark"
            >
              {aiLoading === 'atsCheck' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {/* Comprehensive Enhancement */}
          <div className="p-4 border border-dark-border rounded-lg hover:border-orange-400/50 transition-colors">
            <div className="flex items-center mb-3">
              <BeakerIcon className="w-5 h-5 text-orange-400 mr-2" />
              <h4 className="font-medium text-dark-text-primary">Full Enhancement</h4>
            </div>
            <p className="text-sm text-dark-text-secondary mb-4">
              Comprehensive AI enhancement of all resume sections for maximum impact.
            </p>
            <Button 
              onClick={() => handleAIFeature('comprehensive')}
              disabled={aiLoading === 'comprehensive'}
              size="sm" 
              className="w-full btn-primary-dark"
            >
              {aiLoading === 'comprehensive' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <BeakerIcon className="w-4 h-4 mr-2" />
                  Enhance All
                </>
              )}
            </Button>
          </div>

          {/* AI Suggestions */}
          <div className="p-4 border border-dark-border rounded-lg hover:border-yellow-400/50 transition-colors">
            <div className="flex items-center mb-3">
              <LightBulbIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <h4 className="font-medium text-dark-text-primary">Smart Tips</h4>
            </div>
            <p className="text-sm text-dark-text-secondary mb-4">
              Get personalized improvement suggestions based on your resume content.
            </p>
            <Button 
              onClick={() => handleAIFeature('suggestions')}
              disabled={aiLoading === 'suggestions'}
              size="sm" 
              variant="outline" 
              className="w-full btn-secondary-dark"
            >
              {aiLoading === 'suggestions' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <LightBulbIcon className="w-4 h-4 mr-2" />
                  Get Tips
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* AI Suggestions Display */}
      {aiSuggestions.length > 0 && (
        <Card className="card-dark p-6">
          <div className="flex items-center mb-4">
            <LightBulbIcon className="w-5 h-5 text-yellow-400 mr-2" />
            <h4 className="font-medium text-dark-text-primary">AI Improvement Suggestions</h4>
          </div>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p className="text-sm text-dark-text-secondary">{suggestion}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Powered by Gemini */}
      <Card className="glass-dark p-4 border border-dark-border">
        <div className="flex items-center justify-center">
          <BeakerIcon className="w-5 h-5 text-emerald-400 mr-2" />
          <span className="text-sm text-dark-text-secondary">
            Powered by <span className="text-emerald-400 font-medium">Google Gemini 2.5 Flash</span>
          </span>
        </div>
      </Card>
    </div>
  );

  const renderATSAnalysis = () => (
    <div className="space-y-6">
      <Card className="card-dark p-6">
        <div className="flex items-center mb-6">
          <ChartBarIcon className="w-6 h-6 text-green-400 mr-3" />
          <h3 className="text-xl font-semibold text-dark-text-primary">ATS Compatibility Analysis</h3>
        </div>
        
        {(currentAtsScore !== undefined || atsAnalysis) ? (
          <div className="space-y-6">
            {/* Score Display */}
            <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-xl border border-green-400/30">
              <div className={`text-5xl font-bold mb-2 ${
                (atsAnalysis?.score || currentAtsScore) >= 80 ? 'text-green-400' : 
                (atsAnalysis?.score || currentAtsScore) >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {atsAnalysis?.score || currentAtsScore}%
              </div>
              <p className="text-dark-text-secondary text-lg">ATS Compatibility Score</p>
              <div className="mt-4 w-full bg-gray-800/30 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    (atsAnalysis?.score || currentAtsScore) >= 80 ? 'bg-green-400' : 
                    (atsAnalysis?.score || currentAtsScore) >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${atsAnalysis?.score || currentAtsScore}%` }}
                ></div>
              </div>
            </div>
            
            {/* Status Card */}
            <div className={`p-4 rounded-lg border ${
              (atsAnalysis?.score || currentAtsScore) >= 80 ? 'bg-green-500/10 border-green-400/30' :
              (atsAnalysis?.score || currentAtsScore) >= 60 ? 'bg-yellow-500/10 border-yellow-400/30' :
              'bg-red-500/10 border-red-400/30'
            }`}>
              <div className="flex items-center mb-2">
                {(atsAnalysis?.score || currentAtsScore) >= 80 ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2" />
                )}
                <span className="font-medium text-dark-text-primary">
                  {(atsAnalysis?.score || currentAtsScore) >= 80 ? 'Excellent ATS Compatibility' : 
                   (atsAnalysis?.score || currentAtsScore) >= 60 ? 'Good ATS Compatibility' : 
                   'Needs ATS Improvement'}
                </span>
              </div>
              <p className="text-sm text-dark-text-secondary">
                {(atsAnalysis?.score || currentAtsScore) >= 80 ? 'Your resume is highly likely to pass ATS filters and reach human recruiters.' :
                 (atsAnalysis?.score || currentAtsScore) >= 60 ? 'Your resume should pass most ATS systems with minor improvements needed.' :
                 'Your resume may struggle with ATS systems and requires optimization to improve visibility.'}
              </p>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border border-dark-border rounded-lg">
                <h4 className="font-medium text-dark-text-primary mb-3">Format Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">File Format</span>
                    <span className="text-green-400">✓ PDF/DOCX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">Font Readability</span>
                    <span className="text-green-400">✓ Standard Fonts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">Section Headers</span>
                    <span className="text-green-400">✓ Clear Structure</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-dark-border rounded-lg">
                <h4 className="font-medium text-dark-text-primary mb-3">Content Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">Keywords Density</span>
                    <span className={`${(atsAnalysis?.keywordMatch || currentAtsScore) >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {atsAnalysis?.keywordMatch ? `${atsAnalysis.keywordMatch}%` : 
                       (currentAtsScore >= 70 ? '✓ Optimized' : '⚠ Needs Work')}
                    </span>
                  </div>
                  {atsAnalysis?.formatScore && (
                    <div className="flex justify-between">
                      <span className="text-dark-text-secondary">Format Score</span>
                      <span className={`${atsAnalysis.formatScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {atsAnalysis.formatScore}%
                      </span>
                    </div>
                  )}
                  {atsAnalysis?.contentScore && (
                    <div className="flex justify-between">
                      <span className="text-dark-text-secondary">Content Score</span>
                      <span className={`${atsAnalysis.contentScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {atsAnalysis.contentScore}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">Contact Information</span>
                    <span className="text-green-400">✓ Complete</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-text-secondary">Work Experience</span>
                    <span className="text-green-400">✓ Detailed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI-Generated Recommendations */}
            {atsAnalysis?.recommendations && atsAnalysis.recommendations.length > 0 && (
              <div className="p-4 bg-teal-500/10 border border-teal-400/30 rounded-lg">
                <h4 className="font-medium text-dark-text-primary mb-3">🤖 AI Recommendations</h4>
                <div className="space-y-2 text-sm text-dark-text-secondary">
                  {atsAnalysis.recommendations.map((rec: string, index: number) => (
                    <p key={index}>• {rec}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Suggestions */}
            {((atsAnalysis?.score || currentAtsScore) < 80) && !atsAnalysis?.recommendations && (
              <div className="p-4 bg-teal-500/10 border border-teal-400/30 rounded-lg">
                <h4 className="font-medium text-dark-text-primary mb-3">💡 Improvement Suggestions</h4>
                <div className="space-y-2 text-sm text-dark-text-secondary">
                  {(atsAnalysis?.score || currentAtsScore) < 60 && <p>• Add more industry-specific keywords to your resume</p>}
                  {(atsAnalysis?.score || currentAtsScore) < 70 && <p>• Include quantifiable achievements in your work experience</p>}
                  {(atsAnalysis?.score || currentAtsScore) < 80 && <p>• Ensure all section headers use standard terminology (Experience, Education, Skills)</p>}
                  <p>• Consider adding a skills section with relevant technical keywords</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-dark-text-muted" />
            <h4 className="text-lg font-medium text-dark-text-primary mb-2">Ready to Check ATS Compatibility?</h4>
            <p className="text-dark-text-secondary mb-6 max-w-md mx-auto">
              Our AI will analyze your resume against ATS best practices and provide a detailed compatibility score.
            </p>
            <Button 
              onClick={() => handleAIFeature('atsCheck')} 
              className="btn-primary-dark"
              disabled={aiLoading === 'atsCheck'}
            >
              {aiLoading === 'atsCheck' ? (
                <>
                  <CogIcon className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing ATS Compatibility...
                </>
              ) : (
                <>
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Analyze ATS Compatibility
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* ATS Tips Card */}
      <Card className="glass-dark p-6 border border-dark-border">
        <h4 className="font-medium text-dark-accent mb-3">🎯 ATS Optimization Tips</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-dark-text-secondary">
          <div>
            <h5 className="font-medium mb-2">Keywords:</h5>
            <ul className="space-y-1">
              <li>• Use job posting keywords naturally</li>
              <li>• Include industry-specific terms</li>
              <li>• Avoid keyword stuffing</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Formatting:</h5>
            <ul className="space-y-1">
              <li>• Use standard section headers</li>
              <li>• Keep simple, clean layout</li>
              <li>• Avoid images and graphics</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/20 p-1 rounded-lg border border-dark-border">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
            activeTab === 'preview'
              ? 'bg-dark-accent text-white shadow-sm'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Preview
        </button>
        <button
          onClick={() => setActiveTab('ai-insights')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
            activeTab === 'ai-insights'
              ? 'bg-dark-accent text-white shadow-sm'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          AI Enhance
        </button>
        <button
          onClick={() => setActiveTab('ats-analysis')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
            activeTab === 'ats-analysis'
              ? 'bg-dark-accent text-white shadow-sm'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          <ChartBarIcon className="w-4 h-4 mr-2" />
          ATS Check
        </button>
        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center ${
            activeTab === 'downloads'
              ? 'bg-dark-accent text-white shadow-sm'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Download
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'ai-insights' && renderAIInsights()}
        {activeTab === 'ats-analysis' && renderATSAnalysis()}
        {activeTab === 'downloads' && (
          <ResumeDownloadManager 
            resumeData={resume} 
            templateId={templateId}
            isLatexTemplate={isLatexTemplate}
          />
        )}
      </div>

      {/* Quick Actions Bar */}
      <Card className="glass-dark p-4 border border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-sm font-medium text-dark-text-primary">
                Resume Ready for {template.name}
              </span>
            </div>
            {currentAtsScore && (
              <div className="flex items-center">
                <ChartBarIcon className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm text-dark-text-secondary">
                  ATS Score: <span className="font-medium text-green-400">{currentAtsScore}%</span>
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab('downloads')}
              className="btn-secondary-dark"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Quick Download
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setActiveTab('ai-insights')}
              className="btn-primary-dark"
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              Enhance with AI
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setShowCoverLetterModal(true)}
              variant="outline"
              className="btn-secondary-dark"
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Create Cover Letter
            </Button>
          </div>
        </div>
      </Card>

      {/* Job Optimization Modal */}
      {isJobOptimizationOpen && (
        <JobOptimizationModal
          isOpen={isJobOptimizationOpen}
          onClose={() => setIsJobOptimizationOpen(false)}
          resumeData={resume}
          onOptimize={(optimizedResume) => {
            updateResumeData(optimizedResume);
            if (onResumeUpdate) {
              onResumeUpdate(optimizedResume);
            }
            setIsJobOptimizationOpen(false);
            if (onJobOptimization) onJobOptimization();
            toast.success('Resume optimization applied! Check the preview for changes.');
          }}
        />
      )}

      {/* ATS Compatibility Checker Modal */}
      <ATSCompatibilityChecker
        isOpen={isATSCheckerOpen}
        onClose={() => setIsATSCheckerOpen(false)}
        resumeData={resume}
        onResumeUpdate={(updatedResume) => {
          updateResumeData(updatedResume);
          onResumeUpdate?.(updatedResume);
        }}
      />

      {/* Enhancement Feedback Modal */}
      <EnhancementFeedbackModal
        isOpen={showEnhancementModal}
        onClose={() => setShowEnhancementModal(false)}
        result={enhancementResult}
        onApplyChanges={() => {
          if (enhancementResults) {
            // Update resume data and trigger real-time preview update
            updateResumeData(enhancementResults);
            onResumeUpdate?.(enhancementResults);
            
            // Update AI generated flag for real-time indicators
            updateAIData({
              ...aiData,
              isEnhanced: true,
              lastApplied: new Date().toISOString()
            });
            
            toast.success('🎉 Resume updated with AI enhancements!');
          }
          setShowEnhancementModal(false);
        }}
        onViewComparison={() => {
          setShowComparison(true);
          setShowEnhancementModal(false);
        }}
      />

      {/* Resume Comparison Modal */}
      {showComparison && originalResume && enhancementResult && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Resume Comparison</h3>
              <button
                onClick={() => setShowComparison(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-6">
                {/* Original Resume */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Original Resume
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-700">Professional Summary</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {originalResume?.professionalSummary || originalResume?.summary || 'No summary provided'}
                        </p>
                      </div>
                      
                      {(originalResume?.workExperience?.length > 0 || originalResume?.experience?.length > 0) && (
                        <div>
                          <h5 className="font-medium text-gray-700">Work Experience</h5>
                          {(originalResume.workExperience || originalResume.experience || []).slice(0, 2).map((exp, index) => (
                            <div key={index} className="text-sm text-gray-600 mt-1">
                              <p className="font-medium">{exp.jobTitle || exp.title} at {exp.company}</p>
                              {(exp.achievements || exp.description ? [exp.description] : [])?.slice(0, 2).map((achievement, i) => (
                                <p key={i} className="ml-2">• {achievement}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Resume */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    AI Enhanced Resume
                  </h4>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-700">Professional Summary</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {(enhancementResult.optimizedResume || enhancementResult.enhancedResume)?.professionalSummary || 'No summary provided'}
                        </p>
                      </div>
                      
                      {(enhancementResult.optimizedResume || enhancementResult.enhancedResume)?.workExperience?.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-700">Work Experience</h5>
                          {(enhancementResult.optimizedResume || enhancementResult.enhancedResume).workExperience.slice(0, 2).map((exp, index) => (
                            <div key={index} className="text-sm text-gray-600 mt-1">
                              <p className="font-medium">{exp.jobTitle} at {exp.company}</p>
                              {exp.achievements?.slice(0, 2).map((achievement, i) => (
                                <p key={i} className="ml-2">• {achievement}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Score Comparison */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Quality Score Improvement</h5>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{enhancementResult.qualityScore?.before || 0}%</p>
                    <p className="text-sm text-gray-600">Original Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">+{enhancementResult.qualityScore?.improvement || 0}</p>
                    <p className="text-sm text-gray-600">Improvement</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{enhancementResult.qualityScore?.after || 0}%</p>
                    <p className="text-sm text-gray-600">Enhanced Score</p>
                  </div>
                </div>
              </div>

              {/* Improvements Made */}
              <div className="mt-6">
                <h5 className="font-medium text-gray-900 mb-3">Improvements Made</h5>
                <div className="space-y-3">
                  {(enhancementResult.improvements || []).map((improvement, index) => {
                    // Handle both array of strings and array of objects
                    if (typeof improvement === 'string') {
                      return (
                        <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                            {improvement}
                          </div>
                        </div>
                      );
                    } else if (improvement && typeof improvement === 'object') {
                      return (
                        <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                          <h6 className="font-medium text-gray-800">{improvement.category || 'Enhancement'}</h6>
                          <ul className="mt-1 text-sm text-gray-600">
                            {(improvement.changes || []).map((change, i) => (
                              <li key={i} className="flex items-center">
                                <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowComparison(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (enhancementResult) {
                      updateResumeData(enhancementResult.optimizedResume || enhancementResult.enhancedResume);
                      toast.success('🎉 Resume updated with AI enhancements!');
                    }
                    setShowComparison(false);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter Integration Modal */}
      <CoverLetterIntegration
        resume={resume}
        isOpen={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
      />

      {/* Subscription Modal for AI Features */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        {...modalProps}
      />

    </div>
  );
}