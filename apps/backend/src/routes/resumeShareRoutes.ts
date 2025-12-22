import express, { Router } from 'express';
import { resumeShareController } from '../controllers/resumeShareController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Protected routes
router.post('/', authMiddleware, (req, res) => resumeShareController.createShare(req as any, res));
router.get('/', authMiddleware, (req, res) => resumeShareController.getShares(req as any, res));
router.get('/:id/stats', authMiddleware, (req, res) => resumeShareController.getShareStats(req as any, res));
router.delete('/:id', authMiddleware, (req, res) => resumeShareController.revokeShare(req as any, res));

// Public tracking route
router.get('/access/:shareId', (req, res) => resumeShareController.accessShare(req, res));

export default router;
