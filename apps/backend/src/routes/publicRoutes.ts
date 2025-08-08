import express, { Router, Request, Response } from 'express';
import { resumeController } from '../controllers/resumeController';
import { coverLetterController } from '../controllers/coverLetterController';
import { AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// This route is public, but can optionally accept auth to know who the user is.
router.get(
  '/resumes/latex-templates', 
  optionalAuthMiddleware, 
  (req: Request, res: Response) => 
    resumeController.getLatexTemplates(req as AuthenticatedRequest, res)
);

// Route that includes LaTeX code for job optimization
router.get(
  '/resumes/latex-templates-with-code', 
  optionalAuthMiddleware, 
  (req: Request, res: Response) => 
    resumeController.getLatexTemplatesWithCode(req as AuthenticatedRequest, res)
);

// POST /api/v1/resumes/generate-preview-pdf - Generate LaTeX PDF preview from resume data
// NOTE: No subscription requirement - this is a free teaser to attract customers to see LaTeX quality
router.post('/resumes/generate-preview-pdf', (req: Request, res: Response) => resumeController.generateResumePreviewPDF(req as AuthenticatedRequest, res));

// Public cover letter sharing routes
router.get('/shared/cover-letter/:id', (req: Request, res: Response) => coverLetterController.getPublicCoverLetter(req, res));

export default router;
