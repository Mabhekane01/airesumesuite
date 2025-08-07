import mongoose from 'mongoose';
import { safeParseDate } from './dateHandler';

/**
 * Shared utility for processing and sanitizing resume data
 * Used by both createResume and updateResume methods
 */

/**
 * Validates and converts user ID to ObjectId
 */
export function validateUserId(userId: any): mongoose.Types.ObjectId {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }
  
  try {
    return new mongoose.Types.ObjectId(userId);
  } catch (error) {
    throw new Error('Invalid user ID format');
  }
}

/**
 * Sanitizes and processes education data
 */
export function processEducationData(educationData: any[]): any[] {
  if (!Array.isArray(educationData)) return [];
  
  return educationData.map((edu: any) => ({
    institution: edu.institution || '',
    degree: edu.degree || '',
    fieldOfStudy: edu.fieldOfStudy || '',
    startDate: safeParseDate(edu.startDate),
    endDate: safeParseDate(edu.endDate),
    graduationDate: safeParseDate(edu.graduationDate || edu.endDate), // Use endDate as graduation fallback
    location: edu.location || undefined,
    gpa: edu.gpa || undefined,
    honors: Array.isArray(edu.honors) ? edu.honors.filter(h => h) : [],
    courses: Array.isArray(edu.courses) ? edu.courses.filter(c => c) : []
  }));
}

/**
 * Sanitizes and processes work experience data
 */
export function processWorkExperienceData(workData: any[]): any[] {
  if (!Array.isArray(workData)) return [];
  
  return workData.map((work: any) => ({
    jobTitle: work.jobTitle || work.position || '',
    company: work.company || '',
    location: work.location || '',
    startDate: safeParseDate(work.startDate) || new Date(),
    endDate: work.endDate && !work.isCurrentJob ? safeParseDate(work.endDate) : undefined,
    isCurrentJob: Boolean(work.isCurrentJob),
    responsibilities: Array.isArray(work.responsibilities) ? work.responsibilities.filter(r => r) : [],
    achievements: Array.isArray(work.achievements) ? work.achievements.filter(a => a) : []
  }));
}

/**
 * Sanitizes and processes skills data
 */
export function processSkillsData(skillsData: any[]): any[] {
  if (!Array.isArray(skillsData)) return [];
  
  return skillsData.map((skill: any) => ({
    name: skill.name || '',
    category: skill.category || 'technical',
    proficiencyLevel: skill.proficiencyLevel || undefined
  }));
}

/**
 * Sanitizes and processes projects data
 */
export function processProjectsData(projectsData: any[]): any[] {
  if (!Array.isArray(projectsData)) return [];
  
  return projectsData.map((project: any) => ({
    name: project.name || '',
    description: project.description || '',
    technologies: Array.isArray(project.technologies) ? project.technologies.filter(t => t) : [],
    url: project.url || undefined,
    startDate: safeParseDate(project.startDate),
    endDate: safeParseDate(project.endDate)
  }));
}

/**
 * Sanitizes and processes certifications data
 */
export function processCertificationsData(certificationsData: any[]): any[] {
  if (!Array.isArray(certificationsData)) return [];
  
  return certificationsData.map((cert: any) => ({
    name: cert.name || '',
    issuer: cert.issuer || '',
    date: safeParseDate(cert.date) || new Date(),
    expirationDate: safeParseDate(cert.expirationDate),
    credentialId: cert.credentialId || undefined,
    url: cert.url || undefined
  }));
}

/**
 * Sanitizes and processes volunteer experience data
 */
export function processVolunteerExperienceData(volunteerData: any[]): any[] {
  if (!Array.isArray(volunteerData)) return [];
  
  return volunteerData.map((vol: any) => ({
    organization: vol.organization || '',
    role: vol.role || '',
    location: vol.location || '',
    startDate: safeParseDate(vol.startDate) || new Date(),
    endDate: vol.endDate && !vol.isCurrentRole ? safeParseDate(vol.endDate) : undefined,
    isCurrentRole: Boolean(vol.isCurrentRole),
    description: vol.description || '',
    achievements: Array.isArray(vol.achievements) ? vol.achievements.filter(a => a) : []
  }));
}

/**
 * Sanitizes and processes awards data
 */
export function processAwardsData(awardsData: any[]): any[] {
  if (!Array.isArray(awardsData)) return [];
  
  return awardsData.map((award: any) => ({
    title: award.title || '',
    issuer: award.issuer || '',
    date: safeParseDate(award.date) || new Date(),
    description: award.description || undefined
  }));
}

/**
 * Sanitizes and processes languages data
 */
export function processLanguagesData(languagesData: any[]): any[] {
  if (!Array.isArray(languagesData)) return [];
  
  return languagesData.map((lang: any) => ({
    name: lang.name || '',
    proficiency: lang.proficiency || 'conversational'
  }));
}

/**
 * Sanitizes and processes hobbies data
 */
export function processHobbiesData(hobbiesData: any[]): any[] {
  if (!Array.isArray(hobbiesData)) return [];
  
  return hobbiesData.map((hobby: any) => ({
    name: hobby.name || '',
    description: hobby.description || undefined,
    category: hobby.category || 'other'
  }));
}

/**
 * Validates personal info data
 */
export function validatePersonalInfo(personalInfo: any): void {
  if (!personalInfo || typeof personalInfo !== 'object') {
    throw new Error('Personal information is required');
  }
  
  const required = ['firstName', 'lastName', 'email', 'phone'];
  for (const field of required) {
    if (!personalInfo[field] || typeof personalInfo[field] !== 'string' || !personalInfo[field].trim()) {
      throw new Error(`${field} is required and cannot be empty`);
    }
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(personalInfo.email)) {
    throw new Error('Invalid email format');
  }
}

/**
 * Sanitizes personal info data
 */
export function processPersonalInfo(personalInfo: any): any {
  return {
    firstName: personalInfo.firstName?.trim() || '',
    lastName: personalInfo.lastName?.trim() || '',
    email: personalInfo.email?.trim().toLowerCase() || '',
    phone: personalInfo.phone?.trim() || '',
    location: personalInfo.location?.trim() || '',
    linkedinUrl: personalInfo.linkedinUrl?.trim() || undefined,
    portfolioUrl: personalInfo.portfolioUrl?.trim() || undefined,
    githubUrl: personalInfo.githubUrl?.trim() || undefined,
    websiteUrl: personalInfo.websiteUrl?.trim() || undefined,
    professionalTitle: personalInfo.professionalTitle?.trim() || undefined
  };
}

/**
 * Complete resume data processing pipeline
 * Processes all resume sections with proper validation and sanitization
 */
export function processCompleteResumeData(data: any): any {
  // Validate user ID
  const userId = validateUserId(data.userId);
  
  // Validate and process personal info
  validatePersonalInfo(data.personalInfo);
  const personalInfo = processPersonalInfo(data.personalInfo);
  
  // Process all sections
  const processedData = {
    userId,
    title: data.title?.trim() || 'Untitled Resume',
    personalInfo,
    professionalSummary: data.professionalSummary?.trim() || '',
    workExperience: processWorkExperienceData(data.workExperience || []),
    education: processEducationData(data.education || []),
    skills: processSkillsData(data.skills || []),
    projects: processProjectsData(data.projects || []),
    certifications: processCertificationsData(data.certifications || []),
    languages: processLanguagesData(data.languages || []),
    volunteerExperience: processVolunteerExperienceData(data.volunteerExperience || []),
    awards: processAwardsData(data.awards || []),
    hobbies: processHobbiesData(data.hobbies || []),
    templateId: data.templateId || 'modern-1',
    isPublic: Boolean(data.isPublic)
  };
  
  console.log('✅ Resume data processing completed successfully');
  return processedData;
}

/**
 * Process partial resume data for updates
 * Only processes fields that are present in the update data
 */
export function processPartialResumeData(data: any): any {
  const processedData: any = {};
  
  // Only process fields that exist in the update data
  if (data.title !== undefined) {
    processedData.title = data.title?.trim() || 'Untitled Resume';
  }
  
  if (data.personalInfo !== undefined) {
    validatePersonalInfo(data.personalInfo);
    processedData.personalInfo = processPersonalInfo(data.personalInfo);
  }
  
  if (data.professionalSummary !== undefined) {
    processedData.professionalSummary = data.professionalSummary?.trim() || '';
  }
  
  if (data.workExperience !== undefined) {
    processedData.workExperience = processWorkExperienceData(data.workExperience);
  }
  
  if (data.education !== undefined) {
    processedData.education = processEducationData(data.education);
  }
  
  if (data.skills !== undefined) {
    processedData.skills = processSkillsData(data.skills);
  }
  
  if (data.projects !== undefined) {
    processedData.projects = processProjectsData(data.projects);
  }
  
  if (data.certifications !== undefined) {
    processedData.certifications = processCertificationsData(data.certifications);
  }
  
  if (data.languages !== undefined) {
    processedData.languages = processLanguagesData(data.languages);
  }
  
  if (data.volunteerExperience !== undefined) {
    processedData.volunteerExperience = processVolunteerExperienceData(data.volunteerExperience);
  }
  
  if (data.awards !== undefined) {
    processedData.awards = processAwardsData(data.awards);
  }
  
  if (data.hobbies !== undefined) {
    processedData.hobbies = processHobbiesData(data.hobbies);
  }
  
  if (data.templateId !== undefined) {
    processedData.templateId = data.templateId || 'modern-1';
  }
  
  if (data.isPublic !== undefined) {
    processedData.isPublic = Boolean(data.isPublic);
  }
  
  console.log('✅ Partial resume data processing completed successfully');
  return processedData;
}