import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Education } from '../../types';

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
      endDate: '',
      gpa: '',
      honors: [],
      courses: [],
      location: '',
    };
    handleDataChange('education', [...(education || []), newEducation]);
  };

  const handleRemoveEducation = (id: string) => {
    handleDataChange('education', education?.filter(edu => edu.id !== id));
  };

  const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedEducation = education?.map(edu =>
      edu.id === id ? { ...edu, [name]: value } : edu
    );
    handleDataChange('education', updatedEducation);
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-xl font-semibold gradient-text-dark mb-4">Education</h2>
        <p className="text-dark-text-secondary mb-6">
          Add your educational background, starting with your highest degree.
        </p>
      </div>

      {education?.map(edu => (
        <div key={edu.id} className="p-6 card-dark rounded-lg space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Institution"
              name="institution"
              value={edu.institution}
              onChange={(e) => handleChange(edu.id, e)}
            />
            <Input
              label="Degree"
              name="degree"
              value={edu.degree}
              onChange={(e) => handleChange(edu.id, e)}
            />
          </div>
          <Input
            label="Field of Study"
            name="fieldOfStudy"
            value={edu.fieldOfStudy}
            onChange={(e) => handleChange(edu.id, e)}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={edu.startDate}
              onChange={(e) => handleChange(edu.id, e)}
            />
            <Input
              label="End Date"
              name="endDate"
              type="date"
              value={edu.endDate}
              onChange={(e) => handleChange(edu.id, e)}
            />
          </div>
          <Input
            label="GPA"
            name="gpa"
            value={edu.gpa}
            onChange={(e) => handleChange(edu.id, e)}
          />
          <div className="flex justify-end">
            <Button variant="danger" onClick={() => handleRemoveEducation(edu.id)} className="accent-danger">
              <TrashIcon className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={handleAddEducation} variant="outline" className="btn-secondary-dark">
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Education
      </Button>
    </div>
  );
}