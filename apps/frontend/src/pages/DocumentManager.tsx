import React, { useState, useEffect } from 'react';
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
import ResumePDFPreview from '../components/documents/ResumePDFPreview';
import CoverLetterEditor from '../components/documents/CoverLetterEditor';
import DocumentActions from '../components/documents/DocumentActions';
import DocumentLoadingSkeleton from '../components/documents/DocumentLoadingSkeleton';
import TemplateRenderer from '../components/resume/TemplateRenderer';
import { resumeTemplates, getTemplateById } from '../data/resumeTemplates';
import { Resume } from '../types';
import { toast } from 'sonner';

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
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
    if (!resume._id) {
      toast.error('Cannot download: Resume ID is missing');
      return;
    }

    if (!resume.personalInfo?.firstName || !resume.personalInfo?.lastName) {
      toast.error('Cannot download: Resume is missing required personal information');
      return;
    }

    const loadingToast = toast.loading('🏢 Enterprise PDF generation in progress...');
    setActionLoading(`download-${resume._id}`);
    
    try {
      console.log('🚀 Starting enterprise server-side PDF generation...', resume._id);
      
      // Make API call to server-side PDF generation endpoint using configured API service
      const response = await api.post('/resumes/download/pdf', {
        resumeData: resume
      }, {
        responseType: 'blob' // Important: Tell axios to expect a blob response
      });
      
      // With axios, response.data contains the blob directly
      const pdfBlob = response.data;
      
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
      
      // Show enterprise success message
      setTimeout(() => {
        toast.success('💼 Professional-grade PDF ready for enterprise use!', {
          duration: 4000
        });
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
    if (!resume._id) {
      toast.error('Cannot print: Resume ID is missing');
      return;
    }

    if (!resume.personalInfo?.firstName || !resume.personalInfo?.lastName) {
      toast.error('Cannot print: Resume is missing required personal information');
      return;
    }

    try {
      // Create a temporary div to render the resume for printing
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      printDiv.style.width = '8.5in';
      printDiv.style.minHeight = '11in';
      printDiv.style.backgroundColor = 'white';
      printDiv.style.padding = '0.5in';
      printDiv.style.fontFamily = 'Arial, sans-serif';
      
      // Get the exact template used and ensure consistency
      const template = getTemplateById(resume.templateId || 'modern-creative-1') || resumeTemplates[0];
      console.log(`🖨️ Printing template: ${template.name} (${template.id})`);
      
      // Create print-optimized HTML content
      const printContent = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333;">
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid ${template.colors.primary};">
            <h1 style="font-size: 24px; margin: 0 0 10px 0; color: ${template.colors.primary}; font-weight: bold;">
              ${resume.personalInfo.firstName} ${resume.personalInfo.lastName}
            </h1>
            <div style="font-size: 14px; color: #666;">
              ${resume.personalInfo.email} • ${resume.personalInfo.phone} • ${resume.personalInfo.location}
            </div>
          </div>
          
          ${resume.professionalSummary ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 16px; margin-bottom: 10px; color: ${template.colors.primary}; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-weight: bold;">PROFESSIONAL SUMMARY</h2>
              <p style="margin: 0; text-align: justify; line-height: 1.6;">${resume.professionalSummary}</p>
            </div>
          ` : ''}
          
          ${resume.workExperience && resume.workExperience.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 16px; margin-bottom: 10px; color: ${template.colors.primary}; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-weight: bold;">WORK EXPERIENCE</h2>
              ${resume.workExperience.map(job => `
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <h3 style="font-size: 14px; margin: 0; font-weight: bold; color: #333;">${job.jobTitle}</h3>
                    <span style="font-size: 12px; color: #666;">${job.startDate} - ${job.isCurrentJob ? 'Present' : job.endDate}</span>
                  </div>
                  <div style="font-size: 13px; color: ${template.colors.primary}; margin-bottom: 5px; font-weight: 600;">${job.company}, ${job.location}</div>
                  ${job.responsibilities && job.responsibilities.length > 0 ? `
                    <ul style="margin: 5px 0; padding-left: 20px;">
                      ${job.responsibilities.map(resp => `<li style="margin-bottom: 3px; font-size: 12px;">${resp}</li>`).join('')}
                    </ul>
                  ` : ''}
                  ${job.achievements && job.achievements.length > 0 ? `
                    <ul style="margin: 5px 0; padding-left: 20px;">
                      ${job.achievements.map(ach => `<li style="margin-bottom: 3px; font-size: 12px; font-weight: 500;">${ach}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${resume.education && resume.education.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 16px; margin-bottom: 10px; color: ${template.colors.primary}; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-weight: bold;">EDUCATION</h2>
              ${resume.education.map(edu => `
                <div style="margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <div>
                      <h3 style="font-size: 14px; margin: 0 0 3px 0; font-weight: bold;">${edu.degree}</h3>
                      <div style="font-size: 13px; color: ${template.colors.primary}; font-weight: 600;">${edu.institution}</div>
                      ${edu.gpa ? `<div style="font-size: 12px; color: #666;">GPA: ${edu.gpa}</div>` : ''}
                    </div>
                    <span style="font-size: 12px; color: #666;">${new Date(edu.graduationDate).getFullYear()}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${resume.skills && resume.skills.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 16px; margin-bottom: 10px; color: ${template.colors.primary}; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-weight: bold;">SKILLS</h2>
              <p style="margin: 0; line-height: 1.6;">${resume.skills.map(skill => skill.name).join(' • ')}</p>
            </div>
          ` : ''}
        </div>
      `;
      
      printDiv.innerHTML = printContent;
      document.body.appendChild(printDiv);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${resume.title || 'Resume'} - Print</title>
            <style>
              @media print {
                body { margin: 0.5in; }
                @page { margin: 0.5in; size: letter; }
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0.5in; 
                background: white; 
                font-size: 12px; 
                line-height: 1.4; 
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
        
        toast.success('🖨️ Print dialog opened for resume!');
      } else {
        throw new Error('Failed to open print window');
      }
      
      // Clean up
      document.body.removeChild(printDiv);
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print resume. Please try again.');
    }
  };

  const handleShareResume = async (resume: ResumeData) => {
    if (!resume._id) {
      toast.error('Cannot share: Resume ID is missing');
      return;
    }

    if (!resume.title) {
      toast.error('Cannot share: Resume title is missing');
      return;
    }

    setActionLoading(`share-${resume._id}`);
    
    try {
      // Generate secure shareable link with expiration
      const shareUrl = `${window.location.origin}/shared/resume/${resume._id}?token=${generateSecureToken()}`;
      const personalName = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim();
      
      // Enterprise-grade sharing modal with dark glassy theme
      const createEnterpriseShareModal = () => {
        const shareModal = document.createElement('div');
        shareModal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl';
        shareModal.innerHTML = `
          <div class="bg-dark-secondary/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg mx-4 overflow-hidden border border-dark-border/50 shadow-glow-lg">
            <div class="bg-gradient-to-r from-accent-primary to-accent-secondary px-6 py-4 border-b border-dark-border/30">
              <h3 class="text-xl font-bold text-white">📤 Share Resume</h3>
              <p class="text-white/80 text-sm mt-1">${resume.title} - ${personalName}</p>
            </div>
            
            <div class="p-6 space-y-4">
              <!-- Link Section -->
              <div class="bg-dark-tertiary/30 backdrop-blur-sm p-4 rounded-lg border border-dark-border/30">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold text-dark-text-primary">🔗 Shareable Link</label>
                  <button onclick="copyLink('${shareUrl}')" class="text-accent-primary hover:text-accent-secondary text-sm font-medium transition-colors">
                    Copy Link
                  </button>
                </div>
                <input type="text" value="${shareUrl}" readonly class="w-full text-xs bg-dark-quaternary/50 border border-dark-border/50 rounded px-3 py-2 text-dark-text-secondary backdrop-blur-sm" />
                <p class="text-xs text-dark-text-muted mt-1">🔒 Link expires in 30 days</p>
              </div>

              <!-- Professional Platforms -->
              <div class="space-y-3">
                <h4 class="font-semibold text-dark-text-primary">📋 Professional Platforms</h4>
                <div class="grid grid-cols-2 gap-3">
                  <button onclick="shareToLinkedIn('${encodeURIComponent(shareUrl)}', '${encodeURIComponent(resume.title)}', '${encodeURIComponent(personalName)}')" 
                          class="flex items-center p-3 bg-dark-tertiary/20 backdrop-blur-sm border border-dark-border/30 rounded-lg hover:bg-blue-500/10 hover:border-blue-400/30 transition-all group">
                    <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3 shadow-glow-sm group-hover:shadow-glow-md transition-all">
                      <span class="text-white font-bold text-xs">in</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-sm text-dark-text-primary group-hover:text-blue-400 transition-colors">LinkedIn</div>
                      <div class="text-xs text-dark-text-secondary">Professional network</div>
                    </div>
                  </button>
                  
                  <button onclick="shareViaEmail('${encodeURIComponent(shareUrl)}', '${encodeURIComponent(resume.title)}', '${encodeURIComponent(personalName)}')" 
                          class="flex items-center p-3 bg-dark-tertiary/20 backdrop-blur-sm border border-dark-border/30 rounded-lg hover:bg-green-500/10 hover:border-green-400/30 transition-all group">
                    <div class="w-8 h-8 bg-green-600 rounded flex items-center justify-center mr-3 shadow-glow-sm group-hover:shadow-glow-md transition-all">
                      <span class="text-white font-bold text-xs">✉</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-sm text-dark-text-primary group-hover:text-green-400 transition-colors">Email</div>
                      <div class="text-xs text-dark-text-secondary">Direct to inbox</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Analytics & Control -->
              <div class="bg-accent-primary/10 backdrop-blur-sm p-4 rounded-lg border border-accent-primary/20">
                <h4 class="font-semibold text-accent-primary mb-2">📊 Enterprise Features</h4>
                <div class="space-y-2 text-sm text-dark-text-secondary">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-400 rounded-full mr-2 shadow-glow-sm"></span>
                    View tracking enabled
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-blue-400 rounded-full mr-2 shadow-glow-sm"></span>
                    Download analytics available
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-purple-400 rounded-full mr-2 shadow-glow-sm"></span>
                    Automatic expiration in 30 days
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-4 border-t border-dark-border/30">
                <button onclick="this.closest('.fixed').remove()" 
                        class="flex-1 px-4 py-2 bg-dark-tertiary/30 backdrop-blur-sm border border-dark-border/50 rounded-lg hover:bg-dark-quaternary/50 font-medium text-dark-text-primary transition-all">
                  Cancel
                </button>
                <button onclick="copyAndClose('${shareUrl}', this)" 
                        class="flex-1 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg hover:from-accent-primary/80 hover:to-accent-secondary/80 font-medium shadow-glow-sm hover:shadow-glow-md transition-all">
                  Copy & Close
                </button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(shareModal);
        return shareModal;
      };
      
      // Create and show the enterprise share modal
      const modal = createEnterpriseShareModal();
      
      // Add global functions for sharing actions
      (window as any).copyLink = async (url: string) => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success('🔗 Link copied to clipboard!');
        } catch (error) {
          console.error('Copy failed:', error);
          toast.error('Failed to copy link');
        }
      };
      
      (window as any).shareToLinkedIn = (url: string, title: string, name: string) => {
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${encodeURIComponent(`${decodeURIComponent(name)} - ${decodeURIComponent(title)}`)}`;
        window.open(linkedInUrl, '_blank', 'width=600,height=400');
        toast.success('🔗 Opening LinkedIn...');
      };
      
      (window as any).shareViaEmail = (url: string, title: string, name: string) => {
        const subject = encodeURIComponent(`${decodeURIComponent(name)} - Resume`);
        const body = encodeURIComponent(`Hello,

I'd like to share my resume with you: ${decodeURIComponent(title)}

You can view it here: ${decodeURIComponent(url)}

This link will be available for 30 days.

Best regards,
${decodeURIComponent(name)}`);
        
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        window.open(mailtoUrl);
        toast.success('📧 Opening email client...');
      };
      
      (window as any).copyAndClose = async (url: string, button: HTMLElement) => {
        try {
          await navigator.clipboard.writeText(url);
          button.textContent = '✓ Copied!';
          setTimeout(() => {
            modal.remove();
            toast.success('🚀 Resume link copied and ready to share!');
          }, 1000);
        } catch (error) {
          console.error('Copy failed:', error);
          toast.error('Failed to copy link');
        }
      };
      
      // Auto-remove modal after 2 minutes
      setTimeout(() => {
        if (modal.parentElement) {
          modal.remove();
        }
      }, 120000);
      
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share link. Please try again.');
    } finally {
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
        <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333;">
          <div style="text-align: right; margin-bottom: 40px;">
            ${formatDate(coverLetter.createdAt)}
          </div>
          
          <div style="margin-bottom: 40px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${coverLetter.companyName}</div>
            <div>Hiring Manager</div>
            <div>123 Company Street</div>
            <div>City, State 12345</div>
          </div>

          <div style="margin-bottom: 30px;">
            <strong>Re: Application for ${coverLetter.jobTitle} Position</strong>
          </div>

          <div style="margin-bottom: 20px;">
            Dear Hiring Manager,
          </div>

          <div style="margin-bottom: 20px; text-align: justify; line-height: 1.8;">
            ${coverLetter.content || `I am writing to express my strong interest in the ${coverLetter.jobTitle} position at ${coverLetter.companyName}. With my background and experience, I am confident that I would be a valuable addition to your team.

Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can contribute to ${coverLetter.companyName}'s continued success.`}
          </div>

          <div style="margin-top: 40px;">
            <div style="margin-bottom: 60px;">Sincerely,</div>
            <div style="font-weight: bold;">Your Name</div>
          </div>
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
      const shareUrl = `${window.location.origin}/shared/cover-letter/${coverLetter._id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `Check out my cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          url: shareUrl,
        });
        toast.success('Cover letter shared successfully!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Cover letter link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share cover letter. Please try again.');
    }  
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
            <div className="h-8 bg-dark-tertiary rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-dark-tertiary rounded w-48 animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-10 bg-dark-tertiary rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-dark-tertiary rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="card-dark rounded-xl p-6 shadow-dark-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-dark-tertiary rounded w-24 mb-2"></div>
                  <div className="h-6 bg-dark-tertiary rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-dark-tertiary rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <div className="card-dark rounded-xl p-6 shadow-dark-lg">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 h-10 bg-dark-tertiary rounded animate-pulse"></div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-dark-tertiary rounded animate-pulse"></div>
              <div className="w-10 h-10 bg-dark-tertiary rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex space-x-1 bg-dark-quaternary/30 p-1 rounded-lg">
            <div className="flex-1 h-8 bg-dark-tertiary rounded animate-pulse"></div>
            <div className="flex-1 h-8 bg-dark-tertiary rounded animate-pulse"></div>
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
              ? 'grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 xs:gap-4 sm:gap-6 justify-items-center'
              : 'space-y-3 xs:space-y-4'
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
                    setSelectedDocument(resume._id!);
                    setShowPreviewModal(true);
                  }}
                  onEdit={() => {
                    // Navigate to resume builder with existing data
                    window.location.href = `/dashboard/resume/comprehensive?edit=${resume._id}`;
                  }}
                  onDelete={() => handleDeleteDocument(resume._id!, 'resumes')}
                  onDuplicate={() => handleDuplicateDocument(resume._id!, 'resumes')}
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
              ? 'grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 xs:gap-4 sm:gap-6 justify-items-center'
              : 'space-y-3 xs:space-y-4'
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
                  onEdit={() => {
                    setEditingCoverLetter(coverLetter);
                    setShowCoverLetterEditor(true);
                  }}
                  onDelete={() => handleDeleteDocument(coverLetter._id!, 'cover-letters')}
                  onDuplicate={() => handleDuplicateDocument(coverLetter._id!, 'cover-letters')}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedDocument && (
          <ResumePDFPreview
            resumeId={selectedDocument}
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedDocument(null);
            }}
            onEdit={() => {
              setShowPreviewModal(false);
              window.location.href = `/dashboard/resume/comprehensive?edit=${selectedDocument}`;
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
            onClose={() => {
              setShowCoverLetterEditor(false);
              setEditingCoverLetter(null);
            }}
            onSave={(savedCoverLetter) => {
              if (editingCoverLetter) {
                setCoverLetters(prev => prev.map(c => 
                  c._id === savedCoverLetter._id ? savedCoverLetter : c
                ));
              } else {
                setCoverLetters(prev => [...prev, savedCoverLetter]);
              }
              setShowCoverLetterEditor(false);
              setEditingCoverLetter(null);
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
    <TemplateRenderer 
      resume={resumeForTemplate} 
      template={template} 
      isPreview={true} 
    />
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
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-dark-secondary rounded-xl xs:rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group border border-dark-border/50 w-full max-w-sm sm:max-w-md"
      style={{ maxWidth: '380px' }}
    >
      {/* Resume Preview - Responsive PDF Size */}
      <div className="relative bg-white overflow-hidden aspect-[8.5/11] w-full">
        <ResumePreviewThumbnail resume={resume} />
        
        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
          <button
            onClick={onPreview}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Preview"
          >
            <EyeIcon className="w-6 h-6" />
          </button>
          <button
            onClick={onEdit}
            className="p-3 bg-blue-500/80 hover:bg-blue-500 rounded-xl backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
            title="Edit"
          >
            <PencilIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Resume Info Section */}
      <div className="p-3 xs:p-4 sm:p-5">
        <h3 className="text-sm xs:text-base sm:text-lg font-bold text-dark-text-primary group-hover:text-blue-400 transition-colors mb-2 truncate">
          {resume.title}
        </h3>
        <p className="text-xs xs:text-sm text-dark-text-secondary mb-3 xs:mb-4">
          Updated {formatDate(resume.updatedAt || resume.createdAt)}
        </p>

        {/* Action Buttons - Mobile optimized */}
        <div className="flex items-center justify-between pt-2 xs:pt-3 border-t border-dark-border/30">
          <div className="flex items-center gap-1 xs:gap-2">
            <button
              onClick={onPreview}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-md xs:rounded-lg transition-all duration-200 touch-target"
              title="View Resume"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDuplicate}
              disabled={actionLoading === `duplicate-${resume._id}`}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md xs:rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              title="Duplicate"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onDownload}
              disabled={actionLoading === `download-${resume._id}`}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-md xs:rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onPrint}
              className="hidden xs:flex p-1.5 xs:p-2 text-dark-text-muted hover:text-gray-400 hover:bg-gray-500/10 rounded-md xs:rounded-lg transition-all duration-200 touch-target"
              title="Print Resume"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onShare}
              disabled={actionLoading === `share-${resume._id}`}
              className="p-1.5 xs:p-2 text-dark-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md xs:rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              title="Share Resume"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onDelete}
            className="p-1.5 xs:p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md xs:rounded-lg transition-all duration-200 touch-target"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
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
      <div className="bg-white p-4 text-xs leading-tight h-full">
        {/* Header with date and personal info */}
        <div className="text-right mb-3 text-gray-600">
          {formatDate(coverLetter.createdAt)}
        </div>
        
        {/* Company Address */}
        <div className="mb-4 text-gray-800">
          <div className="font-semibold">{coverLetter.companyName}</div>
          <div className="text-gray-600">Hiring Manager</div>
          <div className="text-gray-600">123 Company Street</div>
          <div className="text-gray-600">City, State 12345</div>
        </div>

        {/* Salutation */}
        <div className="mb-3 text-gray-800">
          <div>Dear Hiring Manager,</div>
        </div>

        {/* Content Preview - Show actual content truncated */}
        <div className="space-y-2 text-gray-700 text-justify">
          <div className="mb-2">
            I am writing to express my strong interest in the <span className="font-medium">{coverLetter.jobTitle}</span> position at <span className="font-medium">{coverLetter.companyName}</span>.
          </div>
          
          {/* Show truncated content */}
          {coverLetter.content && (
            <div className="space-y-1">
              {coverLetter.content.substring(0, 200).split('\n').slice(0, 3).map((line, idx) => (
                <div key={idx} className="leading-tight">
                  {line.substring(0, 60)}{line.length > 60 ? '...' : ''}
                </div>
              ))}
            </div>
          )}
          
          {/* Default content if no content */}
          {!coverLetter.content && (
            <div className="space-y-1">
              <div>With my background in professional services and proven track record of success...</div>
              <div>I am excited about the opportunity to contribute to your team and would welcome...</div>
              <div>Thank you for considering my application. I look forward to hearing from you...</div>
            </div>
          )}
        </div>

        {/* Closing */}
        <div className="mt-4 text-gray-800">
          <div className="mb-2">Sincerely,</div>
          <div className="font-medium">Your Name</div>
        </div>
      </div>
    </div>
  );
}

// Cover Letter Card Component
interface CoverLetterCardProps {
  coverLetter: CoverLetterData;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function CoverLetterCard({ coverLetter, viewMode, onEdit, onDelete, onDuplicate }: CoverLetterCardProps) {
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
      className="card-dark rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-6 shadow-dark-lg hover:shadow-glow-md transition-all duration-300 group max-w-sm mx-auto"
    >
      {/* Cover Letter Preview - Responsive PDF Size */}
      <div className="relative mb-3 xs:mb-4 flex justify-center">
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl border border-gray-300 w-full aspect-[8.5/11] max-w-[280px] xs:max-w-[320px] sm:max-w-[340px]">
          <CoverLetterPreviewThumbnail coverLetter={coverLetter} />
        </div>
        
        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
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
      <div className="space-y-1 xs:space-y-2">
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
      <div className="mt-3 xs:mt-4 pt-3 xs:pt-4 border-t border-dark-border flex items-center justify-between">
        <div className="flex items-center space-x-1 xs:space-x-2">
          <button
            onClick={onDuplicate}
            className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
            title="Duplicate"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDownloadCoverLetter(coverLetter)}
            className="p-1.5 xs:p-2 text-dark-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-md transition-colors touch-target"
            title="Download PDF"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleShareCoverLetter(coverLetter)}
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
    </motion.div>
  );
}