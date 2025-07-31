import express, { Router, Request, Response, NextFunction } from 'express';
import { 
  resumeController, 
  resumeValidation, 
  optimizeValidation, 
  jobUrlValidation,
  atsValidation 
} from '../controllers/resumeController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { requireEnterpriseSubscription, trackFeatureUsage, subscriptionRateLimit } from '../middleware/subscriptionValidation';

const router: Router = express.Router();

// Test endpoint to verify routes are working (no auth required)
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Resume routes are working', timestamp: new Date().toISOString() });
});

// Development endpoints - Only enabled in development mode
let isDevelopment = process.env.NODE_ENV === 'development' && !process.env.DISABLE_DEV_ENDPOINTS;
console.log('🔧 NODE_ENV check:', process.env.NODE_ENV, 'isDevelopment:', isDevelopment);

// Additional safety check for production
if (process.env.NODE_ENV === 'production') {
  console.log('🚨 PRODUCTION MODE: Development endpoints are disabled for security');
  isDevelopment = false;
}

// Define mockUser outside the if block so it's accessible to both development sections
const mockUser = { id: '507f1f77bcf86cd799439011', email: 'dev@example.com' }; // Valid ObjectId

if (isDevelopment) {
  console.log('⚠️ Development endpoints enabled - SHOULD NOT BE USED IN PRODUCTION');

  // Dev test endpoint for basic functionality
  router.post('/test-dev', (req: Request, res: Response) => {
    console.log('🧪 DEV: Test endpoint hit - WARNING: Development mode only');
    res.json({ success: true, message: 'Dev endpoint working', received: req.body });
  });

  // Simple database connection test
  router.get('/db-test', async (req: Request, res: Response) => {
    try {
      const mongoose = require('mongoose');
      console.log('🔍 Testing database connection...');
      console.log('Connection state:', mongoose.connection.readyState);
      
      // Try to perform a simple operation
      const testDoc = await mongoose.connection.db.admin().ping();
      console.log('Database ping result:', testDoc);
      
      res.json({ 
        success: true, 
        connectionState: mongoose.connection.readyState,
        ping: testDoc
      });
    } catch (error) {
      console.error('Database test failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Dev minimal test endpoint - DEPRECATED: Should use authenticated endpoints
  router.post('/minimal-dev', (req: Request, res: Response) => {
    console.log('⚠️ DEV: Minimal test endpoint hit - DEPRECATED, use authenticated endpoints');
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.createMinimalResume(req as AuthenticatedRequest, res);
  });

  // Dev endpoint for creating resumes without auth - DEPRECATED
  router.post('/create-dev', (req: Request, res: Response) => {
    console.log('⚠️ DEV: Create resume dev endpoint - DEPRECATED, use authenticated /resumes endpoint');
    console.log('🧪 DEV: Request body keys:', Object.keys(req.body));
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.createResumeWithoutValidation(req as AuthenticatedRequest, res);
  });

  // Dev endpoint for getting resume by ID without auth - DEPRECATED
  router.get('/get-dev/:id', (req: Request, res: Response) => {
    console.log('⚠️ DEV: Get resume dev endpoint - DEPRECATED, use authenticated /resumes/:id endpoint');
    console.log('🧪 DEV: Resume ID:', req.params.id);
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.getResumeById(req as AuthenticatedRequest, res);
  });
} else {
  console.log('✅ Development endpoints disabled - Production mode');
}

// Additional dev endpoints BEFORE auth middleware (conditionally enabled)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Setting up additional development endpoints (no auth required)');
  
  router.post('/generate-summary-dev', (req: Request, res: Response) => {
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.generateSummaryForUnsavedResume(req as AuthenticatedRequest, res);
  });
  
  router.post('/enhance-dev', (req: Request, res: Response) => {
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.enhanceUnsavedResume(req as AuthenticatedRequest, res);
  });
}

// Apply auth middleware to all routes AFTER dev endpoints
router.use(authMiddleware);

// GET /api/v1/resumes/count - Get resume count for user (for debugging)
router.get('/count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { Resume } = require('../models/Resume');
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const count = await Resume.countDocuments({ userId });
    console.log(`📊 Resume count for user ${userId}: ${count}`);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting resume count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resume count'
    });
  }
});

// POST /api/v1/resumes/debug-user-check - Debug user ID mismatch
router.post('/debug-user-check', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { Resume } = require('../models/Resume');
    const mongoose = require('mongoose');
    const backendUserId = req.user?.id;
    const { frontendUserId, frontendEmail } = req.body;
    
    console.log('🔍 Debug user check:', {
      backendUserId,
      frontendUserId,
      frontendEmail,
      userMatch: backendUserId === frontendUserId
    });

    // Get all resumes in database (limit 10 for debugging)
    const allResumes = await Resume.find({}).limit(10).select('userId title personalInfo.email personalInfo.firstName');
    
    // Check specific user ID
    const userResumes = await Resume.find({ userId: new mongoose.Types.ObjectId(backendUserId) });
    
    // Check if there are resumes with frontend user ID
    let frontendUserResumes = [];
    if (frontendUserId && frontendUserId !== backendUserId) {
      try {
        frontendUserResumes = await Resume.find({ userId: new mongoose.Types.ObjectId(frontendUserId) });
      } catch (error) {
        console.log('Frontend user ID invalid format');
      }
    }

    res.json({
      success: true,
      data: {
        authentication: {
          backendUserId,
          frontendUserId,
          userIdMatch: backendUserId === frontendUserId,
          frontendEmail
        },
        database: {
          totalResumesInDb: allResumes.length,
          resumesForBackendUserId: userResumes.length,
          resumesForFrontendUserId: frontendUserResumes.length,
          sampleResumes: allResumes.map(r => ({
            id: r._id,
            userId: r.userId,
            title: r.title,
            email: r.personalInfo?.email,
            name: r.personalInfo?.firstName
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error in debug user check:', error);
    res.status(500).json({
      success: false,
      message: 'Debug check failed',
      error: error.message
    });
  }
});

// POST /api/v1/resumes/migrate-resumes - Migrate resumes from email match (One-time admin operation)
router.post('/migrate-resumes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { Resume } = require('../models/Resume');
    const mongoose = require('mongoose');
    const currentUserId = req.user?.id;
    const currentUserEmail = req.user?.email;
    
    console.log('🔄 Migration request from user:', {
      currentUserId,
      currentUserEmail
    });

    if (!currentUserId || !currentUserEmail) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Find resumes that match the user's email but have wrong userId (from dev/mock data)
    const resumesToMigrate = await Resume.find({
      'personalInfo.email': currentUserEmail,
      userId: { $ne: new mongoose.Types.ObjectId(currentUserId) }
    });

    console.log('📄 Found resumes to migrate:', resumesToMigrate.length);

    if (resumesToMigrate.length === 0) {
      res.json({
        success: true,
        message: 'No resumes need migration - all resumes are correctly assigned',
        data: { migratedCount: 0 }
      });
      return;
    }

    // Security check: Only migrate from known dev user IDs (not from other real users)
    const devUserIds = ['507f1f77bcf86cd799439011']; // Known dev/mock user IDs
    const safeToMigrate = resumesToMigrate.every(resume => 
      devUserIds.includes(resume.userId.toString())
    );

    if (!safeToMigrate) {
      res.status(400).json({
        success: false,
        message: 'Migration blocked - found resumes from real users, not dev data',
        data: { 
          resumeUserIds: resumesToMigrate.map(r => r.userId.toString()),
          devUserIds 
        }
      });
      return;
    }

    // Migrate the resumes to the current user
    const updateResult = await Resume.updateMany(
      {
        'personalInfo.email': currentUserEmail,
        userId: { $in: devUserIds.map(id => new mongoose.Types.ObjectId(id)) }
      },
      {
        $set: { userId: new mongoose.Types.ObjectId(currentUserId) }
      }
    );

    console.log('✅ Migrated resume ownership:', updateResult);

    res.json({
      success: true,
      message: `Successfully migrated ${updateResult.modifiedCount} resumes to your account`,
      data: { 
        migratedCount: updateResult.modifiedCount,
        matchedCount: updateResult.matchedCount
      }
    });

  } catch (error) {
    console.error('❌ Error migrating resumes:', error);
    res.status(500).json({
      success: false,
      message: 'Resume migration failed',
      error: error.message
    });
  }
});

// GET /api/v1/resumes - Get all resumes for user
router.get('/', (req: AuthenticatedRequest, res: Response) => resumeController.getUserResumes(req, res));

// POST /api/v1/resumes/download/:format - Download resume in various formats (MUST be before /:id routes)
router.post('/download/:format', (req: AuthenticatedRequest, res: Response) => {
  console.log('🎯 Resume download route hit! Format:', req.params.format);
  resumeController.downloadResume(req, res);
});

// POST /api/v1/resumes/parse - Parse resume from text
router.post('/parse', (req: AuthenticatedRequest, res: Response) => resumeController.parseResumeFromText(req, res));

// POST /api/v1/resumes/generate-summary - Generate summary for saved or unsaved resume
router.post('/generate-summary', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-resume-generation'), (req: AuthenticatedRequest, res: Response) => resumeController.generateProfessionalSummary(req, res));

// POST /api/v1/resumes/optimize-for-job - Optimize unsaved resume for job
router.post('/optimize-for-job', (req: AuthenticatedRequest, res: Response) => resumeController.optimizeUnsavedResumeForJob(req, res));

// POST /api/v1/resumes/job-alignment - Check job alignment for unsaved resume
router.post('/job-alignment', (req: AuthenticatedRequest, res: Response) => resumeController.checkJobAlignmentForUnsavedResume(req, res));

// POST /api/v1/resumes/analyze-job-url - Analyze job posting from URL (no resume required)
router.post('/analyze-job-url', (req: AuthenticatedRequest, res: Response) => resumeController.analyzeJobFromUrl(req, res));

// POST /api/v1/resumes/job-matching - Get job matching score without saved resume
router.post('/job-matching', (req: AuthenticatedRequest, res: Response) => resumeController.getJobMatchingScoreUnsaved(req, res));

// POST /api/v1/resumes/optimize-job-url - Optimize unsaved resume with job URL
router.post('/optimize-job-url', (req: AuthenticatedRequest, res: Response) => resumeController.optimizeUnsavedResumeWithJobUrl(req, res));

// POST /api/v1/resumes/analyze-ats - Analyze ATS compatibility for unsaved resume
router.post('/analyze-ats', (req: AuthenticatedRequest, res: Response) => resumeController.analyzeATSCompatibilityUnsaved(req, res));

// GET /api/v1/resumes/:id - Get specific resume
router.get('/:id', (req: AuthenticatedRequest, res: Response) => resumeController.getResumeById(req, res));

// POST /api/v1/resumes - Create new resume
router.post('/', (req: AuthenticatedRequest, res: Response) => resumeController.createResumeWithoutValidation(req, res));

// PUT /api/v1/resumes/:id - Update resume
router.put('/:id', resumeValidation, (req: AuthenticatedRequest, res: Response) => resumeController.updateResume(req, res));

// DELETE /api/v1/resumes/:id - Delete resume
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => resumeController.deleteResume(req, res));

// POST /api/v1/resumes/:id/optimize - Optimize resume for specific job
router.post('/:id/optimize', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-resume-optimization'), optimizeValidation, (req: AuthenticatedRequest, res: Response) => resumeController.optimizeResumeForJob(req, res));

// POST /api/v1/resumes/:id/optimize-url - Optimize resume using job URL
router.post('/:id/optimize-url', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-resume-optimization'), jobUrlValidation, (req: AuthenticatedRequest, res: Response) => resumeController.optimizeResumeWithJobUrl(req, res));

// POST /api/v1/resumes/:id/ats-analysis - Analyze ATS compatibility
router.post('/:id/ats-analysis', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-ats-analysis'), atsValidation, (req: AuthenticatedRequest, res: Response) => resumeController.analyzeATSCompatibility(req, res));

// POST /api/v1/resumes/:id/job-alignment - Check job alignment score
router.post('/:id/job-alignment', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-job-alignment'), (req: AuthenticatedRequest, res: Response) => resumeController.getJobAlignmentScore(req, res));

// POST /api/v1/resumes/enhance - Enhance unsaved resume data
router.post('/enhance', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.enhanceUnsavedResume(req, res));

// POST /api/v1/resumes/:id/enhance - Comprehensive AI enhancement
router.post('/:id/enhance', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-resume-enhancement'), (req: AuthenticatedRequest, res: Response) => resumeController.enhanceResumeComprehensively(req, res));


// POST /api/v1/resumes/:id/job-matching - Get job matching score with URL
router.post('/:id/job-matching', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-job-matching'), (req: AuthenticatedRequest, res: Response) => resumeController.getJobMatchingScore(req, res));

// POST /api/v1/resumes/:id/optimize-job-url - Optimize resume using only job URL
router.post('/:id/optimize-job-url', authMiddleware, requireEnterpriseSubscription, subscriptionRateLimit('ai-resume-builder'), trackFeatureUsage('ai-resume-optimization'), (req: AuthenticatedRequest, res: Response) => resumeController.optimizeResumeWithJobUrlOnly(req, res));

// GET /api/v1/resumes/:id/suggestions - Get missing section suggestions
router.get('/:id/suggestions', (req: AuthenticatedRequest, res: Response) => resumeController.suggestMissingSections(req, res));

// Additional dev endpoints (conditionally enabled)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Setting up additional development endpoints');
  
  router.post('/download-dev/:format', (req: Request, res: Response) => {
    console.log('🧪 DEV: Download request received at dev endpoint');
    (req as AuthenticatedRequest).user = mockUser;
    resumeController.downloadResume(req as AuthenticatedRequest, res);
  });
  
  router.post('/ats-analysis-dev', (req: Request, res: Response) => {
    (req as AuthenticatedRequest).user = mockUser;
    // Mock resume ID for unsaved resumes
    req.body.resumeData = { ...req.body.resumeData, _id: 'dev-resume-id' };
    resumeController.analyzeATSCompatibility(req as AuthenticatedRequest, res);
  });
}

export default router;