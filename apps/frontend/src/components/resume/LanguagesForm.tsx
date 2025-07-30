import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Language } from '../../types';

const proficiencyLevels = [
  { value: 'native', label: 'Native/Bilingual' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'basic', label: 'Basic' }
];

export default function LanguagesForm() {
  const { resumeData, handleDataChange } = useResume();
  const { languages } = resumeData;

  const addLanguage = () => {
    const newLanguage: Language = {
      id: Date.now().toString(),
      name: '',
      proficiency: 'conversational'
    };
    handleDataChange('languages', [...(languages || []), newLanguage]);
  };

  const updateLanguage = (index: number, field: keyof Language, value: string) => {
    const updated = (languages || []).map((language, i) => 
      i === index ? { ...language, [field]: value } : language
    );
    handleDataChange('languages', updated);
  };

  const removeLanguage = (index: number) => {
    const updated = (languages || []).filter((_, i) => i !== index);
    handleDataChange('languages', updated);
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold gradient-text-dark">Languages</h3>
          <p className="text-sm text-dark-text-secondary">List languages you speak and your proficiency level</p>
        </div>
        <Button onClick={addLanguage} variant="outline" size="sm" className="btn-secondary-dark">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Language
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(languages || []).map((language, index) => (
          <Card key={language.id || index} className="card-dark p-4">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-md font-medium text-dark-text-primary">
                Language {index + 1}
              </h4>
              <Button
                onClick={() => removeLanguage(index)}
                variant="outline"
                size="sm"
                className="accent-danger hover:bg-dark-primary/20"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <Input
                label="Language"
                value={language.name}
                onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                placeholder="English, Spanish, French, etc."
              />
              <Select
                label="Proficiency Level"
                value={language.proficiency}
                onChange={(e) => updateLanguage(index, 'proficiency', e.target.value as Language['proficiency'])}
                options={proficiencyLevels}
              />
            </div>
          </Card>
        ))}
      </div>

      {(!languages || languages.length === 0) && (
        <div className="text-center py-8 text-dark-text-muted">
          <p>No languages added yet.</p>
          <Button onClick={addLanguage} className="btn-primary-dark mt-2">
            Add Your First Language
          </Button>
        </div>
      )}
    </div>
  );
}