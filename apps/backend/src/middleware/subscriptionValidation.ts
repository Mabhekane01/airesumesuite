import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';

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

// Feature-specific subscription checks
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

      // Define enterprise-only features
      const enterpriseFeatures = [
        'ai-resume-builder',
        'ai-cover-letter',
        'ai-career-coach',
        'ai-interview-prep',
        'unlimited-resumes',
        'priority-support',
        'advanced-analytics',
        'job-optimization',
        'bulk-operations'
      ];

      const user = await User.findById(userId).select('tier');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if feature requires enterprise subscription
      if (enterpriseFeatures.includes(featureName) && user.tier !== 'enterprise') {
        logger.info(`Allowing free user to preview feature: ${featureName}`, {
          userId,
          tier: user.tier,
          endpoint: req.path
        });
        
        // Allow access for preview
        return next();
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
          logger.info('Feature usage tracked', {
            userId,
            feature: featureName,
            endpoint: req.path,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          // Here you could implement usage analytics storage
          // await analyticsService.trackFeatureUsage(userId, featureName, req.path);
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
          'ai-career-coach': 5, // Allow 5 free requests for preview
          'ai-resume-builder': 10,
          'ai-cover-letter': 5
        },
        enterprise: {
          'ai-career-coach': 100, // 100 requests per hour
          'ai-resume-builder': 50,
          'ai-cover-letter': 50
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