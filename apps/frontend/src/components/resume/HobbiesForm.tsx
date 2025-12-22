import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Hobby } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const hobbyCategories = [
  { value: 'creative', label: 'Creative Cluster' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'technology', label: 'Technical Interests' },
  { value: 'volunteer', label: 'Community Service' },
  { value: 'other', label: 'Miscellaneous Nodes' }
];

export default function HobbiesForm() {
  const { resumeData, handleDataChange } = useResume();
  const { hobbies } = resumeData;

  const addHobby = () => {
    const newHobby: Hobby = {
      id: Date.now().toString(),
      name: '',
      description: '',
      category: 'other'
    };
    handleDataChange('hobbies', [...(hobbies || []), newHobby]);
  };

  const updateHobby = (index: number, field: keyof Hobby, value: string) => {
    const updated = (hobbies || []).map((hobby, i) => i === index ? { ...hobby, [field]: value } : hobby);
    handleDataChange('hobbies', updated);
  };

  const removeHobby = (index: number) => {
    handleDataChange('hobbies', (hobbies || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Interests.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Ancillary attributes, personal interests, and personality-driven career nodes.
        </p>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {(hobbies || []).map((hobby, index) => (
            <motion.div 
              key={hobby.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-white border border-surface-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none text-8xl font-black text-brand-dark">
                0{index + 1}
              </div>

              <div className="relative z-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Interest Identifier"
                    value={hobby.name}
                    onChange={(e) => updateHobby(index, 'name', e.target.value)}
                    placeholder="e.g. Photography"
                    required
                  />
                  <Select
                    label="Node Category"
                    value={hobby.category}
                    onChange={(e) => updateHobby(index, 'category', e.target.value as Hobby['category'])}
                    options={hobbyCategories}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Contextual Description</label>
                  <textarea
                    value={hobby.description || ''}
                    onChange={(e) => updateHobby(index, 'description', e.target.value)}
                    rows={2}
                    className="input-resume py-4 bg-surface-50"
                    placeholder="Briefly describe your involvement..."
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-surface-100">
                  <button 
                    onClick={() => removeHobby(index)} 
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Purge Interest
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addHobby}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Personal Node</span>
      </button>
    </div>
  );
}