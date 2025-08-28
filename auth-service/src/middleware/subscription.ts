import { Request, Response, NextFunction } from "express";
import { query } from "../config/database";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "./auth";

export interface SubscriptionRequest extends AuthenticatedRequest {
  subscription?: {
    planId: string;
    planName: string;
    features: Record<string, string[]>;
    limits: Record<string, number>;
  };
}

// Define the plan hierarchy with proper typing
type PlanName = "free" | "basic" | "pro" | "enterprise";

const PLAN_HIERARCHY: Record<PlanName, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * Middleware to require an active subscription
 * Fails if user doesn't have an active subscription
 */
export const requireSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  checkSubscription(req as SubscriptionRequest, res, next, true);
};

/**
 * Middleware to check subscription but allow free tier
 * Doesn't fail if user has no subscription (free tier)
 */
export const checkSubscription = (
  req: Request,
  res: Response,
  next: NextFunction,
  requireActive: boolean = false
): void => {
  try {
    const subscriptionReq = req as SubscriptionRequest;
    const userId = subscriptionReq.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Get user's subscription
    query(
      `SELECT 
        s.plan_id,
        p.name as plan_name,
        p.features,
        p.limits
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [userId]
    )
      .then((result) => {
        if (result.rows.length === 0) {
          if (requireActive) {
            res.status(403).json({
              success: false,
              message: "Active subscription required",
              code: "SUBSCRIPTION_REQUIRED",
            });
            return;
          }

          // Free tier - continue without subscription
          subscriptionReq.subscription = {
            planId: "free",
            planName: "Free Tier",
            features: {},
            limits: {},
          };

          next();
          return;
        }

        const subscription = result.rows[0];

        // Add subscription info to request
        subscriptionReq.subscription = {
          planId: subscription.plan_id,
          planName: subscription.plan_name,
          features: subscription.features || {},
          limits: subscription.limits || {},
        };

        next();
      })
      .catch((error) => {
        logger.error("Error checking subscription:", error);
        res.status(500).json({
          success: false,
          message: "Failed to check subscription",
          code: "SUBSCRIPTION_CHECK_ERROR",
        });
      });
  } catch (error) {
    logger.error("Subscription middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during subscription check",
      code: "SUBSCRIPTION_MIDDLEWARE_ERROR",
    });
  }
};

/**
 * Middleware to require a specific feature
 * Fails if user's subscription doesn't include the required feature
 */
export const requireFeature = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const subscriptionReq = req as SubscriptionRequest;

      if (!subscriptionReq.subscription) {
        // Free tier - check if feature is allowed
        res.status(403).json({
          success: false,
          message: "Subscription required for this feature",
          code: "FEATURE_SUBSCRIPTION_REQUIRED",
        });
        return;
      }

      const features = subscriptionReq.subscription.features;
      const hasFeature =
        features[resource] && features[resource].includes(action);

      if (!hasFeature) {
        res.status(403).json({
          success: false,
          message: `Feature '${action}' on '${resource}' not available in current plan`,
          code: "FEATURE_NOT_AVAILABLE",
          resource,
          action,
          currentPlan: subscriptionReq.subscription.planName,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Feature requirement middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during feature check",
        code: "FEATURE_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to check usage limits
 * Fails if user has exceeded their usage limit for a resource
 */
export const checkUsageLimit = (resource: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const subscriptionReq = req as SubscriptionRequest;

      if (!subscriptionReq.subscription) {
        // Free tier - continue without usage tracking
        next();
        return;
      }

      const limits = subscriptionReq.subscription.limits;
      const limit = limits[resource];

      if (!limit) {
        // No limit set for this resource
        next();
        return;
      }

      if (!subscriptionReq.user?.id) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      // Check current usage
      const usageResult = await query(
        `SELECT COUNT(*) as usage_count
         FROM resource_usage 
         WHERE user_id = $1 AND resource_type = $2 
         AND created_at >= DATE_TRUNC('month', NOW())`,
        [subscriptionReq.user.id, resource]
      );

      const currentUsage = parseInt(usageResult.rows[0].usage_count);

      if (currentUsage >= limit) {
        res.status(429).json({
          success: false,
          message: `Usage limit exceeded for ${resource}`,
          code: "USAGE_LIMIT_EXCEEDED",
          resource,
          currentUsage,
          limit,
          resetDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            1
          ).toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Usage limit middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during usage limit check",
        code: "USAGE_LIMIT_CHECK_ERROR",
      });
    }
  };
};

/**
 * Middleware to require minimum subscription tier
 * Fails if user's plan is below the required tier
 */
export const requirePlan = (requiredPlan: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const subscriptionReq = req as SubscriptionRequest;

      if (!subscriptionReq.subscription) {
        res.status(403).json({
          success: false,
          message: "Subscription required",
          code: "SUBSCRIPTION_REQUIRED",
        });
        return;
      }

      // Normalize plan names and safely get hierarchy levels
      const userPlanName =
        subscriptionReq.subscription.planName.toLowerCase() as PlanName;
      const requiredPlanName = requiredPlan.toLowerCase() as PlanName;

      const userPlanLevel = PLAN_HIERARCHY[userPlanName] ?? 0;
      const requiredPlanLevel = PLAN_HIERARCHY[requiredPlanName] ?? 0;

      if (userPlanLevel < requiredPlanLevel) {
        res.status(403).json({
          success: false,
          message: `Plan '${requiredPlan}' or higher required`,
          code: "PLAN_UPGRADE_REQUIRED",
          currentPlan: subscriptionReq.subscription.planName,
          requiredPlan,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Plan requirement middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during plan check",
        code: "PLAN_CHECK_ERROR",
      });
    }
  };
};
