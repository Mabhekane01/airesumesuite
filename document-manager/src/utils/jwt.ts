import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { logger } from './logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export interface ApiTokenPayload {
  userId: string;
  apiKeyId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
      algorithm: 'HS256'
    });
  } catch (error) {
    logger.error('JWT generation error:', error);
    throw new Error('Failed to generate token');
  }
};

// Generate API token (longer expiry)
export const generateApiToken = (payload: Omit<ApiTokenPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: '365d', // API tokens are long-lived
      issuer: 'document-manager',
      audience: 'document-manager-api',
    });
  } catch (error) {
    logger.error('API JWT generation error:', error);
    throw new Error('Failed to generate API token');
  }
};

// Verify JWT token
export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'document-manager',
      audience: 'document-manager-client',
    }) as TokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not active yet');
    } else {
      logger.error('JWT verification error:', error);
      throw new Error('Token verification failed');
    }
  }
};

// Verify API token
export const verifyApiToken = (token: string): ApiTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'document-manager',
      audience: 'document-manager-api',
    }) as ApiTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid API token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('API token expired');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('API token not active yet');
    } else {
      logger.error('API JWT verification error:', error);
      throw new Error('API token verification failed');
    }
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('JWT decode error:', error);
    return null;
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  try {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.JWT_SECRET,
      {
        expiresIn: '30d',
        issuer: 'document-manager',
        audience: 'document-manager-refresh',
      }
    );
  } catch (error) {
    logger.error('Refresh token generation error:', error);
    throw new Error('Failed to generate refresh token');
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'document-manager',
      audience: 'document-manager-refresh',
    }) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else {
      logger.error('Refresh token verification error:', error);
      throw new Error('Refresh token verification failed');
    }
  }
};

export default {
  generateToken,
  generateApiToken,
  verifyToken,
  verifyApiToken,
  decodeToken,
  extractTokenFromHeader,
  generateRefreshToken,
  verifyRefreshToken,
};