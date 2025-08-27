import { Request, Response, NextFunction } from "express";
import { UserService } from "@/services/userService";
import { logger } from "@/utils/logger";
import { config } from "@/config/environment";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId?: string;
    permissions: string[];
    subscriptionTier: string;
  };
}

export class AuthMiddleware {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Verify JWT token and attach user to request
   */
  authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          message: "Authorization header required",
          code: "AUTHORIZATION_HEADER_MISSING",
        });
        return;
      }

      const token = authHeader.substring(7);

      try {
        const decoded = this.userService.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired token",
          code: "INVALID_TOKEN",
        });
      }
    } catch (error) {
      logger.error("Authentication middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Authentication failed",
        code: "AUTHENTICATION_ERROR",
      });
    }
  };

  /**
   * Check if user has specific permission
   */
  requirePermission = (permission: string) => {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
          });
          return;
        }

        const hasPermission = await this.userService.hasPermission(
          req.user.id,
          permission
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            message: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
            requiredPermission: permission,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error("Permission check error:", error);
        res.status(500).json({
          success: false,
          message: "Permission check failed",
          code: "PERMISSION_CHECK_ERROR",
        });
      }
    };
  };

  /**
   * Check if user has any of the required permissions
   */
  requireAnyPermission = (permissions: string[]) => {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
          });
          return;
        }

        const hasAnyPermission = await Promise.any(
          permissions.map((permission) =>
            this.userService.hasPermission(req.user!.id, permission)
          )
        );

        if (!hasAnyPermission) {
          res.status(403).json({
            success: false,
            message: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
            requiredPermissions: permissions,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error("Permission check error:", error);
        res.status(500).json({
          success: false,
          message: "Permission check failed",
          code: "PERMISSION_CHECK_ERROR",
        });
      }
    };
  };

  /**
   * Check if user has all required permissions
   */
  requireAllPermissions = (permissions: string[]) => {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
          });
          return;
        }

        const permissionChecks = await Promise.all(
          permissions.map((permission) =>
            this.userService.hasPermission(req.user!.id, permission)
          )
        );

        const hasAllPermissions = permissionChecks.every(Boolean);

        if (!hasAllPermissions) {
          res.status(403).json({
            success: false,
            message: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
            requiredPermissions: permissions,
          });
          return;
        }

        next();
      } catch (error) {
        logger.error("Permission check error:", error);
        res.status(500).json({
          success: false,
          message: "Permission check failed",
          code: "PERMISSION_CHECK_ERROR",
        });
      }
    };
  };

  /**
   * Check if user is organization member
   */
  requireOrganizationMember = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      if (!req.user.organizationId) {
        res.status(403).json({
          success: false,
          message: "Organization membership required",
          code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Organization membership check error:", error);
      res.status(500).json({
        success: false,
        message: "Organization membership check failed",
        code: "ORGANIZATION_CHECK_ERROR",
      });
    }
  };

  /**
   * Check if user is organization admin or owner
   */
  requireOrganizationAdmin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      if (!req.user.organizationId) {
        res.status(403).json({
          success: false,
          message: "Organization membership required",
          code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
        });
        return;
      }

      const isAdmin = req.user.permissions.some((permission) =>
        ["admin", "manage_organization", "manage_members"].includes(permission)
      );

      if (!isAdmin) {
        res.status(403).json({
          success: false,
          message: "Admin permissions required",
          code: "ADMIN_PERMISSIONS_REQUIRED",
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Admin permission check error:", error);
      res.status(500).json({
        success: false,
        message: "Admin permission check failed",
        code: "ADMIN_CHECK_ERROR",
      });
    }
  };

  /**
   * Optional authentication - attach user if token is valid
   */
  optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        try {
          const decoded = this.userService.verifyToken(token);
          req.user = decoded;
        } catch (error) {
          // Token is invalid, but we continue without authentication
          logger.debug("Optional auth: invalid token, continuing without user");
        }
      }

      next();
    } catch (error) {
      logger.error("Optional authentication error:", error);
      // Continue without authentication
      next();
    }
  };

  /**
   * Rate limiting based on user subscription tier
   */
  subscriptionRateLimit = (
    freeLimit: number,
    proLimit: number,
    enterpriseLimit: number
  ) => {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        if (!req.user) {
          // Apply free tier limits to unauthenticated users
          // This would integrate with your rate limiting service
          next();
          return;
        }

        const limits = {
          free: freeLimit,
          pro: proLimit,
          enterprise: enterpriseLimit,
        };

        const userLimit =
          limits[req.user.subscriptionTier as keyof typeof limits] || freeLimit;

        // This would integrate with your rate limiting service
        // For now, we just pass through
        next();
      } catch (error) {
        logger.error("Subscription rate limit error:", error);
        next();
      }
    };
  };
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();
