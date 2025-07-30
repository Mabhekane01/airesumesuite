import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  createPaymentSession,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription,
  getPaymentHistory
} from '../controllers/paymentController';
import {
  securityHeaders,
  corsConfig,
  ipFilter,
  validateRequest,
  paymentRateLimit,
  generalRateLimit
} from '../middleware/securityMiddleware';

const router = express.Router();

// Apply security middleware
router.use(securityHeaders);
router.use(corsConfig);
router.use(ipFilter);
router.use(validateRequest);

// Webhook routes (no authentication required, but with raw body parsing)
router.use('/webhook', express.raw({ type: 'application/json' }));
router.post('/webhook/stripe', generalRateLimit, handleWebhook);
router.post('/webhook/paypal', generalRateLimit, handleWebhook);

// Protected routes (require authentication)
router.use(authenticateToken);

// Payment session creation (with strict rate limiting)
router.post('/create-session', 
  paymentRateLimit, 
  express.json({ limit: '1mb' }), // Smaller payload for security
  createPaymentSession
);

// Subscription management
router.get('/subscription/status', generalRateLimit, getSubscriptionStatus);
router.post('/subscription/cancel', generalRateLimit, cancelSubscription);
router.get('/payment-history', generalRateLimit, getPaymentHistory);

export default router;