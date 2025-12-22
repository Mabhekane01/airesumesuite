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
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CoverLetterData, coverLetterService } from '../../services/coverLetterService';
import { ResumeData, resumeService } from '../../services/resumeService';
import { toast } from 'sonner';
import { testAIEndpoints } from '../../utils/testAI';
import PremiumFeatureGate from '../subscription/PremiumFeatureGate'; // Changed import
import { useAuthStore } from '../../stores/authStore';

interface CoverLetterEditorProps {
  coverLetter: CoverLetterData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (coverLetter: CoverLetterData) => void;
  initialTab?: EditorTab;
}

type EditorTab = 'edit' | 'preview' | 'ai-enhance';

export default function CoverLetterEditor({
  coverLetter,
  isOpen,
  onClose,
  onSave,
  initialTab = 'edit',
}: CoverLetterEditorProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
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
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const hasEnterpriseAccess = user?.tier === 'enterprise' && (user?.subscriptionStatus === 'active' || !user?.subscriptionStatus);

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

  useEffect(() => {
    const words = formData.content.trim().split(/\s+/).length;
    setWordCount(formData.content.trim() === '' ? 0 : words);
    setCharacterCount(formData.content.length);
  }, [formData.content]);

  useEffect(() => {
    const hasMinimumData = formData.title.trim() && formData.jobTitle.trim() && formData.companyName.trim();
    const shouldAutoSave = isDirty && hasMinimumData && !saving;

    if (shouldAutoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isDirty, saving]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAutoSave = async () => {
    if (!isDirty) return;

    if (!formData.title.trim() || !formData.jobTitle.trim() || !formData.companyName.trim()) {
      console.log('⏸️ Auto-save skipped: Missing required fields');
      return;
    }

    try {
      setSaving(true);
      
      const saveData = {
        ...formData,
        templateId: coverLetter?.templateId || 'default',
        isPublic: coverLetter?.isPublic || false,
        ...(formData.resumeId && formData.resumeId.trim() ? { resumeId: formData.resumeId } : { resumeId: null }),
      };

      if (coverLetter?._id) {
        const response = await coverLetterService.updateCoverLetter(coverLetter._id, saveData);
        if (response.success && response.data) {
          setLastSaved(new Date().toISOString());
          setIsDirty(false);
          if (onSave) {
            onSave(response.data);
          }
        }
      } else {
        const response = await coverLetterService.createCoverLetter(saveData);
        if (response.success && response.data) {
          setLastSaved(new Date().toISOString());
          setIsDirty(false);
          if (onSave) {
            onSave(response.data);
          }
        }
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Title is required');
    else if (formData.title.trim().length < 3) errors.push('Title must be at least 3 characters');
    if (!formData.jobTitle.trim()) errors.push('Job title is required');
    if (!formData.companyName.trim()) errors.push('Company name is required');
    if (!formData.content.trim()) errors.push('Cover letter content is required');
    else if (formData.content.trim().length < 100) errors.push('Cover letter content must be at least 100 characters');

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
        ...(formData.resumeId && formData.resumeId.trim() ? { resumeId: formData.resumeId } : { resumeId: null }),
      };

      let response;
      if (coverLetter?._id) {
        response = await coverLetterService.updateCoverLetter(coverLetter._id, saveData);
      } else {
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
    if (!formData.jobTitle.trim() || !formData.companyName.trim()) {
      toast.error('Please enter job title and company name to generate content');
      return;
    }

    try {
      setLoading(true);
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
      const templateContent = generateTemplateContent(formData.jobTitle, formData.companyName, formData.tone);
      handleInputChange('content', templateContent);
      toast.success('Content generated using template');
    } finally {
      setLoading(false);
    }
  };

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

  const enhanceWithAI = async () => {
    if (!formData.content.trim()) {
      toast.error('Please add some content first before enhancing');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await coverLetterService.enhanceCoverLetterWithAI({
        content: formData.content,
        jobDescription: formData.jobTitle && formData.companyName ? 
          `${formData.jobTitle} position at ${formData.companyName}` : '',
        tone: formData.tone,
        focusAreas: ['strengthen language', 'improve flow', 'add impact']
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
      
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
      
      const coverLetterData = {
        title: formData.title || `Cover Letter - ${formData.jobTitle} at ${formData.companyName}`,
        content: formData.content,
        jobTitle: formData.jobTitle,
        companyName: formData.companyName,
        tone: formData.tone,
        metadata: {
          date: today,
          position: formData.jobTitle,
          company: formData.companyName,
          wordCount: formData.content.trim().split(/\s+/).length
        }
      };
      
      toast.info(`Generating ${format.toUpperCase()} document...`, {
        description: 'Creating professional formatted file'
      });

      const result = await coverLetterService.downloadCoverLetterWithData(coverLetterData, format);

      if (result.success && result.blob) {
        if (result.blob.size === 0) {
          throw new Error('Generated file is empty');
        }

        if (result.blob.type.includes('text/html') || result.blob.type.includes('application/json')) {
          const errorText = await result.blob.text();
          console.error('Server returned error as blob:', errorText);
          throw new Error('Server error occurred during file generation');
        }

        const safeTitle = coverLetterData.title
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        
        const fileName = `${safeTitle}.${format}`;
        
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 100);

        toast.success(`✅ ${format.toUpperCase()} downloaded!`, {
          description: `${fileName} (${Math.round(result.blob.size / 1024)}KB) saved to Downloads`
        });
        
      } else {
        throw new Error(result.message || 'No file data received from server');
      }
      
    } catch (error: any) {
      console.error('❌ Download failed:', error);
      toast.error(`Failed to download ${format.toUpperCase()}`, {
        description: error.message || 'Please try again or contact support'
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const generateTemplateContent = (jobTitle: string, companyName: string, tone: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
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

    return `${selectedTone.greeting}` +

    `\n${selectedTone.opener} the ${jobTitle} position at ${companyName}. With my background and experience, I am confident I would be a valuable addition to your team.` +

    `\nThroughout my career, I have developed strong skills that directly align with the requirements for this role. I am particularly drawn to ${companyName} because of your reputation for excellence and innovation in the industry.` +

    `\nI would welcome the opportunity to discuss how my experience and enthusiasm can contribute to ${companyName}'s continued success. ${selectedTone.closer}` +

    `\n${selectedTone.signature}`;
  };

  const getSaveStatus = () => {
    if (saving) {
      return { icon: ClockIcon, text: 'Auto-saving...', color: 'text-yellow-400' };
    }
    if (lastSaved && !isDirty) {
      const savedTime = new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { icon: CheckCircleIcon, text: `Auto-saved at ${savedTime}`, color: 'text-green-400' };
    }
    if (isDirty) {
      return { icon: ExclamationTriangleIcon, text: 'Unsaved changes', color: 'text-orange-400' };
    }
    return { icon: CheckCircleIcon, text: 'All changes saved', color: 'text-green-400' };
  };


  const handleClose = async () => {
    if (isDirty) {
      console.log('💾 Saving changes before closing...');
      await handleAutoSave();
    }
    onClose();
  };

  const saveStatus = getSaveStatus();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 475px) {
          .xs\:inline { display: inline !important; }
          .xs\:space-x-4 > * + * { margin-left: 1rem !important; }
        }
        @media (max-width: 768px) {
          button, input, select, textarea {
            min-height: 44px;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-6xl mx-auto my-2 sm:my-4 rounded-none sm:rounded-2xl overflow-hidden h-screen sm:h-auto"
        >
          <div className="bg-surface-50/95 backdrop-blur-xl border-0 sm:border border-surface-200/50 shadow-2xl flex flex-col h-full sm:min-h-[calc(100vh-2rem)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-surface-200/50 gap-3 sm:gap-0">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-accent-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-text-primary truncate">
                    {coverLetter ? 'Edit Cover Letter' : 'Create Cover Letter'}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-text-secondary">
                    <span className="truncate">{wordCount} words • {characterCount} characters</span>
                    {saveStatus && (
                      <div className={`flex items-center space-x-1 ${saveStatus.color} mt-1 sm:mt-0`}>
                        <saveStatus.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="truncate">{saveStatus.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* AI Generate Button - Hidden on mobile, shown in tab */}
                <PremiumFeatureGate
                  feature="AI Cover Letter Generation"
                  description="Generate AI content"
                  requiresEnterprise={true}
                  actionButtonLabel="Upgrade to Generate AI Content"
                >
                  {(isAccessGranted, openUpgradeModal) => (
                    <button
                      onClick={isAccessGranted ? handleGenerateAI : openUpgradeModal}
                      disabled={loading}
                      className={`hidden sm:flex px-3 lg:px-4 py-2 border rounded-lg transition-all duration-200 items-center space-x-1 lg:space-x-2 disabled:opacity-50 text-sm ${isAccessGranted 
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30' 
                          : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30'}`}
                      title={isAccessGranted ? 'Generate AI content' : 'Upgrade to Enterprise for AI features'}
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span className="hidden lg:inline">AI Generate</span>
                      <span className="lg:hidden">AI</span>
                      {!isAccessGranted && <span className="text-xs">⭐</span>}
                    </button>
                  )}
                </PremiumFeatureGate>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="btn-primary-dark px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 disabled:opacity-50 text-sm"
                >
                  {loading || saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="p-2 text-dark-text-muted hover:text-text-primary rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs - Mobile Optimized */}
            <div className="flex border-b border-surface-200/30 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex-1 min-w-0 py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'edit'
                    ? 'bg-accent-primary/10 text-accent-primary border-b-2 border-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-gray-700/30'}`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <span>✏️</span>
                  <span className="hidden xs:inline">Edit</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 min-w-0 py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'preview'
                    ? 'bg-accent-primary/10 text-accent-primary border-b-2 border-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-gray-700/30'}`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <span>👁️</span>
                  <span className="hidden xs:inline">Preview</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ai-enhance')}
                className={`flex-1 min-w-0 py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'ai-enhance'
                    ? 'bg-green-500/10 text-green-400 border-b-2 border-green-400'
                    : 'text-text-secondary hover:text-text-primary hover:bg-gray-700/30'}`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <span>🤖</span>
                  <span className="hidden xs:inline">AI</span>
                  <span className="hidden sm:inline">Enhance</span>
                </span>
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
                    className="h-full flex flex-col lg:flex-row"
                  >
                    {/* Form Section - Full width on mobile, 1/3 on desktop */}
                    <div className="w-full lg:w-1/3 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-surface-200/30 overflow-y-auto max-h-60 lg:max-h-full">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="e.g., Software Engineer at Google"
                            className="input-field-dark w-full text-base sm:text-sm"
                            style={{ minHeight: '44px' }}
                          />
                        </div>

                        {/* Job Title */}
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Job Title
                          </label>
                          <input
                            type="text"
                            value={formData.jobTitle}
                            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                            placeholder="e.g., Software Engineer"
                            className="input-field-dark w-full text-base sm:text-sm"
                            style={{ minHeight: '44px' }}
                          />
                        </div>

                        {/* Company Name */}
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => handleInputChange('companyName', e.target.value)}
                            placeholder="e.g., Google"
                            className="input-field-dark w-full text-base sm:text-sm"
                            style={{ minHeight: '44px' }}
                          />
                        </div>

                        {/* Tone */}
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Tone
                          </label>
                          <select
                            value={formData.tone}
                            onChange={(e) => handleInputChange('tone', e.target.value)}
                            className="input-field-dark w-full text-base sm:text-sm"
                            style={{ minHeight: '44px' }}
                          >
                            <option value="professional">Professional</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="casual">Casual</option>
                            <option value="conservative">Conservative</option>
                          </select>
                        </div>

                        {/* Resume Selection */}
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Attach Resume (Optional)
                          </label>
                          <select
                            value={formData.resumeId}
                            onChange={(e) => handleResumeChange(e.target.value)}
                            className="input-field-dark w-full text-base sm:text-sm"
                            style={{ minHeight: '44px' }}
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
                          
                          {/* Show currently attached resume */}
                          {coverLetter?.attachedResume && (
                            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <div>
                                  <p className="text-sm font-medium text-green-400">
                                    Currently attached: {coverLetter.attachedResume.title}
                                  </p>
                                  {coverLetter.attachedResume.personalInfo && (
                                    <p className="text-xs text-green-300">
                                      {coverLetter.attachedResume.personalInfo.firstName} {coverLetter.attachedResume.personalInfo.lastName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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

                    {/* Editor Section - Full width on mobile, flex-1 on desktop */}
                    <div className="w-full lg:flex-1 p-4 sm:p-6 flex flex-col min-h-0 lg:min-h-full">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                        <label className="text-sm font-medium text-text-secondary">
                          Cover Letter Content *
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {/* AI Generate Button - Show on mobile since it's hidden in header */}
                          <PremiumFeatureGate
                            feature="AI Cover Letter Generation"
                            description="Generate AI content"
                            requiresEnterprise={true}
                            actionButtonLabel="Upgrade to Generate AI Content"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                onClick={isAccessGranted ? handleGenerateAI : openUpgradeModal}
                                disabled={loading}
                                className={`sm:hidden px-3 py-2 border rounded-lg transition-all duration-200 flex items-center space-x-1 disabled:opacity-50 text-sm ${isAccessGranted 
                                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30 hover:bg-emerald-600/30' 
                                    : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30'}`}
                                title={isAccessGranted ? 'Generate AI content' : 'Upgrade to Enterprise for AI features'}
                              >
                                <SparklesIcon className="w-4 h-4" />
                                <span>AI Generate</span>
                                {!isAccessGranted && <span className="text-xs">⭐</span>}
                              </button>
                            )}
                          </PremiumFeatureGate>
                          <PremiumFeatureGate
                            feature="AI Content Enhancement"
                            description="Enhance content with AI"
                            requiresEnterprise={true}
                            actionButtonLabel="Upgrade to Enhance Content"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                type="button"
                                onClick={isAccessGranted ? enhanceWithAI : openUpgradeModal}
                                disabled={isGeneratingAI || !formData.content.trim()}
                                className={`px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] ${isAccessGranted 
                                    ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' 
                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'}`}
                                title={isAccessGranted ? 'Enhance content with AI' : 'Upgrade to Enterprise for AI enhancement'}
                              >
                                {isGeneratingAI ? 'Enhancing...' : '✨ Enhance'}
                                {!isAccessGranted && <span className="ml-1">⭐</span>}
                              </button>
                            )}
                          </PremiumFeatureGate>
                          <PremiumFeatureGate
                            feature="Premium Download Formats"
                            description="Download your cover letter in DOCX or PDF format."
                            requiresEnterprise={true}
                            actionButtonLabel="Upgrade for Premium Downloads"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                type="button"
                                onClick={isAccessGranted ? () => downloadCoverLetter('pdf') : openUpgradeModal}
                                disabled={!formData.content.trim() || downloadingFormat === 'pdf'}
                                className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 min-h-[36px]"
                              >
                                {downloadingFormat === 'pdf' ? (
                                  <>
                                    <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    <span>PDF</span>
                                  </>
                                ) : (
                                  <>📄 PDF</>
                                )}
                                {!isAccessGranted && <span className="ml-1">⭐</span>}
                              </button>
                            )}
                          </PremiumFeatureGate>
                        </div>
                      </div>
                      {/* Google Docs Style Rich Text Editor */}
                      <div className="flex-1 flex flex-col">
                        {/* Professional Toolbar - Mobile Optimized */}
                        <div className="bg-dark-bg-secondary border border-surface-200 rounded-t-lg px-2 sm:px-4 py-2 border-b-0">
                          <div className="flex items-center gap-1 text-sm text-text-primary overflow-x-auto scrollbar-hide">
                            {/* Essential Formatting Only on Mobile */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button 
                                className="p-2 hover:bg-dark-bg-tertiary rounded font-bold text-text-primary min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Bold"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  document.execCommand('bold', false);
                                }}
                              >
                                B
                              </button>
                              <button 
                                className="p-2 hover:bg-dark-bg-tertiary rounded italic text-text-primary min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Italic"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  document.execCommand('italic', false);
                                }}
                              >
                                I
                              </button>
                              <button 
                                className="p-2 hover:bg-dark-bg-tertiary rounded underline text-text-primary min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Underline"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  document.execCommand('underline', false);
                                }}
                              >
                                U
                              </button>
                            </div>

                            {/* Desktop Only - Advanced Options */}
                            <div className="hidden lg:flex items-center gap-2 ml-4">
                              <div className="w-px h-6 bg-dark-border"></div>
                              
                              {/* Font Options */}
                              <select 
                                className="border border-surface-200 bg-dark-bg-tertiary text-text-primary rounded px-2 py-1 text-xs"
                                onChange={(e) => {
                                  document.execCommand('fontName', false, e.target.value);
                                }}
                              >
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Arial">Arial</option>
                                <option value="Calibri">Calibri</option>
                                <option value="Georgia">Georgia</option>
                              </select>
                              
                              <select 
                                className="border border-surface-200 bg-dark-bg-tertiary text-text-primary rounded px-2 py-1 text-xs"
                                defaultValue="3"
                                onChange={(e) => {
                                  document.execCommand('fontSize', false, e.target.value);
                                }}
                              >
                                <option value="1">8pt</option>
                                <option value="2">10pt</option>
                                <option value="3">12pt</option>
                                <option value="4">14pt</option>
                                <option value="5">18pt</option>
                              </select>

                              <div className="w-px h-6 bg-dark-border"></div>

                              {/* Alignment */}
                              <div className="flex items-center gap-1">
                                <button 
                                  className="p-2 hover:bg-dark-bg-tertiary rounded text-text-primary"
                                  title="Align Left"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    document.execCommand('justifyLeft', false);
                                  }}
                                >
                                  ⚊
                                </button>
                                <button 
                                  className="p-2 hover:bg-dark-bg-tertiary rounded text-text-primary"
                                  title="Center"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    document.execCommand('justifyCenter', false);
                                  }}
                                >
                                  ☰
                                </button>
                                <button 
                                  className="p-2 hover:bg-dark-bg-tertiary rounded text-text-primary"
                                  title="Align Right"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    document.execCommand('justifyRight', false);
                                  }}
                                >
                                  ⚋
                                </button>
                              </div>
                            </div>

                            <div className="flex-1"></div>

                            {/* Word Count - Always visible */}
                            <div className="text-xs text-dark-text-muted px-2 flex-shrink-0">
                              <span className="hidden sm:inline">{formData.content.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
                              <span className="sm:hidden">{formData.content.trim().split(/\s+/).filter(w => w.length > 0).length}w</span>
                            </div>
                          </div>
                        </div>

                        {/* Rich Text Editor - Mobile Optimized */}
                        <div 
                          className="flex-1 bg-white border border-surface-200 rounded-b-lg border-t-0 min-h-0"
                        >
                          <div className="p-3 sm:p-6 h-full">
                            <textarea
                              value={formData.content}
                              onChange={(e) => {
                                const content = e.target.value;
                                setFormData(prev => ({ ...prev, content }));
                                setIsDirty(true);
                                setWordCount(content.trim().split(/\s+/).filter(w => w.length > 0).length);
                                setCharacterCount(content.length);
                                
                                if (autoSaveTimeoutRef.current) {
                                  clearTimeout(autoSaveTimeoutRef.current);
                                }
                                autoSaveTimeoutRef.current = setTimeout(() => {
                                  handleAutoSave();
                                }, 2000);
                              }}
                              placeholder="Start typing your cover letter content here. All formatting, line breaks, and spacing will be preserved exactly as you type them."
                              className="w-full p-3 sm:p-4 border-0 outline-none resize-none leading-relaxed h-full"
                              style={{
                                fontSize: 'clamp(14px, 4vw, 16px)',
                                fontFamily: 'Times, "Times New Roman", serif',
                                lineHeight: '1.6',
                                color: '#000',
                                backgroundColor: 'transparent',
                                minHeight: '300px',
                                whiteSpace: 'pre-wrap'
                              }}
                              spellCheck={true}
                              autoComplete="off"
                              wrap="soft"
                            />
                          </div>
                        </div>

                        {/* Status Bar */}
                        <div className="mt-4 p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-4 text-gray-600">
                            <span className="font-medium">{formData.content.length} characters</span>
                            <span className="font-medium">{formData.content.trim().split(/\s+/).filter(w => w.length > 0).length} words</span>
                            <span className="font-medium">~{Math.max(1, Math.ceil(formData.content.trim().split(/\s+/).filter(w => w.length > 0).length / 250))} min read</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {saveStatus && (
                              <div className={`flex items-center gap-1 ${saveStatus.color} font-medium`}>
                                <saveStatus.icon className="w-3 h-3" />
                                <span>{saveStatus.text}</span>
                              </div>
                            )}
                            <button
                              onClick={handleAutoSave}
                              disabled={!isDirty || saving}
                              className="px-3 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Saving...' : 'Save Now'}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="flex justify-between items-center mt-2 text-xs text-dark-text-muted">
                        <span>{formData.content.split(' ').filter(w => w.length > 0).length} words | {formData.content.length} characters</span>
                        {analysisResults && (
                          <span className={`font-medium ${analysisResults.matchScore >= 80 ? 'text-green-400' : analysisResults.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
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
                    className="h-full w-full overflow-y-auto"
                    style={{
                      maxHeight: 'calc(100vh - 200px)',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    <div className="h-full w-full" style={{ margin: 0, padding: 0 }}>
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
                          <p className="text-text-secondary">
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

                      {/* Action Buttons - Mobile Optimized */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <PremiumFeatureGate
                          feature="AI Content Enhancement"
                          description="Enhance content with AI"
                          requiresEnterprise={true}
                          actionButtonLabel="Upgrade to Enhance Content"
                        >
                          {(isAccessGranted, openUpgradeModal) => (
                            <button
                              onClick={isAccessGranted ? enhanceWithAI : openUpgradeModal}
                              disabled={isGeneratingAI || !formData.content.trim()}
                              className={`p-4 sm:p-6 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] sm:min-h-auto ${isAccessGranted 
                                  ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20' 
                                  : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'}`}
                            >
                              <div className="flex flex-row sm:flex-col items-center space-x-3 sm:space-x-0 sm:space-y-3">
                                <ChatBubbleLeftRightIcon className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${isAccessGranted ? 'text-green-400' : 'text-yellow-400'}`} />
                                <div className="text-left sm:text-center">
                                  <h4 className={`font-semibold text-sm sm:text-base ${isAccessGranted ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {isGeneratingAI ? 'Enhancing...' : 'Enhance Content'}
                                    {!isAccessGranted && ' ⭐'}
                                  </h4>
                                  <p className={`text-xs sm:text-sm ${isAccessGranted ? 'text-green-300' : 'text-yellow-300'}`}>
                                    {isAccessGranted ? 'Improve language, flow, and impact' : 'Premium AI feature - Upgrade to unlock'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )}
                        </PremiumFeatureGate>

                        <PremiumFeatureGate
                          feature="AI Content Analysis"
                          description="Get match score and suggestions"
                          requiresEnterprise={true}
                          actionButtonLabel="Upgrade to Analyze Content"
                        >
                          {(isAccessGranted, openUpgradeModal) => (
                            <button
                              onClick={isAccessGranted ? analyzeContent : openUpgradeModal}
                              disabled={isAnalyzing || !formData.content.trim()}
                              className={`p-4 sm:p-6 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] sm:min-h-auto ${isAccessGranted 
                                  ? 'bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20' 
                                  : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'}`}
                            >
                              <div className="flex flex-row sm:flex-col items-center space-x-3 sm:space-x-0 sm:space-y-3">
                                <ChartBarIcon className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${isAccessGranted ? 'text-teal-400' : 'text-yellow-400'}`} />
                                <div className="text-left sm:text-center">
                                  <h4 className={`font-semibold text-sm sm:text-base ${isAccessGranted ? 'text-teal-400' : 'text-yellow-400'}`}>
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
                                    {!isAccessGranted && ' ⭐'}
                                  </h4>
                                  <p className={`text-xs sm:text-sm ${isAccessGranted ? 'text-teal-300' : 'text-yellow-300'}`}>
                                    {isAccessGranted ? 'Get match score and suggestions' : 'Premium AI feature - Upgrade to unlock'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )}
                        </PremiumFeatureGate>
                      </div>

                      {/* Download Section - Mobile Optimized */}
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 sm:p-6">
                        <h4 className="font-semibold text-emerald-400 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                          <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Professional Downloads
                        </h4>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          <PremiumFeatureGate
                            feature="Premium Download Formats"
                            description="Download your cover letter in DOCX or PDF format."
                            requiresEnterprise={true}
                            actionButtonLabel="Upgrade for Premium Downloads"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                onClick={isAccessGranted ? () => downloadCoverLetter('pdf') : openUpgradeModal}
                                disabled={!formData.content.trim() || downloadingFormat === 'pdf'}
                                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[72px]"
                              >
                                <div className="text-center">
                                  {downloadingFormat === 'pdf' ? (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  ) : (
                                    <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mx-auto mb-2" />
                                  )}
                                  <span className="text-xs sm:text-sm text-red-400">
                                    {downloadingFormat === 'pdf' ? 'Generating...' : 'PDF'}
                                  </span>
                                  {!isAccessGranted && <span className="text-xs ml-1">⭐</span>}
                                </div>
                              </button>
                            )}
                          </PremiumFeatureGate>
                          <PremiumFeatureGate
                            feature="Premium Download Formats"
                            description="Download your cover letter in DOCX or PDF format."
                            requiresEnterprise={true}
                            actionButtonLabel="Upgrade for Premium Downloads"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                onClick={isAccessGranted ? () => downloadCoverLetter('docx') : openUpgradeModal}
                                disabled={!formData.content.trim() || downloadingFormat === 'docx'}
                                className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg hover:bg-teal-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[72px]"
                              >
                                <div className="text-center">
                                  {downloadingFormat === 'docx' ? (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  ) : (
                                    <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 mx-auto mb-2" />
                                  )}
                                  <span className="text-xs sm:text-sm text-teal-400">
                                    {downloadingFormat === 'docx' ? 'Generating...' : 'DOCX'}
                                  </span>
                                  {!isAccessGranted && <span className="text-xs ml-1">⭐</span>}
                                </div>
                              </button>
                            )}
                          </PremiumFeatureGate>
                          <PremiumFeatureGate
                            feature="TXT Download Format"
                            description="Download your cover letter in plain text format."
                            requiresEnterprise={false} // TXT is not premium
                            actionButtonLabel="TXT is available for all users"
                          >
                            {(isAccessGranted, openUpgradeModal) => (
                              <button
                                onClick={isAccessGranted ? () => downloadCoverLetter('txt') : openUpgradeModal}
                                disabled={!formData.content.trim() || downloadingFormat === 'txt'}
                                className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[72px]"
                              >
                                <div className="text-center">
                                  {downloadingFormat === 'txt' ? (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  ) : (
                                    <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-2" />
                                  )}
                                  <span className="text-xs sm:text-sm text-gray-400">
                                    {downloadingFormat === 'txt' ? 'Generating...' : 'TXT'}
                                  </span>
                                </div>
                              </button>
                            )}
                          </PremiumFeatureGate>
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
                              <div className={`text-3xl font-bold mb-2 ${analysisResults.matchScore >= 80 ? 'text-green-400' : analysisResults.matchScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {analysisResults.matchScore}%
                              </div>
                              <p className="text-sm text-dark-text-muted">Match Score</p>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-teal-400 mb-2">
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
    <div className="w-full h-full" style={{ margin: 0, padding: 0 }}>
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .cover-letter-document {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in 0.75in !important;
            width: 100% !important;
            max-width: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Document Container - Full width and height */}
      <div 
        className="cover-letter-document bg-white w-full h-full" 
        style={{
          width: '100%',
          height: '100%',
          fontFamily: 'Times, "Times New Roman", serif',
          fontSize: '12pt',
          lineHeight: '1.8',
          margin: 0,
          padding: '20px',
          boxShadow: 'none',
          border: 'none'
        }}
      >

        {/* Main Content with professional formatting */}
        <div style={{ margin: 0, padding: 0 }}>
          {formData.content ? (
            <div 
              className="text-gray-900 leading-relaxed whitespace-pre-wrap"
              style={{
                fontSize: '12pt',
                fontFamily: 'Times, "Times New Roman", serif',
                lineHeight: '1.8',
                margin: 0,
                padding: 0
              }}
            >
              {formData.content}
            </div>
          ) : (
            <div className="space-y-4 no-print">
              <div 
                className="text-gray-400 italic leading-relaxed border-2 border-dashed border-gray-300 p-6 rounded-lg bg-gray-50"
                style={{ fontSize: '12pt' }}
              >
                <div className="text-center">
                  <DocumentTextIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <p>Your cover letter content will appear here...</p>
                  <p className="text-sm mt-2">Start typing in the Edit tab to see your professional document take shape.</p>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>

      {/* Document Info Panel */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm">
        <div className="flex justify-between items-center">
          <div className="space-x-4 flex">
            <span className="text-gray-600">
              <strong>Word Count:</strong> {formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0}
            </span>
            <span className="text-gray-600">
              <strong>Reading Time:</strong> ~{Math.max(1, Math.ceil((formData.content.trim().split(/\s+/).length || 0) / 250))} min
            </span>
          </div>
          <div className="text-gray-500">
            Standard Business Letter Format
          </div>
        </div>
      </div>
    </div>
  );
}