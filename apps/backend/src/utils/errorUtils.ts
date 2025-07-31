import { Response } from "express";

export const handleControllerError = (
  res: Response,
  error: any,
  message: string = "An error occurred"
): void => {
  console.error(`Error: ${message}`, error);

  // Check if error has a specific status code
  const statusCode = error?.statusCode || error?.status || 500;

  // Extract error message
  let errorMessage = message;
  if (error?.message) {
    errorMessage = `${message}: ${error.message}`;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(process.env.NODE_ENV === "development" && { details: error?.stack }),
  });
};

export const createError = (message: string, statusCode: number = 500) => {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  return error;
};

export const isValidationError = (error: any): boolean => {
  return error?.name === "ValidationError" || error?.statusCode === 400;
};

export const isNotFoundError = (error: any): boolean => {
  return error?.statusCode === 404 || error?.message?.includes("not found");
};

export const isAuthError = (error: any): boolean => {
  return error?.statusCode === 401 || error?.statusCode === 403;
};
