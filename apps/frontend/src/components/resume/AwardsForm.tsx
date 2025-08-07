import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { DatePicker } from '../ui/DatePicker';
import { Card } from '../ui/Card';
import { Award } from '../../types';

export default function AwardsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { awards } = resumeData;

  const addAward = () => {
    const newAward: Award = {
      id: Date.now().toString(),
      title: '',
      issuer: '',
      date: '',
      description: ''
    };
    handleDataChange('awards', [...(awards || []), newAward]);
  };

  const updateAward = (index: number, field: keyof Award, value: string) => {
    const updated = (awards || []).map((award, i) => 
      i === index ? { ...award, [field]: value } : award
    );
    handleDataChange('awards', updated);
  };

  const removeAward = (index: number) => {
    const updated = (awards || []).filter((_, i) => i !== index);
    handleDataChange('awards', updated);
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold gradient-text-dark">Awards & Honors</h3>
          <p className="text-sm text-dark-text-secondary">Recognition and achievements in your field</p>
        </div>
        <Button onClick={addAward} variant="outline" size="sm" className="btn-secondary-dark">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Award
        </Button>
      </div>

      {(awards || []).map((award, index) => (
        <Card key={award.id || index} className="card-dark p-6">
          <div className="flex items-start justify-between mb-4">
            <h4 className="text-lg font-medium text-dark-text-primary">
              Award {index + 1}
            </h4>
            <Button
              onClick={() => removeAward(index)}
              variant="outline"
              size="sm"
              className="accent-danger hover:bg-dark-primary/20"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Award Title"
              value={award.title}
              onChange={(e) => updateAward(index, 'title', e.target.value)}
              placeholder="e.g., Employee of the Year, Dean's List"
              required
              helpText="The name or title of the award"
            />
            <Input
              label="Issuing Organization"
              value={award.issuer}
              onChange={(e) => updateAward(index, 'issuer', e.target.value)}
              placeholder="e.g., Company, University, Professional Body"
              required
              helpText="Who gave you this award"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <DatePicker
              label="Date Received"
              value={award.date}
              onChange={(value) => updateAward(index, 'date', value)}
              allowFuture={false}
              helpText="When you received this award"
            />
            <div></div>
          </div>

          <Textarea
            label="Description"
            value={award.description || ''}
            onChange={(e) => updateAward(index, 'description', e.target.value)}
            placeholder="Brief description of the award and why it was received..."
            rows={2}
            helpText="Explain the significance of this award (optional)"
            className="mb-4"
          />
        </Card>
      ))}

      {(!awards || awards.length === 0) && (
        <div className="text-center py-8 text-dark-text-muted">
          <p>No awards added yet.</p>
          <Button onClick={addAward} className="btn-primary-dark mt-2">
            Add Your First Award
          </Button>
        </div>
      )}
    </div>
  );
}