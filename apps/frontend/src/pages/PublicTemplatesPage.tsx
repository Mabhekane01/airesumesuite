import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CommandLineIcon,
  CpuChipIcon,
  GlobeAmericasIcon,
  ChartBarIcon,
  FireIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import { Button } from '../components/ui/Button';
import OverleafTemplateGallery from '../components/resume/OverleafTemplateGallery';
import AuthModalSimple from '../components/auth/AuthModalSimple';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

export default function PublicTemplatesPage() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const handleTemplateSelect = (templateId: string) => {
    if (!isAuthenticated) {
      setSelectedTemplate(templateId);
      setShowAuthModal(true);
      return;
    }

    navigate('/dashboard/resume/comprehensive', {
      state: { 
        templateId: templateId,
        isLatexTemplate: true
      }
    });
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast.success('System Authenticated. Identity active.');
    
    if (selectedTemplate) {
      navigate('/dashboard/resume/comprehensive', {
        state: { 
          templateId: selectedTemplate,
          isLatexTemplate: true
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] font-sans selection:bg-brand-blue/30 overflow-x-hidden">
      {/* Immersive Background Architecture */}
      <div className="absolute top-0 left-0 w-full h-[1000px] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-brand-blue/[0.03] rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-brand-success/[0.02] rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        
        {/* --- COMPACT HERO SECTION --- */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-surface-200 mb-8 shadow-sm group cursor-default"
          >
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-brand-blue/10 border-2 border-white flex items-center justify-center">
                <CpuChipIcon className="w-3.5 h-3.5 text-brand-blue" />
              </div>
              <div className="w-6 h-6 rounded-full bg-brand-success/10 border-2 border-white flex items-center justify-center">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-brand-success" />
              </div>
            </div>
            <span className="w-px h-4 bg-surface-200 mx-1"></span>
            <span className="text-[11px] font-black text-brand-dark uppercase tracking-widest text-brand-dark">Direct Vector Deployment Engine</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-[5rem] font-display font-black text-brand-dark tracking-[-0.04em] leading-[0.95] mb-8"
          >
            Architecture <span className="text-brand-blue">Repository.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto font-semibold leading-relaxed opacity-80"
          >
            Select a high-performance LaTeX architecture to initialize your deployment.
          </motion.p>
        </div>

        {/* --- ARCHITECTURE EXPLORER (PRIMARY FOCUS) --- */}
        <div className="mb-32 space-y-12">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 px-2">
            <div className="space-y-2 text-left">
              <h2 className="text-3xl md:text-4xl font-display font-black text-brand-dark tracking-tighter">System Explorer.</h2>
              <p className="text-base text-text-secondary font-bold opacity-70">Filtered by career track and technical complexity.</p>
            </div>
            {!isAuthenticated && (
              <div className="flex-shrink-0">
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em] flex items-center group bg-brand-blue/5 px-6 py-3 rounded-xl border border-brand-blue/10 hover:bg-brand-blue/10 transition-all"
                >
                  Authorize System For Full Access <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-brand-blue/[0.01] rounded-[4rem] -z-10 blur-2xl" />
            <OverleafTemplateGallery
              selectedTemplateId={selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
            />
          </div>
        </div>

        {/* --- DYNAMIC CONTEXT HEADER --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-32"
        >
          {!isAuthenticated ? (
            <div className="card-resume p-10 md:p-16 bg-[#0F172A] border-none relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.15),transparent_50%)]" />
              <div className="relative z-10 space-y-4">
                <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
                  Initialize Your Profile?
                </h2>
                <p className="text-surface-300 text-lg font-semibold max-w-xl opacity-90">
                  Secure your deployment credentials to save and optimize your professional narrative across all architectures.
                </p>
              </div>
              <div className="relative z-10 flex-shrink-0">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-white text-brand-blue px-10 py-4 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center"
                >
                  Get Started <ArrowRightIcon className="w-5 h-5 ml-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="card-resume p-10 bg-white border border-surface-200 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
                  <DocumentTextIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none mb-2">
                    Identity Synchronized.
                  </h2>
                  <p className="text-text-secondary font-bold opacity-70">
                    Apply your optimized profile to any deployment architecture.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary px-8 py-3 font-black text-[11px] uppercase tracking-[0.2em] border-2"
              >
                Return to Command Center
              </button>
            </div>
          )}
        </motion.div>

        {/* --- FEATURED SPOTLIGHT --- */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-32 relative"
        >
          <div className="absolute inset-0 bg-brand-blue/[0.01] rounded-[3.5rem] blur-3xl -z-10" />
          <div className="card-resume bg-white p-1 md:p-2 border border-surface-200 overflow-hidden rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] hover:border-brand-blue/20 transition-all duration-500">
            <div className="flex flex-col lg:flex-row items-stretch">
              <div className="flex-1 p-12 md:p-20 space-y-10">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-blue/5 text-brand-blue text-[10px] font-black uppercase tracking-widest border border-brand-blue/10">
                  <FireIcon className="w-4 h-4" /> Priority recommendation
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-5xl font-display font-black text-brand-dark tracking-tight leading-tight">
                    The "ASU Sparky" <br /><span className="text-brand-blue">Master Architecture.</span>
                  </h2>
                  <p className="text-lg text-text-secondary font-bold leading-relaxed opacity-80 max-w-lg">
                    Our most successful technical template. Specifically designed for Lead Engineers and Architects at FAANG-level organizations.
                  </p>
                </div>
                <div className="space-y-6 pt-4 border-t border-surface-100">
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-10 h-10 rounded-full bg-brand-success/10 flex items-center justify-center text-brand-success group-hover:bg-brand-success group-hover:text-white transition-all">
                      <CheckIconSolid className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black text-brand-dark uppercase tracking-widest">Optimized for 2+ Pages</span>
                  </div>
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-10 h-10 rounded-full bg-brand-success/10 flex items-center justify-center text-brand-success group-hover:bg-brand-success group-hover:text-white transition-all">
                      <CheckIconSolid className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black text-brand-dark uppercase tracking-widest">Dynamic Project Grid</span>
                  </div>
                </div>
                <div className="pt-6">
                  <button 
                    onClick={() => handleTemplateSelect('template01')}
                    className="btn-primary px-12 py-5 text-lg shadow-xl shadow-brand-blue/20 group"
                  >
                    Initialize Architecture <ArrowRightIcon className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-surface-50 relative min-h-[400px] overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(26,145,240,0.1),transparent_70%)] group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute inset-0 flex items-center justify-center p-12">
                  <motion.div 
                    whileHover={{ scale: 1.02, rotate: -1 }}
                    className="relative z-10 w-full shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-surface-200 rounded-xl overflow-hidden bg-white"
                  >
                    <img 
                      src="/templates/template01/33592.jpeg" 
                      alt="Featured Template" 
                      className="w-full h-auto"
                    />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl">
                      Live Preview
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- SYSTEM SPECIFICATIONS (LATEX VS STANDARD) --- */}
        <section className="py-32 border-t border-surface-200 mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-dark/5 text-brand-dark text-[10px] font-black uppercase tracking-widest border border-brand-dark/10">
                Technical Comparison
              </div>
              <h2 className="text-5xl font-display font-black text-brand-dark tracking-tighter leading-tight">
                Vector Architecture <br />vs. <span className="text-brand-blue">Standard Pixel.</span>
              </h2>
              <p className="text-lg text-text-secondary font-bold leading-relaxed opacity-80">
                Standard builders use basic HTML components. We use full LaTeX compilation to generate vector-perfect typography that retains 100% clarity across all reading systems.
              </p>
              
              <div className="space-y-4">
                {[
                  { label: "Typographic Kerning", latex: "Precise", std: "Basic" },
                  { label: "Font Rendering", latex: "Vector-Base", std: "Web-Font" },
                  { label: "ATS Parsing Luck", latex: "Zero (Binary)", std: "Variable" },
                  { label: "Layout Lockdown", latex: "Locked", std: "Fluid/Unstable" }
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white border border-surface-200 rounded-2xl shadow-sm group hover:border-brand-blue/30 transition-all">
                    <span className="text-sm font-black text-brand-dark uppercase tracking-widest">{row.label}</span>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 rounded-lg bg-surface-50 text-[10px] font-black text-text-tertiary uppercase">{row.std}</span>
                      <span className="px-3 py-1 rounded-lg bg-brand-blue/10 text-[10px] font-black text-brand-blue uppercase">{row.latex}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="card-resume p-12 bg-brand-dark text-white relative overflow-hidden border-none rounded-[3rem] shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,145,240,0.2),transparent_60%)]" />
                <div className="relative z-10 space-y-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-brand-blue">
                    <ChartBarIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-display font-black tracking-tight leading-tight">
                    Institutional <br />Success Metrics.
                  </h3>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Recruiter Engagement</span>
                        <span className="text-2xl font-black text-brand-blue">+240%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '85%' }} transition={{ duration: 1.5 }} className="h-full bg-brand-blue" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System Stability</span>
                        <span className="text-2xl font-black text-brand-success">99.9%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: '99%' }} transition={{ duration: 1.5, delay: 0.2 }} className="h-full bg-brand-success" />
                      </div>
                    </div>
                  </div>
                  <p className="text-surface-400 text-sm font-bold italic leading-relaxed pt-4 border-t border-white/5">
                    *Verified through 12,000+ deployment cycles across FAANG and Global Fortune 500 sectors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL ACTION POINT --- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center py-32 space-y-10"
        >
          <div className="w-20 h-20 rounded-[2rem] bg-white border border-surface-200 shadow-xl flex items-center justify-center mx-auto text-brand-blue animate-float">
            <CursorArrowRaysIcon className="w-10 h-10" />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-display font-black text-brand-dark tracking-tighter">Ready to Deploy?</h2>
            <p className="text-xl text-text-secondary font-bold max-w-xl mx-auto opacity-80">Finalize your template selection and initialize the AI-optimization layer.</p>
          </div>
          {!isAuthenticated && (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-brand-dark text-white px-14 py-6 rounded-2xl font-black text-2xl shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group"
            >
              Authorize Deployment <ArrowRightIcon className="w-6 h-6 ml-4 inline group-hover:translate-x-2 transition-transform" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModalSimple
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
