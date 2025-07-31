import * as cron from 'node-cron';
import { Database } from '../database/database';
import { logger } from '../utils/logger';
import { paystackService } from './paystackService';
import { notificationService } from './notificationService';
import { User } from '../models/User';

export class SubscriptionService {
  private db: Database;
  private isJobsScheduled = false;

  constructor() {
    this.db = new Database();
  }

  // Initialize subscription management jobs
  public initializeSubscriptionJobs(): void {
    if (this.isJobsScheduled) {
      logger.info('Subscription jobs already scheduled');
      return;
    }

    // Run daily at 6 AM to check for expired subscriptions
    cron.schedule('0 6 * * *', async () => {
      logger.info('Running daily subscription expiry check');
      await this.checkExpiredSubscriptions();
    });

    // Run daily at 5 AM to check for upcoming renewals (3 days before)
    cron.schedule('0 5 * * *', async () => {
      logger.info('Running daily renewal reminders check');
      await this.sendRenewalReminders();
    });

    // Run daily at 4 AM to process automatic renewals
    cron.schedule('0 4 * * *', async () => {
      logger.info('Running daily automatic renewals');
      await this.processAutomaticRenewals();
    });

    this.isJobsScheduled = true;
    logger.info('Subscription management jobs scheduled successfully');
  }

  // Check for expired subscriptions and downgrade users
  public async checkExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all enterprise users with expired subscriptions
      const expiredUsers = await User.find({
        tier: 'enterprise',
        subscription_status: 'active',
        subscription_end_date: { $lt: now }
      });

      logger.info(`Found ${expiredUsers.length} expired subscriptions`);

      for (const user of expiredUsers) {
        await this.handleExpiredSubscription(user);
      }
    } catch (error) {
      logger.error('Error checking expired subscriptions:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  // Send renewal reminders 3 days before expiry
  public async sendRenewalReminders(): Promise<void> {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find users whose subscriptions expire in 3 days
      const usersNeedingReminder = await User.find({
        tier: 'enterprise',
        subscription_status: 'active',
        subscription_end_date: {
          $gte: tomorrow,
          $lte: threeDaysFromNow
        }
      });

      logger.info(`Sending renewal reminders to ${usersNeedingReminder.length} users`);

      for (const user of usersNeedingReminder) {
        await notificationService.createNotification({
          userId: user._id.toString(),
          type: 'info',
          category: 'payment',
          title: 'Subscription Renewal Reminder',
          message: `Your subscription expires on ${user.subscription_end_date}`,
          priority: 'medium'
        });
      }
    } catch (error) {
      logger.error('Error sending renewal reminders:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Process automatic renewals using Paystack recurring billing
  public async processAutomaticRenewals(): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find users whose subscriptions expire today or tomorrow and have Paystack subscription codes
      const usersForRenewal = await User.find({
        tier: 'enterprise',
        subscription_status: 'active',
        subscription_end_date: { $lte: tomorrow },
        paystack_subscription_code: { $exists: true, $ne: null },
        cancel_at_period_end: { $ne: true }
      });

      logger.info(`Processing automatic renewals for ${usersForRenewal.length} users`);

      for (const user of usersForRenewal) {
        await this.processUserRenewal(user);
      }
    } catch (error) {
      logger.error('Error processing automatic renewals:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle individual user renewal
  private async processUserRenewal(user: any): Promise<void> {
    try {
      if (!user.paystack_subscription_code) {
        logger.warn('User has no Paystack subscription code, cannot auto-renew', {
          userId: user._id.toString()
        });
        return;
      }

      // Attempt to charge the user via Paystack
      const renewalResult = await this.attemptPaystackRenewal(user);

      if (renewalResult.success) {
        await this.handleSuccessfulRenewal(user, renewalResult.data);
      } else {
        await this.handleFailedRenewal(user, renewalResult.error);
      }
    } catch (error) {
      logger.error('Error processing user renewal:', {
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Attempt renewal via Paystack
  private async attemptPaystackRenewal(user: any): Promise<{success: boolean, data?: any, error?: string}> {
    try {
      // Check if subscription is still active with Paystack
      const subscriptionStatus = await paystackService.getSubscription(user.paystack_subscription_code);
      
      if (!subscriptionStatus.status || subscriptionStatus.data.status !== 'active') {
        return { success: false, error: 'Paystack subscription is not active' };
      }

      // For Paystack, renewals are handled automatically by their system
      // We just need to verify the subscription is still active and update our records
      return { success: true, data: subscriptionStatus.data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Handle successful renewal
  private async handleSuccessfulRenewal(user: any, renewalData: any): Promise<void> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      
      // Calculate next billing period
      if (user.subscription_plan_type === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Update user subscription
      await User.findByIdAndUpdate(user._id, {
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        subscription_status: 'active',
        updated_at: new Date()
      });

      // Send renewal success notification
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'success',
        category: 'payment',
        title: 'Subscription Renewed Successfully',
        message: `Your subscription has been renewed until ${endDate}`,
        priority: 'high'
      });

      logger.info('Subscription renewed successfully', {
        userId: user._id.toString(),
        planType: user.subscription_plan_type,
        newEndDate: endDate
      });
    } catch (error) {
      logger.error('Error handling successful renewal:', {
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle failed renewal
  private async handleFailedRenewal(user: any, error: string): Promise<void> {
    try {
      // Set subscription to past_due status (grace period)
      await User.findByIdAndUpdate(user._id, {
        subscription_status: 'past_due',
        updated_at: new Date()
      });

      // Send payment failed notification
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'error',
        category: 'payment',
        title: 'Subscription Renewal Failed',
        message: `Your subscription renewal failed: ${error}`,
        priority: 'high'
      });

      logger.warn('Subscription renewal failed', {
        userId: user._id.toString(),
        error,
        status: 'past_due'
      });

      // Schedule downgrade in 7 days if payment not resolved
      setTimeout(async () => {
        const updatedUser = await User.findById(user._id);
        if (updatedUser?.subscription_status === 'past_due') {
          await this.handleExpiredSubscription(updatedUser);
        }
      }, 7 * 24 * 60 * 60 * 1000); // 7 days
    } catch (error) {
      logger.error('Error handling failed renewal:', {
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle expired subscription (downgrade user)
  private async handleExpiredSubscription(user: any): Promise<void> {
    try {
      // Downgrade user to free tier
      await User.findByIdAndUpdate(user._id, {
        tier: 'free',
        subscription_status: 'expired',
        updated_at: new Date()
      });

      // Send expiration notification
      await notificationService.createNotification({
        userId: user._id.toString(),
        type: 'warning',
        category: 'payment',
        title: 'Subscription Expired',
        message: 'Your subscription has expired and you have been downgraded to the free tier',
        priority: 'high'
      });

      logger.info('User subscription expired and downgraded', {
        userId: user._id.toString(),
        previousTier: 'enterprise',
        newTier: 'free'
      });
    } catch (error) {
      logger.error('Error handling expired subscription:', {
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Manual subscription renewal (for admin use)
  public async renewSubscription(userId: string, planType: 'monthly' | 'yearly'): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      
      if (planType === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await User.findByIdAndUpdate(userId, {
        tier: 'enterprise',
        subscription_status: 'active',
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        subscription_plan_type: planType,
        updated_at: new Date()
      });

      logger.info('Manual subscription renewal completed', {
        userId,
        planType,
        endDate
      });
    } catch (error) {
      logger.error('Error in manual subscription renewal:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Get subscription analytics
  public async getSubscriptionAnalytics(): Promise<any> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [
        totalUsers,
        enterpriseUsers,
        activeSubscriptions,
        expiredThisMonth,
        renewedThisMonth
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ tier: 'enterprise' }),
        User.countDocuments({ tier: 'enterprise', subscription_status: 'active' }),
        User.countDocuments({
          tier: 'free',
          subscription_status: 'expired',
          updated_at: { $gte: startOfMonth, $lte: endOfMonth }
        }),
        User.countDocuments({
          tier: 'enterprise',
          subscription_status: 'active',
          subscription_start_date: { $gte: startOfMonth, $lte: endOfMonth }
        })
      ]);

      return {
        totalUsers,
        enterpriseUsers,
        activeSubscriptions,
        expiredThisMonth,
        renewedThisMonth,
        conversionRate: totalUsers > 0 ? (enterpriseUsers / totalUsers * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();