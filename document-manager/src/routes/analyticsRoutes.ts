import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply authentication middleware to all analytics routes
router.use(authMiddleware);

// Document analytics
router.get('/documents/:id', analyticsController.getDocumentAnalytics.bind(analyticsController));
router.get('/documents/:id/performance', analyticsController.getDocumentPerformance.bind(analyticsController));

// Analytics overview and summary
router.get('/summary', analyticsController.getAnalyticsSummary.bind(analyticsController));
router.get('/popular', analyticsController.getPopularDocuments.bind(analyticsController));

// Real-time analytics
router.get('/realtime', analyticsController.getRealTimeAnalytics.bind(analyticsController));

// Analytics export
router.get('/export', analyticsController.exportAnalytics.bind(analyticsController));

export default router;
