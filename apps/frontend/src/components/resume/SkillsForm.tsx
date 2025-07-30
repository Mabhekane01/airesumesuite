import React, { useState } from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Skill } from '../../types';

export function SkillsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { skills } = resumeData;
  const [newSkill, setNewSkill] = useState('');
  const [category, setCategory] = useState('technical');

  const handleAddSkill = () => {
    if (newSkill.trim() === '') return;
    const newSkillData: Skill = {
      id: Date.now().toString(),
      name: newSkill,
      category: category,
    };
    handleDataChange('skills', [...(skills || []), newSkillData]);
    setNewSkill('');
  };

  const handleRemoveSkill = (id: string) => {
    handleDataChange('skills', skills?.filter(skill => skill.id !== id));
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-xl font-semibold gradient-text-dark mb-4">Skills</h2>
        <p className="text-dark-text-secondary mb-6">
          Add your technical skills, soft skills, languages, and certifications.
        </p>
      </div>

      <div className="p-6 card-dark rounded-lg">
        <div className="flex items-end gap-4">
          <div className="flex-grow">
            <Input
              label="New Skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-dark-text-primary">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field-dark mt-1 block w-full pl-3 pr-10 py-2 text-base sm:text-sm rounded-md"
            >
              <option>technical</option>
              <option>soft</option>
              <option>language</option>
            </select>
          </div>
          <Button onClick={handleAddSkill} className="btn-primary-dark">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {['technical', 'soft', 'language'].map(cat => {
          const categorySkills = skills?.filter(skill => skill.category === cat);
          if (!categorySkills || categorySkills.length === 0) return null;

          return (
            <div key={cat}>
              <h3 className="text-lg font-medium text-dark-text-primary capitalize mb-2">{cat} Skills</h3>
              <div className="flex flex-wrap gap-2">
                {categorySkills.map(skill => (
                  <span key={skill.id} className="inline-flex items-center py-1 pl-3 pr-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                    {skill.name}
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="ml-2 flex-shrink-0 h-5 w-5 rounded-full inline-flex items-center justify-center text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 focus:outline-none focus:bg-blue-500 focus:text-white transition-colors"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}