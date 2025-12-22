import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, DocumentTextIcon, CloudArrowUpIcon, RocketLaunchIcon, CpuChipIcon, CommandLineIcon, CheckIcon } from '@heroicons/react/24/outline';
import { FileUpload } from '../../components/resume/FileUpload';
import { useResumeStore } from '../../stores/resumeStore';
import { ResumeData } from '../../services/resumeService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadResume() {
  const navigate = useNavigate();
  const [uploadedData, setUploadedData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createResume } = useResumeStore();

  const handleFileUpload = (data: ResumeData) => {
    setUploadedData(data);
    toast.success('Neural Extraction Complete. Review architecture metadata.');
  };

  const handleCreateResume = async () => {
    if (!uploadedData) return;
    setIsLoading(true);
    try {
      const resume = await createResume(uploadedData);
      toast.success('✅ optimized Layer Applied Successfully.');
      navigate(`/dashboard/resume/preview/${resume._id}`);
    } catch (error) {
      toast.error('Initialization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-12 px-4 animate-slide-up-soft relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-brand-blue/[0.03] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        {/* --- HEADER --- */}
        <div className="space-y-8">
          <button
            onClick={() => navigate('/dashboard/resume')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-surface-200 text-text-tertiary hover:text-brand-blue transition-all shadow-sm"
          >
            <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Abort Import</span>
          </button>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px] shadow-sm">
              <CloudArrowUpIcon className="w-4 h-4" />
              Legacy Asset Ingestion
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-black text-brand-dark tracking-tighter leading-none">
              Import <span className="text-brand-blue">Legacy.</span>
            </h1>
            <p className="text-xl text-text-secondary font-bold opacity-80 leading-relaxed max-w-2xl">
              Upload existing professional architectures. Our neural engine will extract and categorize semantic data for immediate optimization.
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!uploadedData ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
              
              <div className="relative z-10 text-center mb-12">
                <div className="w-20 h-20 rounded-[2rem] bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto mb-8 shadow-inner group">
                  <CommandLineIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
                </div>
                <h2 className="text-3xl font-black text-brand-dark tracking-tight mb-3">Initialize File Ingest.</h2>
                <p className="text-sm font-bold text-text-tertiary uppercase tracking-widest">Supports VECTOR PDF / DOCX / RAW TEXT</p>
              </div>

              <FileUpload onUpload={handleFileUpload} />

              <div className="mt-16 pt-10 border-t border-surface-100 grid md:grid-cols-3 gap-8">
                {[
                  { id: '01', title: 'Neural Analysis', desc: 'Deep-scan extraction of professional nodes.' },
                  { id: '02', title: 'Data Mapping', desc: 'Categorization into career-delta schemas.' },
                  { id: '03', title: 'Logic Sync', desc: 'Validation against 200+ ATS protocols.' }
                ].map(step => (
                  <div key={step.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-lg border border-brand-blue/20">{step.id}</span>
                      <h4 className="text-sm font-black text-brand-dark uppercase tracking-widest">{step.title}</h4>
                    </div>
                    <p className="text-xs font-bold text-text-secondary leading-relaxed opacity-70">{step.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-brand-success/5 border-2 border-brand-success/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-brand-success/10 flex items-center justify-center text-brand-success shadow-inner">
                  <CheckIcon className="w-10 h-10 stroke-[3]" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-none mb-2">Extraction Finalized.</h3>
                  <p className="text-brand-dark font-bold opacity-70">Legacy data successfully mapped to Career-OS schema. System ready for deployment.</p>
                </div>
              </div>

              <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-sm space-y-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                <h3 className="text-xl font-black text-brand-dark tracking-tighter uppercase flex items-center gap-3 relative z-10">
                  <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                  Extracted Manifest
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {[
                    { label: "Identification", val: `${uploadedData.personalInfo.firstName} ${uploadedData.personalInfo.lastName}` },
                    { label: "Identity Endpoint", val: uploadedData.personalInfo.email },
                    { label: "Experience Clusters", val: `${uploadedData.workExperience?.length || 0} Nodes Found` },
                    { label: "Skill Attributes", val: `${uploadedData.skills?.length || 0} Tags identified` }
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-surface-50 border border-surface-200 rounded-2xl shadow-sm">
                      <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-base font-bold text-brand-dark leading-none">{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-surface-100 relative z-10">
                  <button onClick={() => setUploadedData(null)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-brand-dark transition-all">Flush & Re-import</button>
                  <div className="flex gap-4 w-full sm:w-auto">
                    <button onClick={() => navigate('/dashboard/resume/comprehensive', { state: { resumeData: uploadedData } })} className="flex-1 sm:flex-none px-8 py-4 rounded-xl border-2 border-surface-200 text-[10px] font-black uppercase tracking-widest text-brand-dark hover:bg-surface-50 transition-all shadow-sm">Review Logic</button>
                    <button onClick={handleCreateResume} disabled={isLoading} className="flex-1 sm:flex-none btn-primary px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3">
                      {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RocketLaunchIcon className="w-4 h-4" />}
                      Initialize Deployment
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}