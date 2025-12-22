/**
 * Form validation utilities for production-ready forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return 'Phone number is required';
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return 'Phone number must be at least 10 digits';
  return null;
};

export const validateUrl = (url: string, required = false): string | null => {
  if (!url) return required ? 'URL is required' : null;
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

export const validateDateRange = (startDate: string, endDate: string): { start: string | null; end: string | null } => {
  const errors = { start: null as string | null, end: null as string | null };
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      errors.start = 'Start date cannot be after end date';
      errors.end = 'End date cannot be before start date';
    }
  }
  
  return errors;
};

export const validateBulletPoints = (items: string[], minItems = 0, maxItems = 50): string | null => {
  const validItems = items.filter(item => item.trim().length > 0);
  
  if (validItems.length < minItems) {
    return `At least ${minItems} item${minItems !== 1 ? 's' : ''} required`;
  }
  
  if (validItems.length > maxItems) {
    return `Maximum ${maxItems} items allowed`;
  }
  
  // Check for very short items
  const shortItems = validItems.filter(item => item.trim().length < 10);
  if (shortItems.length > 0) {
    return 'All items should be at least 10 characters long for better impact';
  }
  
  return null;
};

export const validatePersonalInfo = (personalInfo: any): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // Required fields
  if (!personalInfo?.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }
  
  if (!personalInfo?.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }
  
  if (!personalInfo?.email && !personalInfo?.phone) {
    errors.email = 'Email or phone number is required';
    errors.phone = 'Email or phone number is required';
  }
  
  if (personalInfo?.email) {
    const emailError = validateEmail(personalInfo.email);
    if (emailError) errors.email = emailError;
  }
  
  if (personalInfo?.phone) {
    const phoneError = validatePhone(personalInfo.phone);
    if (phoneError) errors.phone = phoneError;
  }
  
  if (!personalInfo?.location?.trim()) {
    errors.location = 'Location is required';
  }
  
  // Optional URL validations
  if (personalInfo?.linkedinUrl) {
    const urlError = validateUrl(personalInfo.linkedinUrl);
    if (urlError) errors.linkedinUrl = urlError;
    else if (!personalInfo.linkedinUrl.includes('linkedin.com')) {
      warnings.linkedinUrl = 'This doesn\'t appear to be a LinkedIn URL';
    }
  }
  
  if (personalInfo?.githubUrl) {
    const urlError = validateUrl(personalInfo.githubUrl);
    if (urlError) errors.githubUrl = urlError;
    else if (!personalInfo.githubUrl.includes('github.com')) {
      warnings.githubUrl = 'This doesn\'t appear to be a GitHub URL';
    }
  }
  
  if (personalInfo?.portfolioUrl) {
    const urlError = validateUrl(personalInfo.portfolioUrl);
    if (urlError) errors.portfolioUrl = urlError;
  }
  
  if (personalInfo?.websiteUrl) {
    const urlError = validateUrl(personalInfo.websiteUrl);
    if (urlError) errors.websiteUrl = urlError;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

export const validateWorkExperience = (experience: any): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  if (!experience?.jobTitle?.trim()) {
    errors.jobTitle = 'Job title is required';
  }
  
  if (!experience?.company?.trim()) {
    errors.company = 'Company name is required';
  }
  
  if (!experience?.location?.trim()) {
    errors.location = 'Location is required';
  }
  
  if (!experience?.startDate?.trim()) {
    errors.startDate = 'Start date is required';
  }
  
  if (!experience?.isCurrentJob && !experience?.endDate?.trim()) {
    errors.endDate = 'End date is required (or check "I currently work here")';
  }
  
  // Date validation
  if (experience?.startDate && experience?.endDate) {
    const dateErrors = validateDateRange(experience.startDate, experience.endDate);
    if (dateErrors.start) errors.startDate = dateErrors.start;
    if (dateErrors.end) errors.endDate = dateErrors.end;
  }
  
  // Responsibilities validation
  const responsibilitiesError = validateBulletPoints(experience?.responsibilities || [], 1, 8);
  if (responsibilitiesError) {
    errors.responsibilities = responsibilitiesError;
  }
  
  // Achievements validation (optional but recommended)
  if (!experience?.achievements || experience.achievements.length === 0) {
    warnings.achievements = 'Adding achievements makes your resume more impactful';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

export const validateEducation = (education: any): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  if (!education?.institution?.trim()) {
    errors.institution = 'Institution name is required';
  }
  
  if (!education?.degree?.trim()) {
    errors.degree = 'Degree is required';
  }
  
  if (!education?.fieldOfStudy?.trim()) {
    errors.fieldOfStudy = 'Field of study is required';
  }
  
  if (!education?.startDate?.trim()) {
    errors.startDate = 'Start date is required';
  }
  
  // Date validation
  if (education?.startDate && education?.endDate) {
    const dateErrors = validateDateRange(education.startDate, education.endDate);
    if (dateErrors.start) errors.startDate = dateErrors.start;
    if (dateErrors.end) errors.endDate = dateErrors.end;
  }
  
  // GPA warnings
  if (education?.gpa) {
    const gpa = parseFloat(education.gpa);
    if (isNaN(gpa)) {
      errors.gpa = 'GPA must be a number';
    } else if (gpa > 4.0) {
      warnings.gpa = 'GPA appears to be above 4.0 scale - is this correct?';
    } else if (gpa < 3.5) {
      warnings.gpa = 'Consider omitting GPA if below 3.5';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

export const validateProfessionalSummary = (summary: string): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  if (!summary?.trim()) {
    errors.summary = 'Professional summary is required';
    return { isValid: false, errors, warnings };
  }
  
  const wordCount = summary.trim().split(/\s+/).length;
  const charCount = summary.length;
  
  if (wordCount < 25) {
    warnings.summary = 'Consider expanding your summary to 25-60 words for better impact';
  } else if (wordCount > 60) {
    warnings.summary = 'Consider condensing your summary to 25-60 words for better readability';
  }
  
  if (charCount < 100) {
    warnings.summary = 'Your summary seems quite short. Consider adding more detail about your experience and value proposition.';
  }
  
  // Check for generic phrases
  const genericPhrases = [
    'hard-working', 'team player', 'detail-oriented', 'self-motivated',
    'passionate', 'dedicated', 'results-driven', 'experienced professional'
  ];
  
  const foundGeneric = genericPhrases.filter(phrase => 
    summary.toLowerCase().includes(phrase.toLowerCase())
  );
  
  if (foundGeneric.length > 0) {
    warnings.summary = `Consider replacing generic phrases like "${foundGeneric.join(', ')}" with specific achievements or skills`;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};