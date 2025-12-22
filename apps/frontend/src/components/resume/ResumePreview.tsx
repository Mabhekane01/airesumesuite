import React from 'react';
import { Resume } from '../../types';
import { resumeTemplates, getTemplateById } from '../../data/resumeTemplates';
import TemplateRenderer from './TemplateRenderer';

interface ResumePreviewProps {
  resume: Resume;
  template?: string;
}

export default function ResumePreview({ resume, template }: ResumePreviewProps) {
  const selectedTemplate = getTemplateById(template || resume.template) || resumeTemplates[0];

  return (
    <div className="w-full">
      <TemplateRenderer resume={resume} template={selectedTemplate} />
    </div>
  );
}
