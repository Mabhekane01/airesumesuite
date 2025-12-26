import { ApiResponse } from '../types';

export interface ErrorDetails {
  code: string;
  message: string;
  field?: string;
  userMessage: string;
  action?: 'retry' | 'contact-support' | 'fix-input' | 'upgrade-plan';
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly field?: string;
  public readonly userMessage: string;
  public readonly action?: 'retry' | 'contact-support' | 'fix-input' | 'upgrade-plan';
  public readonly originalError?: Error;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.field = details.field;
    this.userMessage = details.userMessage;
    this.action = details.action;
    this.originalError = originalError;
  }
}

export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NetworkError extends Error {
  public readonly status?: number;
  public readonly userMessage: string;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.userMessage = status === 429 
      ? 'Too many requests. Please wait a moment and try again.'
      : status === 500
      ? 'Server error. Please try again later.'
      : status === 403
      ? 'Access denied. Please check your permissions.'
      : 'Network error. Please check your connection and try again.';
  }
}

export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  
  // Resume Processing
  RESUME_GENERATION_FAILED: 'RESUME_GENERATION_FAILED',
  RESUME_VALIDATION_FAILED: 'RESUME_VALIDATION_FAILED',
  RESUME_NOT_FOUND: 'RESUME_NOT_FOUND',
  RESUME_TEMPLATE_INVALID: 'RESUME_TEMPLATE_INVALID',
  
  // AI Services
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
  AI_INVALID_INPUT: 'AI_INVALID_INPUT',
  
  // Job Processing
  JOB_SCRAPING_FAILED: 'JOB_SCRAPING_FAILED',
  JOB_URL_INVALID: 'JOB_URL_INVALID',
  JOB_CONTENT_INACCESSIBLE: 'JOB_CONTENT_INACCESSIBLE',
  
  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_UNSUPPORTED: 'FILE_TYPE_UNSUPPORTED',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Generic
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const ERROR_MESSAGES: Record<string, ErrorDetails> = {
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
    code: ERROR_CODES.AUTH_TOKEN_EXPIRED,
    message: 'Authentication token has expired',
    userMessage: 'Your session has expired. Please log in again.',
    action: 'retry'
  },
  
  [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: {
    code: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
    message: 'AI service is currently unavailable',
    userMessage: 'AI features are temporarily unavailable. Please try again in a few minutes.',
    action: 'retry'
  },
  
  [ERROR_CODES.AI_QUOTA_EXCEEDED]: {
    code: ERROR_CODES.AI_QUOTA_EXCEEDED,
    message: 'AI usage quota exceeded',
    userMessage: 'You\'ve reached your AI usage limit for today. Please upgrade your plan for unlimited access.',
    action: 'upgrade-plan'
  },
  
  [ERROR_CODES.JOB_SCRAPING_FAILED]: {
    code: ERROR_CODES.JOB_SCRAPING_FAILED,
    message: 'Failed to extract job information from URL',
    userMessage: 'Unable to read the job posting from this URL. Please copy and paste the job description manually.',
    action: 'fix-input'
  },
  
  [ERROR_CODES.FILE_TOO_LARGE]: {
    code: ERROR_CODES.FILE_TOO_LARGE,
    message: 'File size exceeds maximum limit',
    userMessage: 'File is too large. Please use a file smaller than 5MB.',
    action: 'fix-input'
  },
  
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment before trying again.',
    action: 'retry'
  }
};

export function handleApiError(error: any): AppError {
  // Handle network errors
  if (!error.response) {
    return new AppError({
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network error occurred',
      userMessage: 'Network error. Please check your connection and try again.',
      action: 'retry'
    }, error);
  }

  const { status, data } = error.response;
  
  // Handle specific HTTP status codes
  if (status === 401) {
    return new AppError({
      code: ERROR_CODES.AUTH_TOKEN_EXPIRED,
      message: 'Authentication failed',
      userMessage: 'Your session has expired. Please log in again.',
      action: 'retry'
    }, error);
  }
  
  if (status === 403) {
    return new AppError({
      code: ERROR_CODES.AUTH_ACCESS_DENIED,
      message: 'Access denied',
      userMessage: 'You don\'t have permission to perform this action.',
      action: 'contact-support'
    }, error);
  }
  
  if (status === 429) {
    return new AppError({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      action: 'retry'
    }, error);
  }

  // Handle API error responses
  if (data?.error?.code && ERROR_MESSAGES[data.error.code]) {
    const errorDetails = ERROR_MESSAGES[data.error.code];
    return new AppError({
      ...errorDetails,
      field: data.error.field
    }, error);
  }

  // Handle validation errors
  if (status === 400 && data?.errors) {
    const validationErrors: ValidationErrorDetail[] = data.errors.map((err: any) => ({
      field: err.field,
      message: err.message,
      code: err.code || 'VALIDATION_ERROR'
    }));
    
    return new ValidationError(validationErrors) as any;
  }

  // Generic server error
  if (status >= 500) {
    return new AppError({
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Server error occurred',
      userMessage: 'Something went wrong on our end. Please try again later.',
      action: 'retry'
    }, error);
  }

  // Unknown error
  return new AppError({
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: data?.message || 'An unknown error occurred',
    userMessage: 'Something unexpected happened. Please try again or contact support.',
    action: 'contact-support'
  }, error);
}

export function validateResumeData(resumeData: any): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  // Personal info validation
  if (!resumeData.personalInfo?.firstName?.trim()) {
    errors.push({
      field: 'personalInfo.firstName',
      message: 'First name is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!resumeData.personalInfo?.lastName?.trim()) {
    errors.push({
      field: 'personalInfo.lastName',
      message: 'Last name is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!resumeData.personalInfo?.email?.trim()) {
    errors.push({
      field: 'personalInfo.email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD'
    });
  } else if (!isValidEmail(resumeData.personalInfo.email)) {
    errors.push({
      field: 'personalInfo.email',
      message: 'Please enter a valid email address',
      code: 'INVALID_EMAIL'
    });
  }

  if (!resumeData.personalInfo?.phone?.trim()) {
    errors.push({
      field: 'personalInfo.phone',
      message: 'Phone number is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Work experience validation
  if (!resumeData.workExperience || resumeData.workExperience.length === 0) {
    errors.push({
      field: 'workExperience',
      message: 'At least one work experience entry is required',
      code: 'REQUIRED_FIELD'
    });
  } else {
    resumeData.workExperience.forEach((job: any, index: number) => {
      if (!job.jobTitle?.trim()) {
        errors.push({
          field: `workExperience.${index}.jobTitle`,
          message: 'Job title is required',
          code: 'REQUIRED_FIELD'
        });
      }
      
      if (!job.company?.trim()) {
        errors.push({
          field: `workExperience.${index}.company`,
          message: 'Company name is required',
          code: 'REQUIRED_FIELD'
        });
      }
      
      if (!job.startDate) {
        errors.push({
          field: `workExperience.${index}.startDate`,
          message: 'Start date is required',
          code: 'REQUIRED_FIELD'
        });
      }
    });
  }

  // Skills validation
  if (!resumeData.skills || resumeData.skills.length === 0) {
    errors.push({
      field: 'skills',
      message: 'At least one skill is required',
      code: 'REQUIRED_FIELD'
    });
  }

  return errors;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error instanceof ValidationError) {
    return error.errors.map(e => e.message).join(', ');
  }
  
  if (error instanceof NetworkError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorDetails = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  };
  
  console.error('Application Error:', errorDetails);
  
  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Send to error tracking service like Sentry, LogRocket, etc.
  }
}