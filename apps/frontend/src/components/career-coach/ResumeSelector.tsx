import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentTextIcon, CalendarIcon, EyeIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useResumeStore } from '../../stores/resumeStore';
import { ResumeData } from '../../services/resumeService';
import { getTemplateById } from '../../data/resumeTemplates';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeSelectorProps {
  onSelectResume: (resume: ResumeData) => void;
}

export default function ResumeSelector({ onSelectResume }: ResumeSelectorProps) {
  const { resumes, fetchResumes, loadingState, error } = useResumeStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const isLoading = loadingState === 'loading';

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleSelect = (resume: ResumeData) => {
    setSelectedId(resume._id!);
    onSelectResume(resume);
  };

  const getResumeStats = (resume: ResumeData) => {
    const workExpCount = resume.workExperience?.length || 0;
    const skillsCount = resume.skills?.length || 0;
    const educationCount = resume.education?.length || 0;
    const completionScore = Math.min(100, (workExpCount * 25) + (skillsCount * 2) + (educationCount * 15));
    
    return { workExpCount, skillsCount, educationCount, completionScore };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-text-tertiary uppercase tracking-widest">Repository Status</p>
            <p className="text-xs md:text-sm font-black text-brand-dark">{resumes.length} <span className="hidden sm:inline">Architectures</span><span className="sm:hidden">Nodes</span> Detected</p>
          </div>
        </div>
        <button
          onClick={() => fetchResumes()}
          disabled={isLoading}
          className={`p-2 rounded-xl transition-all ${isLoading ? 'opacity-50' : 'hover:bg-surface-100 text-text-tertiary hover:text-brand-blue'}`}
        >
          <ArrowPathIcon className={`w-4 h-4 md:w-5 md:h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {resumes.map((resume, index) => {
            const stats = getResumeStats(resume);
            const isSelected = selectedId === resume._id;
            const template = getTemplateById(resume.templateId || '');
            
            return (
              <motion.div
                layout
                key={resume._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(resume)}
                className={`group p-4 md:p-5 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 border-2 relative overflow-hidden ${
                  isSelected
                    ? 'bg-brand-blue/5 border-brand-blue shadow-lg'
                    : 'bg-white border-surface-200 hover:border-brand-blue/30 hover:shadow-md'
                }`}
              >
                <div className="relative z-10 space-y-3 md:space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm md:text-base font-black text-brand-dark tracking-tight truncate group-hover:text-brand-blue transition-colors">
                        {resume.title || 'Untitled Archive'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${
                          isSelected ? 'bg-brand-blue text-white border-brand-blue' : 'bg-surface-100 text-text-tertiary border-surface-200'
                        }`}>
                          {template?.name || 'V-Core 1.0'}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-brand-blue text-white flex items-center justify-center shadow-lg">
                        <CheckCircleIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1 md:gap-2 py-2 md:py-3 border-y border-surface-100 group-hover:border-brand-blue/10 transition-colors">
                    <div className="text-center">
                      <p className="text-[9px] md:text-[10px] font-black text-brand-dark">{stats.workExpCount}</p>
                      <p className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-tighter">Nodes</p>
                    </div>
                    <div className="text-center border-x border-surface-100">
                      <p className="text-[9px] md:text-[10px] font-black text-brand-dark">{stats.skillsCount}</p>
                      <p className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-tighter">Skills</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] md:text-[10px] font-black text-brand-dark">{stats.completionScore}%</p>
                      <p className="text-[7px] md:text-[8px] font-black text-text-tertiary uppercase tracking-tighter">Health</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-text-tertiary font-bold text-[8px] md:text-[9px] uppercase tracking-widest">
                      <CalendarIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      {resume.updatedAt ? new Date(resume.updatedAt).toLocaleDateString() : 'N/A'}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-brand-blue font-black text-[8px] md:text-[9px] uppercase tracking-widest animate-pulse">
                        <SparklesIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        Analyzing...
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!isLoading && resumes.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-surface-50 border border-dashed border-surface-200 flex items-center justify-center mx-auto">
              <DocumentTextIcon className="w-8 h-8 text-text-tertiary opacity-30" />
            </div>
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Null Cluster Detected</p>
            <button 
              onClick={() => navigate('/dashboard/resume/templates')}
              className="text-xs font-black text-brand-blue uppercase tracking-widest hover:underline"
            >
              Initialize New Resume →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}