import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { PlusIcon, XMarkIcon, CpuChipIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Skill } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export function SkillsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { skills } = resumeData;
  const [newSkill, setNewSkill] = useState('');
  const [category, setCategory] = useState('technical');

  const handleAddSkill = () => {
    if (newSkill.trim() === '') return;
    const newSkillData: Skill = {
      id: Date.now().toString(),
      name: newSkill,
      category: category as Skill['category'],
    };
    handleDataChange('skills', [...(skills || []), newSkillData]);
    setNewSkill('');
  };

  const handleRemoveSkill = (id: string) => {
    handleDataChange('skills', skills?.filter(skill => skill.id !== id));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
              <CpuChipIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Technical Stack.</h2>
          </div>
          <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
            Core competencies, linguistic dexterity, and specialized protocol proficiency.
          </p>
        </div>
      </div>

      {/* Input Console */}
      <div className="bg-white border border-surface-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.1]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 w-full">
            <Input
              label="Attribute Identifier"
              placeholder="e.g. React, Python, Cloud Architecture"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-resume py-4 appearance-none cursor-pointer"
            >
              <option value="technical">Technical</option>
              <option value="soft">Soft Skill</option>
              <option value="language">Language</option>
            </select>
          </div>
          <button 
            onClick={handleAddSkill} 
            className="btn-primary px-8 py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 active:scale-95 transition-all"
          >
            Deploy Tag
          </button>
        </div>
      </div>

      {/* Clusters */}
      <div className="space-y-8">
        {['technical', 'soft', 'language'].map(cat => {
          const categorySkills = skills?.filter(skill => skill.category === cat);
          if (!categorySkills || categorySkills.length === 0) return null;

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-xs font-black text-brand-dark uppercase tracking-[0.3em]">{cat} Cluster</h3>
                <div className="flex-1 h-px bg-surface-100" />
              </div>
              <div className="flex flex-wrap gap-3">
                <AnimatePresence>
                  {categorySkills.map(skill => (
                    <motion.span 
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex items-center py-2 px-4 bg-white border border-surface-200 text-brand-dark rounded-xl text-sm font-bold shadow-sm group hover:border-brand-blue/30 transition-all cursor-default"
                    >
                      {skill.name}
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="ml-3 p-1 rounded-md text-text-tertiary hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <XMarkIcon className="h-3.5 w-3.5 stroke-[3]" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}