import { Router } from 'express';
import { simpleAnalyticsController } from '../controllers/simpleAnalyticsController';
import { authMiddleware as authenticateToken } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get user analytics (applications, resumes, activity)
router.get('/user', simpleAnalyticsController.getUserAnalytics);

// Get dashboard metrics (admin/overview data)
router.get('/dashboard', simpleAnalyticsController.getDashboardMetrics);

// Get application statistics
router.get('/applications', simpleAnalyticsController.getApplicationStats);

// Get resume analytics and insights
router.get('/resume/insights', simpleAnalyticsController.getResumeAnalytics);

export default router;