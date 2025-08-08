import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DocumentTextIcon, PrinterIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { toast } from 'sonner';

interface PublicCoverLetterData {
  _id: string;
  title: string;
  content: string;
  jobTitle: string;
  companyName: string;
  tone: string;
  createdAt: string;
  updatedAt: string;
  userId: {
    firstName?: string;
    lastName?: string;
  };
}

export default function PublicCoverLetterView() {
  const { id } = useParams<{ id: string }>();
  const [coverLetter, setCoverLetter] = useState<PublicCoverLetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicCoverLetter = async () => {
      try {
        const response = await api.get(`/shared/cover-letter/${id}`);
        if (response.data.success) {
          setCoverLetter(response.data.data);
        } else {
          setError('Cover letter not found or not public');
        }
      } catch (error: any) {
        console.error('Error fetching public cover letter:', error);
        if (error.response?.status === 404) {
          setError('Cover letter not found or not public');
        } else {
          setError('Failed to load cover letter');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPublicCoverLetter();
    } else {
      setError('Invalid cover letter ID');
      setLoading(false);
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!coverLetter) return;
    
    const element = document.createElement('a');
    const file = new Blob([coverLetter.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${coverLetter.title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Cover letter downloaded!');
  };

  const handleShare = async () => {
    if (!coverLetter) return;

    try {
      toast.info('Generating PDF for sharing...');
      
      // Generate PDF file for sharing
      const response = await api.post('/cover-letters/download-with-data/pdf', {
        coverLetterData: {
          title: coverLetter.title,
          content: coverLetter.content,
          jobTitle: coverLetter.jobTitle,
          companyName: coverLetter.companyName,
          tone: coverLetter.tone || 'professional',
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
          text: `Cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
          files: [file],
        });
        toast.success('Cover letter PDF shared successfully!');
      } else if (navigator.share) {
        // Fallback to URL sharing if file sharing not supported
        const shareUrl = window.location.href;
        await navigator.share({
          title: `${coverLetter.title} - Cover Letter`,
          text: `Check out this cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
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
        // Fallback to URL sharing
        try {
          const shareUrl = window.location.href;
          if (navigator.share) {
            await navigator.share({
              title: `${coverLetter.title} - Cover Letter`,
              text: `Check out this cover letter for ${coverLetter.jobTitle} at ${coverLetter.companyName}`,
              url: shareUrl,
            });
            toast.success('Cover letter link shared successfully!');
          } else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard - you can now paste it anywhere to share!');
          }
        } catch (fallbackError) {
          toast.error('Unable to share cover letter');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-dark-text-secondary">Loading cover letter...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <DocumentTextIcon className="w-16 h-16 text-dark-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-dark-text-primary mb-2">Cover Letter Not Found</h1>
          <p className="text-dark-text-secondary mb-4">{error}</p>
          <a 
            href="/"
            className="btn-primary-dark inline-flex items-center px-4 py-2 rounded-lg"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  if (!coverLetter) {
    return null;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .cover-letter-document {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0.5in 0.75in !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="no-print mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl font-bold text-dark-text-primary mb-2">
              {coverLetter.title}
            </h1>
            <p className="text-dark-text-secondary mb-4">
              {coverLetter.jobTitle} at {coverLetter.companyName}
            </p>
            {coverLetter.userId.firstName && (
              <p className="text-sm text-dark-text-muted">
                Created by {coverLetter.userId.firstName} {coverLetter.userId.lastName}
              </p>
            )}
          </motion.div>

          {/* Actions */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={handleShare}
              className="btn-primary-dark flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <ShareIcon className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary-dark flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <PrinterIcon className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="btn-secondary-dark flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Cover Letter Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div 
            className="cover-letter-document bg-white shadow-2xl border border-gray-200 mx-auto"
            style={{ 
              width: '8.5in',
              minHeight: '11in',
              fontFamily: 'Times, "Times New Roman", serif',
              fontSize: '12pt',
              lineHeight: '1.8',
              padding: '0.5in 0.75in'
            }}
          >
            <div 
              className="text-gray-900 whitespace-pre-wrap"
              style={{ 
                fontSize: '12pt',
                fontFamily: 'Times, "Times New Roman", serif',
                lineHeight: '1.8',
                marginTop: 0,
                paddingTop: 0
              }}
            >
              {coverLetter.content}
            </div>
          </div>

          {/* Footer Info */}
          <div className="no-print text-center mt-8 text-sm text-dark-text-muted">
            <p>Created on {formatDate(coverLetter.createdAt)}</p>
            {coverLetter.updatedAt !== coverLetter.createdAt && (
              <p>Last updated on {formatDate(coverLetter.updatedAt)}</p>
            )}
            <p className="mt-2">
              Powered by <a href="/" className="text-accent-primary hover:underline">AI Job Suite</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}