import { Router } from 'express';
import authRoutes from './authRoutes';
import documentRoutes from './documentRoutes';
import folderRoutes from './folderRoutes';
import analyticsRoutes from './analyticsRoutes';
import webhookRoutes from './webhookRoutes';

const router = Router();

// API version prefix
const API_PREFIX = '/api/v1';

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Document Manager Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount API routes
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/documents`, documentRoutes);
router.use(`${API_PREFIX}/folders`, folderRoutes);
router.use(`${API_PREFIX}/analytics`, analyticsRoutes);
router.use(`${API_PREFIX}/webhooks`, webhookRoutes);

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

export default router;



