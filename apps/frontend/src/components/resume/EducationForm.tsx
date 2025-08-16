import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DatePicker } from '../ui/DatePicker';
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
              required
              placeholder="e.g., Harvard University, MIT"
            />
            <Input
              label="Degree"
              name="degree"
              value={edu.degree}
              onChange={(e) => handleChange(edu.id, e)}
              required
              placeholder="e.g., Bachelor of Science, Master of Arts"
            />
          </div>
          <Input
            label="Field of Study"
            name="fieldOfStudy"
            value={edu.fieldOfStudy}
            onChange={(e) => handleChange(edu.id, e)}
            required
            placeholder="e.g., Computer Science, Business Administration"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={edu.startDate}
              onChange={(value) => {
                const updatedEducation = education?.map(education =>
                  education.id === edu.id ? { ...education, startDate: value } : education
                );
                handleDataChange('education', updatedEducation);
              }}
              required
              allowFuture={false}
              helpText="When you started this program"
            />
            <DatePicker
              label="End Date"
              value={edu.endDate}
              onChange={(value) => {
                const updatedEducation = education?.map(education =>
                  education.id === edu.id ? { ...education, endDate: value } : education
                );
                handleDataChange('education', updatedEducation);
              }}
              allowFuture={true}
              helpText="When you graduated or expect to graduate"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="GPA"
              name="gpa"
              value={edu.gpa}
              onChange={(e) => handleChange(edu.id, e)}
              placeholder="e.g., 3.8, 3.75 (optional)"
              helpText="Only include if 3.5 or higher"
            />
            <Input
              label="Location"
              name="location"
              value={edu.location}
              onChange={(e) => handleChange(edu.id, e)}
              placeholder="e.g., Cambridge, MA"
              helpText="City and state of the institution (optional)"
            />
          </div>

          {/* Relevant Coursework Section (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-dark-text-primary">
                Relevant Coursework 
                <span className="text-dark-text-muted ml-1">(Optional)</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updatedEducation = education?.map(education =>
                    education.id === edu.id 
                      ? { ...education, coursework: [...(education.coursework || []), ''] }
                      : education
                  );
                  handleDataChange('education', updatedEducation);
                }}
                className="text-accent-primary hover:text-accent-primary/80"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Course
              </Button>
            </div>
            
            {edu.coursework && edu.coursework.length > 0 && (
              <div className="space-y-2">
                {edu.coursework.map((course, courseIndex) => (
                  <div key={courseIndex} className="flex items-center space-x-2">
                    <Input
                      value={course}
                      onChange={(e) => {
                        const newCoursework = [...(edu.coursework || [])];
                        newCoursework[courseIndex] = e.target.value;
                        const updatedEducation = education?.map(education =>
                          education.id === edu.id 
                            ? { ...education, coursework: newCoursework }
                            : education
                        );
                        handleDataChange('education', updatedEducation);
                      }}
                      placeholder="e.g., Advanced Data Structures and Algorithms"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newCoursework = edu.coursework?.filter((_, i) => i !== courseIndex);
                        const updatedEducation = education?.map(education =>
                          education.id === edu.id 
                            ? { ...education, coursework: newCoursework }
                            : education
                        );
                        handleDataChange('education', updatedEducation);
                      }}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {(!edu.coursework || edu.coursework.length === 0) && (
              <p className="text-xs text-dark-text-muted">
                Add specific courses that are relevant to your target position
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="danger" onClick={() => handleRemoveEducation(edu.id!)} className="accent-danger">
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