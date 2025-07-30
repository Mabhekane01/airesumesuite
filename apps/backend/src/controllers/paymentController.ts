import { Request, Response } from 'express';
// Conditional imports with fallbacks for missing packages
let Stripe: any;
let z: any;

try {
  Stripe = require('stripe');
} catch {
  // Fallback Stripe-like interface for development
  Stripe = class {
    constructor() {}
    static createCheckoutSession() { throw new Error('Stripe not installed'); }
  };
}

try {
  z = require('zod');
} catch {
  // Fallback validation for development
  z = {
    object: () => ({ parse: (data: any) => data }),
    enum: () => ({}),
    number: () => ({ positive: () => ({ max: () => ({}) }) }),
    string: () => ({ length: () => ({ regex: () => ({}) }), min: () => ({ max: () => ({}) }) }),
    boolean: () => ({}),
    optional: () => ({})
  };
}
import helmet from 'helmet';
import { paymentService } from '../services/paymentService';
import { userService } from '../services/userService';
import { securityService } from '../services/securityService';
import { logger } from '../utils/logger';

// Input validation schemas
const CreatePaymentSessionSchema = z.object({
  planType: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['stripe', 'paypal']),
  amount: z.number().positive().max(10000),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  location: z.object({
    country: z.string().min(2).max(100),
    continent: z.string().min(2).max(50),
    isAfricanCountry: z.boolean(),
    currency: z.string().length(3)
  }).optional()
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// securityService is imported as a singleton

export const createPaymentSession = async (req: Request, res: Response) => {
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
    let sessionData;
    
    if (paymentMethod === 'stripe') {
      sessionData = await paymentService.createStripeSession({
        userId,
        userEmail: user.email,
        planType,
        amount,
        currency,
        location
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'PayPal integration not yet implemented'
      });
    }

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
    const sig = req.headers['stripe-signature'] as string;
    const paypalSig = req.headers['paypal-signature'] as string;

    if (sig) {
      // Handle Stripe webhook
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      await paymentService.handleStripeWebhook(event);
    } else if (paypalSig) {
      // Handle PayPal webhook
      await paymentService.handlePayPalWebhook(req.body, paypalSig);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    res.json({ received: true });

  } catch (error) {
    logger.error('Webhook handling failed:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook handling failed'
    });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
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

export const cancelSubscription = async (req: Request, res: Response) => {
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

export const getPaymentHistory = async (req: Request, res: Response) => {
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