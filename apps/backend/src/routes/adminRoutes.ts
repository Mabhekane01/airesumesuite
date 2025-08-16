import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { cleanupTokens, getTokenStatistics, cleanupUserTokensEndpoint } from '../controllers/adminController';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

// Token management routes
router.post('/cleanup/tokens', cleanupTokens);
router.get('/stats/tokens', getTokenStatistics);
router.post('/cleanup/user/:userId/tokens', cleanupUserTokensEndpoint);

export default router;