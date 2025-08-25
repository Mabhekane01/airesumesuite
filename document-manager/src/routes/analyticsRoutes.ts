import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const controller = new AnalyticsController();

// All analytics endpoints require authentication
router.use(authMiddleware);

// Document analytics
router.get('/documents/:documentId', controller.getDocumentAnalytics);
router.get('/documents/:documentId/real-time', controller.getRealTimeAnalytics);
router.get('/documents/:documentId/predictive', controller.getPredictiveAnalytics);
router.get('/documents/:documentId/heatmap/:pageNumber', controller.getHeatmapData);
router.get('/documents/:documentId/performance', controller.getPerformanceMetrics);

// User analytics summary
router.get('/summary', controller.getUserAnalyticsSummary);
router.get('/trends', controller.getAnalyticsTrends);
router.get('/audience', controller.getAudienceInsights);

// Document comparison
router.post('/compare', controller.compareDocuments);

// Custom dashboards
router.get('/dashboards/:dashboardId', controller.getCustomDashboard);
router.post('/dashboards', controller.saveCustomDashboard);

// Analytics alerts
router.get('/alerts', controller.getAnalyticsAlerts);
router.post('/alerts', controller.setupAnalyticsAlert);

// Data export
router.post('/export', controller.exportAnalytics);

export default router;
