import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  SparklesIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  LightBulbIcon,
  BeakerIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CoverLetterData, coverLetterService } from '../../services/coverLetterService';
import { ResumeData, resumeService } from '../../services/resumeService';
import { toast } from 'sonner';
import { testAIEndpoints } from '../../utils/testAI';
import SubscriptionGate from '../subscription/SubscriptionGate';
import { useAuthStore } from '../../stores/authStore';

interface CoverLetterEditorProps {
  coverLetter: CoverLetterData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (coverLetter: CoverLetterData) => void;
}

type EditorTab = 'edit' | 'preview' | 'ai-enhance';

export default function CoverLetterEditor({
  coverLetter,
  isOpen,
  onClose,
  onSave,
}: CoverLetterEditorProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<EditorTab>('edit');
  const [formData, setFormData] = useState({
    title: '',
    jobTitle: '',
    companyName: '',
    content: '',
    tone: 'professional' as const,
    resumeId: '',
  });
  const [availableResumes, setAvailableResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  
  // AI Enhancement States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if user has enterprise access
  const hasEnterpriseAccess = user?.tier === 'enterprise' && (user?.subscriptionStatus === 'active' || !user?.subscriptionStatus);

  const showUpgradePrompt = (featureName: string) => {
    toast.error(`${featureName} is a premium feature`, {
      description: 'Upgrade to Enterprise to access AI-powered tools',
      action: {
        label: 'Upgrade',
        onClick: () => window.open('/dashboard/upgrade', '_blank')
      },
      duration: 5000
    });
  };

  // Initialize form data and load resumes
  useEffect(() => {
    if (coverLetter) {
      setFormData({
        title: coverLetter.title || '',
        jobTitle: coverLetter.jobTitle || '',
        companyName: coverLetter.companyName || '',
        content: coverLetter.content || '',
        tone: (coverLetter.tone as "professional" | "casual" | "enthusiastic" | "conservative") || 'professional',
        resumeId: coverLetter.resumeId || '',
      });
      setIsDirty(false);
    } else {
      setFormData({
        title: '',
        jobTitle: '',
        companyName: '',
        content: '',
        tone: 'professional',
        resumeId: '',
      });
      setIsDirty(false);
    }

    // Load available resumes
    loadAvailableResumes();
  }, [coverLetter]);

  const loadAvailableResumes = async () => {
    try {
      const response = await resumeService.getResumes();
      if (response.success && response.data) {
        setAvailableResumes(response.data);
      }
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  };

  // Update word and character count
  useEffect(() => {
    const words = formData.content.trim().split(/\s+/).length;
    setWordCount(formData.content.trim() === '' ? 0 : words);
    setCharacterCount(formData.content.length);
  }, [formData.content]);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && (coverLetter?._id || formData.title.trim())) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 3000); // Auto-save after 3 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isDirty]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAutoSave = async () => {
    if (!isDirty) return;

    try {
      setSaving(true);
      
      const saveData = {
        ...formData,
        templateId: coverLetter?.templateId || 'default',
        isPublic: coverLetter?.isPublic || false,
      };

      if (coverLetter?._id) {
        // Update existing
        const response = await coverLetterService.updateCoverLetter(coverLetter._id, saveData);
        if (response.success) {
          setLastSaved(new Date().toISOString());
          setIsDirty(false);
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Comprehensive validation
    const errors: string[] = [];
    
    if (!formData.title.trim()) {
      errors.push('Title is required');
    } else if (formData.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    if (!formData.jobTitle.trim()) {
      errors.push('Job title is required');
    }

    if (!formData.companyName.trim()) {
      errors.push('Company name is required');
    }

    if (!formData.content.trim()) {
      errors.push('Cover letter content is required');
    } else if (formData.content.trim().length < 100) {
      errors.push('Cover letter content must be at least 100 characters');
    }

    if (errors.length > 0) {
      toast.error(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }

    try {
      setLoading(true);
      
      const saveData = {
        ...formData,
        templateId: coverLetter?.templateId || 'default',
        isPublic: coverLetter?.isPublic || false,
      };

      let response;
      if (coverLetter?._id) {
        // Update existing
        response = await coverLetterService.updateCoverLetter(coverLetter._id, saveData);
      } else {
        // Create new
        response = await coverLetterService.createCoverLetter(saveData);
      }

      if (response.success && response.data) {
        toast.success(coverLetter ? 'Cover letter updated successfully!' : 'Cover letter created successfully!');
        onSave(response.data);
        setIsDirty(false);
        setLastSaved(new Date().toISOString());
      } else {
        toast.error(response.message || 'Failed to save cover letter');
      }
    } catch (error) {
      console.error('Failed to save cover letter:', error);
      toast.error('Failed to save cover letter');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!hasEnterpriseAccess) {
      showUpgradePrompt('AI Cover Letter Generation');
      return;
    }

    if (!formData.jobTitle.trim() || !formData.companyName.trim()) {
      toast.error('Please enter job title and company name to generate content');
      return;
    }

    try {
      setLoading(true);
      
      // First try AI generation
      const aiResponse = await coverLetterService.generateAIContent({
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        tone: formData.tone,
        resumeId: formData.resumeId || undefined,
        existingContent: formData.content || undefined,
      });
      
      if (aiResponse.success && aiResponse.content) {
        handleInputChange('content', aiResponse.content);
        toast.success('AI content generated successfully!');
      } else {
        throw new Error(aiResponse.message || 'AI generation failed');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      // Fallback to template-based generation
      const templateContent = generateTemplateContent(formData.jobTitle, formData.companyName, formData.tone);
      handleInputChange('content', templateContent);
      toast.success('Content generated using template');
    } finally {
      setLoading(false);
    }
  };

  // Handle resume attachment
  const handleResumeChange = async (resumeId: string) => {
    handleInputChange('resumeId', resumeId);
    
    if (coverLetter?._id && resumeId) {
      try {
        const response = await coverLetterService.attachResume(coverLetter._id, resumeId);
        if (response.success) {
          toast.success('Resume attached successfully');
        }
      } catch (error) {
        console.error('Failed to attach resume:', error);
      }
    }
  };

  // AI Enhancement Functions
  const enhanceWithAI = async () => {
    if (!hasEnterpriseAccess) {
      showUpgradePrompt('AI Content Enhancement');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please add some content first before enhancing');
      return;
    }

    setIsGeneratingAI(true);
    try {
      console.log('🚀 Starting AI enhancement with data:', {
        contentLength: formData.content.length,
        tone: formData.tone,
        hasJobTitle: !!formData.jobTitle,
        hasCompanyName: !!formData.companyName
      });

      const result = await coverLetterService.enhanceCoverLetterWithAI({
        content: formData.content,
        jobDescription: formData.jobTitle && formData.companyName ? 
          `${formData.jobTitle} position at ${formData.companyName}` : '',
        tone: formData.tone,
        focusAreas: ['strengthen language', 'improve flow', 'add impact']
      });

      console.log('🔄 AI enhancement result:', {
        hasEnhancedContent: !!result.enhancedContent,
        improvementsCount: result.improvements?.length || 0,
        contentLength: result.enhancedContent?.length || 0
      });

      if (result.enhancedContent && result.enhancedContent.trim().length > 0) {
        handleInputChange('content', result.enhancedContent);
        setAiSuggestions(result.improvements || []);
        toast.success(`✨ Content enhanced with AI! Applied ${result.improvements?.length || 0} improvements.`);
      } else {
        throw new Error('AI returned empty or invalid content');
      }
    } catch (error: any) {
      console.error('❌ AI enhancement error:', error);
      toast.error(error.message || 'AI enhancement failed. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const analyzeContent = async () => {
    if (!hasEnterpriseAccess) {
      showUpgradePrompt('AI Content Analysis');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please add content to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await coverLetterService.analyzeRealTime({
        content: formData.content,
        jobDescription: ''
      });

      if (result.success && result.data) {
        setAnalysisResults(result.data);
        toast.success(`✅ Analysis complete! ${result.data.wordCount} words, ${result.data.matchScore}% match`);
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadCoverLetter = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!formData.content.trim()) {
      toast.error('Please add content before downloading');
      return;
    }

    if (!formData.jobTitle.trim() || !formData.companyName.trim()) {
      toast.error('Please enter job title and company name before downloading');
      return;
    }

    try {
      setDownloadingFormat(format);
      
      const coverLetterData = {
        title: formData.title || `Cover Letter - ${formData.jobTitle} at ${formData.companyName}`,
        content: formData.content,
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        tone: formData.tone
      };

      console.log('🔄 Starting download:', { format, title: coverLetterData.title });
      toast.info(`Generating ${format.toUpperCase()} file...`);

      const result = await coverLetterService.downloadCoverLetterWithData(coverLetterData, format);

      if (result.success && result.blob) {
        // Create download link
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${coverLetterData.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(`✅ Downloaded as ${format.toUpperCase()}!`);
      } else {
        throw new Error(result.message || 'Download failed');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Download failed. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Fallback template generation
  const generateTemplateContent = (jobTitle: string, companyName: string, tone: string) => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const toneAdjustments = {
      professional: {
        greeting: 'Dear Hiring Manager,',
        opener: 'I am writing to express my strong interest in',
        closer: 'I look forward to the opportunity to contribute to your team.',
        signature: 'Sincerely,'
      },
      enthusiastic: {
        greeting: 'Dear Hiring Team,',
        opener: 'I am thrilled to apply for',
        closer: 'I am excited about the possibility of joining your innovative team!',
        signature: 'Best regards,'
      },
      casual: {
        greeting: 'Hello,',
        opener: 'I would love to be considered for',
        closer: 'Thanks for considering my application.',
        signature: 'Best,'
      },
      conservative: {
        greeting: 'To Whom It May Concern:',
        opener: 'I respectfully submit my application for',
        closer: 'Thank you for your time and consideration.',
        signature: 'Respectfully,'
      }
    };

    const selectedTone = toneAdjustments[tone as keyof typeof toneAdjustments] || toneAdjustments.professional;

    return `${selectedTone.greeting}

${selectedTone.opener} the ${jobTitle} position at ${companyName}. With my background and experience, I am confident I would be a valuable addition to your team.

Throughout my career, I have developed strong skills that directly align with the requirements for this role. I am particularly drawn to ${companyName} because of your reputation for excellence and innovation in the industry.

I would welcome the opportunity to discuss how my experience and enthusiasm can contribute to ${companyName}'s continued success. ${selectedTone.closer}

${selectedTone.signature}

[Your Name]`;
  };

  const getSaveStatus = () => {
    if (saving) {
      return { icon: ClockIcon, text: 'Saving...', color: 'text-yellow-400' };
    }
    if (lastSaved && !isDirty) {
      return { icon: CheckCircleIcon, text: `Saved ${lastSaved.toLocaleTimeString()}`, color: 'text-green-400' };
    }
    if (isDirty) {
      return { icon: ExclamationTriangleIcon, text: 'Unsaved changes', color: 'text-orange-400' };
    }
    return null;
  };

  const saveStatus = getSaveStatus();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-6xl mx-auto my-4 rounded-2xl overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          <div className="bg-dark-secondary/95 backdrop-blur-xl border border-dark-border/50 shadow-2xl flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border/50">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-6 h-6 text-accent-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">
                    {coverLetter ? 'Edit Cover Letter' : 'Create Cover Letter'}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-dark-text-secondary">
                    <span>{wordCount} words • {characterCount} characters</span>
                    {saveStatus && (
                      <div className={`flex items-center space-x-1 ${saveStatus.color}`}>
                        <saveStatus.icon className="w-4 h-4" />
                        <span>{saveStatus.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* AI Generate Button */}
                <button
                  onClick={handleGenerateAI}
                  disabled={loading}
                  className={`px-4 py-2 border rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 ${
                    hasEnterpriseAccess 
                      ? 'bg-purple-600/20 text-purple-400 border-purple-600/30 hover:bg-purple-600/30' 
                      : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30'
                  }`}
                  title={hasEnterpriseAccess ? 'Generate AI content' : 'Upgrade to Enterprise for AI features'}
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>AI Generate</span>
                  {!hasEnterpriseAccess && <span className="text-xs">⭐</span>}
                </button>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="btn-primary-dark px-4 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
                >
                  {loading || saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                  <span>Save</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-tertiary/50 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-border/30">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex-1 py-3 px-6 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'edit'
                    ? 'bg-accent-primary/10 text-accent-primary border-b-2 border-accent-primary'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/30'
                }`}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-3 px-6 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'preview'
                    ? 'bg-accent-primary/10 text-accent-primary border-b-2 border-accent-primary'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/30'
                }`}
              >
                👁️ Preview
              </button>
              <button
                onClick={() => setActiveTab('ai-enhance')}
                className={`flex-1 py-3 px-6 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'ai-enhance'
                    ? 'bg-green-500/10 text-green-400 border-b-2 border-green-400'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-tertiary/30'
                }`}
              >
                🤖 AI Enhance
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'edit' ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full flex"
                  >
                    {/* Form Section */}
                    <div className="w-1/3 p-6 border-r border-dark-border/30 overflow-y-auto max-h-full">
                      <div className="space-y-4">
                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="e.g., Software Engineer at Google"
                            className="input-field-dark w-full"
                          />
                        </div>

                        {/* Job Title */}
                        <div>
                          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                            Job Title
                          </label>
                          <input
                            type="text"
                            value={formData.jobTitle}
                            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                            placeholder="e.g., Software Engineer"
                            className="input-field-dark w-full"
                          />
                        </div>

                        {/* Company Name */}
                        <div>
                          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => handleInputChange('companyName', e.target.value)}
                            placeholder="e.g., Google"
                            className="input-field-dark w-full"
                          />
                        </div>

                        {/* Tone */}
                        <div>
                          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                            Tone
                          </label>
                          <select
                            value={formData.tone}
                            onChange={(e) => handleInputChange('tone', e.target.value)}
                            className="input-field-dark w-full"
                          >
                            <option value="professional">Professional</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="casual">Casual</option>
                            <option value="conservative">Conservative</option>
                          </select>
                        </div>

                        {/* Resume Selection */}
                        <div>
                          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                            Attach Resume (Optional)
                          </label>
                          <select
                            value={formData.resumeId}
                            onChange={(e) => handleResumeChange(e.target.value)}
                            className="input-field-dark w-full"
                          >
                            <option value="">Select a resume (optional)</option>
                            {availableResumes.map((resume) => (
                              <option key={resume._id} value={resume._id}>
                                {resume.title}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-dark-text-muted mt-1">
                            Attaching a resume helps AI generate more personalized content
                          </p>
                        </div>

                        {/* Tips */}
                        <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-accent-primary mb-2">💡 Writing Tips</h4>
                          <ul className="text-xs text-accent-primary/80 space-y-1">
                            <li>• Keep it concise (3-4 paragraphs)</li>
                            <li>• Tailor to the specific job and company</li>
                            <li>• Highlight relevant achievements</li>
                            <li>• Show enthusiasm for the role</li>
                            <li>• End with a clear call to action</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Editor Section */}
                    <div className="flex-1 p-6 flex flex-col min-h-0">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-dark-text-secondary">
                          Cover Letter Content *
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={enhanceWithAI}
                            disabled={isGeneratingAI || !formData.content.trim()}
                            className={`px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                              hasEnterpriseAccess 
                                ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' 
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                            }`}
                            title={hasEnterpriseAccess ? 'Enhance content with AI' : 'Upgrade to Enterprise for AI enhancement'}
                          >
                            {isGeneratingAI ? 'Enhancing...' : '✨ Enhance'}
                            {!hasEnterpriseAccess && <span className="ml-1">⭐</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadCoverLetter('pdf')}
                            disabled={!formData.content.trim() || downloadingFormat === 'pdf'}
                            className="px-3 py-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                          >
                            {downloadingFormat === 'pdf' ? (
                              <>
                                <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                                <span>PDF</span>
                              </>
                            ) : (
                              <>📄 PDF</>
                            )}
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={contentRef}
                        value={formData.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        placeholder="Write your cover letter here...&#10;&#10;Dear Hiring Manager,&#10;&#10;I am writing to express my strong interest in the [Job Title] position at [Company Name]...&#10;&#10;Sincerely,&#10;[Your Name]"
                        className="flex-1 input-field-dark resize-none font-mono text-sm leading-relaxed"
                        style={{ minHeight: '300px', maxHeight: 'calc(100vh - 300px)' }}
                      />
                      
                      {/* Quick Stats */}
                      <div className="flex justify-between items-center mt-2 text-xs text-dark-text-muted">
                        <span>{formData.content.split(' ').filter(w => w.length > 0).length} words | {formData.content.length} characters</span>
                        {analysisResults && (
                          <span className={`font-medium ${
                            analysisResults.matchScore >= 80 ? 'text-green-400' :
                            analysisResults.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            Match: {analysisResults.matchScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'preview' ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full overflow-y-auto bg-gray-50 p-8"
                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                  >
                    <div className="max-w-2xl mx-auto">
                      <CoverLetterPreview formData={formData} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai-enhance"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full overflow-y-auto p-6"
                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                  >
                    <div className="space-y-6">
                        {/* AI Tools Header */}
                        <div className="text-center">
                          <h3 className="text-2xl font-bold text-green-400 mb-2 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 mr-2" />
                            AI Enhancement Tools
                          </h3>
                          <p className="text-dark-text-secondary">
                            Improve your cover letter with advanced AI assistance
                          </p>
                        </div>

                      {/* Debug Test Button */}
                      <div className="text-center mb-4">
                        <button
                          onClick={testAIEndpoints}
                          className="px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg hover:bg-gray-500/20 transition-colors text-sm text-gray-400"
                        >
                          🧪 Test AI Endpoints (Check Console)
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <button
                          onClick={enhanceWithAI}
                          disabled={isGeneratingAI || !formData.content.trim()}
                          className={`p-6 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            hasEnterpriseAccess 
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                              : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <ChatBubbleLeftRightIcon className={`w-8 h-8 ${hasEnterpriseAccess ? 'text-green-400' : 'text-yellow-400'}`} />
                            <div>
                              <h4 className={`font-semibold ${hasEnterpriseAccess ? 'text-green-400' : 'text-yellow-400'}`}>
                                {isGeneratingAI ? 'Enhancing...' : 'Enhance Content'}
                                {!hasEnterpriseAccess && ' ⭐'}
                              </h4>
                              <p className={`text-sm ${hasEnterpriseAccess ? 'text-green-300' : 'text-yellow-300'}`}>
                                {hasEnterpriseAccess ? 'Improve language, flow, and impact' : 'Premium AI feature - Upgrade to unlock'}
                              </p>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={analyzeContent}
                          disabled={isAnalyzing || !formData.content.trim()}
                          className={`p-6 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            hasEnterpriseAccess 
                              ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' 
                              : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <ChartBarIcon className={`w-8 h-8 ${hasEnterpriseAccess ? 'text-blue-400' : 'text-yellow-400'}`} />
                            <div>
                              <h4 className={`font-semibold ${hasEnterpriseAccess ? 'text-blue-400' : 'text-yellow-400'}`}>
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
                                {!hasEnterpriseAccess && ' ⭐'}
                              </h4>
                              <p className={`text-sm ${hasEnterpriseAccess ? 'text-blue-300' : 'text-yellow-300'}`}>
                                {hasEnterpriseAccess ? 'Get match score and suggestions' : 'Premium AI feature - Upgrade to unlock'}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Download Section */}
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                        <h4 className="font-semibold text-purple-400 mb-4 flex items-center">
                          <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                          Professional Downloads
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => downloadCoverLetter('pdf')}
                            disabled={!formData.content.trim() || downloadingFormat === 'pdf'}
                            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-center">
                              {downloadingFormat === 'pdf' ? (
                                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              ) : (
                                <DocumentTextIcon className="w-6 h-6 text-red-400 mx-auto mb-2" />
                              )}
                              <span className="text-sm text-red-400">
                                {downloadingFormat === 'pdf' ? 'Generating...' : 'PDF'}
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => downloadCoverLetter('docx')}
                            disabled={!formData.content.trim() || downloadingFormat === 'docx'}
                            className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-center">
                              {downloadingFormat === 'docx' ? (
                                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              ) : (
                                <DocumentTextIcon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                              )}
                              <span className="text-sm text-blue-400">
                                {downloadingFormat === 'docx' ? 'Generating...' : 'DOCX'}
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => downloadCoverLetter('txt')}
                            disabled={!formData.content.trim() || downloadingFormat === 'txt'}
                            className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-center">
                              {downloadingFormat === 'txt' ? (
                                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              ) : (
                                <DocumentTextIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              )}
                              <span className="text-sm text-gray-400">
                                {downloadingFormat === 'txt' ? 'Generating...' : 'TXT'}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* AI Suggestions */}
                      {aiSuggestions.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                          <h4 className="font-semibold text-yellow-400 mb-4 flex items-center">
                            <LightBulbIcon className="w-5 h-5 mr-2" />
                            AI Suggestions
                          </h4>
                          <ul className="space-y-2">
                            {aiSuggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <CheckCircleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-yellow-300">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Analysis Results */}
                      {analysisResults && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                          <h4 className="font-semibold text-green-400 mb-4 flex items-center">
                            <BeakerIcon className="w-5 h-5 mr-2" />
                            Content Analysis
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className={`text-3xl font-bold mb-2 ${
                                analysisResults.matchScore >= 80 ? 'text-green-400' :
                                analysisResults.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {analysisResults.matchScore}%
                              </div>
                              <p className="text-sm text-dark-text-muted">Match Score</p>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-400 mb-2">
                                {analysisResults.wordCount}
                              </div>
                              <p className="text-sm text-dark-text-muted">Words</p>
                            </div>
                          </div>
                          
                          {analysisResults.suggestions?.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-medium text-green-400 mb-2">Improvement Suggestions:</h5>
                              <ul className="space-y-1">
                                {analysisResults.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <ArrowPathIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-green-300">{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Cover Letter Preview Component
interface CoverLetterPreviewProps {
  formData: {
    title: string;
    jobTitle: string;
    companyName: string;
    content: string;
    tone: string;
  };
}

function CoverLetterPreview({ formData }: CoverLetterPreviewProps) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white shadow-2xl rounded-lg p-8 min-h-[11in]">
      {/* Header */}
      <div className="text-right mb-8">
        <p className="text-gray-600 text-sm">{today}</p>
      </div>

      {/* Company Address (if provided) */}
      {formData.companyName && (
        <div className="mb-8">
          <p className="font-semibold text-gray-900">{formData.companyName}</p>
          <p className="text-gray-600">Hiring Manager</p>
        </div>
      )}

      {/* Salutation */}
      <div className="mb-6">
        <p className="text-gray-900">
          {formData.companyName ? `Dear ${formData.companyName} Hiring Manager,` : 'Dear Hiring Manager,'}
        </p>
      </div>

      {/* Content */}
      <div className="mb-8">
        {formData.content ? (
          <div className="prose prose-gray max-w-none">
            {formData.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 italic">
            Your cover letter content will appear here...
          </div>
        )}
      </div>

      {/* Closing */}
      <div className="mt-12">
        <p className="text-gray-900 mb-4">Sincerely,</p>
        <div className="h-12"></div>
        <p className="text-gray-900 font-semibold">[Your Name]</p>
      </div>
    </div>
  );
}