import React from 'react';
import { useResume } from '../../contexts/ResumeContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { BulletPointEditor } from '../ui/BulletPointEditor';
import { Project } from '../../types';

export default function ProjectsForm() {
  const { resumeData, handleDataChange } = useResume();
  const { projects } = resumeData;

  const updateProjects = (newProjects: Project[]) => {
    handleDataChange('projects', newProjects);
  };

  const handleProjectChange = (index: number, field: keyof Project, value: any) => {
    const updatedProjects = [...(projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    updateProjects(updatedProjects);
  };

  const addProject = () => {
    updateProjects([
      ...(projects || []),
      {
        id: Date.now().toString(),
        name: '',
        description: [], // Now an array for bullet points
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
              <DatePicker
                label="Start Date"
                value={project.startDate || ''}
                onChange={(value) => handleProjectChange(index, 'startDate', value)}
                allowFuture={false}
                helpText="When you started working on this project"
              />
              
              <DatePicker
                label="End Date"
                value={project.endDate || ''}
                onChange={(value) => handleProjectChange(index, 'endDate', value)}
                allowFuture={true}
                helpText="When you completed this project (optional)"
              />
            </div>

            {/* Technologies Used Section */}
            <div className="mb-4 space-y-3">
              <label className="text-sm font-medium text-dark-text-primary">
                Technologies Used
              </label>
              
              {/* Technology Chips Display */}
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {project.technologies.map((tech, techIndex) => (
                    <div 
                      key={techIndex} 
                      className="inline-flex items-center bg-accent-primary/10 text-accent-primary px-3 py-1 rounded-full text-sm font-medium border border-accent-primary/20"
                    >
                      <span>{tech}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newTechnologies = project.technologies?.filter((_, i) => i !== techIndex);
                          handleProjectChange(index, 'technologies', newTechnologies);
                        }}
                        className="ml-2 text-accent-primary/60 hover:text-accent-primary transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Single Input for Adding Technologies */}
              <div>
                <Input
                  placeholder="Type technology and press Enter (e.g., React, Node.js, Python)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !project.technologies?.includes(value)) {
                        const newTechnologies = [...(project.technologies || []), value];
                        handleProjectChange(index, 'technologies', newTechnologies);
                        input.value = '';
                      }
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-dark-text-muted mt-1">
                  Press <kbd className="px-1 py-0.5 bg-dark-tertiary rounded text-xs">Enter</kbd>, <kbd className="px-1 py-0.5 bg-dark-tertiary rounded text-xs">Tab</kbd>, or <kbd className="px-1 py-0.5 bg-dark-tertiary rounded text-xs">,</kbd> to add • Click × on chips to remove
                </p>
              </div>
            </div>

            <BulletPointEditor
              label="Project Description & Achievements *"
              value={Array.isArray(project.description) ? project.description : []}
              onChange={(value) => handleProjectChange(index, 'description', value)}
              placeholder="Describe your role, key challenges solved, technologies used, and measurable outcomes..."
              minItems={1}
              maxItems={6}
              required
              helpText="Use bullet points to highlight your contributions and achievements in this project"
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
        <h4 className="font-medium text-dark-accent mb-2">💡 Tips for Great Project Bullet Points</h4>
        <ul className="text-sm text-dark-text-secondary space-y-1">
          <li>• Start each bullet with an action verb (Built, Developed, Implemented, Designed)</li>
          <li>• Focus on your specific role and contributions to the project</li>
          <li>• Include quantifiable results and impact (e.g., "Improved performance by 40%")</li>
          <li>• Mention key technologies, frameworks, and methodologies used</li>
          <li>• Highlight problems solved and challenges overcome</li>
          <li>• Keep each bullet point concise and impactful (1-2 lines max)</li>
        </ul>
      </div>
    </div>
  );
}