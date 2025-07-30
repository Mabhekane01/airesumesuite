export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  } else if (email.length > 254) {
    errors.push({ field: 'email', message: 'Email address is too long' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }
    if (password.length > 128) {
      errors.push({ field: 'password', message: 'Password must be less than 128 characters' });
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one special character (@$!%*?&)' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Name validation
export const validateName = (name: string, fieldName: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!name) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else if (name.length < 2) {
    errors.push({ field: fieldName, message: `${fieldName} must be at least 2 characters long` });
  } else if (name.length > 50) {
    errors.push({ field: fieldName, message: `${fieldName} must be less than 50 characters` });
  } else if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    errors.push({ field: fieldName, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password confirmation validation
export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
  } else if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Phone number validation
export const validatePhoneNumber = (phone: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (phone && !/^\+?[\d\s()-]{10,15}$/.test(phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// URL validation
export const validateUrl = (url: string, fieldName: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (url) {
    try {
      new URL(url);
    } catch {
      errors.push({ field: fieldName, message: 'Please enter a valid URL' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Combined form validation
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const emailValidation = validateEmail(email);
  const passwordValidation = password ? { isValid: true, errors: [] } : { isValid: false, errors: [{ field: 'password', message: 'Password is required' }] };

  const allErrors = [...emailValidation.errors, ...passwordValidation.errors];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

export const validateRegisterForm = (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const firstNameValidation = validateName(firstName, 'First name');
  const lastNameValidation = validateName(lastName, 'Last name');
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);

  const allErrors = [
    ...firstNameValidation.errors,
    ...lastNameValidation.errors,
    ...emailValidation.errors,
    ...passwordValidation.errors,
    ...confirmPasswordValidation.errors
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Real-time validation for better UX
export const getFieldError = (errors: ValidationError[], fieldName: string): string | undefined => {
  const error = errors.find(err => err.field === fieldName);
  return error?.message;
};

// Password strength meter
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  if (!password) return { score: 0, label: 'No password', color: 'bg-gray-300' };

  let score = 0;
  
  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&]/.test(password)) score += 1;
  
  // Bonus for length
  if (password.length >= 16) score += 1;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-green-600'];

  return {
    score: Math.min(score, 5),
    label: labels[Math.min(score, 5)],
    color: colors[Math.min(score, 5)]
  };
};

// Job Application Validation Functions

// Date validation
export const validateDate = (date: string, fieldName: string, allowFuture: boolean = true): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!date) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else {
    const dateObj = new Date(date);
    const now = new Date();
    
    if (isNaN(dateObj.getTime())) {
      errors.push({ field: fieldName, message: 'Please enter a valid date' });
    } else if (!allowFuture && dateObj > now) {
      errors.push({ field: fieldName, message: 'Date cannot be in the future' });
    } else if (allowFuture && fieldName.includes('due') && dateObj < now) {
      errors.push({ field: fieldName, message: 'Due date must be in the future' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Salary validation
export const validateSalary = (min: number, max: number): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (min < 0) {
    errors.push({ field: 'salaryMin', message: 'Minimum salary cannot be negative' });
  }
  if (max < 0) {
    errors.push({ field: 'salaryMax', message: 'Maximum salary cannot be negative' });
  }
  if (min > 0 && max > 0 && min > max) {
    errors.push({ field: 'salaryMax', message: 'Maximum salary must be greater than minimum salary' });
  }
  if (min > 10000000 || max > 10000000) {
    errors.push({ field: 'salary', message: 'Salary seems unusually high' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Job title validation
export const validateJobTitle = (title: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!title.trim()) {
    errors.push({ field: 'jobTitle', message: 'Job title is required' });
  } else if (title.length < 2) {
    errors.push({ field: 'jobTitle', message: 'Job title must be at least 2 characters' });
  } else if (title.length > 200) {
    errors.push({ field: 'jobTitle', message: 'Job title must be less than 200 characters' });
  } else if (!/^[a-zA-Z0-9\s-()/&+.']+$/.test(title)) {
    errors.push({ field: 'jobTitle', message: 'Job title contains invalid characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Company name validation
export const validateCompanyName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!name.trim()) {
    errors.push({ field: 'companyName', message: 'Company name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'companyName', message: 'Company name must be at least 2 characters' });
  } else if (name.length > 200) {
    errors.push({ field: 'companyName', message: 'Company name must be less than 200 characters' });
  } else if (!/^[a-zA-Z0-9\s-()/&+.']+$/.test(name)) {
    errors.push({ field: 'companyName', message: 'Company name contains invalid characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Job description validation
export const validateJobDescription = (description: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!description.trim()) {
    errors.push({ field: 'jobDescription', message: 'Job description is required' });
  } else if (description.length < 10) {
    errors.push({ field: 'jobDescription', message: 'Job description must be at least 10 characters' });
  } else if (description.length > 10000) {
    errors.push({ field: 'jobDescription', message: 'Job description is too long (max 10,000 characters)' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Location validation
export const validateLocation = (city: string, state: string, remote: boolean): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!remote && !city.trim()) {
    errors.push({ field: 'city', message: 'City is required unless position is remote' });
  }
  if (!remote && !state.trim()) {
    errors.push({ field: 'state', message: 'State is required unless position is remote' });
  }
  if (city && city.length > 100) {
    errors.push({ field: 'city', message: 'City name is too long' });
  }
  if (state && state.length > 50) {
    errors.push({ field: 'state', message: 'State name is too long' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Interview validation
export const validateInterview = (interview: {
  type: string;
  scheduledDate: string;
  duration: number;
  interviewers: Array<{ name: string; title?: string }>;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  const validTypes = ['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel'];
  if (!validTypes.includes(interview.type)) {
    errors.push({ field: 'type', message: 'Please select a valid interview type' });
  }
  
  const dateValidation = validateDate(interview.scheduledDate, 'scheduledDate', true);
  errors.push(...dateValidation.errors);
  
  if (interview.duration < 15) {
    errors.push({ field: 'duration', message: 'Interview duration must be at least 15 minutes' });
  } else if (interview.duration > 480) {
    errors.push({ field: 'duration', message: 'Interview duration seems unusually long' });
  }
  
  if (interview.interviewers.length === 0) {
    errors.push({ field: 'interviewers', message: 'At least one interviewer is required' });
  } else {
    interview.interviewers.forEach((interviewer, index) => {
      if (!interviewer.name.trim()) {
        errors.push({ field: `interviewer_${index}_name`, message: 'Interviewer name is required' });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Communication validation
export const validateCommunication = (communication: {
  type: string;
  direction: string;
  contactPerson: string;
  summary: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  const validTypes = ['email', 'phone', 'linkedin', 'text', 'in_person', 'video_call', 'recruiter_call'];
  if (!validTypes.includes(communication.type)) {
    errors.push({ field: 'type', message: 'Please select a valid communication type' });
  }
  
  const validDirections = ['inbound', 'outbound'];
  if (!validDirections.includes(communication.direction)) {
    errors.push({ field: 'direction', message: 'Please select communication direction' });
  }
  
  if (!communication.contactPerson.trim()) {
    errors.push({ field: 'contactPerson', message: 'Contact person is required' });
  } else if (communication.contactPerson.length > 100) {
    errors.push({ field: 'contactPerson', message: 'Contact person name is too long' });
  }
  
  if (!communication.summary.trim()) {
    errors.push({ field: 'summary', message: 'Summary is required' });
  } else if (communication.summary.length > 1000) {
    errors.push({ field: 'summary', message: 'Summary is too long (max 1,000 characters)' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Task validation
export const validateTask = (task: {
  title: string;
  type: string;
  priority: string;
  dueDate: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!task.title.trim()) {
    errors.push({ field: 'title', message: 'Task title is required' });
  } else if (task.title.length > 200) {
    errors.push({ field: 'title', message: 'Task title is too long' });
  }
  
  const validTypes = ['research', 'follow_up', 'preparation', 'networking', 'document_update', 'interview_prep', 'other'];
  if (!validTypes.includes(task.type)) {
    errors.push({ field: 'type', message: 'Please select a valid task type' });
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (!validPriorities.includes(task.priority)) {
    errors.push({ field: 'priority', message: 'Please select task priority' });
  }
  
  const dateValidation = validateDate(task.dueDate, 'dueDate', true);
  errors.push(...dateValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Complete job application validation
export const validateJobApplication = (application: any): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Basic info validation
  const titleValidation = validateJobTitle(application.jobTitle);
  const companyValidation = validateCompanyName(application.companyName);
  const descriptionValidation = validateJobDescription(application.jobDescription);
  const urlValidation = validateUrl(application.jobUrl || '', 'jobUrl');
  
  errors.push(...titleValidation.errors);
  errors.push(...companyValidation.errors);
  errors.push(...descriptionValidation.errors);
  errors.push(...urlValidation.errors);
  
  // Location validation
  const locationValidation = validateLocation(
    application.jobLocation?.city || '',
    application.jobLocation?.state || '',
    application.jobLocation?.remote || false
  );
  errors.push(...locationValidation.errors);
  
  // Salary validation
  const salaryMin = application.compensation?.salaryRange?.min || 0;
  const salaryMax = application.compensation?.salaryRange?.max || 0;
  const salaryValidation = validateSalary(salaryMin, salaryMax);
  errors.push(...salaryValidation.errors);
  
  // Enum validations
  const validSources = ['manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'referral', 'recruiter'];
  if (!validSources.includes(application.jobSource)) {
    errors.push({ field: 'jobSource', message: 'Please select a valid job source' });
  }
  
  const validMethods = ['online', 'email', 'referral', 'recruiter', 'career_fair', 'networking'];
  if (!validMethods.includes(application.applicationMethod)) {
    errors.push({ field: 'applicationMethod', message: 'Please select a valid application method' });
  }
  
  const validPriorities = ['low', 'medium', 'high', 'dream_job'];
  if (!validPriorities.includes(application.priority)) {
    errors.push({ field: 'priority', message: 'Please select a valid priority level' });
  }
  
  // Referral validation
  if ((application.jobSource === 'referral' || application.applicationMethod === 'referral') && 
      !application.referralContact?.name?.trim()) {
    errors.push({ field: 'referralContact', message: 'Referral contact information is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Formatting functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Real-time validation helper
export const validateFieldRealTime = (
  fieldName: string,
  value: any,
  additionalData?: any
): ValidationResult => {
  switch (fieldName) {
    case 'jobTitle':
      return validateJobTitle(value);
    case 'companyName':
      return validateCompanyName(value);
    case 'jobDescription':
      return validateJobDescription(value);
    case 'email':
      return validateEmail(value);
    case 'jobUrl':
      return validateUrl(value, 'jobUrl');
    case 'phone':
      return validatePhoneNumber(value);
    default:
      return { isValid: true, errors: [] };
  }
};