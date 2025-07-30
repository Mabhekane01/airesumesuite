import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { VolunteerExperience } from '../../types';

export default function VolunteerExperienceForm() {
  const { resumeData, handleDataChange } = useResume();
  const { volunteerExperience } = resumeData;
  const [achievements, setAchievements] = useState<{ [key: string]: string }>({});

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
  };

  const removeVolunteerExperience = (index: number) => {
    const updated = (volunteerExperience || []).filter((_, i) => i !== index);
    handleDataChange('volunteer-experience', updated);
  };

  const addAchievement = (expIndex: number) => {
    const achievementText = achievements[expIndex]?.trim();
    if (achievementText) {
      const updated = (volunteerExperience || []).map((exp, i) => 
        i === expIndex ? { ...exp, achievements: [...exp.achievements, achievementText] } : exp
      );
      handleDataChange('volunteer-experience', updated);
      setAchievements({ ...achievements, [expIndex]: '' });
    }
  };

  const removeAchievement = (expIndex: number, achievementIndex: number) => {
    const updated = (volunteerExperience || []).map((exp, i) => 
      i === expIndex ? { 
        ...exp, 
        achievements: exp.achievements.filter((_, j) => j !== achievementIndex) 
      } : exp
    );
    handleDataChange('volunteer-experience', updated);
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
              placeholder="Red Cross, Local Food Bank, etc."
            />
            <Input
              label="Role"
              value={experience.role}
              onChange={(e) => updateVolunteerExperience(index, 'role', e.target.value)}
              placeholder="Volunteer Coordinator, Event Organizer"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Location"
              value={experience.location}
              onChange={(e) => updateVolunteerExperience(index, 'location', e.target.value)}
              placeholder="City, State"
            />
            <Input
              label="Start Date"
              type="month"
              value={experience.startDate}
              onChange={(e) => updateVolunteerExperience(index, 'startDate', e.target.value)}
            />
            <div className="space-y-2">
              <Input
                label="End Date"
                type="month"
                value={experience.endDate || ''}
                onChange={(e) => updateVolunteerExperience(index, 'endDate', e.target.value)}
                disabled={experience.isCurrentRole}
              />
              <label className="flex items-center text-sm text-dark-text-secondary">
                <input
                  type="checkbox"
                  checked={experience.isCurrentRole}
                  onChange={(e) => {
                    updateVolunteerExperience(index, 'isCurrentRole', e.target.checked);
                    if (e.target.checked) {
                      updateVolunteerExperience(index, 'endDate', '');
                    }
                  }}
                  className="mr-2 accent-color-dark"
                />
                Current Role
              </label>
            </div>
          </div>

          <div className="mb-4">
            <Textarea
              label="Description"
              value={experience.description}
              onChange={(e) => updateVolunteerExperience(index, 'description', e.target.value)}
              placeholder="Describe your volunteer work and responsibilities..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-2">
              Key Achievements
            </label>
            <div className="space-y-2">
              {experience.achievements.map((achievement, achievementIndex) => (
                <div key={achievementIndex} className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-dark-secondary/20 rounded-md text-sm text-dark-text-primary border border-dark-border">
                    {achievement}
                  </div>
                  <Button
                    onClick={() => removeAchievement(index, achievementIndex)}
                    variant="outline"
                    size="sm"
                    className="accent-danger hover:bg-dark-primary/20"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex space-x-2">
                <Input
                  value={achievements[experience.id || index] || ''}
                  onChange={(e) => setAchievements({ ...achievements, [experience.id || index]: e.target.value })}
                  placeholder="Add an achievement..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAchievement(index);
                    }
                  }}
                />
                <Button onClick={() => addAchievement(index)} size="sm" className="btn-primary-dark">
                  Add
                </Button>
              </div>
            </div>
          </div>
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