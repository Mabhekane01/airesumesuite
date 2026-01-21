import express, { Router, Request, Response, NextFunction } from 'express';
import { 
  resumeController, 
  resumeValidation,
  resumeUpdateValidation
} from '../controllers/resumeController';
import { authMiddleware, AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/auth';
import { trackFeatureUsage, requireFeatureAccess } from '../middleware/subscriptionValidation';

const router: Router = express.Router();

// ===== CORE RESUME MANAGEMENT =====
// Basic CRUD operations for resumes

// GET /api/v1/resumes - Get all resumes for user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.getAllResumes(req, res));

// GET /api/v1/resumes/new - Get empty resume structure
router.get('/new', authMiddleware, (req: Request, res: Response) => resumeController.getNewResume(req, res));

// ===== TEMPLATE MANAGEMENT =====
// Place static template routes before dynamic :id routes

// GET /api/v1/resumes/templates - Get available templates
router.get('/templates', (req: Request, res: Response) => resumeController.getAvailableTemplates(req, res));

// GET /api/v1/resumes/latex-templates - Get LaTeX templates
router.get('/latex-templates', (req: AuthenticatedRequest, res: Response) => resumeController.getLatexTemplates(req, res));

// GET /api/v1/resumes/latex-templates-with-code - Get LaTeX templates with code (for job optimization)
router.get('/latex-templates-with-code', (req: AuthenticatedRequest, res: Response) => resumeController.getLatexTemplatesWithCode(req, res));

// GET /api/v1/resumes/:id - Get specific resume
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.getResumeById(req, res));

// POST /api/v1/resumes - Create new resume
router.post('/', authMiddleware, resumeValidation, (req: AuthenticatedRequest, res: Response) => resumeController.createResume(req, res));

// PUT /api/v1/resumes/:id - Update existing resume
router.put('/:id', authMiddleware, resumeUpdateValidation, (req: AuthenticatedRequest, res: Response) => resumeController.updateResume(req, res));

// DELETE /api/v1/resumes/:id - Delete resume
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.deleteResume(req, res));

// ===== PDF GENERATION WITH STANDARDIZED TEMPLATES =====

// POST /api/v1/resumes/:id/preview - Generate PDF preview using standardized templates
router.post('/:id/preview', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.generateResumePreview(req, res));

// POST /api/v1/resumes/:id/download-tracked - Download tracked resume PDF
router.post('/:id/download-tracked', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.downloadTrackedPDF(req, res));

// POST /api/v1/resumes/preview-unsaved - Generate PDF for unsaved resume
router.post('/preview-unsaved', (req: Request, res: Response) => resumeController.generateUnsavedResumePreview(req, res));

// POST /api/v1/resumes/:id/save-pdf - Save PDF to database with resume data
router.post('/:id/save-pdf', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.savePDFToDatabase(req, res));

// GET /api/v1/resumes/:id/pdf-info - Get saved PDF info
router.get('/:id/pdf-info', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.getSavedPDFInfo(req, res));

// POST /api/v1/resumes/download/pdf - Download saved PDF
router.post('/download/pdf', authMiddleware, (req: AuthenticatedRequest, res: Response) => resumeController.downloadSavedPDF(req, res));


// ===== AI CONTENT ENHANCEMENT =====
// All AI enhancement now uses standardized templates for LaTeX generation

// POST /api/v1/resumes/generate-summary - Generate professional summary for unsaved resume
router.post('/generate-summary',
  (req: Request, res: Response) => resumeController.generateSummaryForUnsavedResume(req, res)
);

// POST /api/v1/resumes/optimize-basic-summary - Generate summary for basic builder
router.post('/optimize-basic-summary',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => resumeController.optimizeBasicSummary(req, res)
);

// POST /api/v1/resumes/:id/enhance - Comprehensive AI enhancement
router.post('/:id/enhance',
  authMiddleware,
  requireFeatureAccess('ai-resume-enhancement'),
  trackFeatureUsage('ai-resume-enhancement'), 
  (req: AuthenticatedRequest, res: Response) => resumeController.enhanceResumeComprehensively(req, res)
);

// POST /api/v1/resumes/enhance-unsaved - Enhance unsaved resume
router.post('/enhance-unsaved',
  authMiddleware,
  requireFeatureAccess('ai-resume-enhancement'),
  trackFeatureUsage('ai-resume-enhancement'),
  (req: Request, res: Response) => resumeController.enhanceUnsavedResume(req, res)
);

// POST /api/v1/resumes/enhance-with-latex - Enhance resume and return PDF
router.post('/enhance-with-latex',
  authMiddleware,
  requireFeatureAccess('ai-resume-enhancement'),
  trackFeatureUsage('ai-resume-enhancement-pdf'),
  (req: Request, res: Response) => resumeController.enhanceResumeWithLatexPDF(req, res)
);

// POST /api/v1/resumes/enhance-with-latex-stream - Enhance resume with streaming progress
router.post('/enhance-with-latex-stream',
  authMiddleware,
  requireFeatureAccess('ai-resume-enhancement'),
  trackFeatureUsage('ai-resume-enhancement-pdf-stream'),
  (req: Request, res: Response) => resumeController.enhanceResumeWithLatexStreamPDF(req, res)
);

// POST /api/v1/resumes/enhance-content-only - Get AI enhancements without PDF generation
router.post('/enhance-content-only',
  authMiddleware,
  requireFeatureAccess('ai-resume-enhancement'),
  trackFeatureUsage('ai-resume-enhancement-preview'),
  (req: Request, res: Response) => resumeController.enhanceResumeContentOnly(req, res)
);

// POST /api/v1/resumes/generate-preview-pdf - Generate PDF with specific resume data
router.post('/generate-preview-pdf',
  authMiddleware,
  (req: Request, res: Response) => resumeController.generateUnsavedResumePreview(req, res)
);

// ===== JOB OPTIMIZATION =====
// All job optimization uses standardized job optimization service

// POST /api/v1/resumes/:id/optimize-for-job - Optimize saved resume for specific job
router.post('/:id/optimize-for-job', 
  authMiddleware,
  requireFeatureAccess('ai-job-optimization'),
  trackFeatureUsage('ai-job-optimization'),
  (req: AuthenticatedRequest, res: Response) => resumeController.optimizeResumeWithStandardizedTemplate(req, res)      
);

// POST /api/v1/resumes/optimize-for-job - Optimize unsaved resume for job (JSON response)
router.post('/optimize-for-job',
  authMiddleware,
  requireFeatureAccess('ai-job-optimization'),
  trackFeatureUsage('ai-job-optimization'),
  (req: AuthenticatedRequest, res: Response) => resumeController.optimizeUnsavedResumeForJob(req, res)
);

// POST /api/v1/resumes/optimize-for-job-pdf - Generate PDF for job-optimized resume
router.post('/optimize-for-job-pdf', 
  authMiddleware,
  requireFeatureAccess('ai-job-optimization'),
  trackFeatureUsage('ai-job-optimization'),
  (req: AuthenticatedRequest, res: Response) => resumeController.optimizeUnsavedResumeForJobPDF(req, res)
);

// POST /api/v1/resumes/optimize-for-job-preview - Get job optimization suggestions without PDF generation
router.post('/optimize-for-job-preview',
  authMiddleware,
  requireFeatureAccess('ai-job-optimization'),
  trackFeatureUsage('ai-job-optimization-preview'),
  (req: Request, res: Response) => resumeController.optimizeForJobPreview(req, res)
);

// POST /api/v1/resumes/:id/optimize-with-url - Optimize resume using job URL
router.post('/:id/optimize-with-url', 
  authMiddleware,
  requireFeatureAccess('ai-job-optimization'),
  trackFeatureUsage('ai-job-optimization'),
  (req: AuthenticatedRequest, res: Response) => resumeController.optimizeResumeWithJobUrl(req, res)
);

// POST /api/v1/resumes/analyze-job-url - Analyze job from URL (for frontend compatibility)
router.post('/analyze-job-url',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => resumeController.analyzeJobFromUrl(req, res)
);

// POST /api/v1/resumes/job-alignment - Check job alignment (for frontend compatibility)
router.post('/job-alignment', 
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => resumeController.checkJobAlignment(req, res)
);

// POST /api/v1/resumes/:id/job-match-score - Get job compatibility score
router.post('/:id/job-match-score',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => resumeController.getJobMatchScoreStandardized(req, res)
);

// ===== ATS ANALYSIS =====
// ATS analysis now uses standardized content enhancement

// POST /api/v1/resumes/:id/ats-analysis - Analyze ATS compatibility
router.post('/:id/ats-analysis',
  authMiddleware,
  requireFeatureAccess('ai-ats-analysis'),
  trackFeatureUsage('ai-ats-analysis'),
  (req: AuthenticatedRequest, res: Response) => resumeController.analyzeATSCompatibility(req, res)
);

// POST /api/v1/resumes/ats-analysis-unsaved - ATS analysis for unsaved resume
router.post('/ats-analysis-unsaved',
  authMiddleware,
  requireFeatureAccess('ai-ats-analysis'),
  trackFeatureUsage('ai-ats-analysis-preview'),
  (req: Request, res: Response) => resumeController.analyzeATSCompatibilityUnsaved(req, res)
);

// ===== ERROR HANDLING =====
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error in resume routes:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: err.message
  });
});

export default router;
