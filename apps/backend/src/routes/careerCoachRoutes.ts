import { Router } from 'express';
import { careerCoachController } from '../controllers/careerCoachController';
import { authMiddleware } from '../middleware/auth';
import { requireEnterpriseSubscription, trackFeatureUsage, subscriptionRateLimit } from '../middleware/subscriptionValidation';

const router: Router = Router();

// Chat with AI career coach
router.post(
  '/chat',
  authMiddleware,
  requireEnterpriseSubscription,
  subscriptionRateLimit('ai-career-coach'),
  trackFeatureUsage('ai-career-coach'),
  careerCoachController.chatWithCoach
);

// Health check endpoint
router.get(
  '/health',
  careerCoachController.checkHealth
);

export default router;
