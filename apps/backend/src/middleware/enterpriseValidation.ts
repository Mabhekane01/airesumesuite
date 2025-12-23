import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain, ValidationError } from 'express-validator';
import mongoose from 'mongoose';
import validator from 'validator';
import { SystemSettings } from '../models/SystemSettings';
import { User } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
    permissions: string[];
  };
}

// Custom validation error class
export class ValidationException extends Error {
  public statusCode: number;
  public errors: ValidationError[];

  constructor(message: string, errors: ValidationError[], statusCode: number = 400) {
    super(message);
    this.name = 'ValidationException';
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

// Enhanced request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: (error as any).param || (error as any).type || 'unknown',
      message: error.msg,
      value: (error as any).value,
      location: (error as any).location || 'body'
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Custom validators
export const customValidators = {
  // Validate MongoDB ObjectId
  isObjectId: (value: string) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ObjectId format');
    }
    return true;
  },

  // Validate URL with specific protocols
  isValidUrl: (value: string, protocols: string[] = ['http', 'https']) => {
    if (!validator.isURL(value, { protocols })) {
      throw new Error(`Invalid URL format. Allowed protocols: ${protocols.join(', ')}`);
    }
    return true;
  },

  // Validate professional email domains
  isProfessionalEmail: (value: string) => {
    if (!validator.isEmail(value)) {
      throw new Error('Invalid email format');
    }
    
    // List of common personal email domains to avoid for professional profiles
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
    ];
    
    const domain = value.split('@')[1]?.toLowerCase();
    if (personalDomains.includes(domain)) {
      throw new Error('Please use a professional email address');
    }
    
    return true;
  },

  // Validate LinkedIn URL format
  isLinkedInUrl: (value: string) => {
    const linkedinPattern = /^https:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9\-]+\/?$/;
    if (!linkedinPattern.test(value)) {
      throw new Error('Invalid LinkedIn URL format');
    }
    return true;
  },

  // Validate GitHub URL format
  isGitHubUrl: (value: string) => {
    const githubPattern = /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9\-]+\/?$/;
    if (!githubPattern.test(value)) {
      throw new Error('Invalid GitHub URL format');
    }
    return true;
  },

  // Validate phone number with international support
  isPhoneNumber: (value: string) => {
    if (!validator.isMobilePhone(value, 'any', { strictMode: false })) {
      throw new Error('Invalid phone number format');
    }
    return true;
  },

  // Validate timezone
  isValidTimezone: (value: string) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      throw new Error('Invalid timezone');
    }
  },

  // Validate currency code
  isValidCurrency: (value: string) => {
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR',
      'BRL', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK'
    ];
    
    if (!validCurrencies.includes(value.toUpperCase())) {
      throw new Error(`Invalid currency code. Supported: ${validCurrencies.join(', ')}`);
    }
    return true;
  },

  // Validate skill proficiency level
  isValidSkillProficiency: (value: string) => {
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validLevels.includes(value)) {
      throw new Error(`Invalid proficiency level. Must be one of: ${validLevels.join(', ')}`);
    }
    return true;
  },

  // Validate language proficiency level
  isValidLanguageProficiency: (value: string) => {
    const validLevels = ['basic', 'conversational', 'professional', 'native'];
    if (!validLevels.includes(value)) {
      throw new Error(`Invalid language proficiency. Must be one of: ${validLevels.join(', ')}`);
    }
    return true;
  },

  // Validate salary range
  isValidSalaryRange: (min: number, max: number) => {
    if (min >= max) {
      throw new Error('Minimum salary must be less than maximum salary');
    }
    if (min < 0 || max < 0) {
      throw new Error('Salary values must be positive');
    }
    if (max > 10000000) { // 10 million cap
      throw new Error('Maximum salary exceeds reasonable limit');
    }
    return true;
  },

  // Validate experience years
  isValidExperienceYears: (value: number) => {
    if (value < 0 || value > 60) {
      throw new Error('Experience years must be between 0 and 60');
    }
    return true;
  },

  // Validate date range
  isValidDateRange: (startDate: Date, endDate: Date) => {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
    
    const now = new Date();
    if (startDate > now) {
      throw new Error('Start date cannot be in the future');
    }
    
    const maxPastDate = new Date();
    maxPastDate.setFullYear(maxPastDate.getFullYear() - 70);
    if (startDate < maxPastDate) {
      throw new Error('Start date is too far in the past');
    }
    
    return true;
  },

  // Validate professional headline
  isProfessionalHeadline: (value: string) => {
    // Check for common unprofessional patterns
    const unprofessionalPatterns = [
      /looking for job/i,
      /unemployed/i,
      /desperate/i,
      /hire me/i,
      /need work/i
    ];
    
    if (unprofessionalPatterns.some(pattern => pattern.test(value))) {
      throw new Error('Headline should be professional and focus on your skills and experience');
    }
    
    // Should contain at least one skill or role keyword
    const professionalKeywords = [
      'developer', 'engineer', 'manager', 'analyst', 'consultant', 'designer',
      'architect', 'specialist', 'expert', 'professional', 'experienced',
      'senior', 'lead', 'principal', 'director', 'coordinator'
    ];
    
    if (!professionalKeywords.some(keyword => value.toLowerCase().includes(keyword))) {
      throw new Error('Headline should include professional role or skill keywords');
    }
    
    return true;
  },

  // Validate bio content quality
  isProfessionalBio: (value: string) => {
    if (value.length < 50) {
      throw new Error('Bio should be at least 50 characters to be meaningful');
    }
    
    // Check for excessive repetition
    const words = value.toLowerCase().split(/\s+/);
    const wordCount = words.reduce((acc: { [key: string]: number }, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    
    const maxRepeats = Math.max(...Object.values(wordCount));
    if (maxRepeats > words.length * 0.1) { // More than 10% repetition
      throw new Error('Bio contains excessive word repetition');
    }
    
    // Should contain some professional indicators
    const professionalIndicators = [
      'experience', 'skilled', 'responsible', 'led', 'managed', 'developed',
      'implemented', 'achieved', 'improved', 'collaborated', 'expertise'
    ];
    
    const bioLower = value.toLowerCase();
    const professionalCount = professionalIndicators.filter(indicator => 
      bioLower.includes(indicator)
    ).length;
    
    if (professionalCount < 2) {
      throw new Error('Bio should highlight professional experience and achievements');
    }
    
    return true;
  }
};

// Business logic validators
export const businessValidators = {
  // Validate user tier limitations
  validateTierLimitations: async (req: AuthenticatedRequest, feature: string) => {
    const user = req.user;
    if (!user) throw new Error('User not authenticated');

    const tierLimitations: { [key: string]: { [key: string]: boolean } } = {
      free: {
        autoApply: false,
        immediateNotifications: false,
        bulkOperations: false,
        advancedAnalytics: false,
        prioritySupport: false
      },
      premium: {
        autoApply: true,
        immediateNotifications: true,
        bulkOperations: false,
        advancedAnalytics: true,
        prioritySupport: true
      },
      enterprise: {
        autoApply: true,
        immediateNotifications: true,
        bulkOperations: true,
        advancedAnalytics: true,
        prioritySupport: true
      }
    };

    const userTier = user.tier || 'free';
    if (!tierLimitations[userTier]?.[feature]) {
      throw new Error(`Feature '${feature}' requires ${feature === 'autoApply' ? 'Premium' : 'Enterprise'} subscription`);
    }

    return true;
  },

  // Validate system constraints
  validateSystemConstraints: async (updates: any) => {
    const systemSettings = await SystemSettings.findOne({ 
      environment: process.env.NODE_ENV || 'development',
      isActive: true 
    });

    if (!systemSettings) {
      throw new Error('System settings not found');
    }

    // Check AI features availability
    if (updates.ai?.resumeOptimization?.enabled && !systemSettings.features?.aiResumeBuilder) {
      throw new Error('AI resume optimization is disabled system-wide');
    }

    if (updates.ai?.careerCoach?.enabled && !systemSettings.features?.careerCoach) {
      throw new Error('AI career coach is disabled system-wide');
    }

    // Check rate limits
    if (updates.jobSearch?.autoApply?.criteria?.maxApplicationsPerDay) {
      const maxAllowed = 10; // Default rate limit for auto-applications per day
      if (updates.jobSearch.autoApply.criteria.maxApplicationsPerDay > maxAllowed) {
        throw new Error(`Maximum ${maxAllowed} auto-applications per day allowed`);
      }
    }

    return true;
  },

  // Validate data consent requirements
  validateDataConsent: (updates: any) => {
    if (updates.dataConsent) {
      const requiredConsents = ['analytics', 'personalizedAds', 'dataSharing'];
      
      for (const consent of requiredConsents) {
        if (updates.dataConsent[consent] === undefined) {
          throw new Error(`Data consent for '${consent}' is required`);
        }
      }

      // Ensure consent date is updated
      updates.dataConsent.consentDate = new Date();
      updates.dataConsent.consentVersion = '1.0';
    }

    return true;
  },

  // Validate profile completeness requirements
  validateProfileCompleteness: (profileData: any) => {
    const requiredFields = ['headline', 'bio', 'yearsOfExperience', 'currentLocation'];
    const missingFields = requiredFields.filter(field => !profileData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
    }

    // Validate minimum content quality
    if (profileData.headline && profileData.headline.length < 10) {
      throw new Error('Headline must be at least 10 characters');
    }

    if (profileData.bio && profileData.bio.length < 50) {
      throw new Error('Bio must be at least 50 characters');
    }

    return true;
  }
};

// Validation chain builders
export const validationChains = {
  // User profile validation chains
  userProfile: {
    basic: [
      body('headline')
        .optional()
        .isLength({ min: 10, max: 120 })
        .withMessage('Headline must be 10-120 characters')
        .custom(customValidators.isProfessionalHeadline),
      
      body('bio')
        .optional()
        .isLength({ min: 50, max: 2000 })
        .withMessage('Bio must be 50-2000 characters')
        .custom(customValidators.isProfessionalBio),
      
      body('yearsOfExperience')
        .optional()
        .isInt({ min: 0, max: 60 })
        .withMessage('Years of experience must be 0-60')
        .custom(customValidators.isValidExperienceYears)
    ],

    contact: [
      body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
        .custom(customValidators.isProfessionalEmail),
      
      body('phone')
        .optional()
        .custom(customValidators.isPhoneNumber),
      
      body('linkedinUrl')
        .optional()
        .custom(customValidators.isLinkedInUrl),
      
      body('githubUrl')
        .optional()
        .custom(customValidators.isGitHubUrl)
    ],

    location: [
      body('currentLocation.city')
        .notEmpty()
        .withMessage('City is required')
        .isLength({ max: 100 })
        .withMessage('City name too long'),
      
      body('currentLocation.state')
        .notEmpty()
        .withMessage('State is required')
        .isLength({ max: 100 })
        .withMessage('State name too long'),
      
      body('currentLocation.country')
        .notEmpty()
        .withMessage('Country is required')
        .isLength({ max: 100 })
        .withMessage('Country name too long'),
      
      body('currentLocation.coordinates.lat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),
      
      body('currentLocation.coordinates.lng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude')
    ],

    salary: [
      body('currentSalary.amount')
        .optional()
        .isFloat({ min: 0, max: 10000000 })
        .withMessage('Current salary must be 0-10,000,000'),
      
      body('expectedSalary.min')
        .optional()
        .isFloat({ min: 0, max: 10000000 })
        .withMessage('Expected salary minimum must be 0-10,000,000'),
      
      body('expectedSalary.max')
        .optional()
        .isFloat({ min: 0, max: 10000000 })
        .withMessage('Expected salary maximum must be 0-10,000,000'),
      
      body(['currentSalary.currency', 'expectedSalary.currency'])
        .optional()
        .custom(customValidators.isValidCurrency)
    ],

    skills: [
      body('technicalSkills')
        .optional()
        .isArray({ max: 50 })
        .withMessage('Maximum 50 technical skills allowed'),
      
      body('technicalSkills.*.name')
        .notEmpty()
        .withMessage('Skill name is required')
        .isLength({ max: 100 })
        .withMessage('Skill name too long'),
      
      body('technicalSkills.*.proficiency')
        .custom(customValidators.isValidSkillProficiency),
      
      body('technicalSkills.*.yearsOfExperience')
        .isInt({ min: 0, max: 50 })
        .withMessage('Skill experience must be 0-50 years'),
      
      body('languages')
        .optional()
        .isArray({ max: 20 })
        .withMessage('Maximum 20 languages allowed'),
      
      body('languages.*.proficiency')
        .custom(customValidators.isValidLanguageProficiency)
    ]
  },

  // Settings validation chains
  settings: {
    notifications: [
      body('notifications.email.frequency')
        .optional()
        .isIn(['immediate', 'daily', 'weekly', 'never'])
        .withMessage('Invalid email frequency'),
      
      body('notifications.push.quietHours.startTime')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Invalid start time format (HH:mm)'),
      
      body('notifications.push.quietHours.endTime')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Invalid end time format (HH:mm)'),
      
      body('notifications.push.quietHours.timezone')
        .optional()
        .custom(customValidators.isValidTimezone)
    ],

    privacy: [
      body('privacy.profileVisibility')
        .optional()
        .isIn(['public', 'private', 'recruiters_only', 'network_only'])
        .withMessage('Invalid profile visibility'),
      
      body('privacy.dataRetentionPreference')
        .optional()
        .isIn(['minimal', 'standard', 'extended'])
        .withMessage('Invalid data retention preference')
    ],

    ai: [
      body('ai.resumeOptimization.aggressiveness')
        .optional()
        .isIn(['conservative', 'moderate', 'aggressive'])
        .withMessage('Invalid optimization aggressiveness'),
      
      body('ai.resumeOptimization.keywordDensity')
        .optional()
        .isFloat({ min: 0.1, max: 1.0 })
        .withMessage('Keyword density must be 0.1-1.0'),
      
      body('ai.careerCoach.communicationStyle')
        .optional()
        .isIn(['direct', 'supportive', 'analytical', 'encouraging'])
        .withMessage('Invalid communication style')
    ],

    security: [
      body('security.sessionManagement.inactivityTimeout')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Inactivity timeout must be 15-480 minutes'),
      
      body('security.sessionManagement.deviceTrustDuration')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Device trust duration must be 1-365 days'),
      
      body('security.twoFactorAuth.method')
        .optional()
        .isIn(['app', 'sms', 'email'])
        .withMessage('Invalid 2FA method')
    ]
  }
};

// Comprehensive validation middleware factory
export const createValidationMiddleware = (validationChain: ValidationChain[]) => {
  return [
    ...validationChain,
    validateRequest
  ];
};

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return validator.escape(obj.trim());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// Content Security Policy validation
export const validateContentSecurity = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi
  ];

  const checkContent = (content: string): boolean => {
    return dangerousPatterns.some(pattern => pattern.test(content));
  };

  const validateObjectContent = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkContent(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(validateObjectContent);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(validateObjectContent);
    }
    
    return false;
  };

  if (req.body && validateObjectContent(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Content contains potentially dangerous scripts',
      code: 'CONTENT_SECURITY_VIOLATION'
    });
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Add request metadata for rate limiting
  req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  next();
};

export default {
  validateRequest,
  customValidators,
  businessValidators,
  validationChains,
  createValidationMiddleware,
  sanitizeInput,
  validateContentSecurity,
  validateRateLimit,
  ValidationException
};