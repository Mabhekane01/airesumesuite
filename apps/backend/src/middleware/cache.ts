import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  exclude?: string[]; // Query parameters to exclude from cache key
}

// In-memory cache for development (in production, use Redis)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const cacheMiddleware = (options: CacheOptions = {}) => {
  const { ttl = 300, keyGenerator, exclude = [] } = options; // Default 5 minutes TTL

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    let cacheKey: string;
    if (keyGenerator) {
      cacheKey = keyGenerator(req);
    } else {
      // Create cache key from URL and filtered query parameters
      const filteredQuery = { ...req.query };
      exclude.forEach(param => delete filteredQuery[param]);
      
      const queryString = Object.keys(filteredQuery)
        .sort()
        .map(key => `${key}=${filteredQuery[key]}`)
        .join('&');
      
      const baseKey = `${req.path}${queryString ? `?${queryString}` : ''}`;
      cacheKey = createHash('md5').update(baseKey).digest('hex');
    }

    // Check if data exists in cache and is not expired
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < cachedData.ttl * 1000) {
      console.log(`📦 Cache hit for key: ${cacheKey}`);
      return res.json(cachedData.data);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache the response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl
        });
        console.log(`💾 Cached response for key: ${cacheKey}, TTL: ${ttl}s`);
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache configuration for different endpoints
export const locationCacheConfig: CacheOptions = {
  ttl: 3600, // 1 hour for location data
  exclude: ['timestamp'] // Exclude timestamp from cache key
};

export const companyCacheConfig: CacheOptions = {
  ttl: 1800, // 30 minutes for company search
  exclude: ['timestamp', 'offset'], // Exclude pagination offset from cache key
};

export const staticDataCacheConfig: CacheOptions = {
  ttl: 86400, // 24 hours for static reference data
};

// Utility function to clear cache
export const clearCache = (pattern?: string) => {
  if (pattern) {
    // Clear cache entries matching pattern
    const regex = new RegExp(pattern);
    for (const [key] of cache) {
      if (regex.test(key)) {
        cache.delete(key);
        console.log(`🗑️  Cleared cache entry: ${key}`);
      }
    }
  } else {
    // Clear all cache
    const size = cache.size;
    cache.clear();
    console.log(`🗑️  Cleared ${size} cache entries`);
  }
};

// Cache cleanup job - remove expired entries
export const cleanupCache = () => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, value] of cache) {
    if (now - value.timestamp > value.ttl * 1000) {
      cache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
  }
};

// Run cache cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

export default cacheMiddleware;