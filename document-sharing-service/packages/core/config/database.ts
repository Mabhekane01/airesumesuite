import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface RedisConfig {
  url: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private redisClient: RedisClientType;

  private constructor() {
    this.initializePostgres();
    this.initializeRedis();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private initializePostgres(): void {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      database: process.env.DB_NAME || 'document_sharing',
      user: process.env.DB_USER || 'docshare_user',
      password: process.env.DB_PASSWORD || 'docshare_password',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (process.env.NODE_ENV === 'production') {
      config.ssl = { rejectUnauthorized: false };
    }

    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6381';
    this.redisClient = createClient({ url: redisUrl });

    this.redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    await this.redisClient.connect();
  }

  public getPool(): Pool {
    return this.pool;
  }

  public getRedisClient(): RedisClientType {
    return this.redisClient;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
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
  }

  public async close(): Promise<void> {
    await this.pool.end();
    await this.redisClient.quit();
  }
}