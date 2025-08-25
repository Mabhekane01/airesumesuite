import { Pool, PoolConfig, PoolClient, QueryResult } from "pg";
import Redis from "redis";
import { logger } from "@/utils/logger";
import { config } from "./environment";

// Database configuration
const dbConfig: PoolConfig = {
  host: config["DB_HOST"],
  port: config["DB_PORT"],
  database: config["DB_NAME"],
  user: config["DB_USER"],
  password: config["DB_PASSWORD"],
  max: config["DB_MAX_CONNECTIONS"],
  idleTimeoutMillis: config["DB_IDLE_TIMEOUT"],
  connectionTimeoutMillis: config["DB_CONNECTION_TIMEOUT"],
  ssl:
    config["NODE_ENV"] === "production" ? { rejectUnauthorized: false } : false,
};

// Redis configuration
const redisConfig = {
  host: config["REDIS_HOST"],
  port: config["REDIS_PORT"],
  password: config["REDIS_PASSWORD"] || undefined,
  db: config["REDIS_DB"],
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);

// Create Redis client
export const redis = Redis.createClient(redisConfig);

// Database connection event handlers
pool.on("connect", () => {
  logger.info("New client connected to PostgreSQL");
});

pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", err);
});

pool.on("acquire", () => {
  logger.debug("Client acquired from pool");
});

pool.on("release", () => {
  logger.debug("Client released back to pool");
});

// Redis connection event handlers
redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

redis.on("ready", () => {
  logger.info("Redis is ready");
});

redis.on("end", () => {
  logger.info("Redis connection ended");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down database connections...");

  try {
    await pool.end();
    await redis.quit();
    logger.info("Database connections closed gracefully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down database connections...");

  try {
    await pool.end();
    await redis.quit();
    logger.info("Database connections closed gracefully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Database utility functions
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const query = async (
  text: string,
  params?: any[]
): Promise<QueryResult> => {
  const client = await pool.connect();

  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Health check functions
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await query("SELECT 1");
    return result.rows[0]["?column?"] === 1;
  } catch (error) {
    logger.error("Database health check failed:", error);
    return false;
  }
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error("Redis health check failed:", error);
    return false;
  }
};

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error("PostgreSQL connection failed");
    }
    logger.info("PostgreSQL connection established");

    // Test Redis connection
    const redisHealthy = await checkRedisHealth();
    if (!redisHealthy) {
      throw new Error("Redis connection failed");
    }
    logger.info("Redis connection established");

    logger.info("Database initialization completed successfully");
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw error;
  }
};

export default {
  pool,
  redis,
  withTransaction,
  query,
  getClient,
  checkDatabaseHealth,
  checkRedisHealth,
  initializeDatabase,
};
