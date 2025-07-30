import { ResumeData } from '../../services/resumeService';
import { getTemplateById, resumeTemplates } from '../../data/resumeTemplates';
import TemplateRenderer from '../resume/TemplateRenderer';

interface ResumeDisplayProps {
  resume: ResumeData;
}

export default function ResumeDisplay({ resume }: ResumeDisplayProps) {
  const template = getTemplateById(resume.templateId) || resumeTemplates[0];

  return (
    <div className="w-full h-full">
      <TemplateRenderer resume={resume} template={template} />
    </div>
  );
}
