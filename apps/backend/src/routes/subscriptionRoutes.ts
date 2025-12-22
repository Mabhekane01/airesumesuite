import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getSubscriptionAnalytics,
  getAllSubscriptions,
  renewSubscription,
  cancelSubscription,
  reactivateSubscription,
  getRevenueAnalytics
} from '../controllers/subscriptionController';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Analytics endpoints
router.get('/analytics', getSubscriptionAnalytics);
router.get('/revenue-analytics', getRevenueAnalytics);

// Subscription management endpoints
router.get('/all', getAllSubscriptions);
router.post('/renew', renewSubscription);
router.post('/cancel', cancelSubscription);
router.post('/reactivate', reactivateSubscription);

export default router;