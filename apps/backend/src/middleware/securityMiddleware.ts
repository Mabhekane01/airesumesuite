import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { securityService } from '../services/securityService';
import { logger } from '../utils/logger';

// CSRF Protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for webhook endpoints
  if (req.path.includes('/webhook')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken as string;

  if (!token || !sessionToken || !securityService.verifyCSRFToken(token, sessionToken)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
};

// Security Headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

// CORS Configuration
export const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'Cache-Control'
  ],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400 // 24 hours
});

// IP Whitelist/Blacklist
export const ipFilter = async (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if IP is blacklisted
  try {
    const isBlacklisted = await checkBlacklistedIP(clientIP);
    if (isBlacklisted) {
      await securityService.logSecurityEvent({
        ip: clientIP,
        userAgent: req.get('User-Agent') || 'unknown',
        event: 'blacklisted_ip_access_attempt',
        severity: 'high',
        metadata: { endpoint: req.path, method: req.method }
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  } catch (error) {
    logger.error('IP filter check failed:', error);
  }

  next();
};

// Request Size Limits
export const requestSizeLimits = {
  // General API requests
  general: '10mb',
  // File uploads
  upload: '50mb',
  // Payment requests (smaller for security)
  payment: '1mb'
};

// Request Validation
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for suspicious patterns in URL
  if (containsSuspiciousPatterns(req.url)) {
    securityService.logSecurityEvent({
      userId: req.user?.userId,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      event: 'suspicious_url_pattern',
      severity: 'medium',
      metadata: { url: req.url, method: req.method }
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request'
    });
  }

  // Check request headers for suspicious content
  const userAgent = req.get('User-Agent') || '';
  if (isSuspiciousUserAgent(userAgent)) {
    securityService.logSecurityEvent({
      userId: req.user?.userId,
      ip: req.ip || 'unknown',
      userAgent,
      event: 'suspicious_user_agent',
      severity: 'low',
      metadata: { userAgent }
    });
  }

  next();
};

// Helper functions
async function checkBlacklistedIP(ip: string): Promise<boolean> {
  // Implementation would check database for blacklisted IPs
  // This is a simplified version
  return false;
}

function containsSuspiciousPatterns(url: string): boolean {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /\/etc\/passwd/,  // Linux system files
    /\/proc\//,  // Linux proc filesystem
    /\\windows\\/i,  // Windows paths
    /script.*src/i,  // Script injection
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\(/i,  // Code injection
    /exec\(/i,  // Command injection
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousUAs = [
    'curl',
    'wget',
    'python-requests',
    'python-urllib',
    'bot',
    'spider',
    'crawler'
  ];

  const lowerUA = userAgent.toLowerCase();
  return suspiciousUAs.some(ua => lowerUA.includes(ua));
}

// Rate limiters using express-rate-limit
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts
  message: 'Too many payment attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});