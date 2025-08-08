import express, { Router, Response, NextFunction } from 'express';
import { 
  coverLetterController, 
  coverLetterValidation, 
  jobUrlValidation 
} from '../controllers/coverLetterController';
import { authMiddleware, AuthenticatedRequest, requireSubscription } from '../middleware/auth';
import { requireEnterpriseSubscription, trackFeatureUsage, subscriptionRateLimit } from '../middleware/subscriptionValidation';

const router: Router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/v1/cover-letters - Get all cover letters for user
router.get('/', (req: AuthenticatedRequest, res: Response) => coverLetterController.getUserCoverLetters(req, res));

// GET /api/v1/cover-letters/:id - Get specific cover letter
router.get('/:id', (req: AuthenticatedRequest, res: Response) => coverLetterController.getCoverLetterById(req, res));

// POST /api/v1/cover-letters - Create new cover letter
router.post('/', requireSubscription('premium'), coverLetterValidation, (req: AuthenticatedRequest, res: Response) => coverLetterController.createCoverLetter(req, res));

// POST /api/v1/cover-letters/generate-from-job - Generate cover letter from job URL (legacy)
router.post('/generate-from-job', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-generate'), jobUrlValidation, (req: AuthenticatedRequest, res: Response) => coverLetterController.generateFromJobUrl(req, res));

// POST /api/v1/cover-letters/ai-generate-from-url - New AI-powered job URL analysis and cover letter generation
router.post('/ai-generate-from-url', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-advanced'), jobUrlValidation, (req: AuthenticatedRequest, res: Response) => coverLetterController.aiGenerateFromJobUrl(req, res));

// PUT /api/v1/cover-letters/:id - Update cover letter
router.put('/:id', requireSubscription('premium'), (req: AuthenticatedRequest, res: Response) => coverLetterController.updateCoverLetter(req, res));

// PUT /api/v1/cover-letters/:id/intelligent-update - Intelligently update cover letter with AI enhancement
router.put('/:id/intelligent-update', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-update'), (req: AuthenticatedRequest, res: Response) => coverLetterController.intelligentUpdateCoverLetter(req, res));

// PUT /api/v1/cover-letters/:id/visibility - Toggle cover letter public visibility
router.put('/:id/visibility', (req: AuthenticatedRequest, res: Response) => coverLetterController.toggleCoverLetterVisibility(req, res));

// DELETE /api/v1/cover-letters/:id - Delete cover letter
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => coverLetterController.deleteCoverLetter(req, res));

// POST /api/v1/cover-letters/:id/regenerate - Regenerate cover letter content
router.post('/:id/regenerate', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-regenerate'), (req: AuthenticatedRequest, res: Response) => coverLetterController.regenerateCoverLetter(req, res));

// POST /api/v1/cover-letters/scrape-job - Scrape job posting data
router.post('/scrape-job', (req: AuthenticatedRequest, res: Response) => coverLetterController.scrapeJobPosting(req, res));

// POST /api/v1/cover-letters/generate-variations - Generate multiple AI variations
router.post('/generate-variations', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-variations'), (req: AuthenticatedRequest, res: Response) => coverLetterController.generateCoverLetterVariations(req, res));

// POST /api/v1/cover-letters/:id/analyze - Analyze cover letter match with job
router.post('/:id/analyze', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-analysis'), (req: AuthenticatedRequest, res: Response) => coverLetterController.analyzeCoverLetterMatch(req, res));

// POST /api/v1/cover-letters/optimize-ats - Optimize cover letter for ATS
router.post('/optimize-ats', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-ats-optimization'), (req: AuthenticatedRequest, res: Response) => coverLetterController.optimizeCoverLetterForATS(req, res));

// POST /api/v1/cover-letters/ai-enhance - Enhance cover letter with AI
router.post('/ai-enhance', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-enhance'), (req: AuthenticatedRequest, res: Response) => coverLetterController.enhanceCoverLetterWithAI(req, res));

// POST /api/v1/cover-letters/from-resume-builder - Create from resume builder
router.post('/from-resume-builder', (req: AuthenticatedRequest, res: Response) => coverLetterController.createFromResumeBuilder(req, res));

// GET /api/v1/cover-letters/:id/download/:format - Download cover letter
router.get('/:id/download/:format', (req: AuthenticatedRequest, res: Response) => coverLetterController.downloadCoverLetter(req, res));

// POST /api/v1/cover-letters/download-with-data/:format - Enterprise download cover letter with data
router.post('/download-with-data/:format', (req: AuthenticatedRequest, res: Response) => coverLetterController.downloadCoverLetterWithData(req, res));

// POST /api/v1/cover-letters/ai-generate - Generate AI content for conversational interface
router.post('/ai-generate', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-generate'), (req: AuthenticatedRequest, res: Response) => coverLetterController.generateAIContent(req, res));

// POST /api/v1/cover-letters/conversation - Handle conversational AI interactions
router.post('/conversation', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-conversation'), (req: AuthenticatedRequest, res: Response) => coverLetterController.handleConversation(req, res));

// POST /api/v1/cover-letters/analyze-realtime - Real-time analysis
router.post('/analyze-realtime', requireEnterpriseSubscription, subscriptionRateLimit('ai-cover-letter'), trackFeatureUsage('ai-cover-letter-analysis'), (req: AuthenticatedRequest, res: Response) => coverLetterController.analyzeRealTime(req, res));

export default router;