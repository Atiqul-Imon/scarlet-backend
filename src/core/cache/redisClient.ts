import Redis from 'ioredis';
import { logger } from '../logging/logger.js';
import { env } from '../../config/env.js';

class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;
  private fallbackStorage = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Use Redis URL if provided, otherwise use default localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableOfflineQueue: false,
        // Production optimizations
        family: 4, // Use IPv4
        db: 0
      });

      // Set up event handlers
      this.client.on('error', (err: Error) => {
        logger.error({ error: err }, 'Redis connection error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.client.ping();
      logger.info('Redis client initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Redis client');
      // Fallback to in-memory storage if Redis is not available
      this.client = null;
      this.isConnected = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.warn('Redis not available, falling back to in-memory storage');
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    // Check fallback storage first
    const fallbackData = this.fallbackStorage.get(key);
    if (fallbackData) {
      // Check if expired
      if (fallbackData.expiresAt && Date.now() > fallbackData.expiresAt) {
        this.fallbackStorage.delete(key);
        return null;
      }
      return fallbackData.value;
    }

    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error({ error }, 'Redis GET error');
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    // Always store in fallback storage
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.fallbackStorage.set(key, { value, expiresAt });

    if (!this.client || !this.isConnected) {
      return true; // Successfully stored in fallback
    }

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error({ error }, 'Redis SET error');
      return true; // Still successful because we stored in fallback
    }
  }

  async del(key: string): Promise<boolean> {
    // Always remove from fallback storage
    this.fallbackStorage.delete(key);

    if (!this.client || !this.isConnected) {
      return true; // Successfully removed from fallback
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error }, 'Redis DEL error');
      return true; // Still successful because we removed from fallback
    }
  }

  async exists(key: string): Promise<boolean> {
    // Check fallback storage first
    const fallbackData = this.fallbackStorage.get(key);
    if (fallbackData) {
      // Check if expired
      if (fallbackData.expiresAt && Date.now() > fallbackData.expiresAt) {
        this.fallbackStorage.delete(key);
        return false;
      }
      return true;
    }

    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error }, 'Redis EXISTS error');
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    // Update fallback storage
    const fallbackData = this.fallbackStorage.get(key);
    if (fallbackData) {
      fallbackData.expiresAt = Date.now() + (ttlSeconds * 1000);
      this.fallbackStorage.set(key, fallbackData);
    }

    if (!this.client || !this.isConnected) {
      return true; // Successfully updated fallback
    }

    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error({ error }, 'Redis EXPIRE error');
      return true; // Still successful because we updated fallback
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error({ error }, 'Redis TTL error');
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    // Get keys from fallback storage
    const fallbackKeys = Array.from(this.fallbackStorage.keys()).filter(key => {
      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    });

    if (!this.client || !this.isConnected) {
      return fallbackKeys;
    }

    try {
      const redisKeys = await this.client.keys(pattern);
      // Combine and deduplicate
      const allKeys = [...new Set([...fallbackKeys, ...redisKeys])];
      return allKeys;
    } catch (error) {
      logger.error({ error }, 'Redis KEYS error');
      return fallbackKeys;
    }
  }

  async flushdb(): Promise<boolean> {
    // Always clear fallback storage
    this.fallbackStorage.clear();

    if (!this.client || !this.isConnected) {
      return true; // Successfully cleared fallback
    }

    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      logger.error({ error }, 'Redis FLUSHDB error');
      return true; // Still successful because we cleared fallback
    }
  }

  async quit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting Redis client');
    }
    }
  }

  // Cleanup expired fallback storage
  cleanupExpired(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, data] of this.fallbackStorage.entries()) {
      if (data.expiresAt && now > data.expiresAt) {
        this.fallbackStorage.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired fallback entries`);
    }

    return cleanedCount;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.client) {
      return { 
        status: 'fallback', 
        error: 'Redis not available, using in-memory storage' 
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'fallback',
        error: 'Redis unavailable, using in-memory storage'
      };
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

// Cleanup expired fallback storage every 5 minutes
setInterval(() => {
  redisClient.cleanupExpired();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisClient.quit();
  process.exit(0);
});
