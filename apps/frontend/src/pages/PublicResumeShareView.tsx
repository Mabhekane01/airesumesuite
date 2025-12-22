import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  Eye, 
  AlertCircle,
  Mail,
  User,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import EnhancedResumePreview from '../components/resume/EnhancedResumePreview';
import { Resume } from '../types';
import { ResumeProvider } from '../contexts/ResumeContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const PublicResumeShareView = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailProvided, setEmailProvided] = useState(false);
  const [visitorEmail, setVisitorEmail] = useState('');

  useEffect(() => {
    const fetchSharedResume = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/share/access/${shareId}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          if (!result.data.settings.requireEmail) {
            setEmailProvided(true);
          }
        } else {
          setError(result.message || 'Link inactive or not found');
        }
      } catch (err) {
        setError('Connection failure.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedResume();
  }, [shareId]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (visitorEmail) {
      setEmailProvided(true);
      toast.success('Access Granted.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          <p className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Decrypting Share Node...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] p-6">
        <div className="bg-white border border-surface-200 rounded-[3rem] p-12 text-center max-w-lg shadow-xl">
          <AlertCircle size={48} className="text-brand-orange mx-auto mb-6" />
          <h2 className="text-2xl font-black text-brand-dark mb-4 uppercase">Link Compromised.</h2>
          <p className="text-text-secondary font-bold mb-8">{error || 'This tracking node has been deactivated or expired.'}</p>
          <div className="p-6 bg-surface-50 rounded-2xl border border-surface-200 text-xs font-bold text-text-tertiary">
            The institutional share link you are attempting to access is no longer broadcasting data.
          </div>
        </div>
      </div>
    );
  }

  if (!emailProvided) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-surface-200 rounded-[3rem] p-12 w-full max-w-md shadow-2xl space-y-10"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tighter">Access Protocol.</h2>
            <p className="text-sm font-bold text-text-secondary opacity-70">Please provide your institutional email to view this architecture.</p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Professional Email</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-brand-blue transition-colors" />
                <input 
                  required 
                  type="email" 
                  className="input-resume pl-14" 
                  placeholder="name@company.com"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-5 text-xs font-black uppercase tracking-widest shadow-xl">
              Initialize Decryption
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const resume = data.resume;

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-10 px-6 sm:px-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* --- TOP BAR --- */}
        <div className="flex justify-between items-center bg-white border border-surface-200 px-8 py-4 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black text-brand-dark uppercase tracking-tight">Shared Architecture.</h1>
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{resume.personalInfo?.firstName} {resume.personalInfo?.lastName}</p>
            </div>
          </div>

          {data.settings.allowDownload && (
            <button className="btn-primary px-6 py-2.5 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <Download size={14} /> Download PDF
            </button>
          )}
        </div>

        {/* --- RESUME PREVIEW --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
          <div className="relative z-10">
            <ResumeProvider initialData={resume}>
              <EnhancedResumePreview 
                resume={resume}
                templateId={resume.templateId || 'template01'}
                isLatexTemplate={resume.isLatexTemplate}
                readOnly={true}
              />
            </ResumeProvider>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-success/5 border border-brand-success/10 text-[9px] font-black text-brand-success uppercase tracking-widest">
            <ShieldCheck size={12} /> Secure Protocol Verified
          </div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Powered by AI Job Suite Architecture</p>
        </div>
      </div>
    </div>
  );
};

export default PublicResumeShareView;
