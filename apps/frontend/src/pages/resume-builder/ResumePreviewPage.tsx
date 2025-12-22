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

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) {
        setError('Reference Error: Deployment ID required.');
        setLoading(false);
        return;
      }
      try {
        const resumeData: ResumeData = await resumeService.getResumeById(String(id));
        const transformedResume: Resume = {
          ...resumeData,
          template: resumeData.templateId || 'template01',
        };
        setResume(transformedResume);
      } catch (error) {
        setError('Protocol Error: Data acquisition failed.');
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [id]);

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
    <div className="min-h-screen bg-[#FAFAFB] space-y-10 pb-20 animate-slide-up-soft relative">
      <div className="absolute top-0 left-0 w-full h-[500px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand-blue/[0.02] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 space-y-10">
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-10">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard/resume/comprehensive')}
              className="w-12 h-12 rounded-2xl bg-white border border-surface-200 flex items-center justify-center text-text-tertiary hover:text-brand-blue shadow-sm group"
            >
              <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-black text-brand-dark tracking-tighter">Architecture Review.</h1>
                <div className="px-3 py-1 rounded-lg bg-brand-blue/5 border border-brand-blue/10 text-[9px] font-black text-brand-blue uppercase tracking-widest">
                  Live Terminal
                </div>
              </div>
              <p className="text-lg text-text-secondary font-bold opacity-70">Reviewing: {resume.personalInfo?.firstName}'s Deployment Node</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="btn-primary px-6 py-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center gap-2"
            >
              <Share2 size={16} strokeWidth={3} />
              Share Tracking Link
            </button>
            <button
              onClick={() => navigate(`/dashboard/resume/edit/${id}`)}
              className="btn-secondary px-6 py-3 font-black text-[10px] uppercase tracking-[0.2em] border-2 flex items-center gap-2"
            >
              <PencilIcon className="w-4 h-4" />
              Modify Parameters
            </button>
          </div>
        </div>

        {/* --- PREVIEW ARCHITECTURE --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.05] pointer-events-none" />
          <div className="relative z-10">
            <ResumeProvider initialData={resume}>
              <EnhancedResumePreview 
                resume={resume}
                templateId={resume.template}
                isLatexTemplate={resume.isLatexTemplate}
                onResumeUpdate={setResume}
              />
            </ResumeProvider>
          </div>
        </div>

        {/* --- SYSTEM META --- */}
        <div className="flex justify-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_8px_rgba(46,204,113,0.5)]" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Integrity: Optimal</span>
          </div>
          <div className="flex items-center gap-3">
            <CommandLineIcon className="w-4 h-4 text-brand-blue opacity-40" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Engine: Vector LaTeX v4.2</span>
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