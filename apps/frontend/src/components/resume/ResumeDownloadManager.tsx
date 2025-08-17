import React, { useState } from 'react';
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookmarkIcon,
  TrashIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { resumeService } from '../../services/resumeService';
import { useResume } from '../../contexts/ResumeContext';

interface ResumeDownloadManagerProps {
  resumeData: any;
  templateId?: string;
  isLatexTemplate?: boolean;
  optimizedLatexCode?: string;
  className?: string;
}

interface DownloadFormat {
  id: 'pdf';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  useCase: string;
  fileSize: string;
  compatibility: string;
}

export default function ResumeDownloadManager({ 
  resumeData, 
  templateId, 
  isLatexTemplate = false,
  optimizedLatexCode,
  className = '' 
}: ResumeDownloadManagerProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: 'success' | 'error' }>({});
  const [savingPdf, setSavingPdf] = useState(false);
  const [pdfSaveName, setPdfSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const { 
    aiData, 
    downloadPdf, 
    savePdfToLibrary, 
    deleteSavedPdf 
  } = useResume();

  const formats: DownloadFormat[] = [
    {
      id: 'pdf',
      name: isLatexTemplate ? 'LaTeX PDF Document' : 'PDF Document',
      description: optimizedLatexCode
        ? 'Job-optimized LaTeX PDF with AI-enhanced content and formatting'
        : isLatexTemplate 
          ? 'Professional LaTeX-compiled PDF with perfect typography and layout'
          : 'Industry standard format, best for email and online applications',
      icon: DocumentTextIcon,
      useCase: 'Email applications, online portals, printing',
      fileSize: isLatexTemplate ? '~400KB' : '~500KB',
      compatibility: optimizedLatexCode
        ? '🎯 Job-optimized content, Overleaf-quality output'
        : isLatexTemplate 
          ? 'Perfect formatting, Overleaf-quality output'
          : 'Universal compatibility, maintains formatting'
    }
  ];

  const handleDownload = async (format: 'pdf') => {
    try {
      setDownloadingFormat(format);
      setDownloadStatus(prev => ({ ...prev, [format]: undefined as any }));

      // For PDF format, check if we have a cached PDF first
      if (format === 'pdf' && aiData.cachedPdfUrl) {
        console.log('📄 Using cached PDF for download');
        downloadPdf();
        setDownloadStatus(prev => ({ ...prev, [format]: 'success' }));
        setTimeout(() => {
          setDownloadStatus(prev => ({ ...prev, [format]: undefined as any }));
        }, 3000);
        return;
      }

      // Add performance timing
      const startTime = performance.now();
      
      // Show immediate feedback for user experience
      const progressTimeout = setTimeout(() => {
        if (downloadingFormat === format) {
          console.log(`⏱️ Download taking longer than expected for ${format} format...`);
        }
      }, 2000);

      const blob = await resumeService.downloadResumeWithEngine(resumeData, format, {
        engine: isLatexTemplate ? 'latex' : 'html',
        templateId: templateId,
        optimizedLatexCode: optimizedLatexCode
      });
      
      clearTimeout(progressTimeout);
      const endTime = performance.now();
      console.log(`⚡ Download completed in ${(endTime - startTime).toFixed(0)}ms for ${format} format`);
      
      // Optimize filename generation with proper null checks
      const firstName = resumeData.personalInfo?.firstName || '';
      const lastName = resumeData.personalInfo?.lastName || '';
      const sanitizedFirstName = firstName ? firstName.replace(/[^\w\s-]/g, '').trim() : 'Resume';
      const sanitizedLastName = lastName ? lastName.replace(/[^\w\s-]/g, '').trim() : '';
      const fileName = `${sanitizedFirstName}${sanitizedLastName ? `_${sanitizedLastName}` : ''}_Resume.${format}`;
      
      // Use more efficient download approach
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // Append, click, and remove immediately for better performance
      document.body.appendChild(link);
      link.click();
      
      // Clean up asynchronously to avoid blocking UI
      requestAnimationFrame(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      setDownloadStatus(prev => ({ ...prev, [format]: 'success' }));
      
      // Clear success status after 3 seconds
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [format]: undefined as any }));
      }, 3000);

    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus(prev => ({ ...prev, [format]: 'error' }));
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [format]: undefined as any }));
      }, 5000);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleSavePdf = async () => {
    if (!aiData.cachedPdfUrl || !pdfSaveName.trim()) return;
    
    try {
      setSavingPdf(true);
      const pdfId = await savePdfToLibrary(pdfSaveName.trim());
      console.log('📄 PDF saved to library:', pdfId);
      setPdfSaveName('');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save PDF:', error);
    } finally {
      setSavingPdf(false);
    }
  };

  const handleDeleteSavedPdf = (pdfId: string) => {
    try {
      deleteSavedPdf(pdfId);
      console.log('📄 PDF deleted from library:', pdfId);
    } catch (error) {
      console.error('Failed to delete PDF:', error);
    }
  };

  const getButtonContent = (format: DownloadFormat) => {
    const isDownloading = downloadingFormat === format.id;
    const status = downloadStatus[format.id];

    if (isDownloading) {
      return (
        <>
          <ArrowDownTrayIcon className="w-4 h-4 mr-2 animate-bounce" />
          Downloading...
        </>
      );
    }

    if (status === 'success') {
      return (
        <>
          <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />
          Downloaded!
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-red-600" />
          Try Again
        </>
      );
    }

    return (
      <>
        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
        Download {format.name}
      </>
    );
  };

  const getButtonVariant = (format: DownloadFormat) => {
    const status = downloadStatus[format.id];
    
    if (status === 'success') return 'outline';
    if (status === 'error') return 'outline';
    if (format.id === 'pdf') return 'primary';
    return 'outline';
  };

  return (
    <div className={`space-y-6 animate-slide-up-soft ${className}`}>
      <div>
        <h3 className="text-lg font-semibold gradient-text-dark mb-2">Download Your Resume</h3>
        <p className="text-dark-text-secondary">
          Your professional PDF resume with AI-enhanced content and LaTeX formatting.
        </p>
      </div>

      <div className="grid md:grid-cols-1 gap-6 max-w-lg mx-auto">
        {formats.map((format) => {
          const IconComponent = format.icon;
          const status = downloadStatus[format.id];
          const isCachedPdf = format.id === 'pdf' && aiData.cachedPdfUrl;
          
          return (
            <Card 
              key={format.id} 
              className={`card-dark p-6 transition-all duration-200 hover:shadow-lg ${
                status === 'success' ? 'border-green-400/30 bg-green-500/10' :
                status === 'error' ? 'border-red-400/30 bg-red-500/10' : ''
              }`}
            >
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg mr-3 bg-red-500/20">
                  <IconComponent className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-dark-text-primary">{format.name}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-dark-text-muted">{format.fileSize}</p>
                    {isCachedPdf && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        Cached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-dark-text-secondary mb-4">{format.description}</p>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs font-medium text-dark-text-primary mb-1">Best for:</p>
                  <p className="text-xs text-dark-text-secondary">{format.useCase}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-dark-text-primary mb-1">Compatibility:</p>
                  <p className="text-xs text-dark-text-secondary">{format.compatibility}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleDownload(format.id)}
                  disabled={downloadingFormat !== null}
                  variant={getButtonVariant(format)}
                  size="sm"
                  className="w-full"
                >
                  {getButtonContent(format)}
                </Button>

                {format.id === 'pdf' && isCachedPdf && (
                  <Button
                    onClick={() => setShowSaveDialog(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <BookmarkIcon className="w-4 h-4 mr-2" />
                    Save to Library
                  </Button>
                )}
              </div>

              {format.id === 'pdf' && (
                <p className="text-xs text-dark-accent mt-2 text-center">
                  ⭐ Recommended for most applications
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Saved PDFs Library */}
      {aiData.savedPdfs && aiData.savedPdfs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold gradient-text-dark">Your PDF Library</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {aiData.savedPdfs.map((savedPdf) => (
              <Card key={savedPdf.id} className="card-dark p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-dark-text-primary">{savedPdf.name}</h4>
                    <p className="text-sm text-dark-text-muted">
                      {new Date(savedPdf.generatedAt).toLocaleDateString()}
                    </p>
                    {savedPdf.jobOptimized && (
                      <p className="text-xs text-teal-400 mt-1">
                        Optimized for {savedPdf.jobOptimized.jobTitle}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => downloadPdf(savedPdf.id)}
                      variant="outline"
                      size="sm"
                    >
                      <CloudArrowDownIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteSavedPdf(savedPdf.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Save PDF Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="card-dark p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-dark-text-primary mb-4">Save PDF to Library</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-primary mb-1">
                  PDF Name
                </label>
                <input
                  type="text"
                  value={pdfSaveName}
                  onChange={(e) => setPdfSaveName(e.target.value)}
                  placeholder="My Resume - Software Engineer"
                  className="w-full px-3 py-2 bg-gray-700 border border-dark-border rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-dark-accent"
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowSaveDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePdf}
                  disabled={!pdfSaveName.trim() || savingPdf}
                  className="flex-1"
                >
                  {savingPdf ? 'Saving...' : 'Save PDF'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Usage Tips */}
      <Card className="glass-dark p-6 border border-dark-border">
        <h4 className="font-medium text-dark-accent mb-3">💡 PDF Download Tips</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-dark-text-secondary">
          <div>
            <h5 className="font-medium mb-2">For Online Applications:</h5>
            <ul className="space-y-1">
              <li>• Perfect for email attachments</li>
              <li>• Maintains exact formatting across devices</li>
              <li>• Check file size limits (usually 2-5MB)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">For Recruiters:</h5>
            <ul className="space-y-1">
              <li>• Professional appearance guaranteed</li>
              <li>• Works on all devices and platforms</li>
              <li>• Include your name in the filename</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ATS Compatibility Note */}
      <Card className="glass-dark p-4 border border-dark-border">
        <div className="flex items-start">
          <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-dark-text-primary">ATS-Optimized PDF</p>
            <p className="text-sm text-dark-text-secondary">
              Your PDF is optimized for Applicant Tracking Systems with proper structure, 
              readable fonts, and professional LaTeX formatting to ensure maximum compatibility.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}