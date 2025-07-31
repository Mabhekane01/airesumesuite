import axios, { AxiosResponse } from 'axios';
import { z } from 'zod';
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
  userId: z.string(),
  planType: z.enum(['monthly', 'yearly']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.any()).optional()
});

const CreatePaymentSessionFromControllerSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  planType: z.enum(['monthly', 'yearly']),
  amount: z.number(),
  currency: z.string(),
  location: z.object({
    country: z.string(),
    continent: z.string(),
    isAfricanCountry: z.boolean(),
    currency: z.string()
  }).optional()
});

const HandleWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string(),
    amount: z.number(),
    status: z.string(),
    customer: z.object({
      email: z.string().email()
    }).optional()
  })
});

// Pricing configuration
const PRICING_CONFIG = {
  monthly: { amount: 2900, currency: 'NGN' }, // ₦29 per month
  yearly: { amount: 29000, currency: 'NGN' }   // ₦290 per year (save ~17%)
};

interface SubscriptionStatus {
  tier: 'free' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  paystackSubscriptionId?: string;
}

export class PaymentService {
  private paystackSecretKey: string;
  private paystackBaseUrl: string = 'https://api.paystack.co';
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
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY not configured. Please set PAYSTACK_SECRET_KEY environment variable.');
    }
    
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.db = new Database();
  }

  async getPaymentHistory(userId: string): Promise<any[]> {
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return payments.map(payment => ({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      description: payment.description,
      createdAt: payment.createdAt
    }));
  }

  async verifyPayment(reference: string, userId: string, planType: string): Promise<any> {
    // Verify payment with Paystack
    const response = await axios.get(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`
        }
      }
    );

    if (!response.data.status || response.data.data.status !== 'success') {
      throw new Error('Payment verification failed');
    }

    const paymentData = response.data.data;
    
    // Update payment record
    await Payment.findOneAndUpdate(
      { paystackReference: reference, userId },
      { status: 'succeeded' }
    );

    // Activate subscription if payment was successful
    if (paymentData.status === 'success') {
      await this.activateSubscription(userId, planType as 'monthly' | 'yearly');
    }

    return {
      verified: true,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      status: paymentData.status
    };
  }

  async createPaystackSession(data: z.infer<typeof CreatePaymentSessionFromControllerSchema> | z.infer<typeof CreatePaymentSessionSchema>): Promise<{ sessionId: string; checkoutUrl: string; expiresAt: Date }> {
    try {
      let validatedData: any;
      let userEmail: string;
      let successUrl: string = process.env.FRONTEND_URL + '/dashboard';
      
      // Check if this is from controller (has userEmail) or direct call (has successUrl)
      if ('userEmail' in data) {
        // From controller - convert format
        validatedData = {
          userId: data.userId,
          planType: data.planType,
          successUrl,
          cancelUrl: successUrl,
          metadata: { location: data.location }
        };
        userEmail = data.userEmail;
      } else {
        // Direct call - validate normally
        validatedData = CreatePaymentSessionSchema.parse(data);
        const user = await User.findById(validatedData.userId);
        if (!user) {
          throw new Error('User not found');
        }
        userEmail = user.email;
        successUrl = validatedData.successUrl;
      }
      
      // Get pricing for plan
      const planConfig = PRICING_CONFIG[validatedData.planType];
      
      // Generate unique reference
      const reference = `ai_job_suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Initialize Paystack transaction
      const paystackResponse = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: userEmail,
          amount: planConfig.amount * 100, // Paystack expects amount in kobo
          currency: planConfig.currency,
          reference: reference,
          callback_url: successUrl,
          metadata: {
            userId: validatedData.userId,
            planType: validatedData.planType,
            ...validatedData.metadata
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!paystackResponse.data.status) {
        throw new Error('Failed to create Paystack transaction');
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Create payment session record
      const paymentSession = new PaymentSession({
        sessionId: reference,
        userId: validatedData.userId,
        planType: validatedData.planType,
        amount: planConfig.amount,
        currency: planConfig.currency,
        provider: 'paystack',
        status: 'pending',
        expiresAt,
        metadata: {
          paystackAccessCode: paystackResponse.data.data.access_code,
          paystackReference: reference,
          ...validatedData.metadata
        }
      });

      await paymentSession.save();
      
      logger.info('Paystack payment session created', {
        sessionId: reference,
        userId: validatedData.userId,
        planType: validatedData.planType
      });

      return {
        sessionId: reference,
        checkoutUrl: paystackResponse.data.data.authorization_url,
        expiresAt
      };
    } catch (error: any) {
      logger.error('Failed to create Paystack session', { error: error.message });
      throw error;
    }
  }

  async handleWebhook(signature: string, payload: any): Promise<void> {
    try {
      // Verify webhook signature
      const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        throw new Error('Invalid webhook signature');
      }

      const { event, data } = payload;

      switch (event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(data);
          break;
        case 'subscription.create':
          await this.handleSubscriptionCreated(data);
          break;
        case 'subscription.disable':
          await this.handleSubscriptionCancelled(data);
          break;
        default:
          logger.info('Unhandled webhook event', { event });
      }
    } catch (error: any) {
      logger.error('Webhook handling failed', { error: error.message });
      throw error;
    }
  }

  private async handleSuccessfulPayment(data: any): Promise<void> {
    const { reference, amount, customer } = data;
    
    // Find payment session
    const session = await PaymentSession.findOne({ 
      sessionId: reference,
      status: 'pending'
    });

    if (!session) {
      logger.warn('Payment session not found for reference', { reference });
      return;
    }

    // Update payment session
    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Create payment record
    const payment = new Payment({
      userId: session.userId,
      paystackReference: reference,
      amount: amount / 100, // Convert from kobo to naira
      currency: 'NGN',
      status: 'succeeded',
      provider: 'paystack',
      metadata: { sessionId: session.sessionId }
    });
    await payment.save();

    // Activate user subscription
    await this.activateSubscription(session.userId, session.planType);

    // Send success notification
    await notificationService.createNotification({
      userId: session.userId,
      type: 'success',
      category: 'payment',
      title: 'Subscription Activated',
      message: 'Your subscription has been successfully activated',
      priority: 'medium'
    });

    logger.info('Subscription activated successfully', {
      userId: session.userId,
      reference: reference
    });
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    // Handle subscription creation if using Paystack subscriptions
    logger.info('Subscription created', { data });
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    // Handle subscription cancellation
    logger.info('Subscription cancelled', { data });
  }

  private async activateSubscription(userId: string, planType: 'monthly' | 'yearly'): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);
    
    if (planType === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create or update subscription
    await Subscription.findOneAndUpdate(
      { userId },
      {
        planType,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null
      },
      { upsert: true, new: true }
    );

    // Update user tier
    await User.findByIdAndUpdate(userId, {
      tier: 'enterprise',
      subscription_status: 'active',
      subscription_end_date: periodEnd
    });
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
      tier: (user?.tier === 'enterprise' ? 'enterprise' : 'free') as 'free' | 'enterprise',
      status: subscription.status as any,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      paystackSubscriptionId: subscription.paystackSubscriptionId,
    };
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getSubscriptionStatus(userId);
    
    if (subscription.tier !== 'enterprise' || subscription.status !== 'active') {
      throw new Error('No active subscription found');
    }

    await Subscription.findOneAndUpdate(
      { userId, status: 'active' },
      { 
        cancelAtPeriodEnd: true,
        cancelledAt: new Date()
      }
    );

    logger.info('Subscription cancelled', { userId });
  }

  // Rate limiting middleware
  getPaymentRateLimit() {
    return this.paymentRateLimit;
  }
}

export const paymentService = new PaymentService();