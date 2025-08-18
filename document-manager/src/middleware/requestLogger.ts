import { Request, Response, NextFunction } from 'express';
import { logRequest } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Generate unique request ID
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start (excluding sensitive paths)
  const shouldLog = !req.path.includes('/health') && !req.path.includes('/favicon.ico');
  
  if (shouldLog) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} - ${requestId}`);
  }
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;
    
    if (shouldLog) {
      logRequest(req, res, responseTime);
    }
    
    // Call original end function
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  next();
};

export default requestLogger;