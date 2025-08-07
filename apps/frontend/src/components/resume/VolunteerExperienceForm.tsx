import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { DatePicker } from '../ui/DatePicker';
import { Card } from '../ui/Card';
import { VolunteerExperience } from '../../types';
import { validateDateRange } from '../../utils/formValidation';

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
    const updated = (volunteerExperience || []).map((exp, i) => 
      i === index ? { ...exp, [field]: value } : exp
    );
    handleDataChange('volunteer-experience', updated);
    
    // Validate dates if they change
    if (field === 'startDate' || field === 'endDate') {
      validateDates(index, updated[index]);
    }
  };

  const removeVolunteerExperience = (index: number) => {
    const updated = (volunteerExperience || []).filter((_, i) => i !== index);
    handleDataChange('volunteer-experience', updated);
  };

  const validateDates = (index: number, experience: VolunteerExperience) => {
    const expErrors = { ...errors[index] || {} };
    
    if (experience.startDate && experience.endDate) {
      const dateErrors = validateDateRange(experience.startDate + '-01', experience.endDate + '-01');
      if (dateErrors.start) expErrors.startDate = 'Start date cannot be after end date';
      if (dateErrors.end) expErrors.endDate = 'End date cannot be before start date';
    }
    
    setErrors(prev => ({
      ...prev,
      [index]: Object.keys(expErrors).length > 0 ? expErrors : {}
    }));
  };

  const getFieldError = (index: number, field: string): string | undefined => {
    return errors[index]?.[field];
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold gradient-text-dark">Volunteer Experience</h3>
          <p className="text-sm text-dark-text-secondary">Add your volunteer work and community involvement</p>
        </div>
        <Button onClick={addVolunteerExperience} variant="outline" size="sm" className="btn-secondary-dark">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Experience
        </Button>
      </div>

      {(volunteerExperience || []).map((experience, index) => (
        <Card key={experience.id || index} className="card-dark p-6">
          <div className="flex items-start justify-between mb-4">
            <h4 className="text-lg font-medium text-dark-text-primary">
              Volunteer Experience {index + 1}
            </h4>
            <Button
              onClick={() => removeVolunteerExperience(index)}
              variant="outline"
              size="sm"
              className="accent-danger hover:bg-dark-primary/20"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Organization"
              value={experience.organization}
              onChange={(e) => updateVolunteerExperience(index, 'organization', e.target.value)}
              placeholder="e.g., Red Cross, Local Food Bank"
              required
            />
            <Input
              label="Role"
              value={experience.role}
              onChange={(e) => updateVolunteerExperience(index, 'role', e.target.value)}
              placeholder="e.g., Volunteer Coordinator, Event Organizer"
              required
            />
          </div>

          <Input
            label="Location"
            value={experience.location}
            onChange={(e) => updateVolunteerExperience(index, 'location', e.target.value)}
            placeholder="City, State"
            required
            className="mb-4"
          />

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <DatePicker
              label="Start Date"
              value={experience.startDate}
              onChange={(value) => updateVolunteerExperience(index, 'startDate', value)}
              allowFuture={false}
              helpText="When you started volunteering"
              error={getFieldError(index, 'startDate')}
            />
            <DatePicker
              label="End Date"
              value={experience.endDate || ''}
              onChange={(value) => updateVolunteerExperience(index, 'endDate', value)}
              disabled={experience.isCurrentRole}
              allowFuture={false}
              helpText={experience.isCurrentRole ? "Not required for current role" : "When you stopped volunteering"}
              error={getFieldError(index, 'endDate')}
            />
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id={`currentRole-${experience.id}`}
              checked={experience.isCurrentRole}
              onChange={(e) => {
                updateVolunteerExperience(index, 'isCurrentRole', e.target.checked);
                if (e.target.checked) {
                  updateVolunteerExperience(index, 'endDate', '');
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-dark-border bg-dark-secondary rounded"
            />
            <label htmlFor={`currentRole-${experience.id}`} className="ml-2 block text-sm text-dark-text-primary">
              I currently volunteer here
            </label>
          </div>

          <Textarea
            label="Description"
            value={experience.description}
            onChange={(e) => updateVolunteerExperience(index, 'description', e.target.value)}
            placeholder="Describe your volunteer work and responsibilities..."
            rows={3}
            helpText="Briefly describe your volunteer role and main activities"
            className="mb-4"
          />

          <BulletPointEditor
            label="Key Achievements & Impact"
            value={experience.achievements || []}
            onChange={(value) => updateVolunteerExperience(index, 'achievements', value)}
            placeholder="Describe a specific achievement or impact you made..."
            minItems={0}
            maxItems={5}
            helpText="Highlight the positive impact of your volunteer work (optional)"
          />
        </Card>
      ))}

      {(!volunteerExperience || volunteerExperience.length === 0) && (
        <div className="text-center py-8 text-dark-text-muted">
          <p>No volunteer experience added yet.</p>
          <Button onClick={addVolunteerExperience} className="btn-primary-dark mt-2">
            Add Your First Volunteer Experience
          </Button>
        </div>
      )}
    </div>
  );
}