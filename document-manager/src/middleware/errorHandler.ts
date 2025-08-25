import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

/**
 * Custom error class for operational errors
 */
export class OperationalError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly code: string | undefined;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "OperationalError";
    this.isOperational = true;
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OperationalError);
    }
  }
}

// Helper function to create operational errors
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string
): OperationalError => {
  return new OperationalError(message, statusCode, code);
};

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const code = error.code || "INTERNAL_ERROR";

  // Log error details
  logger.error("Application error", {
    error: error.message,
    stack: error.stack,
    statusCode,
    code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Don't leak error details in production
  const isProduction = process.env["NODE_ENV"] === "production";
  const errorResponse = {
    success: false,
    message:
      isProduction && statusCode === 500 ? "Internal server error" : message,
    ...(isProduction ? {} : { code, stack: error.stack }),
  };

  // Handle specific error types
  if (error.name === "ValidationError") {
    res.status(400).json({
      success: false,
      message: "Validation error",
      code: "VALIDATION_ERROR",
      details: error.message,
    });
    return;
  }

  if (error.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
      code: "INVALID_ID",
    });
    return;
  }

  if (error.name === "MongoError" || error.name === "MongoServerError") {
    if ((error as any).code === 11000) {
      res.status(409).json({
        success: false,
        message: "Duplicate key error",
        code: "DUPLICATE_KEY",
      });
      return;
    }
  }

  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
    return;
  }

  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    });
    return;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found middleware for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
    path: req.originalUrl,
  });
};

/**
 * Validation error handler
 */
export const validationErrorHandler = (errors: any[]) => {
  const error = new OperationalError(
    "Validation failed",
    400,
    "VALIDATION_ERROR"
  );

  // Add validation details to error
  (error as any).validationErrors = errors;

  throw error;
};

/**
 * Database connection error handler
 */
export const handleDatabaseError = (error: any): void => {
  logger.error("Database connection error", {
    error: error.message,
    stack: error.stack,
  });

  // In production, you might want to restart the service or alert administrators
  if (process.env["NODE_ENV"] === "production") {
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close database connections
  // Close Redis connections
  // Stop accepting new requests

  setTimeout(() => {
    logger.info("Graceful shutdown completed");
    process.exit(0);
  }, 10000); // 10 second timeout
};
