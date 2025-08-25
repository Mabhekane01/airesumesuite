import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const code = error.code || "INTERNAL_ERROR";

  // Log error
  console.error("Error:", {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(statusCode).json({
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
  });
};



