import { Router } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";
import { query } from "../config/database";
import { logger } from "../utils/logger";
import { validateServiceKey } from "../middleware/serviceAuth";

const router: Router = Router();

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

const tokenValidation = [body("token").isString().isLength({ min: 1 })];

const permissionCheckValidation = [
  body("userId").isString().isLength({ min: 1 }),
  body("resource").isString().isLength({ min: 1 }),
  body("action").isString().isLength({ min: 1 }),
];

const usageTrackingValidation = [
  body("userId").isString().isLength({ min: 1 }),
  body("resource").isString().isLength({ min: 1 }),
  body("action").isString().isLength({ min: 1 }),
  body("quantity").optional().isInt({ min: 1 }),
  body("metadata").optional().isObject(),
];

const documentPermissionValidation = [
  body("userId").isString().isLength({ min: 1 }),
  body("documentId").optional().isString().isLength({ min: 1 }),
  body("folderId").optional().isString().isLength({ min: 1 }),
  body("action").isString().isLength({ min: 1 }),
  body("permissionLevel").optional().isString().isIn(["view", "edit", "admin"]),
];

const collaborationValidation = [
  body("userId").isString().isLength({ min: 1 }),
  body("resourceId").isString().isLength({ min: 1 }),
  body("resourceType").isString().isIn(["document", "folder", "workspace"]),
  body("action").isString().isLength({ min: 1 }),
  body("collaboratorId").optional().isString().isLength({ min: 1 }),
];

// =============================================================================
// TOKEN VALIDATION (for other services)
// =============================================================================

// Validate JWT token and return user info
router.post(
  "/validate-token",
  validateServiceKey,
  tokenValidation,
  async (req: any, res: any) => {
    try {
      const { token } = req.body;

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env["JWT_SECRET"] || "your-jwt-secret"
      ) as any;

      if (!decoded || !decoded.id || !decoded.email) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }

      // Get user details from database
      const userResult = await query(
        `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.service_type,
        u.is_active,
        u.created_at,
        s.status as subscription_status,
        p.name as plan_name,
        p.features,
        p.limits
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
       LEFT JOIN subscription_plans p ON s.plan_id = p.id
       WHERE u.id = $1`,
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: "User account is inactive",
          code: "USER_INACTIVE",
        });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            serviceType: user.service_type,
            isActive: user.is_active,
            createdAt: user.created_at,
          },
          subscription: {
            status: user.subscription_status,
            planName: user.plan_name,
            features: user.features || {},
            limits: user.limits || {},
          },
          token: {
            issuedAt: decoded.iat,
            expiresAt: decoded.exp,
          },
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }

      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
          code: "TOKEN_EXPIRED",
        });
      }

      logger.error("Token validation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during token validation",
        code: "TOKEN_VALIDATION_ERROR",
      });
    }
  }
);

// =============================================================================
// PERMISSION CHECKING (for other services)
// =============================================================================

// Check if user has permission for a specific resource/action
router.post(
  "/check-permission",
  validateServiceKey,
  permissionCheckValidation,
  async (req: any, res: any) => {
    try {
      const { userId, resource, action } = req.body;

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
            usage: null,
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
          canProceed:
            parseInt(usageResult.rows[0].usage_count) < limits[resource],
        };
      }

      return res.json({
        success: true,
        data: {
          hasPermission,
          subscription: {
            planId: subscription.plan_id,
            features: features[resource] || [],
            limits: limits[resource] || null,
          },
          usage: usageInfo,
          canProceed: hasPermission && (!usageInfo || usageInfo.canProceed),
        },
      });
    } catch (error) {
      logger.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check permission",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  }
);

// Get user's permissions summary
router.get(
  "/user-permissions/:userId",
  validateServiceKey,
  async (req: any, res: any) => {
    try {
      const { userId } = req.params;

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

      res.json({
        success: true,
        data: {
          hasSubscription: true,
          planName: plan.plan_name,
          permissions: plan.features || {},
          limits: plan.limits || {},
        },
      });
    } catch (error) {
      logger.error("Error fetching user permissions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user permissions",
        code: "USER_PERMISSIONS_ERROR",
      });
    }
  }
);

// =============================================================================
// USAGE TRACKING (for other services)
// =============================================================================

// Track resource usage from other services
router.post(
  "/track-usage",
  validateServiceKey,
  usageTrackingValidation,
  async (req: any, res: any) => {
    try {
      const {
        userId,
        resource,
        action,
        quantity = 1,
        metadata = {},
      } = req.body;

      // Record usage
      await query(
        `INSERT INTO resource_usage (user_id, resource, action, quantity, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
        [userId, resource, action, quantity, JSON.stringify(metadata)]
      );

      // Log the tracking event
      logger.info("Resource usage tracked", {
        userId,
        resource,
        action,
        quantity,
        service: req.headers["x-service-name"] || "unknown",
      });

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
  }
);

// Get user's current month usage
router.get(
  "/user-usage/:userId",
  validateServiceKey,
  async (req: any, res: any) => {
    try {
      const { userId } = req.params;

      const result = await query(
        `SELECT 
        resource,
        action,
        SUM(quantity) as total_usage,
        COUNT(*) as action_count
       FROM resource_usage 
       WHERE user_id = $1 
       AND created_at >= DATE_TRUNC('month', NOW())
       GROUP BY resource, action
       ORDER BY resource, action`,
        [userId]
      );

      return res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Error fetching user usage:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user usage",
        code: "USER_USAGE_ERROR",
      });
    }
  }
);

// =============================================================================
// BULK OPERATIONS (for other services)
// =============================================================================

// Bulk permission check for multiple users
router.post(
  "/bulk-permissions",
  validateServiceKey,
  async (req: any, res: any) => {
    try {
      const { checks } = req.body;

      if (!Array.isArray(checks) || checks.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Checks array is required",
          code: "INVALID_INPUT",
        });
      }

      const results = [];

      for (const check of checks) {
        const { userId, resource, action } = check;

        try {
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
            results.push({
              userId,
              resource,
              action,
              hasPermission: false,
              reason: "No active subscription",
            });
            continue;
          }

          const subscription = subResult.rows[0];
          const features = subscription.features || {};
          const hasPermission =
            features[resource] && features[resource].includes(action);

          results.push({
            userId,
            resource,
            action,
            hasPermission,
            planId: subscription.plan_id,
          });
        } catch {
          results.push({
            userId,
            resource,
            action,
            hasPermission: false,
            error: "Failed to check permission",
          });
        }
      }

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error("Bulk permissions check error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check bulk permissions",
        code: "BULK_PERMISSIONS_ERROR",
      });
    }
  }
);

// =============================================================================
// DOCUMENT SERVICE SPECIFIC ENDPOINTS
// =============================================================================

// Check document-specific permissions
router.post(
  "/document-permissions",
  validateServiceKey,
  documentPermissionValidation,
  async (req: any, res: any) => {
    try {
      const { userId, documentId, folderId, action, permissionLevel } =
        req.body;

      // Get user's subscription and permissions
      const result = await query(
        `SELECT 
           s.status as subscription_status,
           sp.features,
           sp.limits
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE u.id = $1 AND u.is_active = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const userData = result.rows[0];
      const features = userData.features || {};

      // Check document management permissions
      const hasDocumentPermission =
        features.document_management?.includes(action) ||
        features.document_management?.includes("*");

      // Check specific document permissions if documentId is provided
      let hasSpecificPermission = hasDocumentPermission;
      if (documentId && permissionLevel) {
        const specificPermission =
          features.document_permissions?.[documentId]?.[permissionLevel];
        hasSpecificPermission =
          hasSpecificPermission &&
          (specificPermission || permissionLevel === "view");
      }

      // Check folder permissions if folderId is provided
      let hasFolderPermission = hasDocumentPermission;
      if (folderId && permissionLevel) {
        const folderPermission =
          features.folder_permissions?.[folderId]?.[permissionLevel];
        hasFolderPermission =
          hasFolderPermission &&
          (folderPermission || permissionLevel === "view");
      }

      return res.json({
        success: true,
        data: {
          hasPermission: hasSpecificPermission && hasFolderPermission,
          documentPermission: hasSpecificPermission,
          folderPermission: hasFolderPermission,
          userFeatures: features,
          action,
          permissionLevel,
        },
      });
    } catch (error) {
      logger.error("Document permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check document permissions",
        code: "DOCUMENT_PERMISSION_ERROR",
      });
    }
  }
);

// Check collaboration permissions
router.post(
  "/collaboration-permissions",
  validateServiceKey,
  collaborationValidation,
  async (req: any, res: any) => {
    try {
      const { userId, resourceId, resourceType, action, collaboratorId } =
        req.body;

      // Get user's subscription and permissions
      const result = await query(
        `SELECT 
           s.status as subscription_status,
           sp.features,
           sp.limits
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE u.id = $1 AND u.is_active = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const userData = result.rows[0];
      const features = userData.features || {};
      const limits = userData.limits || {};

      // Check collaboration permissions
      const hasCollaborationPermission =
        features.collaboration?.includes(action) ||
        features.collaboration?.includes("*");

      // Check if user can invite collaborators
      const canInvite =
        features.collaboration?.includes("invite") ||
        features.collaboration?.includes("*");

      // Check collaboration limits
      let withinLimits = true;
      if (limits.collaboration_users && limits.collaboration_users !== -1) {
        const currentCollaborators = await query(
          `SELECT COUNT(*) as count FROM user_organizations 
           WHERE organization_id = (SELECT organization_id FROM users WHERE id = $1)`,
          [userId]
        );
        withinLimits =
          parseInt(currentCollaborators.rows[0].count) <
          limits.collaboration_users;
      }

      return res.json({
        success: true,
        data: {
          hasPermission: hasCollaborationPermission && withinLimits,
          canInvite,
          withinLimits,
          userFeatures: features,
          limits: limits,
          action,
          resourceType,
        },
      });
    } catch (error) {
      logger.error("Collaboration permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check collaboration permissions",
        code: "COLLABORATION_PERMISSION_ERROR",
      });
    }
  }
);

// Get document service capabilities for a user
router.get(
  "/document-capabilities/:userId",
  validateServiceKey,
  async (req: any, res: any) => {
    try {
      const { userId } = req.params;

      const result = await query(
        `SELECT 
           u.service_type,
           s.status as subscription_status,
           sp.name as plan_name,
           sp.features,
           sp.limits
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
         WHERE u.id = $1 AND u.is_active = true`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const userData = result.rows[0];
      const features = userData.features || {};
      const limits = userData.limits || {};

      // Check if user has access to document services
      const hasDocumentAccess =
        userData.service_type === "document-service" ||
        userData.service_type === "both";

      if (!hasDocumentAccess) {
        return res.status(403).json({
          success: false,
          message: "User does not have access to document services",
          code: "DOCUMENT_SERVICE_ACCESS_DENIED",
        });
      }

      return res.json({
        success: true,
        data: {
          serviceType: userData.service_type,
          subscriptionStatus: userData.subscription_status,
          planName: userData.plan_name,
          capabilities: {
            documentManagement: features.document_management || [],
            documentSharing: features.document_sharing || [],
            storage: features.storage || [],
            collaboration: features.collaboration || [],
            versionControl: features.document_version_control || [],
            folderManagement: features.folder_management || [],
          },
          limits: limits,
        },
      });
    } catch (error) {
      logger.error("Document capabilities check error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get document capabilities",
        code: "DOCUMENT_CAPABILITIES_ERROR",
      });
    }
  }
);

export default router;
