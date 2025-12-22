import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from './auth';

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://localhost:3000',
      'https://localhost:5173',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean) as string[];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

// Helmet security configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.openai.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request ID middleware for tracking
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potential XSS vectors
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// SQL injection prevention (for raw queries)
export const preventSQLInjection = (input: string): boolean => {
  const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)|(-{2}|\/\*|\*\/|;|'|"|`)/gi;
  return !sqlInjectionPattern.test(input);
};

// NoSQL injection prevention
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          return false; // Potential NoSQL injection
        }
        if (!checkObject(obj[key])) {
          return false;
        }
      }
    }
    return true;
  };

  if (req.body && !checkObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request format detected'
    });
  }

  if (req.query && !checkObject(req.query)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid query format detected'
    });
  }

  next();
};

// File upload security
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (req.file || req.files) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const validateFile = (file: Express.Multer.File) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error(`File type ${file.mimetype} is not allowed`);
      }
      
      if (file.size > maxFileSize) {
        throw new Error('File size exceeds limit (10MB)');
      }

      // Check for potential malicious file extensions
      const dangerousExtensions = ['.exe', '.bat', '.com', '.scr', '.pif', '.vbs', '.js'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      
      if (dangerousExtensions.includes(fileExtension)) {
        throw new Error('File extension not allowed');
      }
    };

    try {
      if (req.file) {
        validateFile(req.file);
      }
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach(validateFile);
        } else {
          Object.values(req.files).flat().forEach(validateFile);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
  }

  next();
};

// API key validation
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  // In production, validate against database
  const validApiKeys = [
    process.env.ADMIN_API_KEY,
    process.env.SERVICE_API_KEY
  ].filter(Boolean);

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  // Add API key info to request
  req.apiKey = {
    key: apiKey,
    type: apiKey === process.env.ADMIN_API_KEY ? 'admin' : 'service'
  };

  next();
};

// CSRF protection for state-changing operations
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token validation failed'
      });
    }
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return res.status(500).json({
      success: false,
      message: 'Session not available'
    });
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

// Audit logging middleware
export const auditLog = (action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(body) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log the action
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        action,
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        statusCode,
        duration,
        success: statusCode < 400
      };

      console.log('AUDIT:', JSON.stringify(logEntry));

      // In production, send to centralized logging service
      // await auditLogger.log(logEntry);

      return originalSend.call(this, body);
    };

    next();
  };
};

// Sensitive data masking
export const maskSensitiveData = (data: any): any => {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'bankAccount'
  ];

  const maskValue = (value: any, key: string): any => {
    if (typeof value === 'string' && sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      return '*'.repeat(value.length);
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item, index) => maskValue(item, `${key}[${index}]`));
      } else {
        const masked: any = {};
        for (const [k, v] of Object.entries(value)) {
          masked[k] = maskValue(v, k);
        }
        return masked;
      }
    }
    
    return value;
  };

  return maskValue(data, '');
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server identification
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add cache control for sensitive endpoints
  if (req.path.includes('/auth') || req.path.includes('/profile')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

// Validation schemas for common security checks
export const securePasswordValidation = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
];

export const secureEmailValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email too long')
];

// Error handler that doesn't leak sensitive information
export const secureErrorHandler = (err: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log the full error for debugging
  console.error('Error:', {
    requestId: req.requestId,
    error: isDevelopment ? err : err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Don't leak sensitive error information in production
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && !isDevelopment 
    ? 'Internal server error' 
    : err.message || 'An error occurred';

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(isDevelopment && { stack: err.stack })
  });
};