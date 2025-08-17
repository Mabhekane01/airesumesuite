import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Hobby } from '../../types';

const hobbyCategories = [
  { value: 'creative', label: 'Creative' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'technology', label: 'Technology' },
  { value: 'volunteer', label: 'Volunteer & Community' },
  { value: 'other', label: 'Other' }
];

export default function HobbiesForm() {
  const { resumeData, handleDataChange } = useResume();
  const { hobbies } = resumeData;

  const addHobby = () => {
    const newHobby: Hobby = {
      id: Date.now().toString(),
      name: '',
      description: '',
      category: 'other'
    };
    handleDataChange('hobbies', [...(hobbies || []), newHobby]);
  };

  const updateHobby = (index: number, field: keyof Hobby, value: string) => {
    const updated = (hobbies || []).map((hobby, i) => 
      i === index ? { ...hobby, [field]: value } : hobby
    );
    handleDataChange('hobbies', updated);
  };

  const removeHobby = (index: number) => {
    const updated = (hobbies || []).filter((_, i) => i !== index);
    handleDataChange('hobbies', updated);
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold gradient-text-dark">Hobbies & Interests</h3>
          <p className="text-sm text-dark-text-secondary">Share your personal interests and hobbies</p>
        </div>
        <Button onClick={addHobby} variant="outline" size="sm" className="btn-secondary-dark">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Hobby
        </Button>
      </div>

      {(hobbies || []).map((hobby, index) => (
        <Card key={hobby.id || index} className="card-dark p-6">
          <div className="flex items-start justify-between mb-4">
            <h4 className="text-lg font-medium text-dark-text-primary">
              Hobby {index + 1}
            </h4>
            <Button
              onClick={() => removeHobby(index)}
              variant="outline"
              size="sm"
              className="accent-danger hover:bg-gray-900/20"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Hobby/Interest"
              value={hobby.name}
              onChange={(e) => updateHobby(index, 'name', e.target.value)}
              placeholder="e.g., Photography, Basketball, Coding"
              required
              helpText="Name of your hobby or interest"
            />
            <Select
              label="Category"
              value={hobby.category}
              onChange={(e) => updateHobby(index, 'category', e.target.value as Hobby['category'])}
              options={hobbyCategories}
              helpText="Choose the most relevant category"
            />
          </div>

          <Textarea
            label="Description"
            value={hobby.description || ''}
            onChange={(e) => updateHobby(index, 'description', e.target.value)}
            placeholder="Brief description of your involvement or achievements..."
            rows={2}
            helpText="Optional: Describe your level of involvement (optional)"
            className="mb-4"
          />
        </Card>
      ))}

      {(!hobbies || hobbies.length === 0) && (
        <div className="text-center py-8 text-dark-text-muted">
          <p>No hobbies added yet.</p>
          <Button onClick={addHobby} className="btn-primary-dark mt-2">
            Add Your First Hobby
          </Button>
        </div>
      )}
    </div>
  );
}