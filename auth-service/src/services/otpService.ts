import { getRedisClient } from "../config/redis";
import { logger } from "../utils/logger";
import crypto from "crypto";

export interface OTPData {
  code: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  type: string;
  metadata?: Record<string, any>;
}

export class OTPService {
  private static readonly OTP_PREFIX = "otp:";
  private static readonly RATE_LIMIT_PREFIX = "rate_limit:";
  private static readonly OTP_EXPIRY = 900; // 15 minutes (increased for slow devices)
  private static readonly RATE_LIMIT_WINDOW = 3600; // 1 hour
  private static readonly MAX_OTP_PER_HOUR = 5;

  /**
   * Generate and store OTP in Redis
   */
  static async generateOTP(
    identifier: string,
    type: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      // Check rate limiting
      const rateLimitKey = `${this.RATE_LIMIT_PREFIX}${identifier}:${type}`;
      const currentCount = await redis.get(rateLimitKey);

      if (currentCount && parseInt(currentCount) >= this.MAX_OTP_PER_HOUR) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }

      // Generate OTP
      const code = this.generateCode();
      const expiresAt = Date.now() + this.OTP_EXPIRY * 1000;

      const otpData: OTPData = {
        code,
        attempts: 0,
        maxAttempts: 3,
        expiresAt,
        type,
        metadata,
      };

      // Store OTP in Redis
      const otpKey = `${this.OTP_PREFIX}${identifier}:${type}`;
      await redis.setex(otpKey, this.OTP_EXPIRY, JSON.stringify(otpData));

      // Update rate limiting
      await redis.incr(rateLimitKey);
      await redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW);

      logger.info("OTP generated", { identifier, type, code });
      return code;
    } catch (error) {
      logger.error("OTP generation failed", { identifier, type, error });
      throw error;
    }
  }

  /**
   * Verify OTP from Redis
   */
  static async verifyOTP(
    identifier: string,
    type: string,
    code: string
  ): Promise<{ valid: boolean; attempts: number; maxAttempts: number }> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const otpKey = `${this.OTP_PREFIX}${identifier}:${type}`;
      const otpDataStr = await redis.get(otpKey);

      if (!otpDataStr) {
        return { valid: false, attempts: 0, maxAttempts: 0 };
      }

      const otpData: OTPData = JSON.parse(otpDataStr);

      // Check if expired
      if (Date.now() > otpData.expiresAt) {
        await redis.del(otpKey);
        return { valid: false, attempts: 0, maxAttempts: 0 };
      }

      // Check attempts
      if (otpData.attempts >= otpData.maxAttempts) {
        await redis.del(otpKey);
        return {
          valid: false,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
        };
      }

      // Verify code
      if (otpData.code === code) {
        await redis.del(otpKey);
        logger.info("OTP verified successfully", { identifier, type });
        return {
          valid: true,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
        };
      }

      // Increment attempts
      otpData.attempts++;
      await redis.setex(otpKey, this.OTP_EXPIRY, JSON.stringify(otpData));

      return {
        valid: false,
        attempts: otpData.attempts,
        maxAttempts: otpData.maxAttempts,
      };
    } catch (error) {
      logger.error("OTP verification failed", { identifier, type, error });
      throw error;
    }
  }

  /**
   * Invalidate OTP
   */
  static async invalidateOTP(identifier: string, type: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const otpKey = `${this.OTP_PREFIX}${identifier}:${type}`;
      await redis.del(otpKey);
      logger.info("OTP invalidated", { identifier, type });
    } catch (error) {
      logger.error("OTP invalidation failed", { identifier, type, error });
      throw error;
    }
  }

  /**
   * Get OTP status
   */
  static async getOTPStatus(
    identifier: string,
    type: string
  ): Promise<{
    exists: boolean;
    attempts: number;
    maxAttempts: number;
    expiresAt?: number;
  }> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const otpKey = `${this.OTP_PREFIX}${identifier}:${type}`;
      const otpDataStr = await redis.get(otpKey);

      if (!otpDataStr) {
        return { exists: false, attempts: 0, maxAttempts: 0 };
      }

      const otpData: OTPData = JSON.parse(otpDataStr);
      return {
        exists: true,
        attempts: otpData.attempts,
        maxAttempts: otpData.maxAttempts,
        expiresAt: otpData.expiresAt,
      };
    } catch (error) {
      logger.error("OTP status check failed", { identifier, type, error });
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (called periodically)
   */
  static async cleanupExpiredOTPs(): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const pattern = `${this.OTP_PREFIX}*`;
      const keys = await redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const otpDataStr = await redis.get(key);
        if (otpDataStr) {
          const otpData: OTPData = JSON.parse(otpDataStr);
          if (Date.now() > otpData.expiresAt) {
            await redis.del(key);
            cleanedCount++;
          }
        }
      }

      logger.info("Expired OTPs cleaned up", { cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error("OTP cleanup failed", { error });
      throw error;
    }
  }

  private static generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}
