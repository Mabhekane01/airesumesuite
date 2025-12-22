import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, DocumentTextIcon, CloudArrowUpIcon, SwatchIcon, SparklesIcon, RocketLaunchIcon, CommandLineIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

type BuilderOption = 'create' | 'upload' | 'templates';

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<BuilderOption | null>(null);

  const handleOptionSelect = (option: BuilderOption) => {
    setSelectedOption(option);
    if (option === 'create') navigate('/dashboard/resume/comprehensive');
    else if (option === 'upload') navigate('/dashboard/resume/upload');
    else if (option === 'templates') navigate('/dashboard/resume/templates');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] py-12 px-4 animate-slide-up-soft relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-brand-blue/[0.03] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        {/* --- HEADER --- */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-surface-200 text-brand-blue font-black uppercase tracking-[0.3em] text-[10px] shadow-sm">
            <RocketLaunchIcon className="w-4 h-4" />
            Core Architecture Module
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-brand-dark tracking-tighter leading-none">
            Scale Your <br /><span className="text-brand-blue">Identity.</span>
          </h1>
          <p className="text-xl text-text-secondary font-bold opacity-80 leading-relaxed">
            Initialize your professional deployment architecture. Choose an entry protocol to begin the optimization cycle.
          </p>
        </div>

        {/* --- OPTIONS GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: 'create', label: 'Manual Init', icon: PlusIcon, desc: 'Step-by-step architectural build with deep semantic guidance.', color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
            { id: 'upload', label: 'Legacy Import', icon: CloudArrowUpIcon, desc: 'Neural extraction from existing PDF or DOCX architectures.', color: 'text-brand-success', bg: 'bg-brand-success/10' },
            { id: 'templates', label: 'Vector Gallery', icon: SwatchIcon, desc: 'Direct access to institutional-grade LaTeX deployment nodes.', color: 'text-brand-orange', bg: 'bg-brand-orange/10' }
          ].map((opt, i) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              onClick={() => handleOptionSelect(opt.id as BuilderOption)}
              className={`bg-white border-2 rounded-[2.5rem] p-10 cursor-pointer transition-all duration-500 group relative overflow-hidden flex flex-col justify-between min-h-[400px] ${
                selectedOption === opt.id ? 'border-brand-blue shadow-2xl' : 'border-surface-200 shadow-sm hover:shadow-xl'
              }`}
            >
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-blue/[0.02] rounded-full blur-2xl group-hover:bg-brand-blue/[0.05] transition-all" />
              
              <div className="relative z-10 space-y-8">
                <div className={`w-16 h-16 rounded-2xl ${opt.bg} ${opt.color} flex items-center justify-center border border-current opacity-80 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <opt.icon className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-brand-dark tracking-tight leading-tight group-hover:text-brand-blue transition-colors">
                    {opt.label}
                  </h3>
                  <p className="text-sm font-bold text-text-secondary leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                    {opt.desc}
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-8 border-t border-surface-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest group-hover:text-brand-blue transition-colors">Initialize Protocol</span>
                <ChevronRightIcon className="w-5 h-5 text-text-tertiary group-hover:text-brand-blue group-hover:translate-x-1 transition-all stroke-[3]" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* --- RECENT ARCHITECTURES --- */}
        <div className="bg-white border border-surface-200 rounded-[3rem] p-10 md:p-16 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10 px-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-inner">
                  <CommandLineIcon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-brand-dark tracking-tighter uppercase">Recent Deployments.</h2>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] hover:underline"
              >
                Access Global Archive →
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-surface-50 border border-surface-200 rounded-2xl group hover:border-brand-blue/30 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center text-text-tertiary shadow-sm group-hover:text-brand-blue transition-colors flex-shrink-0">
                      <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-brand-dark truncate group-hover:text-brand-blue transition-colors">Architecture Delta-{i}</p>
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Updated {i * 2}d ago</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}