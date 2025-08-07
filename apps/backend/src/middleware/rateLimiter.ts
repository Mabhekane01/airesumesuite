import rateLimit, { ValueDeterminingMiddleware } from 'express-rate-limit';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from './auth';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts from this IP, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// AI/Expensive operations rate limiter
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Limit each IP to 200 AI requests per hour
  message: {
    success: false,
    message: 'AI service rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'AI service rate limit exceeded, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 upload requests per windowMs
  message: {
    success: false,
    message: 'Too many file upload attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many file upload attempts from this IP, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// API key rate limiter (higher limits for authenticated API access)
export const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each API key to 5000 requests per windowMs
  keyGenerator: (req: Request) => {
    // Use API key if available, otherwise fall back to IP
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  message: {
    success: false,
    message: 'API rate limit exceeded for this key.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded for this key, please try again later.',
      retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
    });
  }
});

// User-specific rate limiter (for authenticated requests)
export const createUserLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        return authReq.user.id;
      }
      return req.ip || 'unknown';
    },
    message: {
      success: false,
      message: 'User rate limit exceeded.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'User rate limit exceeded, please try again later.',
        retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
      });
    }
  });
};

// AI limiter with tier-based limits
export const createAITieredLimiter = () => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      // For now, give enterprise users higher limits
      // TODO: Implement proper tier detection from user model
      return 500; // Higher limit for all authenticated users
    },
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id || req.ip || 'unknown';
    },
    message: {
      success: false,
      message: 'AI service rate limit exceeded for your account.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'AI service rate limit exceeded, please try again later.',
        retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined
      });
    }
  });
};

// Advanced rate limiter with dynamic limits based on user tier
export const createTieredLimiter = (
  baseLimits: { free: number; premium: number; enterprise: number },
  windowMs: number = 15 * 60 * 1000
) => {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      const userTier = 'free'; // Default tier since tier is not in user type
      return baseLimits[userTier as keyof typeof baseLimits] || baseLimits.free;
    },
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.id || req.ip || 'unknown';
    },
    message: {
      success: false,
      message: 'Rate limit exceeded for your subscription tier.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const userTier = 'free'; // Default tier
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for ${userTier} tier, please upgrade or try again later.`,
        retryAfter: req.rateLimit ? Math.round(req.rateLimit.resetTime / 1000) : undefined,
        currentTier: userTier,
        upgradeInfo: userTier === 'free' ? 'Upgrade to Premium for higher limits' : null
      });
    }
  });
};