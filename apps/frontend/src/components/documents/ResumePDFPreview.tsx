import React, { useState, useEffect } from 'react';
import { createFileName } from '../../utils/validation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  DocumentTextIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { resumeService, ResumeData } from '../../services/resumeService';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import TemplateRenderer from '../resume/TemplateRenderer';
import { Resume } from '../../types';

interface ResumePDFPreviewProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function ResumePDFPreview({
  resumeId,
  isOpen,
  onClose,
  onEdit,
}: ResumePDFPreviewProps) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen && resumeId) {
      loadResume();
    }
  }, [isOpen, resumeId]);

  // Cleanup toasts when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Dismiss any lingering toasts when modal closes
      toast.dismiss();
    }
  }, [isOpen]);

  const loadResume = async () => {
    try {
      setLoading(true);
      const response = await resumeService.getResume(resumeId);
      if (response.success && response.data) {
        setResume(response.data);
      } else {
        toast.error('Failed to load resume');
        onClose();
      }
    } catch (error) {
      console.error('Failed to load resume:', error);
      toast.error('Failed to load resume');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resume) {
      toast.error('No resume data available for download');
      return;
    }

    if (!resume.personalInfo?.firstName || !resume.personalInfo?.lastName) {
      toast.error('Cannot download: Resume is missing required personal information');
      return;
    }

    const loadingToast = toast.loading('🏢 Enterprise PDF generation in progress...');
    
    try {
      console.log('🚀 Starting enterprise server-side PDF generation from preview...', resumeId);
      
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
      
      // Dismiss loading toast and show single success message
      toast.dismiss(loadingToast);
      toast.success(`🎉 Enterprise PDF downloaded successfully! File: ${fileName}`, {
        duration: 3000
      });
      
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
      
      // Fallback info
      console.log('🔄 Enterprise server-side generation failed, no fallback in preview');
      setTimeout(() => {
        toast.info('🛠️ Please try downloading from the Document Manager for fallback options.', {
          duration: 4000
        });
      }, 1000);
    }
  };

  const handleShare = async () => {
    if (!resume) {
      toast.error('No resume data available for sharing');
      return;
    }

    if (!resume.title) {
      toast.error('Cannot share: Resume title is missing');
      return;
    }

    try {
      // Generate secure shareable link with expiration
      const shareUrl = `${window.location.origin}/shared/resume/${resumeId}?token=${generateSecureToken()}`;
      const personalName = `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim();
      
      // Enterprise-grade sharing modal with dark glassy theme
      const createEnterpriseShareModal = () => {
        const shareModal = document.createElement('div');
        shareModal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-xl';
        shareModal.innerHTML = `
          <div class="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg mx-4 overflow-hidden border border-gray-700/50 shadow-2xl">
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 border-b border-gray-700/30">
              <h3 class="text-xl font-bold text-white">📤 Share Resume</h3>
              <p class="text-white/80 text-sm mt-1">${resume.title} - ${personalName}</p>
            </div>
            
            <div class="p-6 space-y-4">
              <!-- Link Section -->
              <div class="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/30">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-semibold text-gray-100">🔗 Shareable Link</label>
                  <button onclick="copyLink('${shareUrl}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                    Copy Link
                  </button>
                </div>
                <input type="text" value="${shareUrl}" readonly class="w-full text-xs bg-gray-700/50 border border-gray-600/50 rounded px-3 py-2 text-gray-300 backdrop-blur-sm" />
                <p class="text-xs text-gray-400 mt-1">🔒 Link expires in 30 days</p>
              </div>

              <!-- Professional Platforms -->
              <div class="space-y-3">
                <h4 class="font-semibold text-gray-100">📋 Professional Platforms</h4>
                <div class="grid grid-cols-2 gap-3">
                  <button onclick="shareToLinkedIn('${encodeURIComponent(shareUrl)}', '${encodeURIComponent(resume.title)}', '${encodeURIComponent(personalName)}')" 
                          class="flex items-center p-3 bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg hover:bg-blue-500/10 hover:border-blue-400/30 transition-all group">
                    <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3 shadow-lg group-hover:shadow-blue-500/25 transition-all">
                      <span class="text-white font-bold text-xs">in</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-sm text-gray-100 group-hover:text-blue-400 transition-colors">LinkedIn</div>
                      <div class="text-xs text-gray-400">Professional network</div>
                    </div>
                  </button>
                  
                  <button onclick="shareViaEmail('${encodeURIComponent(shareUrl)}', '${encodeURIComponent(resume.title)}', '${encodeURIComponent(personalName)}')" 
                          class="flex items-center p-3 bg-gray-800/20 backdrop-blur-sm border border-gray-700/30 rounded-lg hover:bg-green-500/10 hover:border-green-400/30 transition-all group">
                    <div class="w-8 h-8 bg-green-600 rounded flex items-center justify-center mr-3 shadow-lg group-hover:shadow-green-500/25 transition-all">
                      <span class="text-white font-bold text-xs">✉</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-sm text-gray-100 group-hover:text-green-400 transition-colors">Email</div>
                      <div class="text-xs text-gray-400">Direct to inbox</div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Analytics & Control -->
              <div class="bg-blue-500/10 backdrop-blur-sm p-4 rounded-lg border border-blue-400/20">
                <h4 class="font-semibold text-blue-400 mb-2">📊 Enterprise Features</h4>
                <div class="space-y-2 text-sm text-gray-300">
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-400 rounded-full mr-2 shadow-lg"></span>
                    View tracking enabled
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-blue-400 rounded-full mr-2 shadow-lg"></span>
                    Download analytics available
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-purple-400 rounded-full mr-2 shadow-lg"></span>
                    Automatic expiration in 30 days
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-4 border-t border-gray-700/30">
                <button onclick="this.closest('.fixed').remove()" 
                        class="flex-1 px-4 py-2 bg-gray-700/30 backdrop-blur-sm border border-gray-600/50 rounded-lg hover:bg-gray-600/50 font-medium text-gray-100 transition-all">
                  Cancel
                </button>
                <button onclick="copyAndClose('${shareUrl}', this)" 
                        class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 font-medium shadow-lg hover:shadow-xl transition-all">
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

  const handlePrint = () => {
    if (!resume) {
      toast.error('No resume data available for printing');
      return;
    }

    try {
      // Get template for consistent styling
      const template = getTemplateById(resume.templateId || 'modern-creative-1') || resumeTemplates[0];
      
      // Get the resume preview element
      const element = document.querySelector('[data-resume-preview]');
      if (element) {
        // Create print-optimized content
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${resume.title || 'Resume'} - Print</title>
            <meta charset="UTF-8">
            <style>
              * { box-sizing: border-box; }
              body { 
                font-family: Arial, sans-serif;
                margin: 0.5in;
                padding: 0;
                background: white;
                color: #333;
                line-height: 1.4;
                font-size: 12px;
              }
              @media print { 
                body { margin: 0.5in; }
                @page { margin: 0.5in; size: letter; }
              }
              h1, h2, h3 { margin-top: 0; margin-bottom: 0.5em; }
              p { margin: 0 0 0.5em 0; }
              .no-print { display: none !important; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
          </html>
        `;
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          
          // Wait for content to load then print
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          }, 500);
          
          toast.success('🖨️ Print dialog opened!');
        } else {
          throw new Error('Failed to open print window');
        }
      } else {
        throw new Error('Resume preview element not found');
      }
      
    } catch (error) {
      console.error('Print error:', error);
      // Fallback to regular print
      window.print();
      toast.info('Using browser print dialog...');
    }
  };

  const handleDuplicate = async () => {
    if (!resume) {
      toast.error('No resume data available for duplication');
      return;
    }

    const loadingToast = toast.loading('📋 Duplicating resume...');
    
    try {
      const duplicateData = {
        ...resume,
        title: `${resume.title} (Copy)`,
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const response = await resumeService.createResume(duplicateData);
      if (response.success && response.data) {
        toast.dismiss(loadingToast);
        toast.success('🎉 Resume duplicated successfully!', {
          duration: 3000
        });
        
        // Close preview after a short delay
        setTimeout(() => {
          onClose();
          // Trigger a refresh of the parent component if available
          if (window.location.pathname.includes('/dashboard/documents')) {
            window.location.reload();
          }
        }, 1000);
      } else {
        throw new Error(response.message || 'Failed to duplicate resume');
      }
    } catch (error: any) {
      console.error('Duplicate error:', error);
      toast.dismiss(loadingToast);
      
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.message;
        
        if (status === 401) {
          toast.error('🔐 Authentication required. Please log in to duplicate resumes.');
        } else if (status >= 500) {
          toast.error('🏢 Server error. Please try again shortly.');
        } else {
          toast.error(`❌ Duplication failed: ${errorMessage}`);
        }
      } else {
        toast.error('❌ Failed to duplicate resume. Please try again.');
      }
    }
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const showCloudSaveOptions = (htmlContent: string, filename: string) => {
    // Create cloud save options modal
    const cloudModal = document.createElement('div');
    cloudModal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/50';
    cloudModal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h3 class="text-lg font-semibold mb-4 text-gray-900">💾 Save to Cloud</h3>
        <p class="text-sm text-gray-600 mb-4">Want to save your resume to the cloud for easy access?</p>
        <div class="space-y-3">
          <button onclick="saveToGoogleDrive('${encodeURIComponent(htmlContent)}', '${filename}')" class="w-full p-3 text-left hover:bg-gray-100 rounded flex items-center border">
            <div class="w-8 h-8 mr-3 bg-blue-500 rounded flex items-center justify-center text-white font-bold">G</div>
            <div>
              <div class="font-medium">Google Drive</div>
              <div class="text-sm text-gray-500">Save to your Google Drive</div>
            </div>
          </button>
          <button onclick="saveToOneDrive('${encodeURIComponent(htmlContent)}', '${filename}')" class="w-full p-3 text-left hover:bg-gray-100 rounded flex items-center border">
            <div class="w-8 h-8 mr-3 bg-blue-600 rounded flex items-center justify-center text-white font-bold">M</div>
            <div>
              <div class="font-medium">OneDrive</div>
              <div class="text-sm text-gray-500">Save to Microsoft OneDrive</div>
            </div>
          </button>
          <button onclick="saveToDropbox('${encodeURIComponent(htmlContent)}', '${filename}')" class="w-full p-3 text-left hover:bg-gray-100 rounded flex items-center border">
            <div class="w-8 h-8 mr-3 bg-blue-700 rounded flex items-center justify-center text-white font-bold">D</div>
            <div>
              <div class="font-medium">Dropbox</div>
              <div class="text-sm text-gray-500">Save to your Dropbox</div>
            </div>
          </button>
        </div>
        <div class="mt-4 flex gap-2">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
            Maybe Later
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            I'll Print to PDF
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(cloudModal);
    
    // Add global functions for cloud saving
    (window as any).saveToGoogleDrive = (content: string, filename: string) => {
      const decodedContent = decodeURIComponent(content);
      const blob = new Blob([decodedContent], { type: 'text/html' });
      const url = `https://drive.google.com/drive/u/0/my-drive`;
      window.open(url, '_blank');
      toast.success('Opening Google Drive! Upload the downloaded HTML file there.');
      cloudModal.remove();
    };
    
    (window as any).saveToOneDrive = (content: string, filename: string) => {
      const url = `https://onedrive.live.com/?authkey=&id=root&cid=`;
      window.open(url, '_blank');
      toast.success('Opening OneDrive! Upload the downloaded HTML file there.');
      cloudModal.remove();
    };
    
    (window as any).saveToDropbox = (content: string, filename: string) => {
      const url = `https://www.dropbox.com/home`;
      window.open(url, '_blank');
      toast.success('Opening Dropbox! Upload the downloaded HTML file there.');
      cloudModal.remove();
    };
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (cloudModal.parentElement) {
        cloudModal.remove();
      }
    }, 15000);
  };

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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className={`relative w-full h-full flex flex-col ${
            isFullscreen ? '' : 'max-w-6xl mx-auto mt-4 mb-4 rounded-2xl overflow-hidden'
          }`}
        >
          <div className="bg-dark-secondary/95 backdrop-blur-xl border border-dark-border/50 shadow-2xl h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border/50">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-6 h-6 text-accent-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">
                    {loading ? 'Loading...' : resume?.title || 'Resume Preview'}
                  </h2>
                  <p className="text-sm text-dark-text-secondary">
                    PDF-like preview with responsive design
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Zoom Controls */}
                <div className="flex items-center space-x-1 bg-dark-tertiary/50 rounded-lg p-1">
                  <button
                    onClick={() => adjustZoom(-10)}
                    disabled={zoomLevel <= 50}
                    className="p-1 text-dark-text-muted hover:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom Out"
                  >
                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-dark-text-secondary px-2 min-w-[3rem] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => adjustZoom(10)}
                    disabled={zoomLevel >= 200}
                    className="p-1 text-dark-text-muted hover:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Zoom In"
                  >
                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-tertiary/50 transition-all duration-200"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <ArrowsPointingOutIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePrint}
                  className="p-2 text-dark-text-muted hover:text-gray-400 hover:bg-gray-500/10 rounded-lg transition-all duration-200"
                  title="Print Resume"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handleDownload}
                  className="p-2 text-dark-text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all duration-200"
                  title="Enterprise PDF Download"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 text-dark-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-200"
                  title="Enterprise Share"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handleDuplicate}
                  className="p-2 text-dark-text-muted hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all duration-200"
                  title="Duplicate Resume"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={onEdit}
                  className="btn-primary-dark px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-dark-text-muted hover:text-dark-text-primary rounded-lg hover:bg-dark-tertiary/50 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center space-x-3">
                    <div className="spinner-dark"></div>
                    <span className="text-dark-text-primary font-medium">Loading resume...</span>
                  </div>
                </div>
              ) : resume ? (
                <div className="flex justify-center">
                  <div data-resume-preview>
                    <ResumePreviewPage 
                      resume={resume} 
                      zoomLevel={zoomLevel}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <DocumentTextIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-dark-text-primary mb-2">
                      Resume not found
                    </h3>
                    <p className="text-dark-text-secondary">
                      The requested resume could not be loaded.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Resume Preview Page Component
interface ResumePreviewPageProps {
  resume: ResumeData;
  zoomLevel: number;
}

function ResumePreviewPage({ resume, zoomLevel }: ResumePreviewPageProps) {
  const scale = zoomLevel / 100;
  
  // Import template system for consistent rendering
  const template = getTemplateById(resume.templateId || 'modern-creative-1') || resumeTemplates[0];
  
  // Convert ResumeData to Resume format for proper template rendering
  const convertToResumeFormat = (resumeData: ResumeData): Resume => {
    return {
      _id: resumeData._id || 'preview',
      template: resumeData.templateId || 'modern-creative-1',
      personalInfo: {
        firstName: resumeData.personalInfo?.firstName || '',
        lastName: resumeData.personalInfo?.lastName || '',
        email: resumeData.personalInfo?.email || '',
        phone: resumeData.personalInfo?.phone || '',
        location: resumeData.personalInfo?.location || '',
        linkedinUrl: resumeData.personalInfo?.linkedinUrl,
        portfolioUrl: resumeData.personalInfo?.portfolioUrl,
        githubUrl: resumeData.personalInfo?.githubUrl
      },
      professionalSummary: resumeData.professionalSummary || '',
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
        level: 5,
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
        proficiency: 'fluent' as const
      })) || [],
      volunteerExperience: [],
      awards: [],
      hobbies: [],
      createdAt: resumeData.createdAt || new Date().toISOString(),
      updatedAt: resumeData.updatedAt || new Date().toISOString()
    };
  };

  const resumeForTemplate = convertToResumeFormat(resume);

  return (
    <div 
      className="bg-white shadow-2xl transition-transform duration-300"
      style={{ 
        width: `${8.5 * 96 * scale}px`, // 8.5 inches at 96 DPI
        minHeight: `${11 * 96 * scale}px`, // 11 inches at 96 DPI
        transform: `scale(1)`,
      }}
    >
      {/* Use TemplateRenderer for consistency */}
      <div className="w-full h-full" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <TemplateRenderer 
          resume={resumeForTemplate} 
          template={template} 
          isPreview={true}
        />
      </div>
    </div>
  );
}

// Fallback rendering for when TemplateRenderer is not available
function FallbackResumePreviewPage({ resume, zoomLevel }: ResumePreviewPageProps) {
  const scale = zoomLevel / 100;

  return (
    <div 
      className="bg-white shadow-2xl transition-transform duration-300"
      style={{ 
        width: `${8.5 * 96 * scale}px`, // 8.5 inches at 96 DPI
        minHeight: `${11 * 96 * scale}px`, // 11 inches at 96 DPI
        transform: `scale(1)`,
      }}
    >
      <div className="p-8" style={{ fontSize: `${14 * scale}px` }}>
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {resume.personalInfo?.firstName} {resume.personalInfo?.lastName}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-600">
            {resume.personalInfo?.email && (
              <span>{resume.personalInfo.email}</span>
            )}
            {resume.personalInfo?.phone && (
              <span>{resume.personalInfo.phone}</span>
            )}
            {resume.personalInfo?.location && (
              <span>{resume.personalInfo.location}</span>
            )}
            {resume.personalInfo?.linkedinUrl && (
              <span>{resume.personalInfo.linkedinUrl}</span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {resume.professionalSummary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {resume.professionalSummary}
            </p>
          </div>
        )}

        {/* Work Experience */}
        {resume.workExperience && resume.workExperience.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              Work Experience
            </h2>
            <div className="space-y-4">
              {resume.workExperience.map((job, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.jobTitle}
                      </h3>
                      <p className="text-gray-700 font-medium">
                        {job.company} • {job.location}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {job.startDate} - {job.isCurrentJob ? 'Present' : job.endDate}
                    </p>
                  </div>
                  {job.responsibilities && job.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                      {job.responsibilities.map((resp, idx) => (
                        <li key={idx}>{resp}</li>
                      ))}
                    </ul>
                  )}
                  {job.achievements && job.achievements.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4 mt-2">
                      {job.achievements.map((ach, idx) => (
                        <li key={idx} className="font-medium">{ach}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              Education
            </h2>
            <div className="space-y-3">
              {resume.education.map((edu, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {edu.degree} in {edu.fieldOfStudy}
                    </h3>
                    <p className="text-gray-700">{edu.institution}</p>
                    {edu.gpa && (
                      <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              Skills
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {['technical', 'soft', 'language', 'certification'].map(category => {
                const categorySkills = resume.skills?.filter(skill => skill.category === category) || [];
                if (categorySkills.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h3 className="font-semibold text-gray-900 mb-2 capitalize">
                      {category === 'technical' ? 'Technical Skills' : 
                       category === 'soft' ? 'Soft Skills' :
                       category === 'language' ? 'Languages' : 'Certifications'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categorySkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded border"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects */}
        {resume.projects && resume.projects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
              Projects
            </h2>
            <div className="space-y-4">
              {resume.projects.map((project, index) => (
                <div key={index}>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {project.name}
                    {project.url && (
                      <span className="text-sm text-blue-600 ml-2">
                        ({project.url})
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-700 mb-2">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}