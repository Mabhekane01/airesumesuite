import { getRedisClient } from "../config/redis";
import { logger } from "../utils/logger";
import crypto from "crypto";

export interface SessionData {
  userId: string;
  email: string;
  serviceType: string;
  organizationId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  locationInfo?: Record<string, any>;
  lastActivity: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  sessionsByUser: Record<string, number>;
}

export class SessionService {
  private static readonly SESSION_PREFIX = "session:";
  private static readonly USER_SESSIONS_PREFIX = "user_sessions:";
  private static readonly SESSION_EXPIRY = 24 * 60 * 60; // 24 hours
  private static readonly MAX_SESSIONS_PER_USER = 5;
  private static readonly ACTIVITY_TIMEOUT = 60 * 60; // 60 minutes (increased for slow devices)

  /**
   * Create a new session
   */
  static async createSession(
    userId: string,
    sessionData: Partial<SessionData>
  ): Promise<{
    sessionId: string;
    sessionToken: string;
    refreshToken: string;
  }> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      // Check user session limit
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const currentSessions = await redis.smembers(userSessionsKey);

      if (currentSessions.length >= this.MAX_SESSIONS_PER_USER) {
        // Remove oldest session
        const oldestSession = currentSessions[0];
        await this.removeSession(oldestSession);
        await redis.srem(userSessionsKey, oldestSession);
      }

      // Generate session data
      const sessionId = crypto.randomUUID();
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const refreshToken = crypto.randomBytes(32).toString("hex");
      const now = Date.now();

      const session: SessionData = {
        userId,
        email: sessionData.email || "",
        serviceType: sessionData.serviceType || "ai-resume",
        organizationId: sessionData.organizationId,
        role: sessionData.role,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        deviceInfo: sessionData.deviceInfo || {},
        locationInfo: sessionData.locationInfo || {},
        lastActivity: now,
        expiresAt: now + this.SESSION_EXPIRY * 1000,
        metadata: sessionData.metadata || {},
      };

      // Store session in Redis
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redis.setex(
        sessionKey,
        this.SESSION_EXPIRY,
        JSON.stringify(session)
      );

      // Store session token mapping
      const tokenKey = `${this.SESSION_PREFIX}token:${sessionToken}`;
      await redis.setex(tokenKey, this.SESSION_EXPIRY, sessionId);

      // Store refresh token mapping
      const refreshKey = `${this.SESSION_PREFIX}refresh:${refreshToken}`;
      await redis.setex(refreshKey, this.SESSION_EXPIRY, sessionId);

      // Add to user's sessions set
      await redis.sadd(userSessionsKey, sessionId);
      await redis.expire(userSessionsKey, this.SESSION_EXPIRY);

      logger.info("Session created", { sessionId, userId });
      return { sessionId, sessionToken, refreshToken };
    } catch (error) {
      logger.error("Session creation failed", { userId, error });
      throw error;
    }
  }

  /**
   * Get session by token
   */
  static async getSessionByToken(
    sessionToken: string
  ): Promise<SessionData | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const tokenKey = `${this.SESSION_PREFIX}token:${sessionToken}`;
      const sessionId = await redis.get(tokenKey);

      if (!sessionId) {
        return null;
      }

      return await this.getSessionById(sessionId);
    } catch (error) {
      logger.error("Session retrieval by token failed", { error });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  static async getSessionById(sessionId: string): Promise<SessionData | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = await redis.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      const session: SessionData = JSON.parse(sessionData);

      // Check if expired
      if (Date.now() > session.expiresAt) {
        await this.removeSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error("Session retrieval by ID failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession(refreshToken: string): Promise<{
    sessionId: string;
    sessionToken: string;
    refreshToken: string;
  } | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const refreshKey = `${this.SESSION_PREFIX}refresh:${refreshToken}`;
      const sessionId = await redis.get(refreshKey);

      if (!sessionId) {
        return null;
      }

      const session = await this.getSessionById(sessionId);
      if (!session) {
        return null;
      }

      // Remove old session
      await this.removeSession(sessionId);

      // Create new session
      return await this.createSession(session.userId, {
        email: session.email,
        serviceType: session.serviceType,
        organizationId: session.organizationId,
        role: session.role,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo,
        locationInfo: session.locationInfo,
        metadata: session.metadata,
      });
    } catch (error) {
      logger.error("Session refresh failed", { error });
      throw error;
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return;
      }

      session.lastActivity = Date.now();
      session.expiresAt = Date.now() + this.SESSION_EXPIRY * 1000;

      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redis.setex(
        sessionKey,
        this.SESSION_EXPIRY,
        JSON.stringify(session)
      );

      logger.debug("Session activity updated", { sessionId });
    } catch (error) {
      logger.error("Session activity update failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Remove session
   */
  static async removeSession(sessionId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        return;
      }

      // Remove session data
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redis.del(sessionKey);

      // Remove from user's sessions set
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`;
      await redis.srem(userSessionsKey, sessionId);

      logger.info("Session removed", { sessionId, userId: session.userId });
    } catch (error) {
      logger.error("Session removal failed", { sessionId, error });
      throw error;
    }
  }

  /**
   * Remove all user sessions
   */
  static async removeAllUserSessions(userId: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);

      let removedCount = 0;
      for (const sessionId of sessionIds) {
        await this.removeSession(sessionId);
        removedCount++;
      }

      logger.info("All user sessions removed", { userId, removedCount });
      return removedCount;
    } catch (error) {
      logger.error("User sessions removal failed", { userId, error });
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<SessionStats> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const sessionKeys = await redis.keys(`${this.SESSION_PREFIX}*`);
      const userSessionKeys = await redis.keys(`${this.USER_SESSIONS_PREFIX}*`);

      let totalSessions = 0;
      let activeSessions = 0;
      let expiredSessions = 0;
      const sessionsByUser: Record<string, number> = {};

      // Count sessions by user
      for (const key of userSessionKeys) {
        const userId = key.replace(this.USER_SESSIONS_PREFIX, "");
        const sessionIds = await redis.smembers(key);
        sessionsByUser[userId] = sessionIds.length;
        totalSessions += sessionIds.length;
      }

      // Check session status
      for (const key of sessionKeys) {
        if (key.includes(":token:") || key.includes(":refresh:")) continue;

        const sessionId = key.replace(this.SESSION_PREFIX, "");
        const session = await this.getSessionById(sessionId);

        if (session) {
          activeSessions++;
        } else {
          expiredSessions++;
        }
      }

      return {
        totalSessions,
        activeSessions,
        expiredSessions,
        sessionsByUser,
      };
    } catch (error) {
      logger.error("Session stats retrieval failed", { error });
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const sessionKeys = await redis.keys(`${this.SESSION_PREFIX}*`);
      let cleanedCount = 0;

      for (const key of sessionKeys) {
        if (key.includes(":token:") || key.includes(":refresh:")) continue;

        const sessionId = key.replace(this.SESSION_PREFIX, "");
        const session = await this.getSessionById(sessionId);

        if (!session) {
          await this.removeSession(sessionId);
          cleanedCount++;
        }
      }

      logger.info("Expired sessions cleaned up", { cleanedCount });
      return cleanedCount;
    } catch (error) {
      logger.error("Session cleanup failed", { error });
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis client not available");
    }

    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);

      const sessions: SessionData[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.getSessionById(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      logger.error("User sessions retrieval failed", { userId, error });
      throw error;
    }
  }
}
