import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { type Request, type Response, type NextFunction } from 'express';
import { advancedRedis, CacheKeys } from '../cache/advancedRedisClient.js';
import { logger } from '../logging/logger.js';

// Advanced rate limiting with Redis backend
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyPrefix?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyPrefix = 'rl'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis for distributed rate limiting if available
    store: advancedRedis.isAvailable() ? {
      async increment(key: string) {
        const fullKey = `${keyPrefix}:${key}`;
        const current = await advancedRedis.incr(fullKey);
        
        if (current === 1) {
          await advancedRedis.expire(fullKey, Math.ceil(windowMs / 1000));
        }
        
        return {
          totalHits: current,
          resetTime: new Date(Date.now() + windowMs)
        };
      },
      async decrement(key: string) {
        const fullKey = `${keyPrefix}:${key}`;
        await advancedRedis.decr(fullKey);
      },
      async resetKey(key: string) {
        const fullKey = `${keyPrefix}:${key}`;
        await advancedRedis.del(fullKey);
      }
    } : undefined,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiter
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyPrefix: 'rl:general'
  }),

  // Auth endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    keyPrefix: 'rl:auth'
  }),

  // Login specifically (very strict)
  login: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many login attempts, please try again in 15 minutes',
    skipSuccessfulRequests: true,
    keyPrefix: 'rl:login'
  }),

  // Registration
  register: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many registration attempts, please try again later',
    keyPrefix: 'rl:register'
  }),

  // Password reset
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts, please try again later',
    keyPrefix: 'rl:password'
  }),

  // OTP requests
  otp: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many OTP requests, please try again later',
    keyPrefix: 'rl:otp'
  }),

  // Cart updates
  cart: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many cart updates, please slow down',
    keyPrefix: 'rl:cart'
  }),

  // Checkout
  checkout: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many checkout attempts, please try again later',
    keyPrefix: 'rl:checkout'
  }),

  // Search
  search: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many search requests, please slow down',
    keyPrefix: 'rl:search'
  }),

  // Admin operations
  admin: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200,
    message: 'Too many admin requests, please slow down',
    keyPrefix: 'rl:admin'
  })
};

// Helmet security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://api.sslcommerz.com'],
      frameSrc: ["'self'", 'https://sandbox.sslcommerz.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// Prevent HTTP Parameter Pollution
export const preventHPP = hpp({
  whitelist: [
    'price',
    'rating',
    'category',
    'brand',
    'sort',
    'page',
    'limit',
    'search',
    'filter'
  ]
});

// MongoDB query sanitization (prevents NoSQL injection)
export const sanitizeInputs = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized potentially malicious input: ${key} from IP: ${req.ip}`);
  }
});

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API routes (use token-based auth instead)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // For non-API routes, verify CSRF token
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    logger.warn(`CSRF token mismatch for IP: ${req.ip}, Path: ${req.path}`);
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = Math.random().toString(36).substring(2, 15) +
                           Math.random().toString(36).substring(2, 15);
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

// XSS protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Set XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Helper function to sanitize objects
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove potential XSS patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe/gi, '');
}

// IP-based blocking middleware
export const ipBlocker = (req: Request, res: Response, next: NextFunction) => {
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  const clientIP = req.ip || req.socket.remoteAddress;

  if (clientIP && blockedIPs.includes(clientIP)) {
    logger.warn(`Blocked access attempt from IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`
      });
    }
  });

  next();
};

// Security middleware bundle
export const securityMiddleware = [
  securityHeaders,
  preventHPP,
  sanitizeInputs,
  xssProtection,
  ipBlocker,
  requestLogger
];
