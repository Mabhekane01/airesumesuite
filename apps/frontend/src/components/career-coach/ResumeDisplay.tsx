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
      <div className="w-full h-full bg-surface-100 rounded-xl md:rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 p-6 text-center">
          <ArrowPathIcon className="w-8 h-8 text-brand-blue animate-spin" />
          <span className="text-xs md:text-sm font-black text-text-tertiary uppercase tracking-widest">Generating PDF Core...</span>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="w-full h-full bg-surface-100 rounded-xl md:rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 p-8 text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-white border border-surface-200 flex items-center justify-center shadow-sm">
            <DocumentTextIcon className="w-8 h-8 text-text-tertiary opacity-40" />
          </div>
          <span className="text-sm font-bold text-text-secondary leading-relaxed">Failed to initialize professional architecture preview.</span>
          <button
            onClick={generatePDFPreview}
            className="btn-primary px-6 py-2.5 text-[10px] font-black uppercase tracking-widest"
          >
            Re-Initialize
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-inner">
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0 min-h-[500px] md:min-h-0"
        title="Resume Preview"
      />
    </div>
  );
}
