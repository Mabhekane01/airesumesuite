import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    subscriptionTier: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || "your-secret-key";

    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
        return;
      }

      // Add user information to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name || "Unknown User",
        subscriptionTier: decoded.subscriptionTier || "free",
      };

      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

export const requireSubscription = (minTier: string | string[] = "pro") => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const tierOrder = ["free", "pro", "enterprise"];
    const userTierIndex = tierOrder.indexOf(req.user.subscriptionTier);

    if (Array.isArray(minTier)) {
      // Check if user has any of the required tiers
      const hasRequiredTier = minTier.some((tier) => {
        const requiredTierIndex = tierOrder.indexOf(tier);
        return userTierIndex >= requiredTierIndex;
      });

      if (!hasRequiredTier) {
        res.status(403).json({
          success: false,
          message: `${minTier.join(" or ")} subscription or higher required`,
        });
        return;
      }
    } else {
      // Check if user has the minimum required tier
      const minTierIndex = tierOrder.indexOf(minTier);

      if (userTierIndex < minTierIndex) {
        res.status(403).json({
          success: false,
          message: `${minTier} subscription or higher required`,
        });
        return;
      }
    }

    next();
  };
};








