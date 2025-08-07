import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  DocumentTextIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { resumeService, ResumeData } from '../../services/resumeService';
import { toast } from 'sonner';

interface ResumePDFPreviewProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function ResumePDFPreviewSimple({
  resumeId,
  isOpen,
  onClose,
  onEdit,
}: ResumePDFPreviewProps) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (isOpen && resumeId) {
      loadResume();
    }
  }, [isOpen, resumeId]);

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  const loadResume = async () => {
    try {
      setLoading(true);
      setPdfError(false);
      
      const response = await resumeService.getResume(resumeId);
      if (response.success && response.data) {
        setResume(response.data);
        // Generate PDF using the same method as the working thumbnail
        await generatePDFPreview(response.data);
      } else {
        toast.error('Failed to load resume');
        onClose();
      }
    } catch (error) {
      console.error('Failed to load resume:', error);
      toast.error('Failed to load resume');
      onClose();
    }
  };

  const generatePDFPreview = async (resumeData: ResumeData) => {
    try {
      // Use the exact same method as the working thumbnail preview
      const pdfBlob = await resumeService.downloadResumeWithEngine(resumeData, 'pdf', {
        engine: 'latex',
        templateId: resumeData.template || resumeData.templateId || 'template01'
      });

      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Failed to generate PDF preview:', error);
      setPdfError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl || !resume) return;

    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${resume.personalInfo?.firstName || 'Resume'}_${resume.personalInfo?.lastName || 'PDF'}.pdf`;
      link.click();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleShare = async () => {
    if (!pdfUrl || !resume) return;

    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], `${resume.personalInfo?.firstName || 'Resume'}_${resume.personalInfo?.lastName || 'PDF'}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Resume',
          text: `Here is the resume for ${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim(),
          files: [file],
        });
        toast.success('Shared successfully!');
      } else {
        toast.error('Sharing not supported on this browser.');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share PDF.');
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 100);
      };
      toast.success('Print dialog opened.');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print dialog.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full h-full flex flex-col"
        >
          <div className="bg-dark-secondary/95 backdrop-blur-xl h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border/50">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-6 h-6 text-accent-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-dark-text-primary">
                    {resume ? `${resume.personalInfo?.firstName || ''} ${resume.personalInfo?.lastName || ''}`.trim() : 'Resume Preview'}
                  </h3>
                  <p className="text-sm text-dark-text-secondary">
                    Document Preview
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
                  onClick={handleDownload}
                  className="p-2 text-dark-text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all duration-200"
                  title="Download PDF"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 text-dark-text-muted hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all duration-200"
                  title="Share"
                >
                  <ShareIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePrint}
                  className="p-2 text-dark-text-muted hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all duration-200"
                  title="Print"
                >
                  <PrinterIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={onEdit}
                  className="p-2 text-dark-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                  title="Edit Resume"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="spinner-dark"></div>
                    <span className="text-dark-text-primary font-medium">Loading resume...</span>
                  </div>
                </div>
              ) : resume ? (
                <div className="w-full h-full overflow-auto bg-gray-50">
                  <div className="w-full min-h-full flex justify-center items-start p-4 pb-8">
                    <div 
                      className="relative bg-white shadow-lg"
                      style={{ 
                        width: `${zoomLevel}%`, 
                        minWidth: '600px',
                        maxWidth: '1200px',
                        aspectRatio: '8.5/11'
                      }}
                    >
                      {pdfError ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center">
                            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Failed to load PDF preview</p>
                            <button
                              onClick={() => generatePDFPreview(resume)}
                              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      ) : pdfUrl ? (
                        <embed
                          src={pdfUrl}
                          type="application/pdf"
                          className="w-full h-full rounded-lg"
                          style={{
                            border: 'none',
                            background: 'white'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center">
                            <div className="spinner-dark mb-4"></div>
                            <p className="text-gray-600">Generating PDF...</p>
                          </div>
                        </div>
                      )}
                    </div>
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