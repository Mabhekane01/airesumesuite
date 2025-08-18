import { createClient } from 'redis';
import { config } from './environment';
import { logger } from '@/utils/logger';

// Redis client
export const redis = createClient({
  url: config.REDIS_URL,
  socket: {
    connectTimeout: 5000,
  },
});

// Redis connection events
redis.on('connect', () => {
  logger.info('🔗 Connecting to Redis...');
});

redis.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redis.on('error', (err) => {
  logger.error('❌ Redis connection error:', err);
});

redis.on('end', () => {
  logger.info('🔚 Redis connection ended');
});

// Initialize Redis connection
export const initializeRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    logger.info('📡 Connected to Redis successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    // Don't exit process - Redis is optional for core functionality
  }
};

// Cache helper functions
export const cache = {
  // Get cached data
  get: async (key: string): Promise<any> => {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  // Set cached data with TTL
  set: async (key: string, data: any, ttlSeconds: number = 3600): Promise<boolean> => {
    try {
      await redis.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  },

  // Delete cached data
  del: async (key: string): Promise<boolean> => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  },

  // Increment counter
  incr: async (key: string, ttlSeconds?: number): Promise<number> => {
    try {
      const count = await redis.incr(key);
      if (ttlSeconds && count === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  },

  // Set with pattern for bulk operations
  setPattern: async (pattern: string, data: Record<string, any>, ttlSeconds: number = 3600): Promise<void> => {
    try {
      const multi = redis.multi();
      
      Object.entries(data).forEach(([key, value]) => {
        const fullKey = pattern.replace('*', key);
        multi.setEx(fullKey, ttlSeconds, JSON.stringify(value));
      });
      
      await multi.exec();
    } catch (error) {
      logger.error('Cache setPattern error:', error);
    }
  },

  // Get keys by pattern
  getByPattern: async (pattern: string): Promise<Record<string, any>> => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return {};
      
      const values = await redis.mGet(keys);
      const result: Record<string, any> = {};
      
      keys.forEach((key, index) => {
        if (values[index]) {
          try {
            result[key] = JSON.parse(values[index]!);
          } catch {
            result[key] = values[index];
          }
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Cache getByPattern error:', error);
      return {};
    }
  },

  // Analytics helpers
  analytics: {
    // Track document view
    trackView: async (documentId: string, viewData: any): Promise<void> => {
      try {
        const key = `analytics:views:${documentId}:${new Date().toISOString().split('T')[0]}`;
        await redis.lPush(key, JSON.stringify(viewData));
        await redis.expire(key, 86400 * config.ANALYTICS_RETENTION_DAYS); // Retention period
      } catch (error) {
        logger.error('Analytics tracking error:', error);
      }
    },

    // Get document views for date range
    getViews: async (documentId: string, days: number = 7): Promise<any[]> => {
      try {
        const views: any[] = [];
        const now = new Date();
        
        for (let i = 0; i < days; i++) {
          const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
          const dateStr = date.toISOString().split('T')[0];
          const key = `analytics:views:${documentId}:${dateStr}`;
          
          const dayViews = await redis.lRange(key, 0, -1);
          views.push(...dayViews.map(view => JSON.parse(view)));
        }
        
        return views;
      } catch (error) {
        logger.error('Analytics get views error:', error);
        return [];
      }
    },

    // Track real-time viewers
    addViewer: async (documentId: string, viewerId: string, ttl: number = 300): Promise<void> => {
      try {
        const key = `realtime:viewers:${documentId}`;
        await redis.sAdd(key, viewerId);
        await redis.expire(key, ttl);
      } catch (error) {
        logger.error('Add viewer error:', error);
      }
    },

    // Remove viewer
    removeViewer: async (documentId: string, viewerId: string): Promise<void> => {
      try {
        const key = `realtime:viewers:${documentId}`;
        await redis.sRem(key, viewerId);
      } catch (error) {
        logger.error('Remove viewer error:', error);
      }
    },

    // Get active viewers count
    getViewersCount: async (documentId: string): Promise<number> => {
      try {
        const key = `realtime:viewers:${documentId}`;
        return await redis.sCard(key);
      } catch (error) {
        logger.error('Get viewers count error:', error);
        return 0;
      }
    }
  },

  // Session management
  session: {
    // Store session data
    set: async (sessionId: string, data: any, ttlSeconds: number = 86400): Promise<void> => {
      try {
        const key = `session:${sessionId}`;
        await redis.setEx(key, ttlSeconds, JSON.stringify(data));
      } catch (error) {
        logger.error('Session set error:', error);
      }
    },

    // Get session data
    get: async (sessionId: string): Promise<any> => {
      try {
        const key = `session:${sessionId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        logger.error('Session get error:', error);
        return null;
      }
    },

    // Delete session
    delete: async (sessionId: string): Promise<void> => {
      try {
        const key = `session:${sessionId}`;
        await redis.del(key);
      } catch (error) {
        logger.error('Session delete error:', error);
      }
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🔄 Closing Redis connection...');
  await redis.quit();
  logger.info('✅ Redis connection closed');
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Closing Redis connection...');
  await redis.quit();
  logger.info('✅ Redis connection closed');
});

export default { redis, cache, initializeRedis };