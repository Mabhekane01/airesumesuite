import express, { Router, Response } from 'express';
import { jobPostingController } from '../controllers/jobPostingController';
import { authMiddleware, requireAdmin, AuthenticatedRequest } from '../middleware/auth'; 

const router: Router = express.Router();

// Public routes
router.get('/', jobPostingController.getJobs);

// Job creation (Auth required, Admin gets auto-approved)
router.post('/', authMiddleware, (req: any, res: any) => jobPostingController.createJob(req, res)); 

// AI Extraction Assistant (Auth required)
router.post('/extract-details', authMiddleware, jobPostingController.extractJobDetails);

// Admin: Community Verification Routes
router.get('/pending', authMiddleware, requireAdmin, jobPostingController.getPendingJobs);
router.put('/:id/verify', authMiddleware, requireAdmin, (req: any, res: any) => jobPostingController.verifyJob(req, res));
router.delete('/:id', authMiddleware, requireAdmin, (req: any, res: any) => jobPostingController.deleteJob(req, res));

export default router;
