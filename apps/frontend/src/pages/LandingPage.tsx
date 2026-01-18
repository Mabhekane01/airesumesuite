import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AuthModal from "../components/auth/AuthModal";
import { useAuthStore } from "../stores/authStore";
import { 
  CpuChipIcon, 
  GlobeAltIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  ArrowRightIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const { isAuthenticated } = useAuthStore();
  const [stage, setStage] = useState(0);

  // The 5-Step "Boot Sequence"
  useEffect(() => {
    if (stage < 5) {
      const timers = [1000, 1000, 1000, 1000, 1000]; // Duration of each stage
      const timer = setTimeout(() => {
        setStage(prev => prev + 1);
      }, timers[stage]);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 selection:bg-brand-blue/20">
      
      {/* 1. BACKGROUND GRID (Draws in Stage 1) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 0.6 : 0 }}
        className="absolute inset-0 z-0 bg-grid-slate"
      />

      {/* 2. MAIN CONTAINER */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        
        {/* CENTERPIECE: The "System Core" */}
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* HEADER / TITLE MODULE */}
          <motion.div 
             initial={{ y: -50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="md:col-span-12 flex justify-between items-center mb-8"
          >
             <div>
                <h1 className="text-4xl font-display font-black tracking-tighter text-slate-900 uppercase">AI Job Suite<span className="text-brand-blue">.SYS</span></h1>
                <p className="text-xs font-mono text-slate-500 mt-1">v4.0.2 [STABLE] :: GLOBAL_GRID_ACTIVE</p>
             </div>
             <div className="hidden md:flex gap-4">
                <div className="px-4 py-2 border border-slate-300 bg-white/50 backdrop-blur rounded-sm text-xs font-mono">LATEX_ENGINE: READY</div>
                <div className="px-4 py-2 border border-slate-300 bg-white/50 backdrop-blur rounded-sm text-xs font-mono">AI_CORE: READY</div>
             </div>
          </motion.div>

          {/* LEFT MODULE: The Resume Engine (Appears Stage 2) */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: stage >= 2 ? 0 : -50, opacity: stage >= 2 ? 1 : 0 }}
            className="md:col-span-4 bg-white rounded-lg shadow-sm border border-slate-300 p-8 flex flex-col justify-between h-[320px] relative overflow-hidden group hover:border-brand-blue/50 transition-colors"
          >
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-400" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-400" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-400" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-400" />

            <div className="absolute top-0 right-0 p-4 opacity-5">
              <DocumentTextIcon className="w-32 h-32" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-sm animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Module 01</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">Resume Engine</h3>
              <p className="text-slate-500 text-sm leading-relaxed">LaTeX-powered architectural document generation. Strict formatting enforcement.</p>
            </div>
            <div className="mt-auto">
              <div className="h-px w-full bg-slate-200 mb-4" />
              <div className="flex justify-between items-end">
                 <div className="text-[10px] font-mono text-slate-400">BUILD_VERSION: 2.4</div>
                 <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-sm uppercase">Online</div>
              </div>
            </div>
          </motion.div>

          {/* CENTER MODULE: AI Core (Appears Stage 4) */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: stage >= 4 ? 0 : 20, opacity: stage >= 4 ? 1 : 0 }}
            className="md:col-span-4 bg-brand-dark text-white rounded-lg shadow-xl border border-slate-800 p-8 flex flex-col justify-between h-[320px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-slate opacity-10" />
            
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                  <CpuChipIcon className="w-8 h-8 text-cyan-400" />
                  <div className="flex gap-1">
                     <span className="w-1 h-4 bg-cyan-500" />
                     <span className="w-1 h-4 bg-blue-500" />
                     <span className="w-1 h-4 bg-purple-500" />
                  </div>
               </div>
               <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">AI Consensus</h3>
               <p className="text-slate-400 text-sm border-l-2 border-slate-600 pl-3">Logic Unification: Claude + GPT-4 + Gemini.</p>
            </div>
            <div className="relative z-10 mt-auto">
               <div className="flex gap-1 mt-4">
                  {[...Array(12)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2], height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
                      className="w-1.5 bg-cyan-500/50 rounded-sm"
                    />
                  ))}
               </div>
            </div>
          </motion.div>

          {/* RIGHT MODULE: Market Intelligence (Appears Stage 3) */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: stage >= 3 ? 0 : 50, opacity: stage >= 3 ? 1 : 0 }}
            className="md:col-span-4 bg-white rounded-lg shadow-sm border border-slate-300 p-8 flex flex-col justify-between h-[320px] relative overflow-hidden"
          >
             <div className="absolute -bottom-10 -right-10 opacity-5">
              <GlobeAltIcon className="w-48 h-48" />
            </div>
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-400" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-400" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-400" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-400" />

            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Module 02</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">Global Grid</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Real-time job market scanning. High-frequency node detection.</p>
            </div>
            
            {/* Animated Ticker */}
            <div className="mt-auto space-y-1 font-mono text-[10px] text-blue-600 border-t border-slate-100 pt-4">
               <div className="flex justify-between">
                  <span>US_EAST</span>
                  <span>[SCANNING]</span>
               </div>
               <div className="flex justify-between opacity-70">
                  <span>EU_WEST</span>
                  <span>[IDLE]</span>
               </div>
               <div className="flex justify-between opacity-50">
                  <span>APAC</span>
                  <span>[QUEUED]</span>
               </div>
            </div>
          </motion.div>

          {/* BOTTOM BAR: The Control Deck (Appears Stage 5) */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: stage >= 5 ? 0 : 50, opacity: stage >= 5 ? 1 : 0 }}
            className="md:col-span-12 bg-white rounded-lg shadow-lg border border-slate-300 p-6 flex flex-col md:flex-row items-center justify-between gap-6 mt-4 relative"
          >
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                   <ShieldCheckIcon className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                   <h4 className="font-bold text-lg uppercase tracking-tight text-slate-900">System Operational</h4>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-slate-500 text-xs font-mono">ALL_MODULES_SYNCED</p>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 w-full md:w-auto">
                {isAuthenticated ? (
                   <Link 
                     to="/dashboard"
                     className="flex-1 md:flex-none px-8 py-4 bg-brand-dark text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                   >
                     Access Terminal <ArrowRightIcon className="w-4 h-4" />
                   </Link>
                ) : (
                   <>
                     <button 
                       onClick={() => handleAuth("login")}
                       className="px-8 py-4 font-bold text-slate-600 hover:text-brand-dark hover:bg-slate-50 rounded-lg transition-all uppercase tracking-wider text-sm border border-transparent hover:border-slate-200"
                     >
                       Login
                     </button>
                     <button 
                       onClick={() => handleAuth("register")}
                       className="flex-1 md:flex-none px-8 py-4 bg-brand-blue text-white font-bold rounded-lg shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-sm"
                     >
                       Initialize <BoltIcon className="w-4 h-4" />
                     </button>
                   </>
                )}
             </div>
          </motion.div>

        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
