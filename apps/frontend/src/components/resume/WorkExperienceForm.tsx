import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { WorkExperience } from '../../types';

export function WorkExperienceForm() {
  const { resumeData, handleDataChange } = useResume();
  const { workExperience } = resumeData;

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
  };

  const handleCheckboxChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const updatedExperience = workExperience?.map(exp =>
      exp.id === id ? { ...exp, [name]: checked, endDate: checked ? '' : exp.endDate } : exp
    );
    handleDataChange('work-experience', updatedExperience);
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-xl font-semibold gradient-text-dark mb-4">Work Experience</h2>
        <p className="text-dark-text-secondary mb-6">
          Add your professional work experience. Start with your most recent position.
        </p>
      </div>

      {workExperience?.map(exp => (
        <div key={exp.id} className="p-6 card-dark rounded-lg space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              name="jobTitle"
              value={exp.jobTitle}
              onChange={(e) => handleChange(exp.id, e)}
            />
            <Input
              label="Company"
              name="company"
              value={exp.company}
              onChange={(e) => handleChange(exp.id, e)}
            />
          </div>
          <Input
            label="Location"
            name="location"
            value={exp.location}
            onChange={(e) => handleChange(exp.id, e)}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={exp.startDate}
              onChange={(e) => handleChange(exp.id, e)}
            />
            <Input
              label="End Date"
              name="endDate"
              type="date"
              value={exp.endDate}
              onChange={(e) => handleChange(exp.id, e)}
              disabled={exp.isCurrentJob}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`currentJob-${exp.id}`}
              name="isCurrentJob"
              checked={exp.isCurrentJob}
              onChange={(e) => handleCheckboxChange(exp.id, e)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-dark-border bg-dark-secondary rounded"
            />
            <label htmlFor={`currentJob-${exp.id}`} className="ml-2 block text-sm text-dark-text-primary">
              I currently work here
            </label>
          </div>
          <Textarea
            label="Responsibilities"
            name="responsibilities"
            value={exp.responsibilities.join('\n')}
            onChange={(e) => {
              const { name, value } = e.target;
              const updatedExperience = workExperience?.map(experience =>
                experience.id === exp.id ? { ...experience, [name]: value.split('\n') } : experience
              );
              handleDataChange('work-experience', updatedExperience);
            }}
            placeholder="Enter each responsibility on a new line."
          />
          <Textarea
            label="Achievements"
            name="achievements"
            value={exp.achievements.join('\n')}
            onChange={(e) => {
              const { name, value } = e.target;
              const updatedExperience = workExperience?.map(experience =>
                experience.id === exp.id ? { ...experience, [name]: value.split('\n') } : experience
              );
              handleDataChange('work-experience', updatedExperience);
            }}
            placeholder="Enter each achievement on a new line."
          />
          <div className="flex justify-end">
            <Button variant="danger" onClick={() => handleRemoveExperience(exp.id)} className="accent-danger">
              <TrashIcon className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={handleAddExperience} variant="outline" className="btn-secondary-dark">
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Experience
      </Button>
    </div>
  );
}