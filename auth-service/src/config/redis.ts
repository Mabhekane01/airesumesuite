import { createClient, RedisClientType } from "redis";
import { logger } from "../utils/logger";

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env["REDIS_URL"] || "redis://localhost:6379",
      socket: {
        connectTimeout: 10000,
      },
    });

    redisClient.on("error", (err: Error) => {
      logger.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      logger.info("✅ Redis connected successfully");
    });

    redisClient.on("ready", () => {
      logger.info("✅ Redis ready for commands");
    });

    await redisClient.connect();
  } catch (error) {
    logger.error("❌ Redis connection failed:", error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info("✅ Redis disconnected successfully");
    }
  } catch (error) {
    logger.error("❌ Redis disconnection error:", error);
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

// For backward compatibility
export { redisClient };
