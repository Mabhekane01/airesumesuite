import { Pool, PoolClient } from "pg";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    pool = new Pool({
      host: process.env["DB_HOST"] || "localhost",
      port: parseInt(process.env["DB_PORT"] || "5432"),
      database: process.env["DB_NAME"] || "ai_job_suite_auth",
      user: process.env["DB_USER"] || "postgres",
      password: process.env["DB_PASSWORD"] || "password",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();

    logger.info("✅ PostgreSQL connected successfully");
  } catch (error) {
    logger.error("❌ PostgreSQL connection failed:", error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      logger.info("✅ PostgreSQL disconnected successfully");
    }
  } catch (error) {
    logger.error("❌ PostgreSQL disconnection error:", error);
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  if (!pool) {
    throw new Error("Database not connected");
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error("Query error:", { text, params, error });
    throw error;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  if (!pool) {
    throw new Error("Database not connected");
  }
  return pool.connect();
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error("Database not connected");
  }
  return pool;
};
