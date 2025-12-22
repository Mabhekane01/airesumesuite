import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { subscriptionService } from '../services/subscriptionService';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { notificationService } from '../services/notificationService';

// Get subscription analytics dashboard data
export const getSubscriptionAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // TODO: Add proper admin role check
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const analytics = await subscriptionService.getSubscriptionAnalytics();
    
    // Get additional detailed metrics
    const detailedMetrics = await getDetailedSubscriptionMetrics();
    
    res.json({
      success: true,
      data: {
        ...analytics,
        ...detailedMetrics
      }
    });

  } catch (error) {
    logger.error('Failed to get subscription analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription analytics'
    });
  }
};

// Get all subscriptions with filters and pagination
export const getAllSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      tier,
      planType,
      search
    } = req.query;

    // Build filter query
    const filter: any = {};
    
    if (status && status !== 'all') {
      filter.subscription_status = status;
    }
    
    if (tier && tier !== 'all') {
      filter.tier = tier;
    }
    
    if (planType && planType !== 'all') {
      filter.subscription_plan_type = planType;
    }

    // Add search functionality
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [subscriptions, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshTokens -twoFactorSecret -emailVerificationToken -passwordResetToken')
        .skip(skip)
        .limit(Number(limit))
        .sort({ updatedAt: -1 }),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          limit: Number(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions'
    });
  }
};

// Manually renew a subscription
export const renewSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id;
    const { userId, planType } = req.body;
    
    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!userId || !planType) {
      return res.status(400).json({
        success: false,
        message: 'userId and planType are required'
      });
    }

    if (!['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'planType must be "monthly" or "yearly"'
      });
    }

    // TODO: Add proper admin role validation
    // For now, allow users to renew their own subscriptions
    if (adminUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    await subscriptionService.renewSubscription(userId, planType);

    // Log the action
    logger.info('Manual subscription renewal', {
      adminUserId,
      targetUserId: userId,
      planType,
      timestamp: new Date()
    });

    // Send notification
    await notificationService.sendPaymentNotification(userId, 'subscription_renewed', { planType });

    res.json({
      success: true,
      message: `Subscription renewed successfully for ${planType} plan`
    });

  } catch (error) {
    logger.error('Failed to renew subscription:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to renew subscription'
    });
  }
};

// Cancel a subscription
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id;
    const { userId, immediate = false } = req.body;
    
    if (!adminUserId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Authentication and userId required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (immediate) {
      // Immediate cancellation - downgrade now
      await User.findByIdAndUpdate(userId, {
        tier: 'free',
        subscription_status: 'cancelled',
        cancel_at_period_end: false,
        updated_at: new Date()
      });
    } else {
      // Cancel at period end
      await User.findByIdAndUpdate(userId, {
        cancel_at_period_end: true,
        updated_at: new Date()
      });
    }

    logger.info('Subscription cancellation', {
      adminUserId,
      targetUserId: userId,
      immediate,
      timestamp: new Date()
    });

    // Send notification
    await notificationService.sendPaymentNotification(userId, 'subscription_cancelled', { immediate });

    res.json({
      success: true,
      message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end'
    });

  } catch (error) {
    logger.error('Failed to cancel subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

// Reactivate a cancelled subscription
export const reactivateSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id;
    const { userId } = req.body;
    
    if (!adminUserId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Authentication and userId required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if subscription can be reactivated
    if (user.subscription_status !== 'cancelled' && !user.cancel_at_period_end) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not in a cancelled state'
      });
    }

    await User.findByIdAndUpdate(userId, {
      tier: 'enterprise',
      subscription_status: 'active',
      cancel_at_period_end: false,
      updated_at: new Date()
    });

    logger.info('Subscription reactivation', {
      adminUserId,
      targetUserId: userId,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Subscription reactivated successfully'
    });

  } catch (error) {
    logger.error('Failed to reactivate subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription'
    });
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const revenueData = await calculateRevenueAnalytics(startDate);

    res.json({
      success: true,
      data: revenueData
    });

  } catch (error) {
    logger.error('Failed to get revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue analytics'
    });
  }
};

// Helper function to get detailed subscription metrics
async function getDetailedSubscriptionMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    upcomingRenewals,
    recentCancellations,
    pastDueSubscriptions,
    trialUsers,
    monthlyVsYearly
  ] = await Promise.all([
    // Subscriptions renewing in next 7 days
    User.countDocuments({
      tier: 'enterprise',
      subscription_status: 'active',
      subscription_end_date: {
        $gte: now,
        $lte: sevenDaysAgo
      }
    }),
    
    // Cancelled in last 30 days
    User.countDocuments({
      subscription_status: 'cancelled',
      updated_at: { $gte: thirtyDaysAgo }
    }),
    
    // Past due subscriptions
    User.countDocuments({
      subscription_status: 'past_due'
    }),
    
    // Free tier users (potential conversions)
    User.countDocuments({
      tier: 'free'
    }),
    
    // Monthly vs Yearly breakdown
    User.aggregate([
      {
        $match: {
          tier: 'enterprise',
          subscription_status: 'active'
        }
      },
      {
        $group: {
          _id: '$subscription_plan_type',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const planTypeBreakdown = monthlyVsYearly.reduce((acc: any, item: any) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, { monthly: 0, yearly: 0 });

  return {
    upcomingRenewals,
    recentCancellations,
    pastDueSubscriptions,
    trialUsers,
    planTypeBreakdown
  };
}

// Helper function to calculate revenue analytics
async function calculateRevenueAnalytics(startDate: Date) {
  // Base pricing (these should come from config)
  const MONTHLY_PRICE_AFRICAN = 50;
  const YEARLY_PRICE_AFRICAN = 540;
  const MONTHLY_PRICE_OTHER = 100;
  const YEARLY_PRICE_OTHER = 1080;

  const activeSubscriptions = await User.find({
    tier: 'enterprise',
    subscription_status: 'active',
    subscription_start_date: { $gte: startDate }
  });

  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;

  activeSubscriptions.forEach(user => {
    // For now, assume African pricing (you'd need location data for accurate calculation)
    const isYearly = user.subscription_plan_type === 'yearly';
    const amount = isYearly ? YEARLY_PRICE_AFRICAN : MONTHLY_PRICE_AFRICAN;
    
    totalRevenue += amount;
    
    if (isYearly) {
      yearlyRevenue += amount;
    } else {
      monthlyRevenue += amount;
    }
  });

  // Calculate projected monthly recurring revenue (MRR)
  const monthlySubscriptions = await User.countDocuments({
    tier: 'enterprise',
    subscription_status: 'active',
    subscription_plan_type: 'monthly'
  });

  const yearlySubscriptions = await User.countDocuments({
    tier: 'enterprise',
    subscription_status: 'active',
    subscription_plan_type: 'yearly'
  });

  const projectedMRR = (monthlySubscriptions * MONTHLY_PRICE_AFRICAN) + 
                      (yearlySubscriptions * YEARLY_PRICE_AFRICAN / 12);

  return {
    totalRevenue,
    monthlyRevenue,
    yearlyRevenue,
    projectedMRR,
    newSubscriptions: activeSubscriptions.length,
    averageRevenuePerUser: activeSubscriptions.length > 0 ? totalRevenue / activeSubscriptions.length : 0
  };
}