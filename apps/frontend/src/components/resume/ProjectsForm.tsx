import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Project } from '../../types';

export default function ProjectsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { projects } = resumeData;

  const updateProjects = (newProjects: Project[]) => {
    handleDataChange('projects', newProjects);
  };

  const handleProjectChange = (index: number, field: keyof Project, value: any) => {
    const updatedProjects = [...(projects || [])];
    if (field === 'technologies' && typeof value === 'string') {
      updatedProjects[index] = {
        ...updatedProjects[index],
        [field]: value.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0)
      };
    } else {
      updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    }
    updateProjects(updatedProjects);
  };

  const addProject = () => {
    updateProjects([
      ...(projects || []),
      {
        id: Date.now().toString(),
        name: '',
        description: '',
        technologies: [],
        url: '',
        startDate: '',
        endDate: ''
      }
    ]);
  };

  const removeProject = (index: number) => {
    if (projects && projects.length > 1) {
      updateProjects(projects.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6 animate-slide-up-soft">
      <div>
        <h2 className="text-2xl font-bold gradient-text-dark mb-2">Projects</h2>
        <p className="text-dark-text-secondary">
          Showcase your key projects, highlighting your role, technologies used, and outcomes achieved.
        </p>
      </div>

      <div className="space-y-6">
        {(projects || []).map((project, index) => (
          <Card key={project.id || index} className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text-primary">
                Project {index + 1}
              </h3>
              {projects && projects.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeProject(index)}
                  className="accent-danger hover:bg-dark-primary/20"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Project Name *"
                value={project.name}
                onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                placeholder="e.g., E-commerce Platform Redesign"
                required
              />
              
              <Input
                label="Project URL"
                value={project.url || ''}
                onChange={(e) => handleProjectChange(index, 'url', e.target.value)}
                placeholder="https://project-demo.com"
                type="url"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Start Date"
                value={project.startDate || ''}
                onChange={(e) => handleProjectChange(index, 'startDate', e.target.value)}
                type="month"
              />
              
              <Input
                label="End Date"
                value={project.endDate || ''}
                onChange={(e) => handleProjectChange(index, 'endDate', e.target.value)}
                type="month"
              />
            </div>

            <div className="mb-4">
              <Input
                label="Technologies Used"
                value={project.technologies.join(', ')}
                onChange={(e) => handleProjectChange(index, 'technologies', e.target.value)}
                placeholder="e.g., React, Node.js, MongoDB, AWS"
              />
              <p className="text-sm text-dark-text-muted mt-1">
                Separate technologies with commas
              </p>
            </div>

            <Textarea
              label="Project Description *"
              value={project.description}
              onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
              placeholder="Describe the project goals, your role, key challenges solved, and measurable outcomes..."
              rows={4}
              required
            />
          </Card>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addProject}
        className="btn-secondary-dark w-full"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Another Project
      </Button>

      <div className="glass-dark p-4 rounded-lg border border-dark-border">
        <h4 className="font-medium text-dark-accent mb-2">💡 Tips for Great Project Descriptions</h4>
        <ul className="text-sm text-dark-text-secondary space-y-1">
          <li>• Focus on problems solved and impact achieved</li>
          <li>• Include specific technologies and methodologies used</li>
          <li>• Quantify results where possible (performance improvements, user growth, etc.)</li>
          <li>• Mention your specific role and contributions to team projects</li>
        </ul>
      </div>
    </div>
  );
}