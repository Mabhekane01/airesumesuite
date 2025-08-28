import { Request, Response, NextFunction } from "express";
import { query } from "../config/database";
import { logger } from "../utils/logger";

// Extend Request interface to include session user info
export interface SessionRequest extends Request {
  sessionUser?: {
    id: string;
    email: string;
    organizationId: string | null;
    role: string;
    serviceType: string;
  };
}

// =============================================================================
// SESSION MANAGEMENT MIDDLEWARE
// =============================================================================

/**
 * Middleware to validate and enhance session data
 * Ensures proper session isolation between organizations
 */
export const sessionValidation = async (
  req: SessionRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return next();
    }

    const userId = (req.session as any).userId;

    // Get user details with organization info
    const userResult = await query(
      `SELECT u.id, u.email, u.organization_id, u.role, u.service_type, u.is_active,
              o.name as org_name, o.slug as org_slug, o.is_active as org_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1 AND u.is_active = true`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) {
          logger.error("Error destroying invalid session:", err);
        }
      });
      return next();
    }

    const user = userResult.rows[0];

    // Check if organization is still active
    if (user.organization_id && !user.org_active) {
      logger.warn("User organization is inactive, moving to default org", {
        userId: user.id,
        organizationId: user.organization_id,
      });

      // Move user to default organization
      const defaultOrg = await query(
        "SELECT id FROM organizations WHERE slug = 'default' AND is_active = true",
        []
      );

      if (defaultOrg.rows.length > 0) {
        await query(
          "UPDATE users SET organization_id = $1, role = 'user' WHERE id = $2",
          [defaultOrg.rows[0].id, user.id]
        );
        user.organization_id = defaultOrg.rows[0].id;
        user.role = "user";
      } else {
        user.organization_id = null;
        user.role = "user";
      }
    }

    // Add user info to request
    req.sessionUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      role: user.role,
      serviceType: user.service_type,
    };

    // Update last activity
    await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      user.id,
    ]);

    next();
  } catch (error) {
    logger.error("Session validation error:", error);
    next();
  }
};

/**
 * Middleware to ensure user belongs to specific organization
 */
export const requireOrganizationAccess = (organizationId?: string) => {
  return async (
    req: SessionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      if (!req.sessionUser) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      const targetOrgId = organizationId || req.params["organizationId"];

      if (!targetOrgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID required",
          code: "ORGANIZATION_ID_REQUIRED",
        });
      }

      // Check if user belongs to this organization
      if (req.sessionUser.organizationId !== targetOrgId) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this organization",
          code: "ORGANIZATION_ACCESS_DENIED",
        });
      }

      next();
    } catch (error) {
      logger.error("Organization access check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
};

/**
 * Middleware to require specific role in organization
 */
export const requireRole = (requiredRole: string | string[]) => {
  return async (
    req: SessionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      if (!req.sessionUser) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userRole = req.sessionUser.role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          required: roles,
          current: userRole,
        });
      }

      next();
    } catch (error) {
      logger.error("Role check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
};

/**
 * Middleware to handle cross-organization requests
 * Useful for admin operations across multiple organizations
 */
export const crossOrganizationAccess = async (
  req: SessionRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    if (!req.sessionUser) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Only allow cross-organization access for system admins
    if (req.sessionUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Cross-organization access requires admin privileges",
        code: "CROSS_ORG_ACCESS_DENIED",
      });
    }

    // Check if user has cross-organization permissions
    const permissionsResult = await query(
      `SELECT settings FROM users WHERE id = $1`,
      [req.sessionUser.id]
    );

    if (permissionsResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    const userSettings = permissionsResult.rows[0].settings || {};

    if (!userSettings.crossOrganizationAccess) {
      return res.status(403).json({
        success: false,
        message: "Cross-organization access not enabled",
        code: "CROSS_ORG_ACCESS_DISABLED",
      });
    }

    next();
  } catch (error) {
    logger.error("Cross-organization access check error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Middleware to track session activity for analytics
 */
export const sessionActivityTracking = async (
  req: SessionRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.sessionUser) {
      // Track session activity asynchronously
      setImmediate(async () => {
        try {
          await query(
            `INSERT INTO security_events (user_id, event_type, ip_address, user_agent, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              req.sessionUser!.id,
              "session_activity",
              req.ip,
              req.get("User-Agent"),
              {
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString(),
              },
            ]
          );
        } catch (error) {
          logger.error("Failed to track session activity:", error);
        }
      });
    }

    next();
  } catch (error) {
    // Don't block the request if tracking fails
    logger.error("Session activity tracking error:", error);
    next();
  }
};

/**
 * Middleware to enforce session limits per organization
 */
export const enforceSessionLimits = async (
  req: SessionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.sessionUser?.organizationId) {
      return next();
    }

    const organizationId = req.sessionUser.organizationId;

    // Get organization session limits
    const orgResult = await query(
      `SELECT o.max_users, o.settings, sp.limits
       FROM organizations o
       LEFT JOIN subscription_plans sp ON o.subscription_plan_id = sp.id
       WHERE o.id = $1`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return next();
    }

    const org = orgResult.rows[0];
    const orgSettings = org.settings || {};
    const planLimits = org.limits || {};

    // Get current active sessions for this organization
    const activeSessionsResult = await query(
      `SELECT COUNT(DISTINCT u.id) as active_users
       FROM users u
       WHERE u.organization_id = $1 AND u.is_active = true
       AND u.last_login_at > NOW() - INTERVAL '30 minutes'`,
      [organizationId]
    );

    const activeUsers = parseInt(activeSessionsResult.rows[0].active_users);
    const maxConcurrentUsers =
      orgSettings.maxConcurrentUsers ||
      planLimits.concurrent_users ||
      org.max_users;

    if (activeUsers >= maxConcurrentUsers) {
      res.status(429).json({
        success: false,
        message: "Organization concurrent user limit reached",
        code: "CONCURRENT_USER_LIMIT_EXCEEDED",
        current: activeUsers,
        limit: maxConcurrentUsers,
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("Session limit enforcement error:", error);
    // Allow the request to proceed if limit checking fails
    next();
  }
};

/**
 * Middleware to handle session cleanup and maintenance
 */
export const sessionMaintenance = async (
  _req: SessionRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Clean up expired sessions periodically (every 100th request)
    if (Math.random() < 0.01) {
      setImmediate(async () => {
        try {
          // Clean up expired sessions in database
          await query("DELETE FROM sessions WHERE expires_at < NOW()");

          // Clean up old security events
          await query(
            "DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days'"
          );

          logger.info("Session maintenance completed");
        } catch (error) {
          logger.error("Session maintenance error:", error);
        }
      });
    }

    next();
  } catch (error) {
    logger.error("Session maintenance error:", error);
    next();
  }
};

export default {
  sessionValidation,
  requireOrganizationAccess,
  requireRole,
  crossOrganizationAccess,
  sessionActivityTracking,
  enforceSessionLimits,
  sessionMaintenance,
};
