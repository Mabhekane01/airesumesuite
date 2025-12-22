import React, { useState, useEffect } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { DatePicker } from '../ui/DatePicker';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, BriefcaseIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { WorkExperience } from '../../types';
import { validateWorkExperience, ValidationResult } from '../../utils/formValidation';
import { motion, AnimatePresence } from 'framer-motion';

export function WorkExperienceForm() {
  const { resumeData, handleDataChange } = useResume();
  const { workExperience } = resumeData;
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  const handleAddExperience = () => {
    const newExperience: WorkExperience = {
      id: Date.now().toString(),
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrentJob: false,
      responsibilities: [],
      achievements: [],
    };
    handleDataChange('work-experience', [...(workExperience || []), newExperience]);
  };

  const handleRemoveExperience = (id: string) => {
    handleDataChange('work-experience', workExperience?.filter(exp => exp.id !== id));
  };

  const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedExperience = workExperience?.map(exp =>
      exp.id === id ? { ...exp, [name]: value } : exp
    );
    handleDataChange('work-experience', updatedExperience);
    
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      setValidationResults(prev => ({ ...prev, [id]: validateWorkExperience(experienceToValidate) }));
    }
  };

  const handleCheckboxChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const updatedExperience = workExperience?.map(exp =>
      exp.id === id ? { ...exp, [name]: checked, endDate: checked ? '' : exp.endDate } : exp
    );
    handleDataChange('work-experience', updatedExperience);
    
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      setValidationResults(prev => ({ ...prev, [id]: validateWorkExperience(experienceToValidate) }));
    }
  };
  
  const handleDateChange = (id: string, field: 'startDate' | 'endDate', value: string) => {
    const updatedExperience = workExperience?.map(experience =>
      experience.id === id ? { ...experience, [field]: value } : experience
    );
    handleDataChange('work-experience', updatedExperience);
    
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      setValidationResults(prev => ({ ...prev, [id]: validateWorkExperience(experienceToValidate) }));
    }
  };
  
  const handleBulletPointsChange = (id: string, field: 'responsibilities' | 'achievements', value: string[]) => {
    const updatedExperience = workExperience?.map(experience =>
      experience.id === id ? { ...experience, [field]: value } : experience
    );
    handleDataChange('work-experience', updatedExperience);
    
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      setValidationResults(prev => ({ ...prev, [id]: validateWorkExperience(experienceToValidate) }));
    }
  };
  
  const getFieldError = (expId: string, fieldName: string): string | undefined => validationResults[expId]?.errors[fieldName];
  const getFieldWarning = (expId: string, fieldName: string): string | undefined => validationResults[expId]?.warnings[fieldName];

  const totalExperiences = workExperience?.length || 0;
  const validExperiences = Object.values(validationResults).filter(result => result.isValid).length;

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
              <BriefcaseIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Experience Nodes.</h2>
          </div>
          <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
            Chronological history of your professional deployments and technical impact.
          </p>
        </div>

        {totalExperiences > 0 && (
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-all ${
            validExperiences === totalExperiences ? 'bg-brand-success/5 border-brand-success/20 text-brand-success' : 'bg-brand-orange/5 border-brand-orange/20 text-brand-orange'
          }`}>
            {validExperiences === totalExperiences ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationTriangleIcon className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{validExperiences}/{totalExperiences} Nodes Validated</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {workExperience?.map((exp, index) => (
            <motion.div 
              key={exp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-white border border-surface-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-brand-blue/30 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                <span className="text-8xl font-black text-brand-dark">0{index + 1}</span>
              </div>

              <div className="relative z-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Deployment Title"
                    name="jobTitle"
                    value={exp.jobTitle}
                    onChange={(e) => handleChange(exp.id, e)}
                    required
                    placeholder="e.g. Principal Engineer"
                    error={getFieldError(exp.id, 'jobTitle')}
                  />
                  <Input
                    label="Host Entity (Company)"
                    name="company"
                    value={exp.company}
                    onChange={(e) => handleChange(exp.id, e)}
                    required
                    placeholder="e.g. Global Tech Corp"
                    error={getFieldError(exp.id, 'company')}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Geographic Node"
                    name="location"
                    value={exp.location}
                    onChange={(e) => handleChange(exp.id, e)}
                    required
                    placeholder="City, Country or Remote"
                    error={getFieldError(exp.id, 'location')}
                  />
                  <div className="flex items-end pb-4">
                    <label className="flex items-center gap-3 cursor-pointer group/check">
                      <input
                        type="checkbox"
                        id={`currentJob-${exp.id}`}
                        name="isCurrentJob"
                        checked={exp.isCurrentJob}
                        onChange={(e) => handleCheckboxChange(exp.id, e)}
                        className="w-5 h-5 rounded-lg border-surface-300 text-brand-blue focus:ring-brand-blue/20 transition-all cursor-pointer"
                      />
                      <span className="text-sm font-bold text-text-secondary group-hover/check:text-brand-dark transition-colors">Active Deployment</span>
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Initialization Date"
                    value={exp.startDate}
                    onChange={(value) => handleDateChange(exp.id, 'startDate', value)}
                    required
                    error={getFieldError(exp.id, 'startDate')}
                  />
                  <DatePicker
                    label="Termination Date"
                    value={exp.endDate}
                    onChange={(value) => handleDateChange(exp.id, 'endDate', value)}
                    disabled={exp.isCurrentJob}
                    error={getFieldError(exp.id, 'endDate')}
                  />
                </div>

                <div className="space-y-12 pt-6 border-t border-surface-100">
                  <BulletPointEditor
                    label="Core Responsibilities"
                    value={exp.responsibilities || []}
                    onChange={(value) => handleBulletPointsChange(exp.id, 'responsibilities', value)}
                    placeholder="Describe a key protocol or directive..."
                    required
                    minItems={1}
                    maxItems={8}
                    error={getFieldError(exp.id, 'responsibilities')}
                  />
                  <BulletPointEditor
                    label="Technical Achievements & Yield"
                    value={exp.achievements || []}
                    onChange={(value) => handleBulletPointsChange(exp.id, 'achievements', value)}
                    placeholder="Describe a measurable result or optimization..."
                    minItems={0}
                    maxItems={6}
                    helpText={getFieldWarning(exp.id, 'achievements')}
                  />
                </div>

                <div className="flex justify-end pt-6 border-t border-surface-100">
                  <button 
                    onClick={() => handleRemoveExperience(exp.id)} 
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Purge Node
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={handleAddExperience}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Initialize New Experience Node</span>
      </button>
    </div>
  );
}