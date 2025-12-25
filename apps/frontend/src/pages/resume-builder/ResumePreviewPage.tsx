import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, ChevronLeftIcon, DocumentTextIcon, RocketLaunchIcon, PencilIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import EnhancedResumePreview from '../../components/resume/EnhancedResumePreview';
import { ResumeShareModal } from '../../components/resume/ResumeShareModal';
import { resumeService, ResumeData } from '../../services/resumeService';
import { Resume } from '../../types';
import { ResumeProvider } from '../../contexts/ResumeContext';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) {
        setError('Reference Error: Deployment ID required.');
        setLoading(false);
        return;
      }

      if (id === '[object Object]') {
        console.error('Invalid resume ID detected in preview: [object Object]');
        toast.error('Corrupted architecture reference. Redirecting to repository.');
        navigate('/dashboard/documents');
        return;
      }

      try {
        const resumeData: ResumeData = await resumeService.getResumeById(String(id));
        const transformedResume: Resume = {
          ...resumeData,
          template: resumeData.templateId || 'template01',
        };
        setResume(transformedResume);
        
        // Pre-generate PDF for smoother preview experience
        try {
          console.log('🔄 Pre-generating PDF preview for architecture:', id);
          const blob = await resumeService.generateLatexPDFPreview(
            transformedResume, 
            transformedResume.template
          );
          setPdfBlob(blob);
          console.log('✅ Architecture preview synchronized successfully');
        } catch (pdfErr) {
          console.warn('⚠️ PDF pre-generation failed, component will retry on mount');
        }
      } catch (error) {
        setError('Protocol Error: Data acquisition failed.');
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white border border-surface-200 flex items-center justify-center shadow-xl">
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em]">Accessing Architecture Layer...</p>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-red-100 p-12 rounded-[3rem] text-center shadow-sm">
          <h2 className="text-2xl font-black text-brand-dark mb-2">Access Denied.</h2>
          <p className="text-text-secondary font-bold mb-8 opacity-80">{error || 'Target node not found.'}</p>
          <button onClick={() => navigate('/dashboard/resume/templates')} className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest">Return to Repository</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] space-y-12 pb-24 animate-slide-up-soft relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-brand-blue/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] bg-brand-purple/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 space-y-10 relative z-10">
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard/documents')}
              className="w-14 h-14 rounded-[1.2rem] bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/10 shadow-sm transition-all duration-300 group"
            >
              <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-display font-black text-brand-dark tracking-tighter">Architecture Review.</h1>
                <div className="px-3 py-1 rounded-full bg-brand-success/5 border border-brand-success/10 text-[9px] font-black text-brand-success uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                  Live Terminal
                </div>
              </div>
              <p className="text-lg text-text-secondary font-medium opacity-80 flex items-center gap-2">
                Reviewing: <span className="font-black text-brand-dark">{resume.personalInfo?.firstName}'s Deployment Node</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="btn-primary px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-2.5 hover:scale-105 transition-transform duration-300"
            >
              <Share2 size={16} strokeWidth={2.5} />
              Share Tracking Link
            </button>
            <button
              onClick={() => navigate(`/dashboard/resume/edit/${id}`)}
              className="px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] bg-white border-2 border-surface-200 rounded-xl text-brand-dark hover:border-brand-dark hover:bg-surface-50 transition-all duration-300 flex items-center gap-2.5 shadow-sm"
            >
              <PencilIcon className="w-4 h-4 stroke-2" />
              Modify Parameters
            </button>
          </div>
        </div>

        {/* --- PREVIEW ARCHITECTURE --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-4 md:p-10 lg:p-16 shadow-2xl relative overflow-hidden group min-h-[1000px]">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.4] pointer-events-none group-hover:opacity-[0.6] transition-opacity duration-700" />
          <div className="relative z-10">
            <ResumeProvider initialData={resume}>
              <EnhancedResumePreview 
                resume={resume}
                templateId={resume.template}
                isLatexTemplate={resume.isLatexTemplate}
                onResumeUpdate={setResume}
                pdfBlob={pdfBlob || undefined}
              />
            </ResumeProvider>
          </div>
        </div>

        {/* --- SYSTEM META --- */}
        <div className="flex justify-center gap-12 pt-4 pb-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-surface-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-brand-success shadow-[0_0_8px_rgba(46,204,113,0.6)]" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Integrity: Optimal</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-surface-200 shadow-sm">
            <CommandLineIcon className="w-4 h-4 text-brand-blue" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Engine: Vector LaTeX v4.2</span>
          </div>
        </div>
      </div>

      <ResumeShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        resumeId={String(id)} 
        resumeTitle={resume.title || `${resume.personalInfo?.firstName} Architecture`} 
      />
    </div>
  );
}