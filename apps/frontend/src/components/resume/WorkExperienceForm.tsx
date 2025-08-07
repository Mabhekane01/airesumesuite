import React, { useState, useEffect } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { DatePicker } from '../ui/DatePicker';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { WorkExperience } from '../../types';
import { validateWorkExperience, ValidationResult } from '../../utils/formValidation';

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
    
    // Validate the updated experience
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      const validation = validateWorkExperience(experienceToValidate);
      setValidationResults(prev => ({
        ...prev,
        [id]: validation
      }));
    }
  };

  const handleCheckboxChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const updatedExperience = workExperience?.map(exp =>
      exp.id === id ? { ...exp, [name]: checked, endDate: checked ? '' : exp.endDate } : exp
    );
    handleDataChange('work-experience', updatedExperience);
    
    // Re-validate after checkbox change
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      const validation = validateWorkExperience(experienceToValidate);
      setValidationResults(prev => ({
        ...prev,
        [id]: validation
      }));
    }
  };
  
  const handleDateChange = (id: string, field: 'startDate' | 'endDate', value: string) => {
    const updatedExperience = workExperience?.map(experience =>
      experience.id === id ? { ...experience, [field]: value } : experience
    );
    handleDataChange('work-experience', updatedExperience);
    
    // Validate the updated experience
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      const validation = validateWorkExperience(experienceToValidate);
      setValidationResults(prev => ({
        ...prev,
        [id]: validation
      }));
    }
  };
  
  const handleBulletPointsChange = (id: string, field: 'responsibilities' | 'achievements', value: string[]) => {
    const updatedExperience = workExperience?.map(experience =>
      experience.id === id ? { ...experience, [field]: value } : experience
    );
    handleDataChange('work-experience', updatedExperience);
    
    // Validate the updated experience
    const experienceToValidate = updatedExperience?.find(exp => exp.id === id);
    if (experienceToValidate) {
      const validation = validateWorkExperience(experienceToValidate);
      setValidationResults(prev => ({
        ...prev,
        [id]: validation
      }));
    }
  };
  
  const getFieldError = (expId: string, fieldName: string): string | undefined => {
    return validationResults[expId]?.errors[fieldName];
  };
  
  const getFieldWarning = (expId: string, fieldName: string): string | undefined => {
    return validationResults[expId]?.warnings[fieldName];
  };

  // Calculate form health
  const totalExperiences = workExperience?.length || 0;
  const validExperiences = Object.values(validationResults).filter(result => result.isValid).length;
  const hasWarnings = Object.values(validationResults).some(result => Object.keys(result.warnings).length > 0);

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-xl font-semibold gradient-text-dark mb-4">Work Experience</h2>
        <p className="text-dark-text-secondary mb-4">
          Add your professional work experience. Start with your most recent position.
        </p>
        
        {totalExperiences > 0 && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              {validExperiences === totalExperiences ? (
                <div className="flex items-center text-green-400">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All entries valid ({validExperiences}/{totalExperiences})
                </div>
              ) : (
                <div className="flex items-center text-amber-400">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                  {validExperiences}/{totalExperiences} entries complete
                </div>
              )}
            </div>
            {hasWarnings && (
              <div className="text-blue-400 text-xs">
                Some suggestions available
              </div>
            )}
          </div>
        )}
      </div>

      {workExperience?.map(exp => (
        <div key={exp.id} className="p-6 card-dark rounded-lg space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              name="jobTitle"
              value={exp.jobTitle}
              onChange={(e) => handleChange(exp.id, e)}
              required
              placeholder="e.g., Software Engineer, Marketing Manager"
              error={getFieldError(exp.id, 'jobTitle')}
            />
            <Input
              label="Company"
              name="company"
              value={exp.company}
              onChange={(e) => handleChange(exp.id, e)}
              required
              placeholder="e.g., Google, Microsoft"
              error={getFieldError(exp.id, 'company')}
            />
          </div>
          <Input
            label="Location"
            name="location"
            value={exp.location}
            onChange={(e) => handleChange(exp.id, e)}
            required
            placeholder="e.g., New York, NY or Remote"
            error={getFieldError(exp.id, 'location')}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={exp.startDate}
              onChange={(value) => handleDateChange(exp.id, 'startDate', value)}
              required
              allowFuture={false}
              helpText="Month and year you started this position"
              error={getFieldError(exp.id, 'startDate')}
            />
            <DatePicker
              label="End Date"
              value={exp.endDate}
              onChange={(value) => handleDateChange(exp.id, 'endDate', value)}
              disabled={exp.isCurrentJob}
              allowFuture={false}
              helpText={exp.isCurrentJob ? "Not required for current position" : "Month and year you ended this position"}
              error={getFieldError(exp.id, 'endDate')}
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
          <BulletPointEditor
            label="Key Responsibilities"
            value={exp.responsibilities || []}
            onChange={(value) => handleBulletPointsChange(exp.id, 'responsibilities', value)}
            placeholder="Describe a key responsibility or duty..."
            required
            minItems={1}
            maxItems={8}
            helpText="Add your main job responsibilities. Use action verbs and be specific."
            error={getFieldError(exp.id, 'responsibilities')}
          />
          <BulletPointEditor
            label="Key Achievements & Results"
            value={exp.achievements || []}
            onChange={(value) => handleBulletPointsChange(exp.id, 'achievements', value)}
            placeholder="Describe a measurable achievement or result..."
            minItems={0}
            maxItems={6}
            helpText={getFieldWarning(exp.id, 'achievements') || "Highlight your accomplishments with metrics when possible (e.g., increased sales by 25%)"}
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