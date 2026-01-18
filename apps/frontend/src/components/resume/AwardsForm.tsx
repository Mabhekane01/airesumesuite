import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, StarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { Award } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export default function AwardsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { awards } = resumeData;

  const addAward = () => {
    const newAward: Award = {
      id: Date.now().toString(),
      title: '',
      issuer: '',
      date: '',
      description: ''
    };
    handleDataChange('awards', [...(awards || []), newAward]);
  };

  const updateAward = (index: number, field: keyof Award, value: string) => {
    const updated = (awards || []).map((award, i) => i === index ? { ...award, [field]: value } : award);
    handleDataChange('awards', updated);
  };

  const removeAward = (index: number) => {
    handleDataChange('awards', (awards || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <StarIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Recognition.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Merit-based accolades, industry honors, and professional milestones.
        </p>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {(awards || []).map((award, index) => (
            <motion.div 
              key={award.id || index}
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
                    label="Accolade Title"
                    value={award.title}
                    onChange={(e) => updateAward(index, 'title', e.target.value)}
                    placeholder="e.g. Employee of the Year"
                    required
                  />
                  <Input
                    label="Issuing Authority"
                    value={award.issuer}
                    onChange={(e) => updateAward(index, 'issuer', e.target.value)}
                    placeholder="e.g. Global Tech Corp"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Recognition Date"
                    value={award.date}
                    onChange={(value) => updateAward(index, 'date', value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Contextual Description</label>
                  <textarea
                    value={award.description || ''}
                    onChange={(e) => updateAward(index, 'description', e.target.value)}
                    rows={2}
                    className="input-resume py-4"
                    placeholder="Briefly describe the significance of this award..."
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-surface-100">
                  <button 
                    onClick={() => removeAward(index)} 
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Purge Record
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addAward}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Accolade Node</span>
      </button>
    </div>
  );
}