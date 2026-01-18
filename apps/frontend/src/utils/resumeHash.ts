type HashableValue =
  | string
  | number
  | boolean
  | null
  | HashableValue[]
  | { [key: string]: HashableValue };

const normalizeValue = (value: any): HashableValue | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map(normalizeValue).filter((item) => item !== undefined) as HashableValue[];
  }

  if (typeof value === "object") {
    const normalized: { [key: string]: HashableValue } = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        const normalizedValue = normalizeValue(value[key]);
        if (normalizedValue !== undefined) {
          normalized[key] = normalizedValue;
        }
      });
    return normalized;
  }

  return value as HashableValue;
};

const stableStringify = (value: any): string => {
  const normalized = normalizeValue(value);
  return JSON.stringify(normalized ?? null);
};

const hashString = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 16);
};

export const getResumeHash = (
  resumeData: any,
  aiData?: { optimizedLatexCode?: string; optimizedForJob?: any },
  options?: { templateId?: string }
): string => {
  if (!resumeData) return "";

  const normalized = {
    title: resumeData.title,
    template: resumeData.template,
    templateId: options?.templateId ?? resumeData.templateId ?? resumeData.template,
    targetLocation: resumeData.targetLocation,
    educationLevel: resumeData.educationLevel,
    personalInfo: resumeData.personalInfo,
    professionalSummary: resumeData.professionalSummary,
    workExperience: resumeData.workExperience,
    education: resumeData.education,
    skills: resumeData.skills,
    projects: resumeData.projects,
    certifications: resumeData.certifications,
    languages: resumeData.languages,
    volunteerExperience: resumeData.volunteerExperience,
    awards: resumeData.awards,
    publications: resumeData.publications,
    references: resumeData.references,
    hobbies: resumeData.hobbies,
    additionalSections: resumeData.additionalSections,
    optimizedLatexCode: aiData?.optimizedLatexCode,
    optimizedForJob: aiData?.optimizedForJob
  };

  return hashString(stableStringify(normalized));
};
