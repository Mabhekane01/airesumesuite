import express, { Router } from 'express';
import { jobPostingController } from '../controllers/jobPostingController';
import { authMiddleware, requireAdmin } from '../middleware/auth'; 

const router: Router = express.Router();

// Public routes
router.get('/', jobPostingController.getJobs);

// Job creation (Auth required, Admin gets auto-approved)
router.post('/', authMiddleware, jobPostingController.createJob); 

// AI Extraction (Auth required)
router.post('/extract-details', authMiddleware, jobPostingController.extractJobDetails);

// Scraper trigger (Admin Protected)
router.post('/scrape', authMiddleware, requireAdmin, jobPostingController.scrapeJobs);

// Admin routes
router.get('/pending', authMiddleware, requireAdmin, jobPostingController.getPendingJobs);
router.put('/:id/verify', authMiddleware, requireAdmin, jobPostingController.verifyJob);

export default router;
