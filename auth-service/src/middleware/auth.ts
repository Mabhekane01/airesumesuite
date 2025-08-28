import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { query } from "../config/database";
import { logger } from "../utils/logger";

// Types and Interfaces
export interface AuthenticatedUser {
  id: string;
  email: string;
  serviceType: string;
  organizationId: string | null;
  role: string;
  tier?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Constants
const JWT_SECRET = process.env["JWT_SECRET"] || "your-jwt-secret";

const TIER_HIERARCHY = {
  free: 0,
  premium: 1,
  enterprise: 2,
} as const;

const ROLE_HIERARCHY = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
} as const;

type TierType = keyof typeof TIER_HIERARCHY;
type RoleType = keyof typeof ROLE_HIERARCHY;

// Utility Functions
const extractTokenFromHeader = (authHeader: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1] || null;
};

const verifyJWTToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw error; // Re-throw to be handled by caller
  }
};

const fetchUserData = async (userId: string) => {
  const result = await query(
    `SELECT 
       u.id, 
       u.email, 
       u.service_type, 
       u.organization_id, 
       u.role,
       u.tier,
       o.is_active as org_active
     FROM users u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1 AND u.is_active = true`,
    [userId]
  );

  return result.rows[0] || null;
};

const updateLastLogin = async (userId: string): Promise<void> => {
  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
};

// Main Authentication Middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;

    // Extract token from header
    const token = extractTokenFromHeader(authHeader || "");
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
        code: "TOKEN_REQUIRED",
      });
      return;
    }

    // Verify JWT token
    const decoded = verifyJWTToken(token);

    // Fetch user data
    const userData = await fetchUserData(decoded.id);
    if (!userData) {
      res.status(401).json({
        success: false,
        message: "User not found or inactive",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    // Check organization status
    if (userData.organization_id && !userData.org_active) {
      res.status(403).json({
        success: false,
        message: "User's organization is inactive",
        code: "ORGANIZATION_INACTIVE",
      });
      return;
    }

    // Attach user to request
    (req as any).user = {
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      serviceType: userData.service_type,
      organizationId: userData.organization_id,
      role: userData.role,
      tier: userData.tier,
      profile: userData.profile,

      lastKnownLocation: userData.last_known_location,
      twoFactorEnabled: userData.two_factor_enabled,
      isEmailVerified: userData.is_email_verified,
      provider: userData.provider,
      googleId: userData.google_id,
      subscriptionStatus: userData.subscription_status,
      subscriptionEndDate: userData.subscription_end_date,
      cancelAtPeriodEnd: userData.cancel_at_period_end,
      subscriptionPlanType: userData.subscription_plan_type,
      createdAt: userData.created_at,
      lastLoginAt: userData.last_login_at,
    };

    // Update last login (fire and forget)
    updateLastLogin(userData.id).catch((error) => {
      logger.warn("Failed to update last login:", error);
    });

    next();
  } catch (error) {
    // Handle JWT-specific errors
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
        code: "INVALID_TOKEN",
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
      return;
    }

    // Handle other errors
    logger.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

// Service Access Middleware
export const requireServiceAccess = (serviceType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedReq = req as any;
    if (!authenticatedReq.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const hasAccess =
      authenticatedReq.user.serviceType === serviceType ||
      authenticatedReq.user.serviceType === "both";

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Access denied. This endpoint requires ${serviceType} service access.`,
        code: "SERVICE_ACCESS_DENIED",
        data: {
          currentServiceType: (req as any).user?.serviceType,
          requiredServiceType: serviceType,
        },
      });
      return;
    }

    next();
  };
};

// Subscription Tier Middleware
export const requireSubscription = (minTier: TierType) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      const authenticatedReq = req as any;
      if (!authenticatedReq.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      // Use cached tier from user object if available
      let userTier: string;
      if (authenticatedReq.user.tier) {
        userTier = authenticatedReq.user.tier;
      } else {
        // Fallback to database query if tier not cached
        const result = await query(
          "SELECT tier FROM users WHERE id = $1 AND is_active = true",
          [authenticatedReq.user.id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: "User not found",
            code: "USER_NOT_FOUND",
          });
          return;
        }

        userTier = result.rows[0].tier || "free";
      }

      // Check tier hierarchy
      const requiredLevel = TIER_HIERARCHY[minTier];
      const userLevel = TIER_HIERARCHY[userTier as TierType] || 0;

      if (userLevel < requiredLevel) {
        res.status(403).json({
          success: false,
          message: `This feature requires a ${minTier} subscription`,
          code: "SUBSCRIPTION_REQUIRED",
          data: {
            currentTier: userTier,
            requiredTier: minTier,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Subscription check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
};

// Organization Access Middleware
export const requireOrganizationAccess = (minRole: RoleType) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      const authenticatedReq = req as any;
      if (!authenticatedReq.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      // Extract organization ID from params, body, or query
      const organizationId =
        req.params["organizationId"] ||
        req.body?.["organizationId"] ||
        req.query?.["organizationId"];

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: "Organization ID is required",
          code: "ORGANIZATION_ID_REQUIRED",
        });
        return;
      }

      // Check user's role in the organization
      const result = await query(
        `SELECT uo.role 
         FROM user_organizations uo
         INNER JOIN users u ON u.id = uo.user_id
         INNER JOIN organizations o ON o.id = uo.organization_id
         WHERE u.id = $1 
           AND uo.organization_id = $2 
           AND uo.is_active = true 
           AND u.is_active = true
           AND o.is_active = true`,
        [authenticatedReq.user.id, organizationId]
      );

      if (result.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this organization.",
          code: "ORGANIZATION_ACCESS_DENIED",
        });
        return;
      }

      const userRole = result.rows[0].role;

      // Check role hierarchy
      const requiredLevel = ROLE_HIERARCHY[minRole];
      const userLevel = ROLE_HIERARCHY[userRole as RoleType] || 0;

      if (userLevel < requiredLevel) {
        res.status(403).json({
          success: false,
          message: `This action requires ${minRole} role or higher`,
          code: "INSUFFICIENT_PERMISSIONS",
          data: {
            currentRole: userRole,
            requiredRole: minRole,
          },
        });
        return;
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

// Permission-based Access Control Middleware
export const requirePermission = (resource: string, action: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      const authenticatedReq = req as any;
      if (!authenticatedReq.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

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
        [authenticatedReq.user.id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      const userData = result.rows[0];
      const features = userData.features || {};
      const limits = userData.limits || {};

      // Check if user has the required permission
      const hasPermission =
        features[resource]?.includes(action) ||
        features[resource]?.includes("*") ||
        features["*"]?.includes("*");

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Access denied. This action requires ${action} permission on ${resource}`,
          code: "INSUFFICIENT_PERMISSIONS",
          data: {
            requiredResource: resource,
            requiredAction: action,
            userFeatures: features,
          },
        });
        return;
      }

      // Check usage limits if applicable
      if (limits[resource]) {
        const usageResult = await query(
          `SELECT usage_count, usage_limit
           FROM resource_usage
           WHERE user_id = $1 AND resource_type = $2 AND reset_date >= CURRENT_DATE`,
          [authenticatedReq.user.id, resource]
        );

        if (usageResult.rows.length > 0) {
          const usage = usageResult.rows[0];
          if (
            usage.usage_limit !== -1 &&
            usage.usage_count >= usage.usage_limit
          ) {
            res.status(429).json({
              success: false,
              message: `Usage limit exceeded for ${resource}`,
              code: "USAGE_LIMIT_EXCEEDED",
              data: {
                resource,
                currentUsage: usage.usage_count,
                limit: usage.usage_limit,
              },
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      logger.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
};

// Document Service Specific Middleware
export const requireDocumentPermission = (action: string) => {
  return requirePermission("document_management", action);
};

export const requireDocumentSharingPermission = (action: string) => {
  return requirePermission("document_sharing", action);
};

export const requireStoragePermission = (action: string) => {
  return requirePermission("storage", action);
};

export const requireCollaborationPermission = (action: string) => {
  return requirePermission("collaboration", action);
};

// Helper middleware for optional authentication
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader || "");

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = verifyJWTToken(token);
    const userData = await fetchUserData(decoded.id);

    if (userData && (!userData.organization_id || userData.org_active)) {
      (req as any).user = {
        id: userData.id,
        email: userData.email,
        serviceType: userData.service_type,
        organizationId: userData.organization_id,
        role: userData.role,
        tier: userData.tier,
      };
    }
  } catch (error) {
    // Silent fail for optional auth
    logger.debug("Optional auth failed:", error);
  }

  next();
};

// Combine multiple middleware functions
export const combineMiddleware = (...middlewares: any[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const executeMiddleware = (index: number) => {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index];
      middleware(req, res, (err?: any) => {
        if (err) {
          return next(err);
        }
        executeMiddleware(index + 1);
      });
    };

    executeMiddleware(0);
  };
};
