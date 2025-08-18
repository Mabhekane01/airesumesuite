import { Pool, PoolClient } from 'pg';
import { config } from './environment';
import { logger } from '@/utils/logger';

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  logger.info('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// Query helper function
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.NODE_ENV === 'development') {
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (err) {
    logger.error('Database query error:', { text, params, error: err });
    throw err;
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
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

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as timestamp');
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// Initialize database (create tables if they don't exist)
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('🔄 Initializing database...');
    
    // Check if tables exist
    const tablesExist = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tablesExist.rows[0].exists) {
      logger.info('📋 Creating database tables...');
      
      // Read and execute schema file
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await query(schema);
        logger.info('✅ Database tables created successfully');
      } else {
        logger.warn('⚠️ Schema file not found, skipping table creation');
      }
    } else {
      logger.info('✅ Database tables already exist');
    }
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🔄 Closing database connections...');
  await pool.end();
  logger.info('✅ Database connections closed');
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Closing database connections...');
  await pool.end();
  logger.info('✅ Database connections closed');
});

export default { pool, query, withTransaction, checkDatabaseHealth, initializeDatabase };