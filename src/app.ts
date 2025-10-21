import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './core/logging/logger.js';
import { authenticate } from './core/middleware/auth.js';
import { env, isProduction } from './config/env.js';
// Phase 3 files temporarily removed for stable production build

import { router as healthRoutes } from './modules/health/routes.js';
import { router as authRoutes } from './modules/auth/routes.js';
import { router as userRoutes } from './modules/users/routes.js';
import { router as catalogRoutes } from './modules/catalog/routes.js';
import { router as cartRoutes } from './modules/cart/routes.js';
import { router as orderRoutes } from './modules/orders/routes.js';
import { router as adminRoutes } from './modules/admin/routes.js';
import { router as paymentRoutes } from './modules/payments/routes.js';
import { router as addressRoutes } from './modules/addresses/routes.js';
import { router as wishlistRoutes } from './modules/wishlist/routes.js';
import { router as inventoryRoutes } from './modules/inventory/routes.js';
import { router as analyticsRoutes } from './modules/analytics/routes.js';
import { router as cartAbandonmentRoutes } from './modules/cart-abandonment/routes.js';
import { router as otpRoutes } from './modules/otp/routes.js';
import { router as blogRoutes } from './modules/blog/routes.js';
import { router as brandRoutes } from './modules/brands/routes.js';
import { router as chatRoutes } from './modules/chat/routes.js';
import { router as consultationRoutes } from './modules/consultations/routes.js';
import { router as mediaRoutes } from './modules/media/routes.js';
import { rateLimits } from './core/middleware/rateLimiting.js';
import { 
  noCacheCart, 
  noCacheOrders, 
  noCacheAuth, 
  noCacheUsers, 
  noCacheCheckout,
  shortCacheSemiStatic 
} from './core/middleware/cacheControl.js';

export function createApp() {
  const app = express();
  
  // Trust proxy for Render deployment
  app.set('trust proxy', 1);
  
  // Enhanced security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: !isProduction, // Disable in production for better compatibility
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true,
    frameguard: { action: 'deny' }
  }));
  
  app.use(compression());
  
  // Mobile-specific CORS headers
  app.use((req, res, next) => {
    // Add mobile-friendly headers
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Session-ID, X-Mobile-Request, Cache-Control, Pragma, Expires, Last-Modified, ETag, If-None-Match, If-Modified-Since, X-Timestamp');
    res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  });
  
  // CORS configuration
  app.use(cors({
    origin: isProduction 
      ? env.allowedOrigins
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Session-ID', 'X-Mobile-Request', 'Cache-Control', 'Pragma', 'Expires', 'Last-Modified', 'ETag', 'If-None-Match', 'If-Modified-Since'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    optionsSuccessStatus: 200, // For legacy browser support
  }));
  
  // Body parsing
  app.use(express.json({ 
    limit: isProduction ? `${env.maxFileSize}b` : '1mb' 
  }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  
  // Logging
  app.use(pinoHttp({ 
    logger,
    // Don't log health checks in production
    autoLogging: {
      ignore: req => isProduction && req.url === '/api/health'
    }
  }));
  
  // Apply performance monitoring (Phase 3 - TODO: Fix TypeScript issues)
  // app.use(performanceMonitor.middleware());
  // app.use(coreWebVitalsMiddleware);
  
  // Apply security middleware (Phase 3 - TODO: Fix TypeScript issues)
  // securityMiddleware.forEach(middleware => app.use(middleware));
  
  // General rate limiting
  app.use(rateLimits.general);

  app.use(authenticate);

  app.use('/api/health', healthRoutes);
  
  // Mobile debugging endpoint
  app.get('/api/mobile-debug', (req, res) => {
    res.json({
      success: true,
      message: 'Mobile connection successful',
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      host: req.headers.host,
      environment: env.nodeEnv,
      corsOrigins: env.allowedOrigins
    });
  });
  
  // API Routes with appropriate cache control
  app.use('/api/auth', noCacheAuth, authRoutes);
  app.use('/api/users', noCacheUsers, userRoutes);
  app.use('/api/catalog', shortCacheSemiStatic, catalogRoutes);
  app.use('/api/cart', noCacheCart, cartRoutes);
  app.use('/api/orders', noCacheOrders, orderRoutes);
  app.use('/api/admin', noCacheAuth, adminRoutes);
  app.use('/api/payments', noCacheCheckout, paymentRoutes);
  app.use('/api/addresses', noCacheUsers, addressRoutes);
  app.use('/api/wishlist', noCacheUsers, wishlistRoutes);
  app.use('/api/inventory', noCacheAuth, inventoryRoutes);
  app.use('/api/analytics', noCacheAuth, analyticsRoutes);
  app.use('/api/cart-abandonment', noCacheCart, cartAbandonmentRoutes);
  app.use('/api/otp', noCacheAuth, otpRoutes);
  app.use('/api/blog', shortCacheSemiStatic, blogRoutes);
  app.use('/api/brands', shortCacheSemiStatic, brandRoutes);
  app.use('/api/chat', noCacheAuth, chatRoutes);
  app.use('/api/consultations', noCacheAuth, consultationRoutes);
  app.use('/api/media', noCacheAuth, mediaRoutes);

  // 404 handler
  app.use((req, res) => res.status(404).json({ success: false, error: { message: 'Not Found' } }));
  
  // Error tracking middleware (Phase 3 - TODO: Fix TypeScript issues)
  // app.use(errorTracker);
  
  // Global error handler
  app.use((err: any, req: any, res: any, _next: any) => { 
    try { 
      req.log?.error?.(err); 
    } catch {} 
    res.status(err.statusCode || 500).json({ 
      success: false, 
      error: { 
        message: isProduction ? 'Internal Server Error' : err.message 
      } 
    }); 
  });
  
  return app;
}



