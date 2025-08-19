import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    subscriptionTier: string;
  };
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authorization header is required'
      });
      return;
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token is required'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    if (!decoded || !decoded.userId || !decoded.email) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
      return;
    }

    // Add user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      subscriptionTier: decoded.subscriptionTier || 'free'
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
      return;
    }

    logger.error('Authentication middleware error', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    if (decoded && decoded.userId && decoded.email) {
      // Add user information to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        subscriptionTier: decoded.subscriptionTier || 'free'
      };
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.warn('Optional authentication failed', { 
      error: error instanceof Error ? error.message : String(error)
    });
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.subscriptionTier)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this operation'
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.subscriptionTier !== 'enterprise') {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};