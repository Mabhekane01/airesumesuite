import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { jobApplicationController } from '../controllers/jobApplicationController';
import { authMiddleware as authenticateToken, AuthenticatedRequest, requireSubscription } from '../middleware/auth';
import { requireEnterpriseSubscription, trackFeatureUsage, subscriptionRateLimit } from '../middleware/subscriptionValidation';

const router: Router = Router();

// Validation middleware
const createApplicationValidation = [
  body('jobTitle')
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ max: 200 })
    .withMessage('Job title must be 200 characters or less'),
  body('companyName')
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 200 })
    .withMessage('Company name must be 200 characters or less'),
  body('jobDescription')
    .notEmpty()
    .withMessage('Job description is required'),
  body('jobLocation.remote')
    .isBoolean()
    .withMessage('Remote field must be a boolean'),
  body('applicationMethod')
    .optional()
    .isIn(['online', 'email', 'referral', 'recruiter', 'career_fair', 'networking'])
    .withMessage('Invalid application method'),
  body('jobSource')
    .optional()
    .isIn(['manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'referral', 'recruiter'])
    .withMessage('Invalid job source')
];

const updateApplicationValidation = [
  // Core job information fields
  body('jobTitle')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Job title must be 200 characters or less'),
  body('companyName')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Company name must be 200 characters or less'),
  body('jobDescription')
    .optional()
    .isString()
    .withMessage('Job description must be a string'),
  body('jobUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Job URL must be a valid URL'),
  body('jobSource')
    .optional()
    .isIn(['manual', 'linkedin', 'indeed', 'glassdoor', 'company_website', 'referral', 'recruiter'])
    .withMessage('Invalid job source'),
  body('applicationMethod')
    .optional()
    .isIn(['online', 'email', 'referral', 'recruiter', 'career_fair', 'networking'])
    .withMessage('Invalid application method'),
  // Job location
  body('jobLocation')
    .optional()
    .isObject()
    .withMessage('Job location must be an object'),
  body('jobLocation.city')
    .optional()
    .isString()
    .withMessage('City must be a string'),
  body('jobLocation.state')
    .optional()
    .isString()
    .withMessage('State must be a string'),
  body('jobLocation.country')
    .optional()
    .isString()
    .withMessage('Country must be a string'),
  body('jobLocation.remote')
    .optional()
    .isBoolean()
    .withMessage('Remote field must be a boolean'),
  body('jobLocation.hybrid')
    .optional()
    .isBoolean()
    .withMessage('Hybrid field must be a boolean'),
  // Compensation
  body('compensation')
    .optional()
    .isObject()
    .withMessage('Compensation must be an object'),
  body('compensation.salaryRange')
    .optional()
    .isObject()
    .withMessage('Salary range must be an object'),
  body('compensation.salaryRange.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('compensation.salaryRange.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number'),
  body('compensation.salaryRange.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('compensation.salaryRange.period')
    .optional()
    .isIn(['hourly', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid salary period'),
  body('compensation.benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array'),
  // Referral contact
  body('referralContact')
    .optional()
    .isObject()
    .withMessage('Referral contact must be an object'),
  body('referralContact.name')
    .optional()
    .isString()
    .withMessage('Referral contact name must be a string'),
  body('referralContact.email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Referral contact email must be valid'),
  body('referralContact.relationship')
    .optional()
    .isString()
    .withMessage('Relationship must be a string'),
  // Application status and metadata
  body('status')
    .optional()
    .isIn([
      'applied', 'under_review', 'phone_screen', 'technical_assessment',
      'first_interview', 'second_interview', 'final_interview', 'reference_check',
      'offer_negotiation', 'offer_received', 'offer_accepted', 'offer_declined',
      'rejected', 'withdrawn', 'ghosted', 'on_hold'
    ])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'dream_job'])
    .withMessage('Invalid priority'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must be 1000 characters or less'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  // Allow updating documents used (resume data)
  body('documentsUsed')
    .optional()
    .isObject()
    .withMessage('Documents used must be an object'),
  body('documentsUsed.resumeId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Resume ID must be a valid MongoDB ObjectId'),
  body('documentsUsed.resumeContent')
    .optional()
    .isString()
    .withMessage('Resume content must be a string'),
  body('documentsUsed.coverLetterId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Cover letter ID must be a valid MongoDB ObjectId'),
  // Allow updating application strategy
  body('applicationStrategy')
    .optional()
    .isObject()
    .withMessage('Application strategy must be an object'),
  body('applicationStrategy.whyInterested')
    .optional()
    .isString()
    .withMessage('Why interested must be a string'),
  body('applicationStrategy.keySellingPoints')
    .optional()
    .isArray()
    .withMessage('Key selling points must be an array'),
  body('applicationStrategy.uniqueValueProposition')
    .optional()
    .isString()
    .withMessage('Unique value proposition must be a string')
];

const addInterviewValidation = [
  body('type')
    .isIn(['phone', 'video', 'on_site', 'technical', 'behavioral', 'case_study', 'presentation', 'panel'])
    .withMessage('Invalid interview type'),
  body('round')
    .isInt({ min: 1 })
    .withMessage('Round must be a positive integer'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Invalid scheduled date format'),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('interviewers')
    .isArray({ min: 1 })
    .withMessage('At least one interviewer is required'),
  body('interviewers.*.name')
    .notEmpty()
    .withMessage('Interviewer name is required'),
  body('interviewers.*.title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Interviewer title must be 100 characters or less')
];

const updateInterviewValidation = [
  body('status')
    .optional()
    .isIn(['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'])
    .withMessage('Invalid interview status'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Rating must be between 1 and 10'),
  body('technicalPerformance')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Technical performance must be between 1 and 10'),
  body('culturalFit')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Cultural fit must be between 1 and 10'),
  body('communicationSkills')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Communication skills must be between 1 and 10'),
  body('thankYouSent')
    .optional()
    .isBoolean()
    .withMessage('Thank you sent must be a boolean')
];

const addCommunicationValidation = [
  body('type')
    .isIn(['email', 'phone', 'linkedin', 'text', 'in_person', 'video_call', 'recruiter_call'])
    .withMessage('Invalid communication type'),
  body('direction')
    .isIn(['inbound', 'outbound'])
    .withMessage('Direction must be inbound or outbound'),
  body('contactPerson')
    .notEmpty()
    .withMessage('Contact person is required')
    .isLength({ max: 100 })
    .withMessage('Contact person must be 100 characters or less'),
  body('summary')
    .notEmpty()
    .withMessage('Summary is required')
    .isLength({ max: 500 })
    .withMessage('Summary must be 500 characters or less'),
  body('sentiment')
    .optional()
    .isIn(['positive', 'neutral', 'negative'])
    .withMessage('Invalid sentiment'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority')
];

const addTaskValidation = [
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title must be 200 characters or less'),
  body('type')
    .isIn(['research', 'follow_up', 'preparation', 'networking', 'document_update', 'other'])
    .withMessage('Invalid task type'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('dueDate')
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be 1000 characters or less')
];

const mongoIdValidation = [
  param('applicationId').isMongoId().withMessage('Invalid application ID'),
];

const mongoIdPairValidation = [
  param('applicationId').isMongoId().withMessage('Invalid application ID'),
  param('interviewId').notEmpty().withMessage('Interview ID is required'),
];

const taskIdValidation = [
  param('applicationId').isMongoId().withMessage('Invalid application ID'),
  param('taskId').notEmpty().withMessage('Task ID is required'),
];

const bulkUpdateValidation = [
  body('applicationIds')
    .isArray({ min: 1 })
    .withMessage('Application IDs array is required'),
  body('applicationIds.*')
    .isMongoId()
    .withMessage('Invalid application ID in array'),
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['applicationDate', 'status', 'priority', 'companyName', 'jobTitle'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Routes
router.use(authenticateToken);
router.use(requireSubscription('premium'));

// Create job application
router.post(
  '/',
  createApplicationValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.createApplication(req, res)
);

// Get all applications with filtering and pagination
router.get(
  '/',
  paginationValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getApplications(req, res)
);

// Get application statistics
router.get(
  '/stats',
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getApplicationStats(req, res)
);

// Get upcoming interviews
router.get(
  '/interviews/upcoming',
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getUpcomingInterviews(req, res)
);

// Get pending tasks
router.get(
  '/tasks/pending',
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('overdue').optional().isBoolean().withMessage('Overdue must be a boolean'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getPendingTasks(req, res)
);

// Export applications
router.get(
  '/export',
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Invalid format'),
  query('includeArchived').optional().isBoolean().withMessage('Include archived must be a boolean'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.exportApplications(req, res)
);

// Bulk update applications
router.patch(
  '/bulk',
  bulkUpdateValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.bulkUpdateApplications(req, res)
);

// Get specific application
router.get(
  '/:applicationId',
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getApplication(req, res)
);

// Update application
router.put(
  '/:applicationId',
  mongoIdValidation,
  updateApplicationValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.updateApplication(req, res)
);

// Delete application
router.delete(
  '/:applicationId',
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.deleteApplication(req, res)
);

// Archive application
router.patch(
  '/:applicationId/archive',
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.archiveApplication(req, res)
);

// Test Gemini connection
router.get(
  '/test-gemini',
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.testGeminiConnection(req, res)
);

// Debug match score calculation
router.get(
  '/:applicationId/debug-match-score',
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.debugMatchScore(req, res)
);

// Reset match scores for fresh analysis
router.post(
  '/reset-match-scores',
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.resetMatchScores(req, res)
);

// Calculate AI match score
router.post(
  '/:applicationId/match-score',
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-job-matching'),
  trackFeatureUsage('ai-job-matching'),
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.calculateMatchScore(req, res)
);

// Batch calculate match scores for applications with missing scores
router.post(
  '/batch/match-scores',
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-job-matching'),
  trackFeatureUsage('ai-batch-matching'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.batchCalculateMatchScores(req, res)
);

// Get job match analysis
router.get(
  '/:applicationId/analysis',
  mongoIdValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getJobMatchAnalysis(req, res)
);

// Generate cover letter
router.post(
  '/:applicationId/cover-letter',
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-cover-letter'),
  trackFeatureUsage('ai-cover-letter-generation'),
  mongoIdValidation,
  body('template').optional().isString().withMessage('Template must be a string'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.generateCoverLetter(req, res)
);

// Get interview prep
router.get(
  '/:applicationId/interview-prep',
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-interview-prep'),
  trackFeatureUsage('ai-interview-prep'),
  mongoIdValidation,
  query('interviewType')
    .optional()
    .isIn(['behavioral', 'technical', 'case_study', 'general'])
    .withMessage('Invalid interview type'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.getInterviewPrep(req, res)
);

// Add interview
router.post(
  '/:applicationId/interviews',
  mongoIdValidation,
  addInterviewValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.addInterview(req, res)
);

// Update interview
router.put(
  '/:applicationId/interviews/:interviewId',
  mongoIdPairValidation,
  updateInterviewValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.updateInterview(req, res)
);

// Add communication
router.post(
  '/:applicationId/communications',
  mongoIdValidation,
  addCommunicationValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.addCommunication(req, res)
);

// Add task
router.post(
  '/:applicationId/tasks',
  mongoIdValidation,
  addTaskValidation,
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.addTask(req, res)
);

// Complete task
router.patch(
  '/:applicationId/tasks/:taskId/complete',
  taskIdValidation,
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must be 500 characters or less'),
  (req: AuthenticatedRequest, res: Response) => jobApplicationController.completeTask(req, res)
);

export default router;