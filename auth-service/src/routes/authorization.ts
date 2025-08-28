import { Router } from "express";
import { body } from "express-validator";
import { query } from "../config/database";
import { logger } from "../utils/logger";
import { authMiddleware } from "../middleware/auth";

const router: Router = Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const subscriptionValidation = [
  body("planId").isString().isLength({ min: 1 }),
  body("paymentMethodId").optional().isString(),
];

const permissionValidation = [
  body("resource").isString().isLength({ min: 1 }),
  body("action").isString().isLength({ min: 1 }),
];

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

// Get current user's subscription status
router.get("/subscription", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    const result = await query(
      `SELECT 
        s.id,
        s.plan_id,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        p.name as plan_name,
        p.features,
        p.limits,
        p.price
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          subscription: null,
          plan: null,
        },
      });
    }

    const subscription = result.rows[0];

    return res.json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        plan: {
          id: subscription.plan_id,
          name: subscription.plan_name,
          features: subscription.features,
          limits: subscription.limits,
          price: subscription.price,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching subscription:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
      code: "SUBSCRIPTION_FETCH_ERROR",
    });
  }
});

// Get available subscription plans
router.get("/plans", async (_req: any, res: any) => {
  try {
    const result = await query(
      `SELECT 
        id,
        name,
        description,
        features,
        limits,
        price,
        billing_cycle,
        is_popular,
        sort_order
       FROM subscription_plans
       WHERE is_active = true
       ORDER BY sort_order, price`
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error("Error fetching plans:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch subscription plans",
      code: "PLANS_FETCH_ERROR",
    });
  }
});

// Create/update subscription
router.post(
  "/subscription",
  authMiddleware,
  subscriptionValidation,
  async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const { planId, paymentMethodId } = req.body;

      // Check if user already has an active subscription
      const existingSub = await query(
        "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'",
        [userId]
      );

      if (existingSub.rows.length > 0) {
        // Update existing subscription
        await query(
          `UPDATE subscriptions 
         SET plan_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND status = 'active'`,
          [planId, userId]
        );
      } else {
        // Create new subscription
        await query(
          `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month')`,
          [userId, planId]
        );
      }

      // Log subscription event
      await query(
        `INSERT INTO subscription_events (user_id, event_type, plan_id, details)
       VALUES ($1, $2, $3, $4)`,
        [userId, "subscription_created", planId, { paymentMethodId }]
      );

      return res.json({
        success: true,
        message: "Subscription updated successfully",
      });
    } catch (error) {
      logger.error("Error updating subscription:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update subscription",
        code: "SUBSCRIPTION_UPDATE_ERROR",
      });
    }
  }
);

// Cancel subscription
router.post(
  "/subscription/cancel",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const userId = req.user?.id;

      await query(
        `UPDATE subscriptions 
       SET cancel_at_period_end = true, updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      // Log cancellation event
      await query(
        `INSERT INTO subscription_events (user_id, event_type, details)
       VALUES ($1, 'subscription_cancelled', $2)`,
        [userId, { cancelledAt: new Date() }]
      );

      return res.json({
        success: true,
        message:
          "Subscription will be cancelled at the end of the current period",
      });
    } catch (error) {
      logger.error("Error cancelling subscription:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to cancel subscription",
        code: "SUBSCRIPTION_CANCEL_ERROR",
      });
    }
  }
);

// =============================================================================
// PERMISSION & ACCESS CONTROL
// =============================================================================

// Check if user has permission for a specific resource/action
router.post(
  "/permissions/check",
  authMiddleware,
  permissionValidation,
  async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const { resource, action } = req.body;

      // Get user's subscription and plan
      const subResult = await query(
        `SELECT 
        s.plan_id,
        p.features,
        p.limits
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
        [userId]
      );

      if (subResult.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            hasPermission: false,
            reason: "No active subscription",
            subscription: null,
          },
        });
      }

      const subscription = subResult.rows[0];
      const features = subscription.features || {};
      const limits = subscription.limits || {};

      // Check if the action is allowed for this subscription
      const hasPermission =
        features[resource] && features[resource].includes(action);

      // Check usage limits
      let usageInfo = null;
      if (limits[resource]) {
        const usageResult = await query(
          `SELECT COUNT(*) as usage_count
         FROM resource_usage 
         WHERE user_id = $1 AND resource = $2 
         AND created_at >= DATE_TRUNC('month', NOW())`,
          [userId, resource]
        );

        usageInfo = {
          current: parseInt(usageResult.rows[0].usage_count),
          limit: limits[resource],
          remaining: Math.max(
            0,
            limits[resource] - parseInt(usageResult.rows[0].usage_count)
          ),
        };
      }

      res.json({
        success: true,
        data: {
          hasPermission,
          subscription: {
            planId: subscription.plan_id,
            features: features[resource] || [],
            limits: limits[resource] || null,
          },
          usage: usageInfo,
        },
      });
    } catch (error) {
      logger.error("Error checking permissions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check permissions",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  }
);

// Get user's current permissions summary
router.get(
  "/permissions/summary",
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const userId = (req as any).user?.id;

      const result = await query(
        `SELECT 
        p.name as plan_name,
        p.features,
        p.limits
       FROM subscriptions s
       JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            hasSubscription: false,
            permissions: {},
            limits: {},
          },
        });
      }

      const plan = result.rows[0];

      return res.json({
        success: true,
        data: {
          hasSubscription: true,
          planName: plan.plan_name,
          permissions: plan.features || {},
          limits: plan.limits || {},
        },
      });
    } catch (error) {
      logger.error("Error fetching permissions summary:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch permissions summary",
        code: "PERMISSIONS_SUMMARY_ERROR",
      });
    }
  }
);

// =============================================================================
// USAGE TRACKING
// =============================================================================

// Track resource usage (called by other services)
router.post("/usage/track", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = (req as any).user?.id;
    const { resource, action, quantity = 1, metadata = {} } = req.body;

    // Record usage
    await query(
      `INSERT INTO resource_usage (user_id, resource, action, quantity, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, resource, action, quantity, JSON.stringify(metadata)]
    );

    return res.json({
      success: true,
      message: "Usage tracked successfully",
    });
  } catch (error) {
    logger.error("Error tracking usage:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to track usage",
      code: "USAGE_TRACK_ERROR",
    });
  }
});

// Get usage statistics for current month
router.get("/usage/current", authMiddleware, async (req: any, res: any) => {
  try {
    const userId = (req as any).user?.id;

    const result = await query(
      `SELECT 
        resource,
        action,
        SUM(quantity) as total_usage
       FROM resource_usage 
       WHERE user_id = $1 
       AND created_at >= DATE_TRUNC('month', NOW())
       GROUP BY resource, action
       ORDER BY resource, action`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error("Error fetching usage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch usage statistics",
      code: "USAGE_FETCH_ERROR",
    });
  }
});

export default router;
