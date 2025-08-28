import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../config/redis";
import { logger } from "../utils/logger";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  handler?: (req: Request, res: Response) => void; // Custom error handler
  standardHeaders?: boolean; // Return rate limit info in headers
  legacyHeaders?: boolean; // Return rate limit info in legacy headers
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests per window default
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
      ...config,
    };
  }

  /**
   * Create rate limiting middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const redis = getRedisClient();
        if (!redis) {
          logger.warn("Redis not available, skipping rate limiting");
          return next();
        }

        const key = this.config.keyGenerator!(req);
        const windowKey = `rate_limit:${key}:${Math.floor(Date.now() / this.config.windowMs)}`;

        // Get current count
        const currentCount = await redis.get(windowKey);
        const count = currentCount ? parseInt(currentCount) : 0;

        // Check if limit exceeded
        if (count >= this.config.maxRequests) {
          const resetTime =
            (Math.floor(Date.now() / this.config.windowMs) + 1) *
            this.config.windowMs;
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

          // Set headers
          if (this.config.standardHeaders) {
            res.set("X-RateLimit-Limit", this.config.maxRequests.toString());
            res.set("X-RateLimit-Remaining", "0");
            res.set("X-RateLimit-Reset", new Date(resetTime).toISOString());
            res.set("Retry-After", retryAfter.toString());
          }

          if (this.config.legacyHeaders) {
            res.set("X-RateLimit-Limit", this.config.maxRequests.toString());
            res.set("X-RateLimit-Remaining", "0");
            res.set(
              "X-RateLimit-Reset",
              Math.floor(resetTime / 1000).toString()
            );
          }

          // Handle rate limit exceeded
          if (this.config.handler) {
            return this.config.handler(req, res);
          }

          return res.status(429).json({
            success: false,
            message: "Too many requests, please try again later",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter,
            resetTime: new Date(resetTime).toISOString(),
          });
        }

        // Increment counter
        await redis.incr(windowKey);
        await redis.expire(windowKey, Math.ceil(this.config.windowMs / 1000));

        // Set headers
        if (this.config.standardHeaders) {
          res.set("X-RateLimit-Limit", this.config.maxRequests.toString());
          res.set(
            "X-RateLimit-Remaining",
            (this.config.maxRequests - count - 1).toString()
          );
          res.set(
            "X-RateLimit-Reset",
            new Date(
              (Math.floor(Date.now() / this.config.windowMs) + 1) *
                this.config.windowMs
            ).toISOString()
          );
        }

        if (this.config.legacyHeaders) {
          res.set("X-RateLimit-Limit", this.config.maxRequests.toString());
          res.set(
            "X-RateLimit-Remaining",
            (this.config.maxRequests - count - 1).toString()
          );
          res.set(
            "X-RateLimit-Reset",
            Math.floor(
              ((Math.floor(Date.now() / this.config.windowMs) + 1) *
                this.config.windowMs) /
                1000
            ).toString()
          );
        }

        // Track successful/failed requests if configured
        if (
          this.config.skipSuccessfulRequests ||
          this.config.skipFailedRequests
        ) {
          const originalSend = res.send;
          res.send = function (body: any) {
            const statusCode = res.statusCode;
            const isSuccess = statusCode >= 200 && statusCode < 400;

            if (
              (isSuccess && this.config.skipSuccessfulRequests) ||
              (!isSuccess && this.config.skipFailedRequests)
            ) {
              // Decrement counter for skipped requests
              redis
                .decr(windowKey)
                .catch((err) =>
                  logger.error("Failed to decrement rate limit counter", err)
                );
            }

            return originalSend.call(this, body);
          }.bind(this);
        }

        next();
      } catch (error) {
        logger.error("Rate limiting error", { error, path: req.path });
        // Continue without rate limiting on error
        next();
      }
    };
  }

  /**
   * Default key generator based on IP and user agent
   */
  private defaultKeyGenerator(req: Request): string {
    const identifier = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";
    return `${identifier}:${userAgent}`;
  }

  /**
   * Create user-specific rate limiter
   */
  static userSpecific(config: Omit<RateLimitConfig, "keyGenerator">) {
    return new RateLimiter({
      ...config,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id || "anonymous";
        return `user:${userId}`;
      },
    });
  }

  /**
   * Create IP-based rate limiter
   */
  static ipBased(config: Omit<RateLimitConfig, "keyGenerator">) {
    return new RateLimiter({
      ...config,
      keyGenerator: (req: Request) => {
        return req.ip || req.connection.remoteAddress || "unknown";
      },
    });
  }

  /**
   * Create endpoint-specific rate limiter
   */
  static endpointSpecific(config: Omit<RateLimitConfig, "keyGenerator">) {
    return new RateLimiter({
      ...config,
      keyGenerator: (req: Request) => {
        const identifier = req.ip || req.connection.remoteAddress || "unknown";
        return `${identifier}:${req.method}:${req.path}`;
      },
    });
  }
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Global rate limiting
  global: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  }),

  // Authentication endpoints (stricter but more forgiving)
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Increased from 5 to 10 for slow devices
    skipSuccessfulRequests: true,
  }),

  // API endpoints
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  // User-specific actions (more forgiving for slow devices)
  userActions: RateLimiter.userSpecific({
    windowMs: 2 * 60 * 1000, // 2 minutes (increased from 1 minute)
    maxRequests: 50, // Increased from 30 to 50
  }),

  // File uploads (more forgiving for slow connections)
  fileUpload: RateLimiter.userSpecific({
    windowMs: 2 * 60 * 1000, // 2 minutes (increased from 1 minute)
    maxRequests: 20, // Increased from 10 to 20
  }),
};
