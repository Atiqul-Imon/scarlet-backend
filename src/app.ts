import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './core/logging/logger.js';
import { authenticate } from './core/middleware/auth.js';
import { env, isProduction } from './config/env.js';

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
import { rateLimits } from './core/middleware/rateLimiting.js';

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
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Session-ID');
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Session-ID'],
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
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/addresses', addressRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/cart-abandonment', cartAbandonmentRoutes);

  app.use((req, res) => res.status(404).json({ success: false, error: { message: 'Not Found' } }));
  app.use((err: any, req: any, res: any, _next: any) => { try { req.log?.error?.(err); } catch {} res.status(500).json({ success: false, error: { message: 'Internal Server Error' } }); });
  return app;
}



