import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { PlusIcon, TrashIcon, AcademicCapIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Education } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

export function EducationForm() {
  const { resumeData, handleDataChange } = useResume();
  const { education } = resumeData;

  const handleAddEducation = () => {
    const newEducation: Education = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      graduationDate: '',
      gpa: '',
      coursework: [],
      location: '',
    };
    handleDataChange('education', [...(education || []), newEducation]);
  };

  const handleRemoveEducation = (id: string) => {
    handleDataChange('education', education?.filter(edu => edu.id !== id));
  };

  const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleDataChange('education', education?.map(edu => edu.id === id ? { ...edu, [name]: value } : edu));
  };

  return (
    <div className="space-y-10 animate-slide-up-soft">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-sm">
              <AcademicCapIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-brand-dark tracking-tight leading-none uppercase">Academic Base.</h2>
          </div>
          <p className="text-sm font-bold text-text-secondary opacity-70 ml-1">
            Institutional credentials and qualified educational background.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {education?.map((edu, index) => (
            <motion.div 
              key={edu.id}
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
                    label="Institutional Name"
                    name="institution"
                    value={edu.institution}
                    onChange={(e) => handleChange(edu.id!, e)}
                    required
                    placeholder="e.g. University of Technology"
                  />
                  <Input
                    label="Qualification (Degree)"
                    name="degree"
                    value={edu.degree}
                    onChange={(e) => handleChange(edu.id!, e)}
                    required
                    placeholder="e.g. Bachelor of Science"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    label="Field of Study"
                    name="fieldOfStudy"
                    value={edu.fieldOfStudy}
                    onChange={(e) => handleChange(edu.id!, e)}
                    required
                    placeholder="e.g. Computer Science"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="GPA Index"
                      name="gpa"
                      value={edu.gpa}
                      onChange={(e) => handleChange(edu.id!, e)}
                      placeholder="e.g. 3.8"
                    />
                    <Input
                      label="Geographic Node"
                      name="location"
                      value={edu.location}
                      onChange={(e) => handleChange(edu.id!, e)}
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-surface-100">
                  <DatePicker
                    label="Matriculation Date"
                    value={edu.startDate}
                    onChange={(value) => {
                      handleDataChange('education', education?.map(e => e.id === edu.id ? { ...e, startDate: value } : e));
                    }}
                    required
                  />
                  <DatePicker
                    label="Graduation Date"
                    value={edu.graduationDate}
                    onChange={(value) => {
                      handleDataChange('education', education?.map(e => e.id === edu.id ? { ...e, graduationDate: value } : e));
                    }}
                  />
                </div>

                {/* Coursework Section */}
                <div className="space-y-4 pt-4 border-t border-surface-100">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-brand-dark uppercase tracking-widest">Targeted Coursework</label>
                    <button
                      type="button"
                      onClick={() => {
                        handleDataChange('education', education?.map(e => e.id === edu.id ? { ...e, coursework: [...(e.coursework || []), ''] } : e));
                      }}
                      className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                    >
                      + Add Protocol
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {edu.coursework?.map((course, idx) => (
                      <div key={idx} className="flex items-center gap-2 group/course">
                        <input
                          value={course}
                          onChange={(e) => {
                            const newCoursework = [...(edu.coursework || [])];
                            newCoursework[idx] = e.target.value;
                            handleDataChange('education', education?.map(e => e.id === edu.id ? { ...e, coursework: newCoursework } : e));
                          }}
                          className="input-resume py-3 text-sm flex-1 bg-surface-50 border-surface-100 group-hover/course:border-brand-blue/20 transition-all"
                          placeholder="Role-relevant module..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newCoursework = edu.coursework?.filter((_, i) => i !== idx);
                            handleDataChange('education', education?.map(e => e.id === edu.id ? { ...e, coursework: newCoursework } : e));
                          }}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/course:opacity-100"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-surface-100">
                  <button 
                    onClick={() => handleRemoveEducation(edu.id!)} 
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
        onClick={handleAddEducation}
        className="w-full py-6 border-2 border-dashed border-surface-200 rounded-[2rem] text-text-tertiary hover:text-brand-blue hover:border-brand-blue/30 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 group shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-all">
          <PlusIcon className="w-6 h-6 stroke-[3]" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Initialize New Academic Node</span>
      </button>
    </div>
  );
}