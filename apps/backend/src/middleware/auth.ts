import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: (user as any)._id.toString(),
      email: user.email,
      tier: user.tier || 'free',
      role: user.role || 'user'
    };
    
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid access token' });
  }
};

// Admin requirement middleware
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Admin permissions required' 
    });
  }

  next();
};

// Permission middleware for enterprise features
export const requirePermissions = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // For now, just check if user is authenticated
    // In a real implementation, you would check actual permissions
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // TODO: Implement actual permission checking logic here
    // For now, allow all authenticated users
    return next();
  };
};

// Subscription requirement middleware - creates middleware that checks for specific subscription tiers
export const requireSubscription = (tier: 'free' | 'premium' | 'enterprise') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const user = await User.findById(req.user.id).select('tier');
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const userTier = user.tier || 'free';
      
      // Define tier hierarchy: free < premium < enterprise
      const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
      const requiredLevel = tierHierarchy[tier];
      const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a ${tier} subscription`,
          code: 'SUBSCRIPTION_REQUIRED',
          data: {
            currentTier: userTier,
            requiredTier: tier,
            upgradeUrl: '/dashboard/upgrade'
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal server error during subscription validation',
        code: 'SUBSCRIPTION_VALIDATION_ERROR'
      });
    }
  };
};

export const optionalAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = {
          id: (user as any)._id.toString(),
          email: user.email,
          tier: user.tier || 'free',
          role: (user as any).role || 'user'
        };
      }
    }
    
    return next();
  } catch (error) {
    // If token is invalid or expired, just ignore and proceed as a guest
    return next();
  }
};

export { authMiddleware as authenticateToken };