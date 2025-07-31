import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { EnterpriseSettingsController } from '../controllers/enterpriseSettingsController';
import { authMiddleware, requirePermissions } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { auditLogger } from '../middleware/enterpriseErrorHandler';
import { Redis } from 'ioredis';

const router: express.Router = express.Router();

// Initialize Redis for rate limiting and caching (optional)
let redis: Redis | undefined;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
  console.warn('Redis not available, running without caching');
  redis = undefined;
}

// Initialize controller
const settingsController = new EnterpriseSettingsController({
  redis: redis || undefined,
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
  auditLogEnabled: process.env.AUDIT_LOG_ENABLED === 'true',
  complianceMode: process.env.COMPLIANCE_MODE === 'true'
});

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Global rate limiting for settings endpoints
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && {
    store: new (require('rate-limit-redis'))({
      sendCommand: (...args: any[]) => redis.call(...(args as [string, ...any[]])),
    })
  })
});

router.use(globalRateLimit);

// Authentication middleware for all routes
router.use(authMiddleware);

// Audit logging middleware
router.use(auditLogger);

// =====================
// USER PROFILE ROUTES
// =====================

/**
 * @route GET /api/settings/profile/:userId?
 * @desc Get user profile (own profile or specific user if admin)
 * @access Private
 */
router.get('/profile/:userId?',
  [
    param('userId').optional().isMongoId().withMessage('Invalid user ID format'),
    query('includePrivate').optional().isBoolean().withMessage('includePrivate must be boolean'),
    query('includeAnalytics').optional().isBoolean().withMessage('includeAnalytics must be boolean')
  ],
  validateRequest,
  settingsController.getUserProfile.bind(settingsController)
);

/**
 * @route PUT /api/settings/profile/:userId?
 * @desc Update user profile
 * @access Private
 */
router.put('/profile/:userId?',
  settingsController.getProfileRateLimit(),
  [
    param('userId').optional().isMongoId().withMessage('Invalid user ID format'),
    
    // Basic Information Validation
    body('headline').optional().isLength({ min: 1, max: 120 }).withMessage('Headline must be 1-120 characters'),
    body('bio').optional().isLength({ max: 2000 }).withMessage('Bio must be less than 2000 characters'),
    body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }).withMessage('Years of experience must be 0-50'),
    
    // Salary Validation
    body('currentSalary.amount').optional().isFloat({ min: 0 }).withMessage('Current salary must be positive'),
    body('currentSalary.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('currentSalary.frequency').optional().isIn(['hourly', 'monthly', 'yearly']).withMessage('Invalid salary frequency'),
    body('currentSalary.isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
    
    body('expectedSalary.min').optional().isFloat({ min: 0 }).withMessage('Expected salary min must be positive'),
    body('expectedSalary.max').optional().isFloat({ min: 0 }).withMessage('Expected salary max must be positive'),
    body('expectedSalary.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('expectedSalary.frequency').optional().isIn(['hourly', 'monthly', 'yearly']).withMessage('Invalid salary frequency'),
    body('expectedSalary.isNegotiable').optional().isBoolean().withMessage('isNegotiable must be boolean'),
    
    // Location Validation
    body('currentLocation.city').optional().isLength({ min: 1, max: 100 }).withMessage('City is required and must be less than 100 characters'),
    body('currentLocation.state').optional().isLength({ min: 1, max: 100 }).withMessage('State is required and must be less than 100 characters'),
    body('currentLocation.country').optional().isLength({ min: 1, max: 100 }).withMessage('Country is required and must be less than 100 characters'),
    body('currentLocation.coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('currentLocation.coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    
    // Career Objective Validation
    body('careerObjective.shortTerm').optional().isLength({ max: 500 }).withMessage('Short-term goal must be less than 500 characters'),
    body('careerObjective.longTerm').optional().isLength({ max: 500 }).withMessage('Long-term goal must be less than 500 characters'),
    body('careerObjective.careerLevel').optional().isIn(['entry', 'mid', 'senior', 'lead', 'executive', 'c-level']).withMessage('Invalid career level'),
    body('careerObjective.targetRoles').optional().isArray().withMessage('Target roles must be an array'),
    body('careerObjective.targetRoles.*').optional().isLength({ min: 1, max: 100 }).withMessage('Each target role must be 1-100 characters'),
    body('careerObjective.targetCompanies').optional().isArray().withMessage('Target companies must be an array'),
    body('careerObjective.targetCompanies.*').optional().isLength({ min: 1, max: 100 }).withMessage('Each target company must be 1-100 characters'),
    
    // Technical Skills Validation
    body('technicalSkills').optional().isArray().withMessage('Technical skills must be an array'),
    body('technicalSkills.*.name').optional().isLength({ min: 1, max: 100 }).withMessage('Skill name must be 1-100 characters'),
    body('technicalSkills.*.proficiency').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid proficiency level'),
    body('technicalSkills.*.yearsOfExperience').optional().isInt({ min: 0, max: 50 }).withMessage('Skill experience must be 0-50 years'),
    body('technicalSkills.*.certifications').optional().isArray().withMessage('Certifications must be an array'),
    
    // Languages Validation
    body('languages').optional().isArray().withMessage('Languages must be an array'),
    body('languages.*.name').optional().isLength({ min: 1, max: 50 }).withMessage('Language name must be 1-50 characters'),
    body('languages.*.proficiency').optional().isIn(['basic', 'conversational', 'professional', 'native']).withMessage('Invalid language proficiency'),
    
    // Social Links Validation
    body('linkedinUrl').optional().isURL().withMessage('Invalid LinkedIn URL'),
    body('githubUrl').optional().isURL().withMessage('Invalid GitHub URL'),
    body('portfolioUrl').optional().isURL().withMessage('Invalid portfolio URL'),
    body('personalWebsite').optional().isURL().withMessage('Invalid personal website URL'),
    body('behanceUrl').optional().isURL().withMessage('Invalid Behance URL'),
    body('dribbbleUrl').optional().isURL().withMessage('Invalid Dribbble URL'),
    
    // Privacy Settings Validation
    body('profileVisibility').optional().isIn(['public', 'private', 'recruiters_only']).withMessage('Invalid profile visibility'),
    body('openToOpportunities').optional().isBoolean().withMessage('openToOpportunities must be boolean'),
    body('anonymousProfile').optional().isBoolean().withMessage('anonymousProfile must be boolean'),
    
    // Work Authorization Validation
    body('workAuthorization.eligibleToWork').optional().isBoolean().withMessage('eligibleToWork must be boolean'),
    body('workAuthorization.requiresSponsorship').optional().isBoolean().withMessage('requiresSponsorship must be boolean'),
    body('workAuthorization.visaStatus').optional().isIn(['citizen', 'permanent_resident', 'h1b', 'opt', 'other']).withMessage('Invalid visa status'),
    body('workAuthorization.visaExpiryDate').optional().isISO8601().withMessage('Invalid visa expiry date'),
    
    // Professional Development Validation
    body('professionalDevelopment.certifications').optional().isArray().withMessage('Certifications must be an array'),
    body('professionalDevelopment.certifications.*.name').optional().isLength({ min: 1, max: 200 }).withMessage('Certification name must be 1-200 characters'),
    body('professionalDevelopment.certifications.*.issuingOrganization').optional().isLength({ min: 1, max: 200 }).withMessage('Issuing organization must be 1-200 characters'),
    body('professionalDevelopment.certifications.*.issueDate').optional().isISO8601().withMessage('Invalid issue date'),
    body('professionalDevelopment.certifications.*.expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
    body('professionalDevelopment.certifications.*.url').optional().isURL().withMessage('Invalid certification URL'),
    
    body('professionalDevelopment.education').optional().isArray().withMessage('Education must be an array'),
    body('professionalDevelopment.education.*.institution').optional().isLength({ min: 1, max: 200 }).withMessage('Institution name must be 1-200 characters'),
    body('professionalDevelopment.education.*.degree').optional().isLength({ min: 1, max: 100 }).withMessage('Degree must be 1-100 characters'),
    body('professionalDevelopment.education.*.field').optional().isLength({ min: 1, max: 100 }).withMessage('Field must be 1-100 characters'),
    body('professionalDevelopment.education.*.startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('professionalDevelopment.education.*.endDate').optional().isISO8601().withMessage('Invalid end date'),
    
    // AI Personalization Validation
    body('aiPersonalizationData.communicationStyle').optional().isIn(['direct', 'collaborative', 'analytical', 'expressive']).withMessage('Invalid communication style'),
    body('aiPersonalizationData.workingStyle').optional().isIn(['independent', 'team_oriented', 'leadership', 'supportive']).withMessage('Invalid working style'),
    body('aiPersonalizationData.motivationFactors').optional().isArray().withMessage('Motivation factors must be an array'),
    body('aiPersonalizationData.careerDrivers').optional().isArray().withMessage('Career drivers must be an array'),
    
    // Custom validation for salary range
    body().custom((value) => {
      if (value.expectedSalary && value.expectedSalary.min && value.expectedSalary.max) {
        if (value.expectedSalary.min > value.expectedSalary.max) {
          throw new Error('Expected salary minimum cannot be greater than maximum');
        }
      }
      return true;
    })
  ],
  validateRequest,
  settingsController.updateUserProfile.bind(settingsController)
);

/**
 * @route GET /api/settings/profile/:userId/analytics
 * @desc Get profile analytics and insights
 * @access Private
 */
router.get('/profile/:userId/analytics',
  [
    param('userId').optional().isMongoId().withMessage('Invalid user ID format'),
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range'),
    query('includeInsights').optional().isBoolean().withMessage('includeInsights must be boolean')
  ],
  validateRequest,
  settingsController.getProfileAnalytics.bind(settingsController)
);

// =====================
// USER SETTINGS ROUTES
// =====================

/**
 * @route GET /api/settings/user
 * @desc Get user settings
 * @access Private
 */
router.get('/user',
  settingsController.getUserSettings.bind(settingsController)
);

/**
 * @route PUT /api/settings/user
 * @desc Update user settings
 * @access Private
 */
router.put('/user',
  settingsController.getSettingsRateLimit(),
  [
    // Privacy Settings Validation
    body('privacy.profileVisibility').optional().isIn(['public', 'private', 'recruiters_only', 'network_only']).withMessage('Invalid profile visibility'),
    body('privacy.showEmail').optional().isBoolean().withMessage('showEmail must be boolean'),
    body('privacy.showPhone').optional().isBoolean().withMessage('showPhone must be boolean'),
    body('privacy.showLinkedIn').optional().isBoolean().withMessage('showLinkedIn must be boolean'),
    body('privacy.showLocation').optional().isBoolean().withMessage('showLocation must be boolean'),
    body('privacy.showSalaryExpectations').optional().isBoolean().withMessage('showSalaryExpectations must be boolean'),
    body('privacy.searchable').optional().isBoolean().withMessage('searchable must be boolean'),
    body('privacy.allowDirectMessages').optional().isBoolean().withMessage('allowDirectMessages must be boolean'),
    body('privacy.showOnlineStatus').optional().isBoolean().withMessage('showOnlineStatus must be boolean'),
    
    // Email Notifications Validation
    body('notifications.email.enabled').optional().isBoolean().withMessage('Email notifications enabled must be boolean'),
    body('notifications.email.frequency').optional().isIn(['immediate', 'daily', 'weekly', 'never']).withMessage('Invalid email frequency'),
    body('notifications.email.jobMatches').optional().isBoolean().withMessage('jobMatches must be boolean'),
    body('notifications.email.applicationUpdates').optional().isBoolean().withMessage('applicationUpdates must be boolean'),
    body('notifications.email.interviewReminders').optional().isBoolean().withMessage('interviewReminders must be boolean'),
    body('notifications.email.deadlineAlerts').optional().isBoolean().withMessage('deadlineAlerts must be boolean'),
    body('notifications.email.careerTips').optional().isBoolean().withMessage('careerTips must be boolean'),
    body('notifications.email.weeklyDigest').optional().isBoolean().withMessage('weeklyDigest must be boolean'),
    body('notifications.email.marketingEmails').optional().isBoolean().withMessage('marketingEmails must be boolean'),
    body('notifications.email.securityAlerts').optional().isBoolean().withMessage('securityAlerts must be boolean'),
    
    // Push Notifications Validation
    body('notifications.push.enabled').optional().isBoolean().withMessage('Push notifications enabled must be boolean'),
    body('notifications.push.quietHours.enabled').optional().isBoolean().withMessage('Quiet hours enabled must be boolean'),
    body('notifications.push.quietHours.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format (HH:mm)'),
    body('notifications.push.quietHours.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format (HH:mm)'),
    body('notifications.push.quietHours.timezone').optional().isLength({ min: 1 }).withMessage('Timezone is required'),
    
    // SMS Notifications Validation
    body('notifications.sms.enabled').optional().isBoolean().withMessage('SMS notifications enabled must be boolean'),
    body('notifications.sms.urgentOnly').optional().isBoolean().withMessage('urgentOnly must be boolean'),
    body('notifications.sms.interviewReminders').optional().isBoolean().withMessage('interviewReminders must be boolean'),
    body('notifications.sms.securityAlerts').optional().isBoolean().withMessage('securityAlerts must be boolean'),
    
    // Job Search Settings Validation
    body('jobSearch.autoApply.enabled').optional().isBoolean().withMessage('autoApply enabled must be boolean'),
    body('jobSearch.autoApply.criteria.matchScoreThreshold').optional().isInt({ min: 50, max: 100 }).withMessage('Match score threshold must be 50-100'),
    body('jobSearch.autoApply.criteria.maxApplicationsPerDay').optional().isInt({ min: 1, max: 20 }).withMessage('Max applications per day must be 1-20'),
    body('jobSearch.autoApply.criteria.salaryMinimum').optional().isFloat({ min: 0 }).withMessage('Salary minimum must be positive'),
    body('jobSearch.autoApply.criteria.locationRadius').optional().isInt({ min: 1, max: 500 }).withMessage('Location radius must be 1-500'),
    body('jobSearch.autoApply.criteria.excludeCompanies').optional().isArray().withMessage('Exclude companies must be an array'),
    body('jobSearch.autoApply.criteria.requirementKeywords').optional().isArray().withMessage('Requirement keywords must be an array'),
    body('jobSearch.autoApply.criteria.blacklistKeywords').optional().isArray().withMessage('Blacklist keywords must be an array'),
    
    body('jobSearch.alerts.enabled').optional().isBoolean().withMessage('Job alerts enabled must be boolean'),
    body('jobSearch.alerts.frequency').optional().isIn(['immediate', 'daily', 'weekly']).withMessage('Invalid alerts frequency'),
    body('jobSearch.alerts.keywords').optional().isArray().withMessage('Alert keywords must be an array'),
    body('jobSearch.alerts.locations').optional().isArray().withMessage('Alert locations must be an array'),
    body('jobSearch.alerts.salaryRange.min').optional().isFloat({ min: 0 }).withMessage('Salary range min must be positive'),
    body('jobSearch.alerts.salaryRange.max').optional().isFloat({ min: 0 }).withMessage('Salary range max must be positive'),
    body('jobSearch.alerts.salaryRange.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('jobSearch.alerts.jobType').optional().isArray().withMessage('Job type must be an array'),
    body('jobSearch.alerts.experienceLevel').optional().isArray().withMessage('Experience level must be an array'),
    body('jobSearch.alerts.remoteOptions').optional().isArray().withMessage('Remote options must be an array'),
    
    // AI Settings Validation
    body('ai.resumeOptimization.enabled').optional().isBoolean().withMessage('Resume optimization enabled must be boolean'),
    body('ai.resumeOptimization.aggressiveness').optional().isIn(['conservative', 'moderate', 'aggressive']).withMessage('Invalid optimization aggressiveness'),
    body('ai.resumeOptimization.keywordDensity').optional().isFloat({ min: 0.1, max: 1.0 }).withMessage('Keyword density must be 0.1-1.0'),
    body('ai.resumeOptimization.tonePreference').optional().isIn(['professional', 'casual', 'enthusiastic', 'authoritative']).withMessage('Invalid tone preference'),
    body('ai.resumeOptimization.autoUpdate').optional().isBoolean().withMessage('autoUpdate must be boolean'),
    body('ai.resumeOptimization.approvalRequired').optional().isBoolean().withMessage('approvalRequired must be boolean'),
    
    body('ai.coverLetterGeneration.enabled').optional().isBoolean().withMessage('Cover letter generation enabled must be boolean'),
    body('ai.coverLetterGeneration.template').optional().isIn(['professional', 'creative', 'technical', 'executive', 'custom']).withMessage('Invalid cover letter template'),
    body('ai.coverLetterGeneration.personalizationLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid personalization level'),
    body('ai.coverLetterGeneration.maxLength').optional().isInt({ min: 50, max: 1000 }).withMessage('Max length must be 50-1000 words'),
    body('ai.coverLetterGeneration.autoGenerate').optional().isBoolean().withMessage('autoGenerate must be boolean'),
    body('ai.coverLetterGeneration.requireReview').optional().isBoolean().withMessage('requireReview must be boolean'),
    
    body('ai.careerCoach.enabled').optional().isBoolean().withMessage('Career coach enabled must be boolean'),
    body('ai.careerCoach.proactiveAdvice').optional().isBoolean().withMessage('proactiveAdvice must be boolean'),
    body('ai.careerCoach.communicationStyle').optional().isIn(['direct', 'supportive', 'analytical', 'encouraging']).withMessage('Invalid communication style'),
    body('ai.careerCoach.focusAreas').optional().isArray().withMessage('Focus areas must be an array'),
    body('ai.careerCoach.reminderFrequency').optional().isIn(['daily', 'weekly', 'bi-weekly', 'monthly', 'never']).withMessage('Invalid reminder frequency'),
    
    // Security Settings Validation
    body('security.twoFactorAuth.enabled').optional().isBoolean().withMessage('2FA enabled must be boolean'),
    body('security.twoFactorAuth.method').optional().isIn(['app', 'sms', 'email']).withMessage('Invalid 2FA method'),
    body('security.twoFactorAuth.backupEnabled').optional().isBoolean().withMessage('backupEnabled must be boolean'),
    
    body('security.sessionManagement.logoutInactive').optional().isBoolean().withMessage('logoutInactive must be boolean'),
    body('security.sessionManagement.inactivityTimeout').optional().isInt({ min: 15, max: 480 }).withMessage('Inactivity timeout must be 15-480 minutes'),
    body('security.sessionManagement.rememberDevice').optional().isBoolean().withMessage('rememberDevice must be boolean'),
    body('security.sessionManagement.deviceTrustDuration').optional().isInt({ min: 1, max: 365 }).withMessage('Device trust duration must be 1-365 days'),
    
    body('security.loginAlerts.newDeviceAlert').optional().isBoolean().withMessage('newDeviceAlert must be boolean'),
    body('security.loginAlerts.unusualLocationAlert').optional().isBoolean().withMessage('unusualLocationAlert must be boolean'),
    body('security.loginAlerts.failedLoginAlert').optional().isBoolean().withMessage('failedLoginAlert must be boolean'),
    body('security.loginAlerts.passwordChangeAlert').optional().isBoolean().withMessage('passwordChangeAlert must be boolean'),
    
    body('security.dataDownload.allowExport').optional().isBoolean().withMessage('allowExport must be boolean'),
    body('security.dataDownload.includeAnalytics').optional().isBoolean().withMessage('includeAnalytics must be boolean'),
    body('security.dataDownload.includeMessages').optional().isBoolean().withMessage('includeMessages must be boolean'),
    body('security.dataDownload.encryptExports').optional().isBoolean().withMessage('encryptExports must be boolean'),
    
    // Interface Settings Validation
    body('interface.theme').optional().isIn(['light', 'dark', 'auto', 'high_contrast']).withMessage('Invalid theme'),
    body('interface.colorScheme').optional().isIn(['blue', 'green', 'purple', 'red', 'orange', 'custom']).withMessage('Invalid color scheme'),
    body('interface.fontSize').optional().isIn(['small', 'medium', 'large', 'extra_large']).withMessage('Invalid font size'),
    body('interface.density').optional().isIn(['compact', 'comfortable', 'spacious']).withMessage('Invalid density'),
    body('interface.language').optional().isLength({ min: 2, max: 10 }).withMessage('Invalid language code'),
    body('interface.timezone').optional().isLength({ min: 1 }).withMessage('Timezone is required'),
    body('interface.dateFormat').optional().isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'custom']).withMessage('Invalid date format'),
    body('interface.timeFormat').optional().isIn(['12h', '24h']).withMessage('Invalid time format'),
    body('interface.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('interface.animations').optional().isBoolean().withMessage('animations must be boolean'),
    body('interface.reducedMotion').optional().isBoolean().withMessage('reducedMotion must be boolean'),
    body('interface.screenReader').optional().isBoolean().withMessage('screenReader must be boolean'),
    
    // Data Consent Validation (required fields)
    body('dataConsent.analytics').optional().isBoolean().withMessage('Analytics consent must be boolean'),
    body('dataConsent.personalizedAds').optional().isBoolean().withMessage('Personalized ads consent must be boolean'),
    body('dataConsent.dataSharing').optional().isBoolean().withMessage('Data sharing consent must be boolean'),
    body('dataConsent.researchParticipation').optional().isBoolean().withMessage('Research participation must be boolean'),
    body('dataConsent.productImprovement').optional().isBoolean().withMessage('Product improvement must be boolean'),
    body('dataConsent.marketingCommunication').optional().isBoolean().withMessage('Marketing communication must be boolean'),
    
    // Custom validation for salary ranges
    body().custom((value) => {
      if (value.jobSearch?.alerts?.salaryRange) {
        const { min, max } = value.jobSearch.alerts.salaryRange;
        if (min && max && min > max) {
          throw new Error('Salary range minimum cannot be greater than maximum');
        }
      }
      return true;
    }),
    
    // Custom validation for quiet hours
    body().custom((value) => {
      if (value.notifications?.push?.quietHours?.enabled) {
        const { startTime, endTime } = value.notifications.push.quietHours;
        if (!startTime || !endTime) {
          throw new Error('Start time and end time are required when quiet hours are enabled');
        }
      }
      return true;
    })
  ],
  validateRequest,
  settingsController.updateUserSettings.bind(settingsController)
);

// =====================
// DATA EXPORT/IMPORT ROUTES
// =====================

/**
 * @route GET /api/settings/export
 * @desc Export user data
 * @access Private
 */
router.get('/export',
  [
    query('format').optional().isIn(['json', 'csv', 'excel']).withMessage('Invalid export format'),
    query('includePrivate').optional().isBoolean().withMessage('includePrivate must be boolean'),
    query('includeAnalytics').optional().isBoolean().withMessage('includeAnalytics must be boolean')
  ],
  validateRequest,
  settingsController.exportUserData.bind(settingsController)
);

/**
 * @route POST /api/settings/import
 * @desc Import user settings
 * @access Private
 */
router.post('/import',
  settingsController.getSettingsRateLimit(),
  [
    body('overwrite').optional().isBoolean().withMessage('overwrite must be boolean')
  ],
  validateRequest,
  // File upload middleware would be added here
  async (req, res, next) => {
    // Mock implementation - would use multer or similar in production
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE_UPLOADED'
      });
    }
    next();
  }
);

// =====================
// SYSTEM SETTINGS ROUTES (Admin only)
// =====================

/**
 * @route GET /api/settings/system
 * @desc Get system settings
 * @access Admin only
 */
router.get('/system',
  requirePermissions('system:settings:read'),
  [
    query('environment').optional().isIn(['development', 'staging', 'production']).withMessage('Invalid environment')
  ],
  validateRequest,
  settingsController.getSystemSettings.bind(settingsController)
);

/**
 * @route PUT /api/settings/system/:settingsId
 * @desc Update system settings
 * @access Admin only
 */
router.put('/system/:settingsId',
  requirePermissions('system:settings:update'),
  settingsController.getSettingsRateLimit(),
  [
    param('settingsId').isMongoId().withMessage('Invalid settings ID format'),
    
    // System-wide feature toggles
    body('features.aiResumeBuilder').optional().isBoolean().withMessage('AI resume builder must be boolean'),
    body('features.coverLetterGenerator').optional().isBoolean().withMessage('Cover letter generator must be boolean'),
    body('features.careerCoach').optional().isBoolean().withMessage('Career coach must be boolean'),
    body('features.jobMatching').optional().isBoolean().withMessage('Job matching must be boolean'),
    body('features.analyticsEngine').optional().isBoolean().withMessage('Analytics engine must be boolean'),
    body('features.premiumFeatures').optional().isBoolean().withMessage('Premium features must be boolean'),
    
    // Rate limiting settings
    body('rateLimiting.authEndpoints.max').optional().isInt({ min: 1, max: 1000 }).withMessage('Auth rate limit must be 1-1000'),
    body('rateLimiting.authEndpoints.windowMs').optional().isInt({ min: 60000 }).withMessage('Auth window must be at least 1 minute'),
    body('rateLimiting.apiEndpoints.max').optional().isInt({ min: 1, max: 10000 }).withMessage('API rate limit must be 1-10000'),
    body('rateLimiting.apiEndpoints.windowMs').optional().isInt({ min: 60000 }).withMessage('API window must be at least 1 minute'),
    body('rateLimiting.aiServices.max').optional().isInt({ min: 1, max: 100 }).withMessage('AI services rate limit must be 1-100'),
    body('rateLimiting.aiServices.costLimitPerUser').optional().isFloat({ min: 0, max: 1000 }).withMessage('AI cost limit must be 0-1000'),
    
    // Security settings
    body('security.passwordPolicy.minLength').optional().isInt({ min: 8, max: 128 }).withMessage('Password min length must be 8-128'),
    body('security.passwordPolicy.requireUppercase').optional().isBoolean().withMessage('requireUppercase must be boolean'),
    body('security.passwordPolicy.requireLowercase').optional().isBoolean().withMessage('requireLowercase must be boolean'),
    body('security.passwordPolicy.requireNumbers').optional().isBoolean().withMessage('requireNumbers must be boolean'),
    body('security.passwordPolicy.requireSpecialChars').optional().isBoolean().withMessage('requireSpecialChars must be boolean'),
    body('security.passwordPolicy.maxAge').optional().isInt({ min: 30, max: 365 }).withMessage('Password max age must be 30-365 days'),
    
    body('security.sessionPolicy.maxDuration').optional().isInt({ min: 3600, max: 604800 }).withMessage('Session max duration must be 1 hour - 1 week'),
    body('security.sessionPolicy.inactivityTimeout').optional().isInt({ min: 900, max: 28800 }).withMessage('Inactivity timeout must be 15 minutes - 8 hours'),
    body('security.sessionPolicy.multipleSessionsAllowed').optional().isBoolean().withMessage('multipleSessionsAllowed must be boolean'),
    
    body('security.encryptionSettings.algorithm').optional().isIn(['aes-256-gcm', 'aes-256-cbc']).withMessage('Invalid encryption algorithm'),
    body('security.encryptionSettings.keyRotationDays').optional().isInt({ min: 30, max: 365 }).withMessage('Key rotation must be 30-365 days'),
    
    // Notification settings
    body('notifications.emailService.provider').optional().isIn(['sendgrid', 'ses', 'mailgun']).withMessage('Invalid email provider'),
    body('notifications.emailService.dailyLimit').optional().isInt({ min: 100, max: 100000 }).withMessage('Email daily limit must be 100-100000'),
    body('notifications.pushNotifications.enabled').optional().isBoolean().withMessage('Push notifications enabled must be boolean'),
    body('notifications.pushNotifications.provider').optional().isIn(['firebase', 'apns', 'custom']).withMessage('Invalid push provider'),
    
    // AI service settings
    body('aiServices.openai.enabled').optional().isBoolean().withMessage('OpenAI enabled must be boolean'),
    body('aiServices.openai.model').optional().isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']).withMessage('Invalid OpenAI model'),
    body('aiServices.openai.maxTokens').optional().isInt({ min: 100, max: 4000 }).withMessage('Max tokens must be 100-4000'),
    body('aiServices.openai.temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be 0-2'),
    
    // Data retention settings
    body('dataRetention.userProfiles.retentionDays').optional().isInt({ min: 30, max: 2555 }).withMessage('Profile retention must be 30-2555 days'),
    body('dataRetention.analytics.retentionDays').optional().isInt({ min: 30, max: 1095 }).withMessage('Analytics retention must be 30-1095 days'),
    body('dataRetention.auditLogs.retentionDays').optional().isInt({ min: 90, max: 2555 }).withMessage('Audit log retention must be 90-2555 days'),
    body('dataRetention.backups.enabled').optional().isBoolean().withMessage('Backups enabled must be boolean'),
    body('dataRetention.backups.frequency').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid backup frequency'),
    body('dataRetention.backups.retentionCount').optional().isInt({ min: 1, max: 100 }).withMessage('Backup retention count must be 1-100'),
    
    // Integration settings
    body('integrations.webhook.enabled').optional().isBoolean().withMessage('Webhook enabled must be boolean'),
    body('integrations.webhook.endpoints').optional().isArray().withMessage('Webhook endpoints must be an array'),
    body('integrations.sso.enabled').optional().isBoolean().withMessage('SSO enabled must be boolean'),
    body('integrations.sso.providers').optional().isArray().withMessage('SSO providers must be an array'),
    
    // Custom validation for feature dependencies
    body().custom((value) => {
      if (value.features?.careerCoach && !value.features?.aiResumeBuilder) {
        throw new Error('Career coach requires AI resume builder to be enabled');
      }
      if (value.aiServices?.openai?.enabled && !value.aiServices?.openai?.apiKey) {
        throw new Error('OpenAI API key is required when OpenAI is enabled');
      }
      return true;
    })
  ],
  validateRequest,
  settingsController.updateSystemSettings.bind(settingsController)
);

// =====================
// BULK OPERATIONS ROUTES (Admin only)
// =====================

/**
 * @route POST /api/settings/bulk/users
 * @desc Bulk update user settings
 * @access Admin only
 */
router.post('/bulk/users',
  requirePermissions('settings:bulk:update'),
  [
    body('userIds').isArray({ min: 1, max: 1000 }).withMessage('UserIds must be an array of 1-1000 items'),
    body('userIds.*').isMongoId().withMessage('Each user ID must be valid'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('dryRun').optional().isBoolean().withMessage('dryRun must be boolean')
  ],
  validateRequest,
  async (req, res, next) => {
    // Mock implementation for bulk operations
    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        processed: req.body.userIds.length,
        successful: req.body.userIds.length,
        failed: 0
      }
    });
  }
);

// =====================
// HEALTH CHECK ROUTES
// =====================

/**
 * @route GET /api/settings/health
 * @desc Health check for settings service
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Enterprise Settings API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: redis.status === 'ready' ? 'connected' : 'disconnected'
  });
});

/**
 * @route GET /api/settings/metrics
 * @desc Get service metrics
 * @access Admin only
 */
router.get('/metrics',
  requirePermissions('system:metrics:read'),
  async (req, res) => {
    try {
      const cacheStats = await redis.hgetall('cache_stats');
      const metrics = {
        cache: {
          hits: parseInt(cacheStats.profile_get_hits || '0'),
          misses: parseInt(cacheStats.profile_get_misses || '0'),
          hitRate: 0
        },
        requests: {
          total: 0, // Would be tracked by middleware
          errors: 0,
          averageResponseTime: 0
        }
      };
      
      metrics.cache.hitRate = metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses) || 0;
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics'
      });
    }
  }
);

// Error handling middleware specific to settings routes
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Settings API Error:', error);
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors,
      code: 'VALIDATION_ERROR'
    });
  }
  
  // MongoDB errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      error: 'Database error',
      code: 'DATABASE_ERROR'
    });
  }
  
  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: error.retryAfter
    });
  }
  
  // Permission errors
  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  
  // Authentication errors
  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Default error response
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;