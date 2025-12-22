import { useState, useEffect } from 'react';
import { ResumeData, resumeService } from '../../services/resumeService';
import { DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ResumeDisplayProps {
  resume: ResumeData;
}

export default function ResumeDisplay({ resume }: ResumeDisplayProps) {
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

      // Use the same method to get PDF from server
      const pdfBlob = await resumeService.downloadResumeWithEngine(resume, 'pdf', {
        engine: 'latex',
        templateId: resume.template || resume.templateId || 'template01'
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
      <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="text-sm text-gray-600">Generating PDF...</span>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <DocumentTextIcon className="w-12 h-12 text-gray-400" />
          <span className="text-sm text-gray-600">Failed to load PDF preview</span>
          <button
            onClick={generatePDFPreview}
            className="px-3 py-1 bg-teal-500 text-white text-sm rounded hover:bg-teal-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden">
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0"
        title="Resume Preview"
      />
    </div>
  );
}
