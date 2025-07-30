import React, { useState } from 'react';
import { 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  DocumentIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { resumeService } from '../../services/resumeService';

interface ResumeDownloadManagerProps {
  resumeData: any;
  className?: string;
}

interface DownloadFormat {
  id: 'pdf' | 'docx' | 'txt';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  useCase: string;
  fileSize: string;
  compatibility: string;
}

export default function ResumeDownloadManager({ resumeData, className = '' }: ResumeDownloadManagerProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: 'success' | 'error' }>({});

  const formats: DownloadFormat[] = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Industry standard format, best for email and online applications',
      icon: DocumentTextIcon,
      useCase: 'Email applications, online portals, printing',
      fileSize: '~500KB',
      compatibility: 'Universal compatibility, maintains formatting'
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Editable format for when modifications are needed',
      icon: DocumentIcon,
      useCase: 'Further editing, recruiter modifications',
      fileSize: '~300KB',
      compatibility: 'Microsoft Office, Google Docs'
    },
    {
      id: 'txt',
      name: 'Plain Text',
      description: 'Simple text format for online forms and ATS systems',
      icon: ClipboardDocumentIcon,
      useCase: 'Copy-paste into forms, maximum ATS compatibility',
      fileSize: '~10KB',
      compatibility: 'Universal, perfect for online applications'
    }
  ];

  const handleDownload = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      setDownloadingFormat(format);
      setDownloadStatus(prev => ({ ...prev, [format]: undefined as any }));

      // Add performance timing
      const startTime = performance.now();
      
      // Show immediate feedback for user experience
      const progressTimeout = setTimeout(() => {
        if (downloadingFormat === format) {
          console.log(`⏱️ Download taking longer than expected for ${format} format...`);
        }
      }, 2000);

      const blob = await resumeService.downloadResume(resumeData, format);
      
      clearTimeout(progressTimeout);
      const endTime = performance.now();
      console.log(`⚡ Download completed in ${(endTime - startTime).toFixed(0)}ms for ${format} format`);
      
      // Optimize filename generation
      const sanitizedFirstName = resumeData.personalInfo?.firstName?.replace(/[^\w\s-]/g, '').trim() || 'Resume';
      const sanitizedLastName = resumeData.personalInfo?.lastName?.replace(/[^\w\s-]/g, '').trim() || '';
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
          Choose the format that best suits your needs. Each format is optimized for different use cases.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {formats.map((format) => {
          const IconComponent = format.icon;
          const status = downloadStatus[format.id];
          
          return (
            <Card 
              key={format.id} 
              className={`card-dark p-6 transition-all duration-200 hover:shadow-lg ${
                status === 'success' ? 'border-green-400/30 bg-green-500/10' :
                status === 'error' ? 'border-red-400/30 bg-red-500/10' : ''
              }`}
            >
              <div className="flex items-center mb-4">
                <div className={`p-2 rounded-lg mr-3 ${
                  format.id === 'pdf' ? 'bg-red-500/20' :
                  format.id === 'docx' ? 'bg-blue-500/20' : 'bg-dark-secondary/20'
                }`}>
                  <IconComponent className={`w-6 h-6 ${
                    format.id === 'pdf' ? 'text-red-400' :
                    format.id === 'docx' ? 'text-blue-400' : 'text-dark-text-secondary'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-dark-text-primary">{format.name}</h4>
                  <p className="text-sm text-dark-text-muted">{format.fileSize}</p>
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

              <Button
                onClick={() => handleDownload(format.id)}
                disabled={downloadingFormat !== null}
                variant={getButtonVariant(format)}
                size="sm"
                className="w-full"
              >
                {getButtonContent(format)}
              </Button>

              {format.id === 'pdf' && (
                <p className="text-xs text-dark-accent mt-2 text-center">
                  ⭐ Recommended for most applications
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Usage Tips */}
      <Card className="glass-dark p-6 border border-dark-border">
        <h4 className="font-medium text-dark-accent mb-3">💡 Download Tips</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-dark-text-secondary">
          <div>
            <h5 className="font-medium mb-2">For Online Applications:</h5>
            <ul className="space-y-1">
              <li>• Use PDF for email attachments</li>
              <li>• Use TXT for copying into web forms</li>
              <li>• Check file size limits (usually 2-5MB)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">For Recruiters:</h5>
            <ul className="space-y-1">
              <li>• PDF maintains exact formatting</li>
              <li>• DOCX allows for easy modifications</li>
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
            <p className="text-sm font-medium text-dark-text-primary">ATS-Optimized Downloads</p>
            <p className="text-sm text-dark-text-secondary">
              All formats are optimized for Applicant Tracking Systems with proper structure, 
              readable fonts, and standard formatting to ensure maximum compatibility.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}