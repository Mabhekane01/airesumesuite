import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, CommandLineIcon, CheckCircleIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { Project } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProjectsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { projects } = resumeData;

  const updateProjects = (newProjects: Project[]) => handleDataChange('projects', newProjects);

  const handleProjectChange = (index: number, field: keyof Project, value: any) => {
    const updatedProjects = [...(projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    updateProjects(updatedProjects);
  };

  const addProject = () => {
    updateProjects([
      ...(projects || []),
      { id: Date.now().toString(), name: '', description: [], technologies: [], url: '', startDate: '', endDate: '' }
    ]);
  };

  const removeProject = (index: number) => {
    if (projects && projects.length > 1) {
      updateProjects(projects.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
              <CommandLineIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Technical Assets.</h2>
          </div>
          <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
            Showcase of specialized project deployments, architectures, and measurable outcomes.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {(projects || []).map((project, index) => (
            <motion.div 
              key={project.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-white border border-surface-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity text-8xl font-black text-brand-dark">
                0{index + 1}
              </div>

              <div className="relative z-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Architecture Name"
                    value={project.name}
                    onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                    placeholder="e.g. E-commerce Platform Architecture"
                    required
                  />
                  <Input
                    label="Repository/Demo URL"
                    value={project.url || ''}
                    onChange={(e) => handleProjectChange(index, 'url', e.target.value)}
                    placeholder="https://github.com/source"
                    type="url"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Init Date"
                    value={project.startDate || ''}
                    onChange={(value) => handleProjectChange(index, 'startDate', value)}
                  />
                  <DatePicker
                    label="Closure Date"
                    value={project.endDate || ''}
                    onChange={(value) => handleProjectChange(index, 'endDate', value)}
                  />
                </div>

                {/* Tech Stack Chips */}
                <div className="space-y-4 pt-4 border-t border-surface-100">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Integrated Technologies</label>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies?.map((tech, techIndex) => (
                      <span key={techIndex} className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue/5 text-brand-blue border border-brand-blue/10 rounded-xl text-xs font-bold">
                        {tech}
                        <button onClick={() => handleProjectChange(index, 'technologies', project.technologies?.filter((_, i) => i !== techIndex))} className="hover:text-red-500 transition-colors">×</button>
                      </span>
                    ))}
                    <input
                      placeholder="+ Add Tag"
                      onKeyDown={(e) => {
                        if (['Enter', 'Tab', ','].includes(e.key)) {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !project.technologies?.includes(val)) {
                            handleProjectChange(index, 'technologies', [...(project.technologies || []), val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="px-4 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold outline-none focus:border-brand-blue/30 transition-all w-32 shadow-inner"
                    />
                  </div>
                </div>

                <BulletPointEditor
                  label="Mission Description & Technical Yield"
                  value={Array.isArray(project.description) ? project.description : []}
                  onChange={(value) => handleProjectChange(index, 'description', value)}
                  placeholder="Describe technical challenges solved and specific optimizations..."
                  minItems={1}
                  maxItems={6}
                  required
                />

                {projects.length > 1 && (
                  <div className="flex justify-end pt-6 border-t border-surface-100">
                    <button 
                      onClick={() => removeProject(index)} 
                      className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Purge Asset
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addProject}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Technical Asset</span>
      </button>

      {/* Protocol Guidelines */}
      <div className="p-8 bg-brand-blue/[0.03] border border-brand-blue/10 rounded-[2rem] space-y-4">
        <h4 className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] flex items-center gap-2">
          <RocketLaunchIcon className="w-4 h-4" /> Optimization Directives
        </h4>
        <div className="grid md:grid-cols-2 gap-6 text-xs font-bold text-text-secondary leading-relaxed">
          <ul className="space-y-2">
            <li>• Use action-oriented technical verbs (Engineered, Compiled, Optimized).</li>
            <li>• Focus on specific architectural contributions.</li>
            <li>• Quantify results (e.g. "Reduction in latency by 40%").</li>
          </ul>
          <ul className="space-y-2 text-text-tertiary">
            <li>• Integrate primary technical tags for ATS mapping.</li>
            <li>• Isolate complex problems and describe resolved deltas.</li>
            <li>• Limit bullet points to high-density information only.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}