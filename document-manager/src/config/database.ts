import { Pool, PoolConfig } from 'pg';
import Redis from 'redis';
import { logger } from '@/utils/logger';

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'document_manager',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);

// Create Redis client
export const redis = Redis.createClient(redisConfig);

// Database connection event handlers
pool.on('connect', (client) => {
  logger.info('New client connected to PostgreSQL');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pool.on('release', (client) => {
  logger.debug('Client released back to pool');
});

// Redis connection event handlers
redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('ready', () => {
  logger.info('Redis is ready');
});

redis.on('end', () => {
  logger.info('Redis connection ended');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connections...');
  
  try {
    await pool.end();
    await redis.quit();
    logger.info('Database connections closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connections...');
  
  try {
    await pool.end();
    await redis.quit();
    logger.info('Database connections closed gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Database utility functions
export const withTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export const getClient = async () => {
  return await pool.connect();
};

// Health check functions
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT 1');
    return result.rows[0]['?column?'] === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      throw new Error('PostgreSQL connection failed');
    }
    logger.info('PostgreSQL connection established');

    // Test Redis connection
    const redisHealthy = await checkRedisHealth();
    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }
    logger.info('Redis connection established');

    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
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
  initializeDatabase
};