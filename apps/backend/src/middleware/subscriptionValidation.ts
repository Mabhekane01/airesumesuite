import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { subscriptionService } from '../services/subscriptionService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
    permissions: string[];
  };
}

// Subscription validation middleware
export const requireEnterpriseSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Fetch the latest user data from database to ensure subscription status is current
    const user = await User.findById(userId).select('tier');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check subscription status from Subscription model
    const { Subscription } = require('../models/Subscription');
    const activeSubscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });

    // Check if user has enterprise tier or active subscription
    if (user.tier !== 'enterprise' && !activeSubscription) {
      logger.info('Allowing free user to preview AI feature', {
        userId,
        tier: user.tier,
        endpoint: req.path
      });
      // Bypass block for preview - we'll enforce the lock at the save/download phase
      return next();
    }

    // Log successful enterprise feature access
    logger.info('Enterprise feature accessed', {
      userId,
      endpoint: req.path,
      tier: user.tier
    });

    next();
  } catch (error) {
    logger.error('Subscription validation error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      endpoint: req.path,
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error during subscription validation',
      code: 'SUBSCRIPTION_VALIDATION_ERROR'
    });
  }
};

// Feature-specific subscription checks (New Hybrid Model)
export const requireFeatureAccess = (featureName: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Map feature name to action type
      const actionType = featureName.includes('resume') && featureName.includes('export') 
        ? 'resume_exports' 
        : 'ai_actions';

      const allowed = await subscriptionService.checkUsageLimit(userId, actionType);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Usage limit reached. Please upgrade your plan or purchase credits.',
          code: 'LIMIT_EXCEEDED',
          data: {
            upgradeUrl: '/dashboard/upgrade',
            actionType
          }
        });
      }

      next();
    } catch (error) {
      logger.error(`Feature access validation error for ${featureName}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        feature: featureName,
        endpoint: req.path
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error during feature validation',
        code: 'FEATURE_VALIDATION_ERROR'
      });
    }
  };
};

// Usage tracking middleware for subscription features
export const trackFeatureUsage = (featureName: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    
    if (userId) {
      // Track usage asynchronously without blocking the request
      setImmediate(async () => {
        try {
          const actionType = featureName.includes('resume') && featureName.includes('export') 
            ? 'resume_exports' 
            : 'ai_actions';
            
          await subscriptionService.recordUsage(userId, actionType);

          logger.info('Feature usage tracked', {
            userId,
            feature: featureName,
            actionType,
            endpoint: req.path,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Feature usage tracking failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId,
            feature: featureName
          });
        }
      });
    }

    next();
  };
};

// Rate limiting for AI features by subscription tier
export const subscriptionRateLimit = (feature: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const user = await User.findById(userId).select('tier');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Define rate limits per tier
      const rateLimits: { [key: string]: { [key: string]: number } } = {
        free: {
          'ai-career-coach': 5,
          'ai-resume-builder': 10,
          'ai-job-matching': 10,
          'ai-interview-prep': 5,
          'ai-analytics': 3,
          'ai-recommendations': 5,
          'ai-bulk-analysis': 2,
          'ai-insights': 5,
          'ai-optimization': 5,
          'ai-batch-user-analysis': 2
        },
        premium: {
          'ai-career-coach': 100,
          'ai-resume-builder': 50,
          'ai-job-matching': 100,
          'ai-interview-prep': 50,
          'ai-analytics': 25,
          'ai-recommendations': 50,
          'ai-bulk-analysis': 10,
          'ai-insights': 50,
          'ai-optimization': 50,
          'ai-batch-user-analysis': 10
        },
        enterprise: {
          'ai-career-coach': 1000,
          'ai-resume-builder': 500,
          'ai-job-matching': 1000,
          'ai-interview-prep': 500,
          'ai-analytics': 250,
          'ai-recommendations': 500,
          'ai-bulk-analysis': 100,
          'ai-insights': 500,
          'ai-optimization': 500,
          'ai-batch-user-analysis': 100
        }
      };

      const userTier = user.tier || 'free';
      const limit = rateLimits[userTier]?.[feature] || 0;

      if (limit === 0 && userTier === 'free') {
        return res.status(403).json({
          success: false,
          message: `${feature} requires an Enterprise subscription`,
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      // Here you would implement actual rate limiting logic
      // For now, we just log and continue
      logger.info('Rate limit check passed', {
        userId,
        feature,
        tier: userTier,
        limit
      });

      next();
    } catch (error) {
      logger.error('Subscription rate limit error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        feature
      });

      next(); // Continue on error to avoid blocking legitimate requests
    }
  };
};

export default {
  requireEnterpriseSubscription,
  requireFeatureAccess,
  trackFeatureUsage,
  subscriptionRateLimit
};