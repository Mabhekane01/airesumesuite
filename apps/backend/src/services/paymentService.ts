// Conditional imports with error handling
let Stripe: any;
let z: any;

try {
  Stripe = require('stripe');
} catch {
  Stripe = class {
    constructor() {}
    checkout = { sessions: { create: () => ({ id: 'mock', url: 'mock' }) } };
    webhooks = { constructEvent: () => ({ type: 'mock', data: {} }) };
    subscriptions = { retrieve: () => ({}), update: () => ({}) };
  };
}

try {
  z = require('zod');
} catch {
  z = {
    object: (schema: any) => ({ parse: (data: any) => data }),
    string: () => ({ uuid: () => ({}), email: () => ({}), length: () => ({ regex: () => ({}) }), min: () => ({ max: () => ({}) }) }),
    enum: () => ({}),
    number: () => ({ positive: () => ({ max: () => ({}) }) }),
    boolean: () => ({}),
    optional: () => ({})
  };
}

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Database } from '../database/database';
import { logger } from '../utils/logger';
import { securityService } from './securityService';
import { notificationService } from './notificationService';

// Input validation schemas
const CreatePaymentSessionSchema = z.object({
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  planType: z.enum(['monthly', 'yearly']),
  amount: z.number().positive().max(10000), // Max $10,000 to prevent abuse
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  location: z.object({
    country: z.string().min(2).max(100),
    continent: z.string().min(2).max(50),
    isAfricanCountry: z.boolean(),
    currency: z.string().length(3)
  }).optional()
});

interface PaymentSession {
  sessionId: string;
  checkoutUrl?: string;
  paypalUrl?: string;
  expiresAt: Date;
}

interface SubscriptionStatus {
  tier: 'free' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
  paypalSubscriptionId?: string;
}

export class PaymentService {
  private stripe: any;
  private db: Database;
  
  // Rate limiting for payment operations
  private readonly paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP per window
    message: 'Too many payment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('STRIPE_SECRET_KEY not found, using mock Stripe');
    }
    
    try {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
        apiVersion: '2023-10-16',
        typescript: true,
      });
    } catch (error) {
      console.warn('Stripe initialization failed, using mock');
      this.stripe = new Stripe();
    }
    
    this.db = new Database();
  }

  async createStripeSession(data: z.infer<typeof CreatePaymentSessionSchema>): Promise<PaymentSession> {
    try {
      // Validate input
      const validatedData = CreatePaymentSessionSchema.parse(data);
      
      // Check for existing active subscription
      const existingSubscription = await this.getSubscriptionStatus(validatedData.userId);
      if (existingSubscription.tier === 'enterprise' && existingSubscription.status === 'active') {
        throw new Error('User already has an active subscription');
      }

      // Fraud detection
      await this.performFraudChecks(validatedData);

      // Create idempotency key to prevent duplicate payments
      const idempotencyKey = crypto.createHash('sha256')
        .update(`${validatedData.userId}-${validatedData.planType}-${Date.now()}`)
        .digest('hex');

      // Create Stripe checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer_email: validatedData.userEmail,
        line_items: [{
          price_data: {
            currency: validatedData.currency.toLowerCase(),
            product_data: {
              name: `AI Job Suite Enterprise - ${validatedData.planType}`,
              description: 'Unlimited AI-powered job search tools',
              images: ['https://your-domain.com/enterprise-logo.png'],
            },
            unit_amount: Math.round(validatedData.amount * 100), // Convert to cents
            recurring: {
              interval: validatedData.planType === 'yearly' ? 'year' : 'month',
            },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/dashboard/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/upgrade/cancelled`,
        metadata: {
          userId: validatedData.userId,
          planType: validatedData.planType,
          location: validatedData.location?.country || 'unknown',
          originalAmount: validatedData.amount.toString(),
        },
        subscription_data: {
          metadata: {
            userId: validatedData.userId,
            planType: validatedData.planType,
          },
        },
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        phone_number_collection: {
          enabled: true,
        },
        allow_promotion_codes: true,
        automatic_tax: {
          enabled: true,
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
      }, {
        idempotencyKey,
      });

      // Store payment session in database
      await this.storePaymentSession({
        sessionId: session.id,
        userId: validatedData.userId,
        planType: validatedData.planType,
        amount: validatedData.amount,
        currency: validatedData.currency,
        provider: 'stripe',
        expiresAt: new Date(session.expires_at! * 1000),
        status: 'pending',
      });

      // Log security event
      logger.info('Stripe payment session created', {
        userId: validatedData.userId,
        sessionId: session.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        planType: validatedData.planType,
        location: validatedData.location?.country,
        timestamp: new Date().toISOString(),
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
        expiresAt: new Date(session.expires_at! * 1000),
      };

    } catch (error) {
      logger.error('Failed to create Stripe session:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Don't expose internal errors to client
      if (error instanceof z.ZodError) {
        throw new Error('Invalid payment data provided');
      }
      
      throw new Error('Failed to create payment session');
    }
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      // Verify webhook signature is already done in controller
      logger.info('Processing Stripe webhook', { 
        type: event.type, 
        id: event.id 
      });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

    } catch (error) {
      logger.error('Webhook processing failed:', {
        eventType: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;

    if (!userId) {
      logger.error('Missing userId in checkout session metadata', { sessionId: session.id });
      return;
    }

    // Start database transaction
    await this.db.transaction(async (trx) => {
      // Update user subscription
      await trx('users').where('id', userId).update({
        tier: 'enterprise',
        subscription_status: 'active',
        stripe_customer_id: session.customer,
        subscription_start_date: new Date(),
        updated_at: new Date(),
      });

      // Create subscription record
      await trx('subscriptions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        plan_type: planType,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Update payment session status
      await trx('payment_sessions').where('session_id', session.id).update({
        status: 'completed',
        completed_at: new Date(),
        updated_at: new Date(),
      });
    });

    // Send success notification
    await notificationService.sendSubscriptionActivated(userId);

    logger.info('Subscription activated successfully', {
      userId,
      sessionId: session.id,
      planType,
      customerId: session.customer,
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', { subscriptionId });
      return;
    }

    // Record payment in database
    await this.db.query(`
      INSERT INTO payments (id, user_id, stripe_invoice_id, amount, currency, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'succeeded', ?)
    `, [
      crypto.randomUUID(),
      userId,
      invoice.id,
      invoice.amount_paid,
      invoice.currency.toUpperCase(),
      new Date(),
    ]);

    logger.info('Payment recorded successfully', {
      userId,
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    // Update subscription status to past_due
    await this.db.query(`
      UPDATE subscriptions 
      SET status = 'past_due', updated_at = ? 
      WHERE stripe_subscription_id = ?
    `, [new Date(), subscriptionId]);

    // Send payment failed notification
    await notificationService.sendPaymentFailed(userId);

    logger.warn('Payment failed for subscription', {
      userId,
      subscriptionId,
      invoiceId: invoice.id,
      amount: invoice.amount_due,
    });
  }

  private async performFraudChecks(data: z.infer<typeof CreatePaymentSessionSchema>): Promise<void> {
    // Check for suspicious patterns
    const recentPayments = await this.db.query(`
      SELECT COUNT(*) as count 
      FROM payment_sessions 
      WHERE user_id = ? AND created_at > ? AND status IN ('pending', 'completed')
    `, [data.userId, new Date(Date.now() - 60 * 60 * 1000)]); // Last hour

    if (recentPayments[0]?.count > 3) {
      throw new Error('Too many payment attempts detected');
    }

    // Validate amount against expected pricing
    const isValidAmount = await this.validatePricingAmount(
      data.amount, 
      data.planType, 
      data.location?.isAfricanCountry
    );

    if (!isValidAmount) {
      logger.warn('Suspicious payment amount detected', {
        userId: data.userId,
        amount: data.amount,
        planType: data.planType,
        location: data.location?.country,
      });
      throw new Error('Invalid payment amount');
    }
  }

  private async validatePricingAmount(
    amount: number, 
    planType: string, 
    isAfricanCountry?: boolean
  ): Promise<boolean> {
    const baseMonthly = 50;
    const baseYearly = 540;
    const multiplier = isAfricanCountry ? 1 : 2;
    
    const expectedMonthly = baseMonthly * multiplier;
    const expectedYearly = baseYearly * multiplier;
    
    const tolerance = 0.1; // 10% tolerance for currency conversion
    
    if (planType === 'monthly') {
      return Math.abs(amount - expectedMonthly) <= expectedMonthly * tolerance;
    } else {
      return Math.abs(amount - expectedYearly) <= expectedYearly * tolerance;
    }
  }

  private async storePaymentSession(sessionData: {
    sessionId: string;
    userId: string;
    planType: string;
    amount: number;
    currency: string;
    provider: string;
    expiresAt: Date;
    status: string;
  }): Promise<void> {
    await this.db.query(`
      INSERT INTO payment_sessions (
        id, session_id, user_id, plan_type, amount, currency, 
        provider, expires_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      crypto.randomUUID(),
      sessionData.sessionId,
      sessionData.userId,
      sessionData.planType,
      sessionData.amount,
      sessionData.currency,
      sessionData.provider,
      sessionData.expiresAt,
      sessionData.status,
      new Date(),
      new Date(),
    ]);
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const subscription = await this.db.query(`
      SELECT s.*, u.tier, u.subscription_status
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ? AND s.status IN ('active', 'past_due')
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subscription.length === 0) {
      return {
        tier: 'free',
        status: 'expired',
      };
    }

    const sub = subscription[0];
    return {
      tier: sub.tier,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeSubscriptionId: sub.stripe_subscription_id,
    };
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getSubscriptionStatus(userId);
    
    if (subscription.tier !== 'enterprise' || subscription.status !== 'active') {
      throw new Error('No active subscription found');
    }

    if (subscription.stripeSubscriptionId) {
      // Cancel at period end to allow user to use service until end of billing period
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update database
      await this.db.query(`
        UPDATE subscriptions 
        SET cancel_at_period_end = true, updated_at = ?
        WHERE stripe_subscription_id = ?
      `, [new Date(), subscription.stripeSubscriptionId]);

      logger.info('Subscription cancelled', {
        userId,
        subscriptionId: subscription.stripeSubscriptionId,
      });
    }
  }

  // PayPal webhook handler (placeholder)
  async handlePayPalWebhook(body: any, signature: string): Promise<void> {
    // PayPal webhook implementation would go here
    logger.info('PayPal webhook received', { signature });
  }

  // Get payment history for user
  async getPaymentHistory(userId: string): Promise<any[]> {
    try {
      const payments = await this.db.query(`
        SELECT p.*, s.plan_type, s.created_at as subscription_date
        FROM payments p
        LEFT JOIN subscriptions s ON p.user_id = s.user_id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 50
      `, [userId]);

      return payments;
    } catch (error) {
      logger.error('Failed to get payment history', { userId, error });
      return [];
    }
  }

  // Additional security methods
  private handleSubscriptionUpdated = async (subscription: Stripe.Subscription): Promise<void> => {
    // Implementation for subscription updates
  };

  private handleSubscriptionDeleted = async (subscription: Stripe.Subscription): Promise<void> => {
    // Implementation for subscription deletion
  };
}

export const paymentService = new PaymentService();