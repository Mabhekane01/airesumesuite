import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface ServiceRequest extends Request {
  serviceName?: string;
  serviceId?: string;
}

/**
 * Middleware to validate service-to-service authentication
 * Uses X-Service-Key header for secure inter-service communication
 */
export const validateServiceKey = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const serviceKey = req.headers["x-service-key"] as string;
    const serviceName = req.headers["x-service-name"] as string;

    if (!serviceKey) {
      logger.warn("Service authentication failed: Missing service key", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });

      res.status(401).json({
        success: false,
        message: "Service authentication required",
        code: "SERVICE_AUTH_REQUIRED",
      });
      return;
    }

    // Validate service key against environment variable
    const validServiceKey = process.env["INTERNAL_SERVICE_KEY"];

    if (!validServiceKey || serviceKey !== validServiceKey) {
      logger.warn("Service authentication failed: Invalid service key", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        serviceName,
      });

      res.status(401).json({
        success: false,
        message: "Invalid service key",
        code: "INVALID_SERVICE_KEY",
      });
      return;
    }

    // Add service information to request
    req.serviceName = serviceName || "unknown";
    req.serviceId = serviceKey.substring(0, 8); // Use first 8 chars as service ID

    logger.debug("Service authentication successful", {
      serviceName: req.serviceName,
      serviceId: req.serviceId,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error("Service authentication middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during service authentication",
      code: "SERVICE_AUTH_ERROR",
    });
  }
};

/**
 * Optional service authentication - doesn't fail if no key provided
 * Useful for endpoints that can be called by both services and external clients
 */
export const optionalServiceAuth = (
  req: ServiceRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const serviceKey = req.headers["x-service-key"] as string;
    const serviceName = req.headers["x-service-name"] as string;

    if (serviceKey) {
      const validServiceKey = process.env["INTERNAL_SERVICE_KEY"];

      if (validServiceKey && serviceKey === validServiceKey) {
        req.serviceName = serviceName || "unknown";
        req.serviceId = serviceKey.substring(0, 8);

        logger.debug("Optional service authentication successful", {
          serviceName: req.serviceName,
          serviceId: req.serviceId,
          path: req.path,
        });
      }
    }

    next();
  } catch (error) {
    logger.warn("Optional service authentication failed", {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });
    next();
  }
};
