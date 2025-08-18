import { Request, Response, NextFunction } from 'express';
import { logger, logSecurity } from '@/utils/logger';
import axios from 'axios';
import { config } from '@/config/environment';
import { TokenPayload, verifyToken } from '@/utils/jwt';
import { query } from '@/config/database';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        organizationId?: string;
        subscriptionTier?: string;
        tier?: string; // AI Resume Suite uses 'tier' instead of 'subscriptionTier'
      };
    }
  }
}

// AI Resume Suite JWT verification
const verifyAIResumeToken = async (token: string): Promise<any> => {
  try {
    // Call AI Resume Suite's token verification endpoint
    const response = await axios.get(`${config.AI_RESUME_SERVICE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 5000,
    });
    
    return response.data.user;
  } catch (error) {
    logger.error('AI Resume Suite token verification failed:', error);
    throw new Error('Invalid token');
  }
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

// Main authentication middleware that integrates with AI Resume Suite
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      return;
    }
    
    // Verify token with AI Resume Suite
    const aiResumeUser = await verifyAIResumeToken(token);
    
    if (!aiResumeUser) {
      logSecurity('Authentication failed - invalid AI Resume Suite token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      return;
    }
    
    // Map AI Resume Suite user to document manager format
    req.user = {
      id: aiResumeUser.id,
      email: aiResumeUser.email,
      role: 'user', // Default role
      subscriptionTier: aiResumeUser.tier || 'free',
      tier: aiResumeUser.tier || 'free'
    };
    
    // Check if user exists in document manager database, create if not
    await ensureUserExists(req.user);
    
    next();
  } catch (error: any) {
    logSecurity('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    if (error.message === 'Token expired') {
      res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    
    if (error.message === 'Invalid token') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
      return;
    }
    
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Ensure user exists in document manager database
const ensureUserExists = async (user: any): Promise<void> => {
  try {
    const { query } = await import('@/config/database');
    
    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE id = $1',
      [user.id]
    );
    
    if (existingUser.rows.length === 0) {
      // Create user in document manager database
      await query(`
        INSERT INTO users (id, email, name, subscription_tier, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        user.id,
        user.email,
        user.email.split('@')[0], // Use email prefix as name if no name provided
        user.tier || 'free'
      ]);
      
      logger.info('Created document manager user from AI Resume Suite', {
        userId: user.id,
        email: user.email,
        tier: user.tier
      });
    } else {
      // Update subscription tier in case it changed
      await query(`
        UPDATE users 
        SET subscription_tier = $1, updated_at = NOW()
        WHERE id = $2
      `, [user.tier || 'free', user.id]);
    }
  } catch (error) {
    logger.error('Failed to ensure user exists:', error);
    // Don't throw - continue with authentication
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      next();
      return;
    }
    
    const decoded: TokenPayload = verifyToken(token);
    
    const userResult = await query(
      'SELECT id, email, subscription_tier FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
        subscriptionTier: user.subscription_tier
      };
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors in optional middleware
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }
    
    const userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      logSecurity('Authorization failed - insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        ip: req.ip,
        path: req.path
      });
      
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }
    
    next();
  };
};

// Subscription tier authorization (integrates with AI Resume Suite tiers)
export const requireSubscription = (requiredTiers: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }
    
    // Use both tier and subscriptionTier for compatibility
    const userTier = req.user.tier || req.user.subscriptionTier || 'free';
    
    // Map AI Resume Suite tiers to document manager requirements
    const tierMapping: Record<string, string[]> = {
      'free': ['free'],
      'premium': ['free', 'pro', 'premium'], // AI Resume Suite premium = document manager pro
      'enterprise': ['free', 'pro', 'premium', 'enterprise']
    };
    
    const userAllowedTiers = tierMapping[userTier] || ['free'];
    const hasAccess = requiredTiers.some(tier => userAllowedTiers.includes(tier));
    
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Subscription upgrade required',
        code: 'SUBSCRIPTION_REQUIRED',
        data: {
          currentTier: userTier,
          requiredTiers,
          upgradeUrl: `${config.FRONTEND_URL}/upgrade`
        }
      });
      return;
    }
    
    next();
  };
};

// Organization membership middleware
export const requireOrganizationAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }
    
    const organizationId = req.params.organizationId || req.body.organizationId;
    
    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID required',
        code: 'ORGANIZATION_ID_REQUIRED'
      });
      return;
    }
    
    // Check if user is member of the organization
    const memberResult = await query(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [organizationId, req.user.id]
    );
    
    if (memberResult.rows.length === 0) {
      logSecurity('Organization access denied', {
        userId: req.user.id,
        organizationId,
        ip: req.ip,
        path: req.path
      });
      
      res.status(403).json({
        success: false,
        message: 'Organization access denied',
        code: 'ORGANIZATION_ACCESS_DENIED'
      });
      return;
    }
    
    // Add organization role to user context
    req.user.role = memberResult.rows[0].role;
    req.user.organizationId = organizationId;
    
    next();
  } catch (error) {
    logger.error('Organization access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Document ownership middleware
export const requireDocumentAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }
    
    const documentId = req.params.documentId || req.params.id;
    
    if (!documentId) {
      res.status(400).json({
        success: false,
        message: 'Document ID required',
        code: 'DOCUMENT_ID_REQUIRED'
      });
      return;
    }
    
    // Check if user owns the document or has organization access
    const documentResult = await query(`
      SELECT d.id, d.user_id, d.organization_id 
      FROM documents d 
      WHERE d.id = $1 AND (
        d.user_id = $2 OR 
        d.organization_id IN (
          SELECT organization_id 
          FROM organization_members 
          WHERE user_id = $2
        )
      )
    `, [documentId, req.user.id]);
    
    if (documentResult.rows.length === 0) {
      logSecurity('Document access denied', {
        userId: req.user.id,
        documentId,
        ip: req.ip,
        path: req.path
      });
      
      res.status(403).json({
        success: false,
        message: 'Document access denied',
        code: 'DOCUMENT_ACCESS_DENIED'
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Document access check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

export default {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireSubscription,
  requireOrganizationAccess,
  requireDocumentAccess,
};