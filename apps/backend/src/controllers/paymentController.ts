import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import helmet from 'helmet';
import { paymentService } from '../services/paymentService';
import { userService } from '../services/userService';
import { securityService } from '../services/securityService';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

// Input validation schemas
const CreatePaymentSessionSchema = z.object({
  planType: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['paystack']),
  amount: z.number().positive().max(10000),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  location: z.object({
    country: z.string().min(2).max(100),
    continent: z.string().min(2).max(50),
    isAfricanCountry: z.boolean(),
    currency: z.string().length(3)
  }).optional()
});


// securityService is imported as a singleton

export const createPaymentSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Rate limiting is applied via middleware
    const userId = req.user?.id;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!userId) {
      await securityService.logSecurityEvent(
        'unknown',
        'suspicious_activity',
        {
          ip: clientIP,
          userAgent,
          success: false,
          reason: 'unauthorized_payment_attempt'
        },
        'medium'
      );
      
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate and sanitize input
    const validationResult = CreatePaymentSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      await securityService.logSecurityEvent(
        userId,
        'suspicious_activity',
        {
          ip: clientIP,
          userAgent,
          success: false,
          reason: 'invalid_payment_data'
        },
        'low'
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid payment data provided',
        errors: validationResult.error.errors
      });
    }

    const { planType, paymentMethod, amount, currency, location } = validationResult.data;

    // Fraud detection
    const fraudCheck = await securityService.detectPaymentFraud({
      userId,
      amount,
      currency,
      planType,
      location,
      ip: clientIP,
      userAgent
    });

    if (fraudCheck.shouldBlock) {
      await securityService.logSecurityEvent(
        userId,
        'suspicious_activity',
        {
          ip: clientIP,
          userAgent,
          success: false,
          reason: `payment_fraud_detected - ${fraudCheck.reasons.join(', ')}`
        },
        'critical'
      );

      return res.status(403).json({
        success: false,
        message: 'Payment blocked for security reasons'
      });
    }

    // Get user information
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent duplicate subscriptions
    if (user.tier === 'enterprise' && user.subscription_status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Active subscription already exists'
      });
    }

    // Create payment session
    const sessionData = await paymentService.createPaystackSession({
      userId,
      userEmail: user.email,
      planType,
      amount,
      currency,
      location
    });

    // Log successful payment session creation
    logger.info('Payment session created successfully', {
      userId,
      sessionId: sessionData.sessionId,
      planType,
      paymentMethod,
      amount,
      currency,
      location: location?.country,
      fraudScore: fraudCheck.riskScore
    });

    // Send notification for payment session initiation
    try {
      await notificationService.createNotification({
        userId,
        type: 'info',
        category: 'payment',
        title: 'Payment Session Created',
        message: `Your ${planType} Enterprise subscription payment is ready. Complete your checkout to activate premium features.`,
        priority: 'medium',
        action: {
          label: 'Complete Payment',
          url: sessionData.checkoutUrl,
          type: 'external'
        },
        metadata: {
          source: 'paymentController',
          entityType: 'payment',
          additionalData: { planType, amount, currency, paymentMethod }
        },
        expiresAt: sessionData.expiresAt
      });
    } catch (notificationError) {
      console.warn('⚠️ Failed to send payment session notification:', notificationError);
    }

    res.json({
      success: true,
      data: {
        sessionId: sessionData.sessionId,
        checkoutUrl: sessionData.checkoutUrl,
        expiresAt: sessionData.expiresAt
      }
    });

  } catch (error) {
    logger.error('Payment session creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['x-paystack-signature'] as string;

    if (!sig) {
      return res.status(400).json({
        success: false,
        message: 'Missing Paystack signature'
      });
    }

    // Handle Paystack webhook
    await paymentService.handleWebhook(sig, req.body);
    
    // Note: Payment notifications are handled within the webhook handler
    
    res.json({ received: true });

  } catch (error) {
    logger.error('Webhook handling failed:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook handling failed'
    });
  }
};

export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const subscription = await paymentService.getSubscriptionStatus(userId);

    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    logger.error('Failed to get subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

export const cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    await paymentService.cancelSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    logger.error('Failed to cancel subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const history = await paymentService.getPaymentHistory(userId);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('Failed to get payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reference } = req.params;
    const { planType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!reference || !planType) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference and planType are required'
      });
    }

    const verification = await paymentService.verifyPayment(reference, userId, planType);

    res.json({
      success: true,
      data: verification
    });

  } catch (error) {
    logger.error('Payment verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      reference: req.params.reference,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};