import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
    permissions: string[];
  };
  requestId?: string;
  startTime?: number;
}

class EnterpriseLogger {
  info(message: string, meta?: any) {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, meta || '');
  }

  warn(message: string, meta?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, { 
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...meta 
    });
  }
}

export const enterpriseLogger = new EnterpriseLogger();

// Request ID generation middleware
export const requestIdMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.startTime = Date.now();
  
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Request logging middleware
export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  enterpriseLogger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ipAddress: getClientIP(req),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    enterpriseLogger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Audit logging middleware
export const auditLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const auditableEvents = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const auditablePaths = ['/api/settings/user', '/api/settings/profile', '/api/settings/system'];

    const shouldAudit = auditableEvents.includes(req.method) || 
      auditablePaths.some(path => req.originalUrl.includes(path));

    if (shouldAudit) {
      const auditEvent = {
        eventType: 'api_call',
        userId: req.user?.id,
        action: `${req.method}_${req.originalUrl}`,
        result: res.statusCode < 400 ? 'success' : 'failure',
        ipAddress: getClientIP(req),
        timestamp: new Date(),
        requestId: req.requestId || 'unknown'
      };

      enterpriseLogger.info('Audit event', auditEvent);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Security monitoring middleware
export const securityMonitor = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const ipAddress = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';

  // Detect suspicious patterns - refined to reduce false positives
  const suspiciousPatterns = {
    sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|WHERE|INTO|VALUES)\b)/i,
    xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    pathTraversal: /\.\.[\/\\]|(\.\.\/){2,}/,
    commandInjection: /[;&|`]\s*(?:ls|cat|rm|mkdir|chmod|curl|wget|nc|bash|sh|cmd|powershell)/i
  };

  // Check request content for suspicious patterns
  const checkContent = (content: any): string[] => {
    const findings: string[] = [];
    const contentStr = JSON.stringify(content || {});

    for (const [type, pattern] of Object.entries(suspiciousPatterns)) {
      if (pattern.test(contentStr)) {
        findings.push(type);
      }
    }

    return findings;
  };

  const suspiciousFindings = [
    ...checkContent(req.body),
    ...checkContent(req.query),
    ...checkContent(req.params)
  ];

  if (suspiciousFindings.length > 0) {
    enterpriseLogger.warn('Suspicious request content detected', {
      requestId: req.requestId,
      findings: suspiciousFindings,
      ipAddress,
      userAgent,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id
    });
  }

  // Detect bot traffic
  if (req.headers['user-agent']?.includes('bot') || 
      req.headers['user-agent']?.includes('crawler') ||
      req.headers['user-agent']?.includes('spider')) {
    enterpriseLogger.info('Bot traffic detected', {
      requestId: req.requestId,
      ipAddress,
      userAgent,
      url: req.originalUrl
    });
  }

  next();
};

// Comprehensive error handler
export const errorHandler = (error: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const context = {
    requestId: req.requestId || 'unknown',
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl,
    ipAddress: getClientIP(req),
    timestamp: new Date()
  };

  enterpriseLogger.error(`${error.name || 'Error'}: ${error.message}`, error, context);

  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let userMessage = 'An internal server error occurred';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    userMessage = 'Invalid input data';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    userMessage = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    userMessage = 'Database operation failed';
  } else if (error.status === 429) {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    userMessage = 'Too many requests, please try again later';
  } else if (error.status === 403) {
    statusCode = 403;
    errorCode = 'INSUFFICIENT_PERMISSIONS';
    userMessage = 'Insufficient permissions to perform this action';
  } else if (error.status === 401) {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_REQUIRED';
    userMessage = 'Authentication required';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    userMessage = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    userMessage = 'Authentication token has expired';
  }

  const errorResponse: any = {
    success: false,
    error: userMessage,
    code: errorCode,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    if (error.errors) {
      errorResponse.details = error.errors;
    }
    if (error.stack) {
      errorResponse.stack = error.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  enterpriseLogger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ipAddress: getClientIP(req)
  });

  res.status(404).json({
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
    requestId: (req as AuthenticatedRequest).requestId,
    timestamp: new Date().toISOString()
  });
};

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
};

// Helper function
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.headers['x-real-ip'] as string ||
         req.connection.remoteAddress ||
         'unknown';
}

export default {
  enterpriseLogger,
  requestIdMiddleware,
  requestLogger,
  auditLogger,
  securityMonitor,
  errorHandler,
  notFoundHandler,
  healthCheck
};