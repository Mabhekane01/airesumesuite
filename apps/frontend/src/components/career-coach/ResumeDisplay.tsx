import { ResumeData } from '../../services/resumeService';
import { Resume } from '../../types';
import { getTemplateById, resumeTemplates } from '../../data/resumeTemplates';
import TemplateRenderer from '../resume/TemplateRenderer';

interface ResumeDisplayProps {
  resume: ResumeData;
}

export default function ResumeDisplay({ resume }: ResumeDisplayProps) {
  const template = getTemplateById(resume.templateId) || resumeTemplates[0];

  // Convert ResumeData to Resume format
  const convertedResume: Resume = {
    id: resume._id,
    template: resume.templateId,
    personalInfo: resume.personalInfo,
    professionalSummary: resume.professionalSummary,
    workExperience: resume.workExperience,
    education: resume.education,
    skills: resume.skills,
    projects: resume.projects || [],
    certifications: resume.certifications || [],
    languages: [], // Convert string[] to Language[] if needed
    volunteerExperience: [],
    awards: [],
    publications: [],
    references: [],
    hobbies: [],
    additionalSections: [],
  };

  return (
    <div className="w-full h-full">
      <TemplateRenderer resume={convertedResume} template={template} />
    </div>
  );
}
