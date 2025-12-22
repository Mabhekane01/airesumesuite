import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, GlobeAltIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Language } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const proficiencyLevels = [
  { value: 'native', label: 'Native/Bilingual Protocol' },
  { value: 'fluent', label: 'Fluent Mastery' },
  { value: 'conversational', label: 'Conversational Data' },
  { value: 'basic', label: 'Basic Initialization' }
];

export default function LanguagesForm() {
  const { resumeData, handleDataChange } = useResume();
  const { languages } = resumeData;

  const addLanguage = () => {
    const newLanguage: Language = {
      id: Date.now().toString(),
      name: '',
      proficiency: 'conversational'
    };
    handleDataChange('languages', [...(languages || []), newLanguage]);
  };

  const updateLanguage = (index: number, field: keyof Language, value: string) => {
    const updated = (languages || []).map((language, i) => i === index ? { ...language, [field]: value } : language);
    handleDataChange('languages', updated);
  };

  const removeLanguage = (index: number) => {
    handleDataChange('languages', (languages || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <GlobeAltIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Communication Protocols.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Linguistic dexterity, proficiency levels, and cross-border communication tags.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {(languages || []).map((language, index) => (
            <motion.div 
              key={language.id || index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 bg-white border border-surface-200 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none text-6xl font-black text-brand-dark">
                0{index + 1}
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <h4 className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Linguistic Node</h4>
                  <button onClick={() => removeLanguage(index)} className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Language Identifier"
                    value={language.name}
                    onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                    placeholder="e.g. English"
                    required
                  />
                  <Select
                    label="Proficiency Spectrum"
                    value={language.proficiency}
                    onChange={(e) => updateLanguage(index, 'proficiency', e.target.value as Language['proficiency'])}
                    options={proficiencyLevels}
                    required
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addLanguage}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Linguistic Protocol</span>
      </button>
    </div>
  );
}