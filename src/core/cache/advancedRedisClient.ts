import Redis from 'ioredis';
import { logger } from '../logging/logger.js';
import { env } from '../../config/env.js';

// Advanced Redis client with connection pooling and retry logic
class AdvancedRedisClient {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const redisUrl = env.redisUrl;
      
      if (!redisUrl) {
        logger.warn('Redis URL not configured. Caching will be disabled.');
        return;
      }

      // Main Redis client with optimized settings
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          logger.info(`Redis reconnecting... Attempt ${times}, delay ${delay}ms`);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      // Subscriber client for pub/sub
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      this.subscriber.on('error', (err: Error) => {
        logger.error(`Redis subscriber error: ${err.message}`);
      });

    } catch (error: any) {
      logger.error(`Failed to initialize Redis: ${error?.message || error}`);
      this.client = null;
      this.subscriber = null;
    }
  }

  // Check if Redis is available
  public isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  // Get value with automatic deserialization
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      if (!this.isAvailable()) return null;

      const value = await this.client!.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  // Set value with automatic serialization and TTL
  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  // Delete key(s)
  public async del(...keys: string[]): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      return await this.client!.del(...keys);
    } catch (error) {
      logger.error(`Redis DEL error for keys ${keys.join(', ')}:`, error);
      return 0;
    }
  }

  // Check if key exists
  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  // Set expiration
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;
      const result = await this.client!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  // Get TTL
  public async ttl(key: string): Promise<number> {
    try {
      if (!this.isAvailable()) return -1;
      return await this.client!.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return -1;
    }
  }

  // Increment value
  public async incr(key: string): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      return await this.client!.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  // Decrement value
  public async decr(key: string): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      return await this.client!.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  // Hash operations
  public async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;
      const serialized = JSON.stringify(value);
      await this.client!.hset(key, field, serialized);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  public async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      if (!this.isAvailable()) return null;
      const value = await this.client!.hget(key, field);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  public async hgetall<T = any>(key: string): Promise<Record<string, T> | null> {
    try {
      if (!this.isAvailable()) return null;
      const values = await this.client!.hgetall(key);
      if (!values || Object.keys(values).length === 0) return null;

      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(values)) {
        result[field] = JSON.parse(value) as T;
      }
      return result;
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  public async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      return await this.client!.hdel(key, ...fields);
    } catch (error) {
      logger.error(`Redis HDEL error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  // List operations
  public async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      const serialized = values.map(v => JSON.stringify(v));
      return await this.client!.lpush(key, ...serialized);
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  public async rpush(key: string, ...values: any[]): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      const serialized = values.map(v => JSON.stringify(v));
      return await this.client!.rpush(key, ...serialized);
    } catch (error) {
      logger.error(`Redis RPUSH error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  public async lrange<T = any>(key: string, start: number, stop: number): Promise<T[]> {
    try {
      if (!this.isAvailable()) return [];
      const values = await this.client!.lrange(key, start, stop);
      return values.map(v => JSON.parse(v) as T);
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:` + (error instanceof Error ? error.message : String(error)));
      return [];
    }
  }

  // Pattern-based deletion
  public async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;

      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await this.client!.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          const deleted = await this.client!.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      logger.error(`Redis deletePattern error for pattern ${pattern}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  // Publish message
  public async publish(channel: string, message: any): Promise<number> {
    try {
      if (!this.isAvailable()) return 0;
      const serialized = JSON.stringify(message);
      return await this.client!.publish(channel, serialized);
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:` + (error instanceof Error ? error.message : String(error)));
      return 0;
    }
  }

  // Subscribe to channel
  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      if (!this.subscriber) {
        logger.warn('Redis subscriber not available');
        return;
      }

      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (ch: string, message: string) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            logger.error(`Failed to parse subscribed message: ${error instanceof Error ? error.message : error}`);
          }
        }
      });
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error for channel ${channel}:` + (error instanceof Error ? error.message : String(error)));
    }
  }

  // Get Redis info
  public async getInfo(): Promise<string | null> {
    try {
      if (!this.isAvailable()) return null;
      return await this.client!.info();
    } catch (error) {
      logger.error(`Redis INFO error: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  // Flush all data (use with caution!)
  public async flushAll(): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;
      await this.client!.flushall();
      logger.warn('Redis: All data flushed');
      return true;
    } catch (error) {
      logger.error(`Redis FLUSHALL error: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  // Close connections
  public async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error(`Error closing Redis connections: ${error instanceof Error ? error.message : error}`);
    }
  }
}

// Export singleton instance
export const advancedRedis = new AdvancedRedisClient();

// Cache key generators
export const CacheKeys = {
  // User caches
  user: (userId: string) => `user:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
  userCart: (userId: string) => `cart:${userId}`,
  userWishlist: (userId: string) => `wishlist:${userId}`,
  
  // Product caches
  product: (productId: string) => `product:${productId}`,
  productsByCategory: (categoryId: string, page: number) => `products:category:${categoryId}:page:${page}`,
  productSearch: (query: string, page: number) => `products:search:${query}:page:${page}`,
  
  // Category caches
  categories: () => 'categories:all',
  category: (categoryId: string) => `category:${categoryId}`,
  
  // Order caches
  order: (orderId: string) => `order:${orderId}`,
  userOrders: (userId: string, page: number) => `orders:user:${userId}:page:${page}`,
  
  // Rate limiting
  rateLimit: (identifier: string, endpoint: string) => `ratelimit:${identifier}:${endpoint}`,
  
  // Analytics
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
};

// TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
};
