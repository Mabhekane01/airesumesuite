import { Router } from 'express';
import { advancedAnalyticsController } from '../controllers/advancedAnalyticsController';
import { authMiddleware as authenticateToken, AuthenticatedRequest, requireSubscription } from '../middleware/auth';
import { requireFeatureAccess } from '../middleware/subscriptionValidation';
import { query } from 'express-validator';

const router: Router = Router();

// Get comprehensive analytics (all metrics combined)
router.get(
  '/comprehensive',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getComprehensiveAnalytics(req, res); }
);

// Get company-specific analysis
router.get(
  '/companies',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getCompanyAnalysis(req, res); }
);

// Get skill gap analysis
router.get(
  '/skills/gap-analysis',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getSkillGapAnalysis(req, res); }
);

// Get job matching insights
router.get(
  '/job-matching',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getJobMatchingInsights(req, res); }
);

// Get predictive insights
router.get(
  '/predictive',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getPredictiveInsights(req, res); }
);

// Get analytics summary (dashboard overview)
router.get(
  '/summary',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getAnalyticsSummary(req, res); }
);

// Get performance trends
router.get(
  '/trends',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  query('timeframe')
    .optional()
    .isIn(['3months', '6months', '12months'])
    .withMessage('Invalid timeframe'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getPerformanceTrends(req, res); }
);

// Get market insights
router.get(
  '/market',
  authenticateToken,
  requireFeatureAccess('advanced-analytics'),
  (req: AuthenticatedRequest, res) => { advancedAnalyticsController.getMarketInsights(req, res); }
);

// Production monitoring endpoints (no auth required for health checks)
router.get(
  '/health',
  (req, res) => advancedAnalyticsController.getHealthCheck(req, res)
);

// Metrics endpoint for monitoring (no auth for monitoring systems)
router.get(
  '/metrics',
  (req, res) => advancedAnalyticsController.getMetrics(req, res)
);

export default router;
