import React, { useState, useEffect } from 'react';

// Helper function to convert MongoDB ObjectId to string
const convertObjectIdToString = (id: any): string => {
  if (!id) return '';
  
  if (typeof id === 'string') {
    return id;
  }
  
  // Handle MongoDB ObjectId Buffer format
  if (id.buffer && id.buffer.data && Array.isArray(id.buffer.data)) {
    const bytes = Array.from(id.buffer.data);
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  return String(id);
};
import { createFileName } from '../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  PencilIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PrinterIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { resumeService, ResumeData } from '../services/resumeService';
import { coverLetterService, CoverLetterData } from '../services/coverLetterService';
import { api } from '../services/api';
import ResumePDFPreviewSimple from '../components/documents/ResumePDFPreviewSimple';
import CoverLetterEditor from '../components/documents/CoverLetterEditor';
import DocumentActions from '../components/documents/DocumentActions';
import DocumentLoadingSkeleton from '../components/documents/DocumentLoadingSkeleton';
import TemplateRenderer from '../components/resume/TemplateRenderer';
import { resumeTemplates, getTemplateById } from '../data/resumeTemplates';
import { Resume } from '../types';
import { toast } from 'sonner';

// Utility function to detect LaTeX templates
const isLatexTemplateId = (templateId: string): boolean => {
  // Templates in /public/templates/ are LaTeX templates (template01, template02, etc.)
  // Regular resumeTemplates are HTML-based
  return templateId?.startsWith('template') && !templateId.includes('modern-creative');
};

type DocumentType = 'resumes' | 'cover-letters';
type ViewMode = 'grid' | 'list';

interface DocumentStats {
  totalResumes: number;
  totalCoverLetters: number;
  recentlyModified: number;
  drafts: number;
}

export default function DocumentManager() {
  const [activeTab, setActiveTab] = useState<DocumentType>('resumes');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterData[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats>({
    totalResumes: 0,
    totalCoverLetters: 0,
    recentlyModified: 0,
    drafts: 0,
  });

  // Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCoverLetterEditor, setShowCoverLetterEditor] = useState(false);
  const [editingCoverLetter, setEditingCoverLetter] = useState<CoverLetterData | null>(null);
  const [coverLetterEditorTab, setCoverLetterEditorTab] = useState<'edit' | 'preview' | 'ai-enhance'>('edit');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending action loading states
      setActionLoading(null);
    };
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Load resumes with proper error handling
      let resumesData: ResumeData[] = [];
      try {
        const resumesResponse = await resumeService.getResumes();
        if (resumesResponse.success && resumesResponse.data) {
          resumesData = resumesResponse.data;
          setResumes(resumesData);
        } else {
          console.warn('Failed to load resumes:', resumesResponse.message);
          setResumes([]);
        }
      } catch (error) {
        console.error('Error loading resumes:', error);
        setResumes([]);
      }

      // Load cover letters with proper error handling
      let coverLettersData: CoverLetterData[] = [];
      try {
        const coverLettersResponse = await coverLetterService.getCoverLetters();
        if (coverLettersResponse.success && coverLettersResponse.data) {
          coverLettersData = coverLettersResponse.data;
          setCoverLetters(coverLettersData);
        } else {
          console.warn('Failed to load cover letters:', coverLettersResponse.message);
          setCoverLetters([]);
        }
      } catch (error) {
        console.error('Error loading cover letters:', error);
        setCoverLetters([]);
      }

      // Calculate stats with proper data validation
      const totalResumes = resumesData.length;
      const totalCoverLetters = coverLettersData.length;
      
      // Calculate recently modified documents
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentlyModified = [
        ...resumesData.filter(doc => {
          const updatedAt = doc.updatedAt || doc.createdAt;
          return updatedAt && new Date(updatedAt) > dayAgo;
        }),
        ...coverLettersData.filter(doc => {
          const updatedAt = doc.updatedAt || doc.createdAt;
          return updatedAt && new Date(updatedAt) > dayAgo;
        })
      ].length;

      setStats({
        totalResumes,
        totalCoverLetters,
        recentlyModified,
        drafts: 0, // Will be implemented based on document status
      });

    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents. Please refresh the page.');
      // Set empty state on critical error
      setResumes([]);
      setCoverLetters([]);
      setStats({
        totalResumes: 0,
        totalCoverLetters: 0,
        recentlyModified: 0,
        drafts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string, type: DocumentType) => {
    if (!id) {
      toast.error('Invalid document ID');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${type === 'resumes' ? 'resume' : 'cover letter'}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const success = type === 'resumes' 
        ? await resumeService.deleteResume(id)
        : await coverLetterService.deleteCoverLetter(id);
      
      if (success) {
        if (type === 'resumes') {
          setResumes(prev => prev.filter(r => r._id !== id));
          setStats(prev => ({ ...prev, totalResumes: prev.totalResumes - 1 }));
        } else {
          setCoverLetters(prev => prev.filter(c => c._id !== id));
          setStats(prev => ({ ...prev, totalCoverLetters: prev.totalCoverLetters - 1 }));
        }
        toast.success(`${type === 'resumes' ? 'Resume' : 'Cover letter'} deleted successfully`);
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error) {
      console.error('Delete operation failed:', error);
      toast.error(`Failed to delete ${type === 'resumes' ? 'resume' : 'cover letter'}. Please try again.`);
    }
  };

  const handleDownloadResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error('Cannot download: Resume ID is missing');
      return;
    }

    if (!resume.personalInfo?.firstName || !resume.personalInfo?.lastName) {
      toast.error('Cannot download: Resume is missing required personal information');
      return;
    }

    const loadingToast = toast.loading('🏢 Enterprise PDF generation in progress...');
    setActionLoading(`download-${resumeId}`);
    
    try {
      console.log('🚀 Starting smart PDF download...', resumeId);
      
      // Check if saved PDF exists and is current
      const pdfInfo = await resumeService.getSavedPDFInfo(resumeId);
      
      let pdfBlob: Blob;
      
      if (pdfInfo.hasSavedPDF) {
        console.log('📁 Using saved PDF from database');
        toast.dismiss(loadingToast);
        toast.loading('📁 Retrieving saved PDF...');
        
        pdfBlob = await resumeService.getSavedPDF(resumeId);
        console.log('✅ Retrieved saved PDF successfully');
      } else {
        console.log('🔧 Generating new PDF with LaTeX engine');
        
        // Generate new PDF using standardized LaTeX template system
        const templateId = resume.template || resume.templateId || 'template01';
        
        pdfBlob = await resumeService.downloadResumeWithEngine(resume, 'pdf', {
          engine: 'latex', // All templates now use LaTeX
          templateId: templateId
        });
        console.log('✅ Generated new PDF successfully');
      }
      
      if (pdfBlob.size === 0) {
        throw new Error('Received empty PDF file from server');
      }
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const fileName = createFileName(resume.personalInfo?.firstName, resume.personalInfo?.lastName);
      
      // Create and trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up blob URL
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
      
      toast.dismiss(loadingToast);
      toast.success(`🎉 Enterprise PDF downloaded successfully! File: ${fileName}`);
      
      // Show success message based on source
      setTimeout(() => {
        if (pdfInfo.hasSavedPDF) {
          toast.success('💾 Saved PDF downloaded instantly!', {
            duration: 3000
          });
        } else {
          toast.success('💼 Fresh PDF generated with LaTeX engine!', {
            duration: 4000
          });
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Enterprise PDF generation failed:', error);
      toast.dismiss(loadingToast);
      
      // Handle axios errors properly
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.message;
        
        if (status === 401) {
          toast.error('🔐 Authentication required. Please log in to download resumes.');
        } else if (status === 404) {
          toast.error('🔍 Download endpoint not found. Please ensure backend server is running.');
        } else if (status >= 500) {
          toast.error('🏢 Server-side PDF generation temporarily unavailable. Please try again shortly.');
        } else {
          toast.error(`❌ Enterprise PDF generation failed: ${errorMessage}`);
        }
      } else if (error.request) {
        toast.error('🌐 Cannot connect to server. Please ensure backend is running and accessible.');
      } else {
        toast.error(`❌ Unexpected error: ${error.message || 'Unknown error'}`);
      }
      
      // Fallback to client-side generation for development/testing
      console.log('🔄 Attempting fallback to client-side generation...');
      setTimeout(() => {
        toast.info('🔄 Falling back to browser-based PDF generation...');
        // The existing print-based fallback could go here if needed
      }, 2000);
      
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error('Cannot print: Resume ID is missing');
      return;
    }
    
    setActionLoading(`print-${resumeId}`);
    const loadingToast = toast.loading('Preparing PDF for printing...');

    try {
      const pdfBlob = await resumeService.downloadResumeWithEngine(resume, 'pdf', {
        engine: 'latex',
        templateId: resume.template || resume.templateId || 'template01'
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          // A timeout gives the PDF viewer time to load the document.
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
               toast.error('Print failed. Please use the browser print function (Ctrl+P).');
            } finally {
               URL.revokeObjectURL(pdfUrl);
            }
          }, 250);
        };
      } else {
        toast.error("Could not open print window. Please disable pop-up blockers.");
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to generate PDF for printing.');
    } finally {
      toast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleShareResume = async (resume: ResumeData) => {
    const resumeId = convertObjectIdToString(resume._id);
    if (!resumeId) {
      toast.error('Cannot share: Resume ID is missing');
      return;
    }

    setActionLoading(`share-${resumeId}`);
    const loadingToast = toast.loading('Preparing PDF for sharing...');

    try {
      const pdfBlob = await resumeService.downloadResumeWithEngine(resume, 'pdf', {
        engine: 'latex',
        templateId: resume.template || resume.templateId || 'template01'
      });

      const fileName = `${resume.personalInfo?.firstName || 'Resume'}_${resume.personalInfo?.lastName || 'PDF'}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: resume.title || 'My Resume',
          text: `Check out my resume: ${resume.title}`,
          files: [file],
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback for browsers that don't support sharing files
        const shareUrl = `${window.location.origin}/shared/resume/${resumeId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Sharing not supported, share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share resume.');
    } finally {
      toast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  // Helper function to generate secure token
  const generateSecureToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleDownloadCoverLetter = async (coverLetter: CoverLetterData) => {
    try {
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '8.5in';
      printDiv.style.minHeight = '11in';
      printDiv.style.backgroundColor = 'white';
      printDiv.style.padding = '1in';
      
      const formatDate = (date: string | undefined) => {
        if (!date) return new Date().toLocaleDateString();
        return new Date(date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      };
      
      printDiv.innerHTML = `
        <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; white-space: pre-wrap;">
          ${coverLetter.content || `AI-generated cover letter content will appear here.`}
        </div>
      `;
      
      document.body.appendChild(printDiv);
      
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printDiv.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      
      document.body.removeChild(printDiv);
      
      toast.success('Cover letter download initiated! Use your browser\'s print dialog to save as PDF.');
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download cover letter. Please try again.');
    }
  };

  const handleShareCoverLetter = async (coverLetter: CoverLetterData) => {
    try {
      toast.info('Generating PDF for sharing...');
      
      // Generate PDF file for sharing using enterprise download endpoint
      const response = await api.post('/cover-letters/download-with-data/pdf', {
        coverLetterData: {
          title: coverLetter.title,
          content: coverLetter.content,
          jobTitle: coverLetter.jobTitle,
          companyName: coverLetter.companyName,
          tone: coverLetter.tone,
          createdAt: coverLetter.createdAt
        }
      }, {
        responseType: 'blob'
      });

      if (!response.data) {
        throw new Error('Failed to generate PDF');
      }

      // Create a File object from the PDF blob
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `${coverLetter.title}_Cover_Letter.pdf`.replace(/\s+/g, '_');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Check if file sharing is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `My cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          files: [file],
        });
        toast.success('Cover letter PDF shared successfully!');
      } else if (navigator.share) {
        // Fallback to URL sharing if file sharing not supported
        const shareUrl = `${window.location.origin}/api/v1/shared/cover-letter/${coverLetter._id}`;
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `Check out my cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          url: shareUrl,
        });
        toast.success('Cover letter link shared successfully!');
      } else {
        // For older browsers, download the file and copy link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF downloaded! You can now share the downloaded file.');
      }
    } catch (error: any) {
      console.error('Share error:', error);
      if (error.name !== 'AbortError') {
        toast.error('Failed to share cover letter. Please try downloading instead.');
      }
    }
  };

  // Helper function for clipboard operations
  const copyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success('Link copied to clipboard!');
        }).catch(() => {
          fallbackCopyTextToClipboard(text);
        });
      } else {
        fallbackCopyTextToClipboard(text);
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      fallbackCopyTextToClipboard(text);
    }
  };

  // Fallback copy method
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Could not copy link. Please copy manually: ' + text.substring(0, 50) + '...');
    }
    
    document.body.removeChild(textArea);
  };

  const handleDuplicateDocument = async (id: string, type: DocumentType) => {
    if (!id) {
      toast.error('Invalid document ID');
      return;
    }

    try {
      if (type === 'resumes') {
        const original = resumes.find(r => r._id === id);
        if (!original) {
          toast.error('Original resume not found');
          return;
        }

        const duplicateData = {
          ...original,
          title: `${original.title} (Copy)`,
          _id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        };
        
        const response = await resumeService.createResume(duplicateData);
        if (response.success && response.data) {
          setResumes(prev => [...prev, response.data]);
          setStats(prev => ({ ...prev, totalResumes: prev.totalResumes + 1 }));
          toast.success('Resume duplicated successfully');
        } else {
          throw new Error(response.message || 'Failed to duplicate resume');
        }
      } else {
        const original = coverLetters.find(c => c._id === id);
        if (!original) {
          toast.error('Original cover letter not found');
          return;
        }

        const duplicateData = {
          ...original,
          title: `${original.title} (Copy)`,
          _id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        };
        
        const response = await coverLetterService.createCoverLetter(duplicateData);
        if (response.success && response.data) {
          setCoverLetters(prev => [...prev, response.data]);
          setStats(prev => ({ ...prev, totalCoverLetters: prev.totalCoverLetters + 1 }));
          toast.success('Cover letter duplicated successfully');
        } else {
          throw new Error(response.message || 'Failed to duplicate cover letter');
        }
      }
    } catch (error) {
      console.error('Duplicate operation failed:', error);
      toast.error(`Failed to duplicate ${type === 'resumes' ? 'resume' : 'cover letter'}. Please try again.`);
    }
  };

  const filteredResumes = resumes.filter(resume =>
    resume.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCoverLetters = coverLetters.filter(coverLetter =>
    coverLetter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coverLetter.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coverLetter.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsCards = [
    {
      title: 'Total Resumes',
      value: stats.totalResumes,
      icon: DocumentTextIcon,
      color: 'from-accent-primary to-accent-secondary',
      bgColor: 'bg-accent-primary/10',
    },
    {
      title: 'Cover Letters',
      value: stats.totalCoverLetters,
      icon: PencilIcon,
      color: 'from-accent-secondary to-accent-tertiary',
      bgColor: 'bg-accent-secondary/10',
    },
    {
      title: 'Recently Modified',
      value: stats.recentlyModified,
      icon: FolderIcon,
      color: 'from-accent-tertiary to-accent-quaternary',
      bgColor: 'bg-accent-tertiary/10',
    },
    {
      title: 'Drafts',
      value: stats.drafts,
      icon: DocumentDuplicateIcon,
      color: 'from-accent-quaternary to-accent-primary',
      bgColor: 'bg-accent-quaternary/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up-soft">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="card-dark rounded-xl p-6 shadow-dark-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-700 rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="card-dark rounded-xl p-6 shadow-dark-lg">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 h-10 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gray-700 rounded animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex space-x-1 bg-dark-quaternary/30 p-1 rounded-lg">
            <div className="flex-1 h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex-1 h-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Documents Loading */}
        <DocumentLoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up-soft">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text-dark">📄 Document Manager</h1>
          <p className="text-dark-text-secondary mt-2">
            Manage your resumes and cover letters in one place
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard/resume/templates"
            className="btn-primary-dark px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Resume</span>
          </Link>
          <button
            onClick={() => {
              setEditingCoverLetter(null);
              setCoverLetterEditorTab('edit');
              setShowCoverLetterEditor(true);
            }}
            className="btn-secondary-dark px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Cover Letter</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card-dark rounded-xl p-6 shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-text-secondary">{stat.title}</p>
                  <p className="text-2xl font-bold text-dark-text-primary mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="card-dark rounded-xl p-6 shadow-dark-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-dark-text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field-dark w-full pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-dark-text-muted hover:text-dark-text-primary hover:bg-dark-quaternary/50'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-dark-text-muted hover:text-dark-text-primary hover:bg-dark-quaternary/50'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6 bg-dark-quaternary/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('resumes')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'resumes'
                ? 'bg-accent-primary/20 text-accent-primary shadow-glow-sm'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            📄 Resumes ({filteredResumes.length})
          </button>
          <button
            onClick={() => setActiveTab('cover-letters')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'cover-letters'
                ? 'bg-accent-primary/20 text-accent-primary shadow-glow-sm'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            ✉️ Cover Letters ({filteredCoverLetters.length})
          </button>
        </div>
      </div>

      {/* Documents Grid/List */}
      <AnimatePresence mode="wait">
        {activeTab === 'resumes' ? (
          <motion.div
            key="resumes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'
              : 'space-y-4'
            }
          >
            {filteredResumes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                  No resumes found
                </h3>
                <p className="text-dark-text-secondary mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first resume to get started'}
                </p>
                <Link
                  to="/dashboard/resume/templates"
                  className="btn-primary-dark px-6 py-2 rounded-lg inline-flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Resume</span>
                </Link>
              </div>
            ) : (
              filteredResumes.map((resume) => (
                <ResumeCard
                  key={resume._id}
                  resume={resume}
                  viewMode={viewMode}
                  actionLoading={actionLoading}
                  onPreview={() => {
                    setSelectedDocument(convertObjectIdToString(resume._id));
                    setShowPreviewModal(true);
                  }}
                  onEdit={() => {
                    const resumeId = convertObjectIdToString(resume._id);
                    window.location.href = `/dashboard/resume/comprehensive?edit=${resumeId}`;
                  }}
                  onDelete={() => handleDeleteDocument(convertObjectIdToString(resume._id), 'resumes')}
                  onDuplicate={() => handleDuplicateDocument(convertObjectIdToString(resume._id), 'resumes')}
                  onDownload={() => handleDownloadResume(resume)}
                  onShare={() => handleShareResume(resume)}
                  onPrint={() => handlePrintResume(resume)}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="cover-letters"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 justify-items-center'
              : 'space-y-4'
            }
          >
            {filteredCoverLetters.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <PencilIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                  No cover letters found
                </h3>
                <p className="text-dark-text-secondary mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Create your first cover letter to get started'}
                </p>
                <button
                  onClick={() => {
                    setEditingCoverLetter(null);
                    setCoverLetterEditorTab('edit');
                    setShowCoverLetterEditor(true);
                  }}
                  className="btn-primary-dark px-6 py-2 rounded-lg inline-flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Cover Letter</span>
                </button>
              </div>
            ) : (
              filteredCoverLetters.map((coverLetter) => (
                <CoverLetterCard
                  key={coverLetter._id}
                  coverLetter={coverLetter}
                  viewMode={viewMode}
                  onView={() => {
                    setEditingCoverLetter(coverLetter);
                    setCoverLetterEditorTab('preview');
                    setShowCoverLetterEditor(true);
                  }}
                  onEdit={() => {
                    setEditingCoverLetter(coverLetter);
                    setCoverLetterEditorTab('edit');
                    setShowCoverLetterEditor(true);
                  }}
                  onDelete={() => handleDeleteDocument(coverLetter._id!, 'cover-letters')}
                  onShare={() => handleShareCoverLetter(coverLetter)}
                  onDownload={() => handleDownloadCoverLetter(coverLetter)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedDocument && (
          <ResumePDFPreviewSimple
            resumeId={selectedDocument}
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedDocument(null);
            }}
            onEdit={() => {
              setShowPreviewModal(false);
              const resumeId = convertObjectIdToString(selectedDocument);
              window.location.href = `/dashboard/resume/comprehensive?edit=${resumeId}`;
            }}
          />
        )}
      </AnimatePresence>

      {/* Cover Letter Editor Modal */}
      <AnimatePresence>
        {showCoverLetterEditor && (
          <CoverLetterEditor
            coverLetter={editingCoverLetter}
            isOpen={showCoverLetterEditor}
            initialTab={coverLetterEditorTab}
            onClose={() => {
              setShowCoverLetterEditor(false);
              setEditingCoverLetter(null);
              setCoverLetterEditorTab('edit');
            }}
            onSave={(savedCoverLetter) => {
              if (editingCoverLetter) {
                setCoverLetters(prev => prev.map(c => 
                  c._id === savedCoverLetter._id ? savedCoverLetter : c
                ));
              } else {
                setCoverLetters(prev => [...prev, savedCoverLetter]);
              }
              // Update the editing cover letter with the saved data to reflect changes
              setEditingCoverLetter(savedCoverLetter);
              // Keep the editor open - don't close it after saving
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Resume Preview Thumbnail Component
interface ResumePreviewThumbnailProps {
  resume: ResumeData;
}

function ResumePreviewThumbnail({ resume }: ResumePreviewThumbnailProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    generatePDFPreview();
  }, [resume._id]);

  const generatePDFPreview = async () => {
    try {
      setLoading(true);
      setError(false);

      // Generate PDF blob using the standardized LaTeX template system
      const pdfBlob = await resumeService.downloadResumeWithEngine(resume, 'pdf', {
        engine: 'latex', // Use LaTeX engine for best quality
        templateId: resume.template || resume.templateId || 'template01' // Use standardized template format
      });

      // Create blob URL for preview
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Failed to generate PDF preview:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{ margin: 0, padding: 0 }}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Generating PDF...</span>
        </div>
      </div>
    );
  }

  if (error) {
    // Fallback to template-based preview if PDF generation fails
    return <FallbackTemplatePreview resume={resume} />;
  }

  if (!pdfUrl) {
    return <FallbackTemplatePreview resume={resume} />;
  }

  return (
    <div className="w-full h-full bg-white overflow-hidden" style={{ margin: 0, padding: 0 }}>
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=FitH`}
        className="w-full h-full border-0"
        style={{ 
          margin: 0, 
          padding: 0, 
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: 'scale(1.2)',
          transformOrigin: 'top center'
        }}
        title="Resume Preview"
      />
    </div>
  );
}

// Fallback component using TemplateRenderer for when PDF generation fails
interface FallbackTemplatePreviewProps {
  resume: ResumeData;
}

function FallbackTemplatePreview({ resume }: FallbackTemplatePreviewProps) {
  // Convert ResumeData to Resume format for TemplateRenderer
  const convertToResumeFormat = (resumeData: ResumeData): Resume => {
    return {
      _id: resumeData._id || 'preview',
      template: resumeData.templateId || 'modern-creative-1',
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || 'John',
        lastName: resumeData.personalInfo?.lastName || 'Doe',
        email: resumeData.personalInfo?.email || 'john.doe@email.com',
        phone: resumeData.personalInfo?.phone || '(555) 123-4567',
        location: resumeData.personalInfo?.location || 'New York, NY',
        title: 'Professional', // Add a default title
        linkedinUrl: resumeData.personalInfo?.linkedinUrl,
        portfolioUrl: resumeData.personalInfo?.portfolioUrl,
        githubUrl: resumeData.personalInfo?.githubUrl
      },
      professionalSummary: resumeData.professionalSummary || 'Experienced professional with proven track record of success.',
      workExperience: resumeData.workExperience?.map(exp => ({
        jobTitle: exp.jobTitle,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate || '',
        isCurrentJob: exp.isCurrentJob,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || []
      })) || [],
      education: resumeData.education?.map(edu => ({
        degree: edu.degree,
        institution: edu.institution,
        graduationDate: edu.graduationDate,
        fieldOfStudy: edu.fieldOfStudy || '',
        gpa: edu.gpa || '',
        honors: edu.honors || []
      })) || [],
      skills: resumeData.skills?.map(skill => ({
        name: skill.name,
        level: 5, // Default level since ResumeData doesn't have level
        category: skill.category
      })) || [],
      projects: resumeData.projects?.map(proj => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies || [],
        startDate: '',
        endDate: '',
        url: proj.url || ''
      })) || [],
      certifications: resumeData.certifications || [],
      languages: resumeData.languages?.map(lang => ({
        name: typeof lang === 'string' ? lang : lang,
        proficiency: 'Fluent'
      })) || [],
      volunteerExperience: [],
      awards: [],
      hobbies: [],
      createdAt: new Date(resumeData.createdAt || Date.now()),
      updatedAt: new Date(resumeData.updatedAt || Date.now())
    };
  };

  // Get the template for this resume
  const template = getTemplateById(resume.templateId || 'modern-creative-1') || resumeTemplates[0];
  const resumeForTemplate = convertToResumeFormat(resume);

  return (
    <div className="w-full h-full" style={{ margin: 0, padding: 0 }}>
      <TemplateRenderer 
        resume={resumeForTemplate} 
        template={template} 
        isPreview={true} 
      />
    </div>
  );
}

// Resume Card Component
interface ResumeCardProps {
  resume: ResumeData;
  viewMode: ViewMode;
  actionLoading: string | null;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onPrint: () => void;
}

function ResumeCard({ resume, viewMode, actionLoading, onPreview, onEdit, onDelete, onDuplicate, onDownload, onShare, onPrint }: ResumeCardProps) {
  const [pdfInfo, setPdfInfo] = useState<{hasSavedPDF: boolean; isOptimized?: boolean} | null>(null);
  const resumeId = convertObjectIdToString(resume._id);

  useEffect(() => {
    // Check if resume has saved PDF
    if (resumeId) {
      resumeService.getSavedPDFInfo(resumeId)
        .then(info => setPdfInfo(info))
        .catch(error => {
          console.log('PDF info not available:', error);
          setPdfInfo({ hasSavedPDF: false });
        });
    }
  }, [resumeId]);

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        className="card-dark rounded-lg shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 xs:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-12 xs:w-12 xs:h-16 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <DocumentTextIcon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base xs:text-lg font-semibold text-dark-text-primary truncate">{resume.title}</h3>
              <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
                Updated {formatDate(resume.updatedAt || resume.createdAt)}
              </p>
            </div>
          </div>
          
          <DocumentActions
            onPreview={onPreview}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -6, scale: 1.02 }}
      className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 group border border-dark-border/50 hover:border-teal-500/50 w-full max-w-sm mx-auto"
    >
      {/* Resume Preview */}
      <div className="relative overflow-hidden w-full h-96 rounded-t-xl" style={{ margin: 0, padding: 0 }}>
        <ResumePreviewThumbnail resume={resume} />
        
        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
          <button
            onClick={onPreview}
            className="p-4 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Preview"
          >
            <EyeIcon className="w-7 h-7" />
          </button>
          <button
            onClick={onEdit}
            className="p-4 bg-teal-500/80 hover:bg-teal-500 rounded-full backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Edit"
          >
            <PencilIcon className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Resume Info Section */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-dark-text-primary group-hover:text-teal-400 transition-colors truncate flex-1">
            {resume.title}
          </h3>
          {pdfInfo?.hasSavedPDF && (
            <div className="flex items-center ml-2 flex-shrink-0">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-glow-sm" title="PDF Saved"></div>
              {pdfInfo.isOptimized && (
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full shadow-glow-sm ml-1.5" title="Job Optimized"></div>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-dark-text-secondary mb-4">
          Updated {formatDate(resume.updatedAt || resume.createdAt)}
          {pdfInfo?.hasSavedPDF && (
            <span className="text-green-400 ml-2">• PDF Saved</span>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-dark-border/30">
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              disabled={actionLoading === `download-${resume._id}`}
              className="p-2 text-dark-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onPrint}
              className="p-2 text-dark-text-muted hover:text-gray-400 hover:bg-gray-500/10 rounded-lg transition-all duration-200"
              title="Print Resume"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onShare}
              disabled={actionLoading === `share-${resumeId}`}
              className="p-2 text-dark-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Share Resume"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={onDelete}
            className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Cover Letter Preview Thumbnail Component
interface CoverLetterPreviewThumbnailProps {
  coverLetter: CoverLetterData;
}

function CoverLetterPreviewThumbnail({ coverLetter }: CoverLetterPreviewThumbnailProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return new Date().toLocaleDateString();
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full h-full transform scale-100 origin-top-left overflow-hidden">
      <div className="bg-white text-xs leading-tight h-full">
        {/* AI-Generated Content Preview - Full Content Display */}
        <div className="text-gray-800 text-justify h-full overflow-hidden leading-relaxed text-xs p-2" style={{ margin: 0 }}>
          {coverLetter.content ? (
            <div className="whitespace-pre-wrap overflow-hidden" style={{ margin: 0, padding: 0 }}>
              {coverLetter.content.length > 800 ? coverLetter.content.substring(0, 800) + '...' : coverLetter.content}
            </div>
          ) : (
            <div className="text-gray-400 italic text-center flex items-center justify-center h-full">
              <div>
                <div className="text-lg">📄</div>
                <div>AI Cover Letter</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Cover Letter Card Component
interface CoverLetterCardProps {
  coverLetter: CoverLetterData;
  viewMode: ViewMode;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onDownload: () => void;
}

function CoverLetterCard({ coverLetter, viewMode, onView, onEdit, onDelete, onShare, onDownload }: CoverLetterCardProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        className="card-dark rounded-lg p-3 xs:p-4 shadow-dark-lg hover:shadow-glow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 xs:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-12 xs:w-12 xs:h-16 bg-gradient-to-br from-accent-secondary to-accent-tertiary rounded-lg flex items-center justify-center shadow-glow-sm flex-shrink-0">
              <PencilIcon className="w-5 h-5 xs:w-6 xs:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base xs:text-lg font-semibold text-dark-text-primary truncate">{coverLetter.title}</h3>
              <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
                {coverLetter.jobTitle} at {coverLetter.companyName}
              </p>
              <p className="text-xs text-dark-text-muted truncate">
                Updated {formatDate(coverLetter.updatedAt || coverLetter.createdAt)}
              </p>
            </div>
          </div>
          
          <DocumentActions
            onPreview={onEdit}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            hidePreview
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="card-dark rounded-lg xs:rounded-xl shadow-dark-lg hover:shadow-glow-md transition-all duration-300 group max-w-sm mx-auto"
    >
      {/* Cover Letter Preview - Responsive PDF Size */}
      <div className="relative mb-3 flex justify-center">
        <div className="bg-white rounded-t-lg overflow-hidden shadow-2xl border border-gray-300 w-full h-96 max-w-[400px]">
          <CoverLetterPreviewThumbnail coverLetter={coverLetter} />
        </div>
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-3">
          <button
            onClick={onView}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all duration-200"
            title="View Full Cover Letter"
          >
            <EyeIcon className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={onEdit}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all duration-200"
            title="Edit Cover Letter"
          >
            <PencilIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Cover Letter Info */}
      <div className="p-4">
        <div className="space-y-1">
          <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-dark-text-primary group-hover:text-accent-primary transition-colors truncate">
            {coverLetter.title}
          </h3>
          <p className="text-xs xs:text-sm text-dark-text-secondary truncate">
            {coverLetter.jobTitle} at {coverLetter.companyName}
          </p>
          <p className="text-xs text-dark-text-muted">
            Updated {formatDate(coverLetter.updatedAt || coverLetter.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-2 xs:mt-3 pt-2 xs:pt-3 border-t border-dark-border flex items-center justify-between">
          <div className="flex items-center space-x-1 xs:space-x-2">
            <button
              onClick={onDownload}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onShare}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
              title="Share Cover Letter"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onDelete}
            className="p-1.5 xs:p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors touch-target"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}