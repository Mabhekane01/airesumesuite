import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

// Create a standardized error
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
};

// Error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('API Error:', {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    details: error.details
  });
  
  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Determine error message
  let message = error.message;
  
  // Don't expose internal errors in production
  if (statusCode === 500 && config.NODE_ENV === 'production') {
    message = 'Internal server error';
  }
  
  // Create error response
  const errorResponse: any = {
    success: false,
    message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  };
  
  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }
  
  // Add error details in development
  if (config.NODE_ENV === 'development') {
    errorResponse.details = error.details;
    errorResponse.stack = error.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (errors: any[]): ApiError => {
  const message = errors.map(error => error.msg).join(', ');
  return createError(
    `Validation failed: ${message}`,
    400,
    'VALIDATION_ERROR',
    errors
  );
};

// Database error handler
export const databaseErrorHandler = (error: any): ApiError => {
  logger.error('Database error:', error);
  
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // Unique violation
      return createError(
        'Resource already exists',
        409,
        'DUPLICATE_RESOURCE',
        { constraint: error.constraint }
      );
    case '23503': // Foreign key violation
      return createError(
        'Referenced resource not found',
        400,
        'INVALID_REFERENCE',
        { constraint: error.constraint }
      );
    case '23502': // Not null violation
      return createError(
        'Required field missing',
        400,
        'MISSING_REQUIRED_FIELD',
        { column: error.column }
      );
    case '42P01': // Undefined table
      return createError(
        'Database table not found',
        500,
        'DATABASE_ERROR'
      );
    default:
      return createError(
        'Database operation failed',
        500,
        'DATABASE_ERROR'
      );
  }
};

// File upload error handler
export const fileUploadErrorHandler = (error: any): ApiError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return createError(
      'File size too large',
      413,
      'FILE_TOO_LARGE',
      { maxSize: error.limit }
    );
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return createError(
      'Too many files',
      413,
      'TOO_MANY_FILES',
      { maxCount: error.limit }
    );
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return createError(
      'Unexpected file field',
      400,
      'UNEXPECTED_FILE_FIELD',
      { fieldName: error.field }
    );
  }
  
  return createError(
    'File upload failed',
    400,
    'FILE_UPLOAD_ERROR',
    { originalError: error.message }
  );
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

export default {
  createError,
  errorHandler,
  asyncHandler,
  validationErrorHandler,
  databaseErrorHandler,
  fileUploadErrorHandler,
  notFoundHandler,
};