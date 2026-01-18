import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, HeartIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Input } from '../ui/Input';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { DatePicker } from '../ui/DatePicker';
import { VolunteerExperience } from '../../types';
import { validateDateRange } from '../../utils/formValidation';
import { motion, AnimatePresence } from 'framer-motion';

export default function VolunteerExperienceForm() {
  const { resumeData, handleDataChange } = useResume();
  const { volunteerExperience } = resumeData;
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const addVolunteerExperience = () => {
    const newExperience: VolunteerExperience = {
      id: Date.now().toString(),
      organization: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrentRole: false,
      description: '',
      achievements: []
    };
    handleDataChange('volunteer-experience', [...(volunteerExperience || []), newExperience]);
  };

  const updateVolunteerExperience = (index: number, field: keyof VolunteerExperience, value: any) => {
    const updated = (volunteerExperience || []).map((exp, i) => i === index ? { ...exp, [field]: value } : exp);
    handleDataChange('volunteer-experience', updated);
    if (field === 'startDate' || field === 'endDate') validateDates(index, updated[index]);
  };

  const removeVolunteerExperience = (index: number) => {
    handleDataChange('volunteer-experience', (volunteerExperience || []).filter((_, i) => i !== index));
  };

  const validateDates = (index: number, experience: VolunteerExperience) => {
    const expErrors = { ...errors[index] || {} };
    if (experience.startDate && experience.endDate) {
      const dateErrors = validateDateRange(experience.startDate + '-01', experience.endDate + '-01');
      if (dateErrors.start) expErrors.startDate = 'Start date must precede end date';
    }
    setErrors(prev => ({ ...prev, [index]: expErrors }));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
            <HeartIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Community Impact.</h2>
        </div>
        <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
          Pro-bono contributions, volunteer work, and social alignment architectures.
        </p>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {(volunteerExperience || []).map((exp, index) => (
            <motion.div 
              key={exp.id || index}
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
                    label="Host Organization"
                    value={exp.organization}
                    onChange={(e) => updateVolunteerExperience(index, 'organization', e.target.value)}
                    placeholder="e.g. Red Cross"
                    required
                  />
                  <Input
                    label="Assigned Role"
                    value={exp.role}
                    onChange={(e) => updateVolunteerExperience(index, 'role', e.target.value)}
                    placeholder="e.g. System Admin"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Deployment Node (Location)"
                    value={exp.location}
                    onChange={(e) => updateVolunteerExperience(index, 'location', e.target.value)}
                    placeholder="City, State"
                    required
                  />
                  <div className="flex items-end pb-4">
                    <label className="flex items-center gap-3 cursor-pointer group/check">
                      <input
                        type="checkbox"
                        checked={exp.isCurrentRole}
                        onChange={(e) => updateVolunteerExperience(index, 'isCurrentRole', e.target.checked)}
                        className="w-5 h-5 rounded-lg border-surface-300 text-brand-blue"
                      />
                      <span className="text-sm font-bold text-text-secondary group-hover/check:text-brand-dark transition-colors">Active Assignment</span>
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Initialization Date"
                    value={exp.startDate}
                    onChange={(value) => updateVolunteerExperience(index, 'startDate', value)}
                    error={errors[index]?.startDate}
                  />
                  <DatePicker
                    label="Termination Date"
                    value={exp.endDate || ''}
                    onChange={(value) => updateVolunteerExperience(index, 'endDate', value)}
                    disabled={exp.isCurrentRole}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest ml-1">Mission Abstract</label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => updateVolunteerExperience(index, 'description', e.target.value)}
                    rows={3}
                    className="input-resume py-4"
                    placeholder="Briefly describe the mission protocol..."
                  />
                </div>

                <BulletPointEditor
                  label="Key Deliverables & Impact"
                  value={exp.achievements || []}
                  onChange={(value) => updateVolunteerExperience(index, 'achievements', value)}
                  placeholder="Describe a measurable social optimization..."
                  maxItems={5}
                />

                <div className="flex justify-end pt-6 border-t border-surface-100">
                  <button 
                    onClick={() => removeVolunteerExperience(index)} 
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Purge Archive
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={addVolunteerExperience}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Register New Community Node</span>
      </button>
    </div>
  );
}