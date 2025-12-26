import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrophyIcon,
  SparklesIcon,
  ChevronLeftIcon,
  BriefcaseIcon,
  StarIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CpuChipIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import OverleafTemplateGallery from '../../components/resume/OverleafTemplateGallery';
import { resumeService } from '../../services/resumeService';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import AuthModalSimple from '../../components/auth/AuthModalSimple';
import { motion } from 'framer-motion';
import { LocationEducationCheck } from './LocationEducationCheck';
import { locationService } from '../../services/locationService';

export default function TemplateSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Pre-check state
  const [showPreCheck, setShowPreCheck] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string>('');
  const [preCheckStep, setPreCheckStep] = useState(1);

  // Automated Location Detection
  useEffect(() => {
    const detectLocationAndCheck = async () => {
      // Don't ask again if we already have it in navigation state
      if (location.state?.targetLocation) return;

      try {
        const loc = await locationService.getUserLocation();
        const country = loc.country || '';
        setDetectedLocation(country);

        if (country === 'South Africa') {
          // If SA, we MUST ask for education level to decide builder type
          setPreCheckStep(2); // Jump straight to education question
          setShowPreCheck(true);
        } else {
          // If not SA, we don't need to show the popup, just set the location
          // (Unless we want to ask education for everyone, but user specified SA focus)
        }
      } catch (err) {
        // If detection fails, show full check starting at location
        setPreCheckStep(1);
        setShowPreCheck(true);
      }
    };

    detectLocationAndCheck();
  }, []);

  // Auth store
  const { isAuthenticated, setRedirectAfterLogin } = useAuthStore();

  const handlePreCheckComplete = (data: { location: string; education: string }) => {
    setShowPreCheck(false);
    
    // Branching Logic
    if (data.location === 'South Africa' && data.education === 'Grade 12') {
      navigate('/dashboard/resume/basic', { 
        state: { 
          targetLocation: data.location, 
          educationLevel: data.education 
        } 
      });
    } else {
      // Stay on template selection but remember preferences
      // (Optional: filter templates here based on education if needed)
    }
  };

  // Get resume data if passed from previous steps
  const resumeData = location.state?.resumeData;

  useEffect(() => {
    const loadLatexTemplates = async () => {
      try {
        setLoading(true);
        await resumeService.getAvailableLatexTemplates();
      } catch (error) {
        toast.error('Failed to load architectures.');
      } finally {
        setLoading(false);
      }
    };
    loadLatexTemplates();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 rounded-[2.5rem] bg-white border border-surface-200 flex items-center justify-center shadow-xl">
          <ArrowPathIcon className="h-10 w-10 animate-spin text-brand-blue" />
        </div>
        <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.3em]">Accessing Vector Repository...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-8 md:py-12 px-3 md:px-4 relative overflow-hidden animate-slide-up-soft">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-brand-blue/[0.03] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 md:space-y-16 relative z-10">
        {/* --- HEADER --- */}
        <div className="text-center space-y-6 md:space-y-8 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-surface-200 text-text-tertiary hover:text-brand-blue transition-all shadow-sm"
            >
              <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Control</span>
            </button>
          </div>
          
          <div className="space-y-3 md:space-y-4">
            <div className="inline-flex items-center gap-3 px-4 md:px-5 py-1.5 md:py-2 rounded-full bg-white border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] shadow-sm">
              <CpuChipIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Architecture Selection Protocol
            </div>
            <h1 className="text-3xl md:text-7xl font-display font-black text-brand-dark tracking-tighter leading-none">
              Deploy Your <br /><span className="text-brand-blue">Interface.</span>
            </h1>
            <p className="text-base md:text-xl text-text-secondary font-bold opacity-80 leading-relaxed px-4 md:px-0">
              Initialize a high-fidelity LaTeX deployment. Every architecture is validated for typographic precision.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 opacity-60 px-4">
            {[
              { icon: ShieldCheckIcon, label: "ATS Validator v4.2" },
              { icon: CommandLineIcon, label: "Vector Source Core" },
              { icon: SparklesIcon, label: "Semantic Optimization" }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-dark">
                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-blue" />
                {stat.label}
              </div>
            ))}
          </div>
        </div>

        {/* --- TEMPLATES EXPLORER --- */}
        <div className="relative">
          <div className="absolute -inset-10 bg-brand-blue/[0.01] rounded-[4rem] -z-10 blur-3xl" />
          <OverleafTemplateGallery
            selectedTemplateId={selectedTemplate}
            onTemplateSelect={(templateId) => {
              if (!isAuthenticated) {
                const redirectUrl = resumeData 
                  ? `/dashboard/resume/builder?templateId=${templateId}&isLatexTemplate=true`
                  : `/dashboard/resume/comprehensive?templateId=${templateId}&isLatexTemplate=true`;
                setRedirectAfterLogin(redirectUrl);
                setShowAuthModal(true);
                return;
              }
              
              setSelectedTemplate(templateId);
              const builderPath = '/dashboard/resume/comprehensive';
              navigate(builderPath, { 
                state: { 
                  resumeData: resumeData ? { ...resumeData, templateId, isLatexTemplate: true } : undefined, 
                  templateId, 
                  isLatexTemplate: true 
                } 
              });
            }}
          />
        </div>

        {/* --- SYSTEM STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-8 md:pt-10 border-t border-surface-100 px-4 md:px-0">
          {[
            { title: "Vector Precision", desc: "Typeset-quality font rendering for absolute clarity." },
            { title: "Node Compatibility", desc: "Certified parsing across 200+ institutional ATS models." },
            { title: "Direct Export", desc: "Secure deployment to professional PDF and LaTeX formats." }
          ].map((item, i) => (
            <div key={i} className="space-y-2 md:space-y-3">
              <h4 className="text-[11px] md:text-sm font-black text-brand-dark uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-blue" />
                {item.title}
              </h4>
              <p className="text-[10px] md:text-xs font-bold text-text-secondary leading-relaxed opacity-70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <AuthModalSimple
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setRedirectAfterLogin(null);
        }}
      />
      {/* Pre-Check Modal (Location/Education) */}
      {showPreCheck && (
        <LocationEducationCheck 
          onComplete={handlePreCheckComplete} 
          onCancel={() => setShowPreCheck(false)}
          initialStep={preCheckStep}
          initialLocation={detectedLocation}
        />
      )}
    </div>
  );
}