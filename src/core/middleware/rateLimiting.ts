import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../cache/redisClient.js';
import { logger } from '../logging/logger.js';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit is reached
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private fallbackStorage = new Map<string, { count: number; resetTime: number }>();

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private getKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const route = req.route?.path || req.path;
    
    return `rate_limit:${ip}:${route}`;
  }

  private async getCurrentCount(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const data = await redisClient.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          return parsed;
        }
      }

      // Fallback to in-memory storage
      const fallbackData = this.fallbackStorage.get(key);
      if (fallbackData) {
        // Check if window has expired
        if (Date.now() > fallbackData.resetTime) {
          this.fallbackStorage.delete(key);
          return { count: 0, resetTime: Date.now() + windowMs };
        }
        return fallbackData;
      }

      return { count: 0, resetTime: Date.now() + windowMs };
    } catch (error) {
      logger.error({ error }, 'Error getting rate limit count');
      return { count: 0, resetTime: Date.now() + windowMs };
    }
  }

  private async incrementCount(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const data = await redisClient.get(key);
        let count = 1;

        if (data) {
          const parsed = JSON.parse(data);
          if (now < parsed.resetTime) {
            count = parsed.count + 1;
          }
        }

        await redisClient.set(key, JSON.stringify({ count, resetTime }), Math.ceil(windowMs / 1000));
        return { count, resetTime };
      }

      // Fallback to in-memory storage
      const fallbackData = this.fallbackStorage.get(key);
      let count = 1;

      if (fallbackData && now < fallbackData.resetTime) {
        count = fallbackData.count + 1;
      }

      this.fallbackStorage.set(key, { count, resetTime });
      return { count, resetTime };
    } catch (error) {
      logger.error({ error }, 'Error incrementing rate limit count');
      return { count: 1, resetTime };
    }
  }

  async checkLimit(req: Request, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(req, config);
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;

    const { count, resetTime } = await this.getCurrentCount(key, windowMs);
    const remaining = Math.max(0, maxRequests - count);
    const retryAfter = count >= maxRequests ? Math.ceil((resetTime - Date.now()) / 1000) : undefined;

    return {
      limit: maxRequests,
      remaining,
      resetTime,
      retryAfter
    };
  }

  async incrementAndCheck(req: Request, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.getKey(req, config);
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;

    const { count, resetTime } = await this.incrementCount(key, windowMs);
    const remaining = Math.max(0, maxRequests - count);
    const retryAfter = count > maxRequests ? Math.ceil((resetTime - Date.now()) / 1000) : undefined;

    return {
      limit: maxRequests,
      remaining,
      resetTime,
      retryAfter
    };
  }

  async resetLimit(key: string): Promise<void> {
    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        await redisClient.del(key);
      }

      // Also remove from fallback storage
      this.fallbackStorage.delete(key);
    } catch (error) {
      logger.error({ error }, 'Error resetting rate limit');
    }
  }

  async cleanupExpired(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    try {
      // Clean up fallback storage
      for (const [key, data] of this.fallbackStorage.entries()) {
        if (now > data.resetTime) {
          this.fallbackStorage.delete(key);
          cleanedCount++;
        }
      }

      logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
      return cleanedCount;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up rate limits');
      return cleanedCount;
    }
  }
}

// Export singleton instance
const rateLimiter = RateLimiter.getInstance();

// Middleware factory
export function createRateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await rateLimiter.incrementAndCheck(req, config);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString());
      }

      // Check if limit exceeded
      if (result.remaining < 0) {
        if (config.onLimitReached) {
          config.onLimitReached(req, res);
        }

        const message = config.message || 'Too many requests, please try again later';
        return res.status(429).json({
          success: false,
          error: {
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: result.retryAfter
          }
        });
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Rate limiting error');
      // Continue without rate limiting if there's an error
      next();
    }
  };
}

// Predefined rate limit configurations
export const rateLimits = {
  // General API rate limiting
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later'
  }),

  // Strict rate limiting for auth endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:auth:${ip}`;
    }
  }),

  // Password reset rate limiting
  passwordReset: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:password_reset:${ip}`;
    }
  }),

  // Login rate limiting
  login: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many login attempts, please try again later',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:login:${ip}`;
    }
  }),

  // Registration rate limiting
  register: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Too many registration attempts, please try again later',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:register:${ip}`;
    }
  }),

  // Payment rate limiting
  payment: createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
    message: 'Too many payment attempts, please try again later',
    keyGenerator: (req) => {
      const userId = (req as any).userId || 'anonymous';
      return `rate_limit:payment:${userId}`;
    }
  }),

  // Admin operations rate limiting
  admin: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many admin operations, please slow down',
    keyGenerator: (req) => {
      const userId = (req as any).userId || 'anonymous';
      return `rate_limit:admin:${userId}`;
    }
  }),

  // File upload rate limiting
  upload: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many file uploads, please try again later',
    keyGenerator: (req) => {
      const userId = (req as any).userId || req.ip || 'anonymous';
      return `rate_limit:upload:${userId}`;
    }
  }),

  // Search rate limiting
  search: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many search requests, please slow down',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:search:${ip}`;
    }
  })
};

// Cleanup expired rate limits every 5 minutes
setInterval(() => {
  rateLimiter.cleanupExpired().catch(error => {
    logger.error('Error during rate limit cleanup:', error);
  });
}, 5 * 60 * 1000);

export { rateLimiter };
