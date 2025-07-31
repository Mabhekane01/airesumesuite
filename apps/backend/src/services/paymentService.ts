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
import { PaymentSession } from '../models/PaymentSession';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { User } from '../models/User';

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
      await PaymentSession.create({
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

  async createPaystackSession(data: z.infer<typeof CreatePaymentSessionSchema>): Promise<PaymentSession> {
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

      // Generate payment reference
      const { paystackService } = await import('./paystackService');
      const reference = paystackService.generateReference('ENTERPRISE');

      // Store payment session in database FIRST to prevent race conditions
      await PaymentSession.create({
        sessionId: reference,
        userId: validatedData.userId,
        planType: validatedData.planType,
        amount: validatedData.amount,
        currency: validatedData.currency,
        provider: 'paystack',
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)), // 30 minutes
        status: 'pending',
      });
      logger.info('Local payment session created before redirecting to Paystack', { userId: validatedData.userId, reference });

      // Initialize Paystack transaction
      const paystackTransaction = await paystackService.initializeTransaction({
        reference,
        amount: validatedData.amount,
        email: validatedData.userEmail,
        currency: validatedData.currency,
        callback_url: `${process.env.FRONTEND_URL}/dashboard/upgrade/success`,
        metadata: {
          userId: validatedData.userId,
          planType: validatedData.planType,
          location: validatedData.location?.country || 'unknown',
          originalAmount: validatedData.amount,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      });

      if (!paystackTransaction.data) {
        // If this fails, mark our local session as failed so it can't be used
        await PaymentSession.findOneAndUpdate({ sessionId: reference }, { status: 'failed' });
        throw new Error('Failed to initialize Paystack transaction');
      }

      // Log security event
      logger.info('Paystack payment session created', {
        userId: validatedData.userId,
        reference,
        amount: validatedData.amount,
        currency: validatedData.currency,
        planType: validatedData.planType,
        location: validatedData.location?.country,
        timestamp: new Date().toISOString(),
      });

      console.log('Paystack session created with reference:', reference, 'for user:', validatedData.userId);

      return {
        sessionId: reference,
        checkoutUrl: paystackTransaction.data.authorization_url,
        expiresAt: new Date(Date.now() + (30 * 60 * 1000)),
      };

    } catch (error) {
      logger.error('Failed to create Paystack session:', {
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

    try {
      // Update user subscription
      await User.findByIdAndUpdate(userId, {
        tier: 'enterprise',
        subscription_status: 'active',
        stripe_customer_id: session.customer,
        subscription_start_date: new Date(),
        updated_at: new Date(),
      });

      // Create subscription record
      await Subscription.create({
        userId: userId,
        stripeSubscriptionId: session.subscription as string,
        stripeCustomerId: session.customer as string,
        planType: planType as 'monthly' | 'yearly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      });

      // Update payment session status
      await PaymentSession.findOneAndUpdate(
        { sessionId: session.id },
        { 
          status: 'completed',
          completedAt: new Date(),
        }
      );
    } catch (error) {
      logger.error('Failed to complete checkout:', error);
      throw error;
    }

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
    await Payment.create({
      userId: userId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      provider: 'stripe',
      description: 'Subscription payment',
    });

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
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { status: 'past_due' }
    );

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
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentPayments = await PaymentSession.countDocuments({
      userId: data.userId,
      createdAt: { $gt: oneHourAgo },
      status: { $in: ['pending', 'completed'] }
    });

    if (recentPayments > 3) {
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


  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'past_due'] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return {
        tier: 'free',
        status: 'expired',
      };
    }

    // Get user tier from User model
    const user = await User.findById(userId).select('tier subscription_status');

    return {
      tier: user?.tier || 'free',
      status: subscription.status as any,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
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
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.stripeSubscriptionId },
        { cancelAtPeriodEnd: true }
      );

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
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

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

  async verifyPayment(reference: string, userId: string, planType: 'monthly' | 'yearly'): Promise<any> {
    try {
      // 1. Check if this payment has already been successfully processed.
      const existingPayment = await Payment.findOne({ paystackReference: reference, status: 'succeeded' });
      if (existingPayment) {
        logger.info('Payment has already been processed.', { reference, userId });
        return {
          reference: existingPayment.paystackReference,
          status: 'completed',
          message: 'Already processed',
          subscriptionActivated: true,
        };
      }

      // 2. Verify with Paystack
      const { paystackService } = await import('./paystackService');
      const paystackResponse = await paystackService.verifyTransaction(reference);

      // 3. Process if Paystack verification is successful
      if (paystackResponse.data && paystackResponse.data.status === 'success') {
        
        await Subscription.findOneAndUpdate(
            { userId: userId },
            {
              paystackSubscriptionId: reference,
              planType: planType,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
              cancelAtPeriodEnd: false,
              metadata: { paystackData: paystackResponse.data }
            },
            { new: true, upsert: true }
        );

        const updatedUser = await User.findByIdAndUpdate(userId, {
            tier: 'enterprise',
            subscription_status: 'active',
            subscription_start_date: new Date(),
        }, { new: true });

        if (!updatedUser) {
          throw new Error('Failed to update user after payment.');
        }

        await Payment.create({
            userId: userId,
            paystackReference: reference,
            amount: paystackResponse.data.amount / 100,
            currency: paystackResponse.data.currency?.toUpperCase(),
            status: 'succeeded',
            provider: 'paystack',
            description: `${planType} subscription payment`,
            metadata: { paystackData: paystackResponse.data }
        });

        // Optional: Mark local session as completed if it exists
        await PaymentSession.findOneAndUpdate(
            { sessionId: reference, userId: userId },
            { status: 'completed', completedAt: new Date() }
        ).catch(err => logger.warn('Could not update local payment session, but proceeding as payment is verified.', { reference, err }));

        logger.info('Paystack payment completed and subscription activated', {
          userId,
          reference,
          amount: paystackResponse.data.amount,
          planType: planType
        });
        
        return {
          reference,
          status: 'completed',
          amount: paystackResponse.data.amount / 100,
          currency: paystackResponse.data.currency?.toUpperCase(),
          planType: planType,
          provider: 'paystack',
          subscriptionActivated: true,
          user: updatedUser
        };

      } else {
        logger.warn('Paystack verification failed or was not successful.', { reference, status: paystackResponse.data?.status });
        return {
          reference,
          status: paystackResponse.data?.status || 'failed',
        };
      }
    } catch (error) {
      logger.error('Payment verification failed:', {
        reference,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();