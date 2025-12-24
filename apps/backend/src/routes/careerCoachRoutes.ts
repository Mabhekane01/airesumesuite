import express, { Router, Request, Response } from 'express';
import { careerCoachController } from '../controllers/careerCoachController';
import { authMiddleware as authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { requireFeatureAccess, trackFeatureUsage } from '../middleware/subscriptionValidation';

const router: Router = express.Router();

// Health check for the career coach service
router.get('/health', (req: Request, res: Response) => careerCoachController.checkHealth(req, res));

// All other routes require authentication
router.use(authenticateToken);

// Start or continue a coaching conversation
router.post(
  '/chat',
  requireFeatureAccess('ai-career-coach'),
  trackFeatureUsage('ai-career-coach'),
  (req: AuthenticatedRequest, res: Response) => careerCoachController.chatWithCoach(req, res)
);

export default router;
