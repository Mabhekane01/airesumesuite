import express, { Router, Response, NextFunction } from 'express';
import { fileUploadController, upload } from '../controllers/fileUploadController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router: Router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/v1/upload/resume - Upload and parse resume file
router.post(
  '/resume',
  upload.single('resume'),
  (req: AuthenticatedRequest, res: Response) => fileUploadController.uploadAndParseResume(req, res)
);

// GET /api/v1/upload/limits - Get upload limits and supported file types
router.get('/limits', (req: AuthenticatedRequest, res: Response) => fileUploadController.getUploadLimits(req, res));

export default router;