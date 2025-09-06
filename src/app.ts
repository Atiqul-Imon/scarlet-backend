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

export function createApp() {
  const app = express();
  
  // Trust proxy for Render deployment
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: !isProduction, // Disable in production for better compatibility
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));
  
  app.use(compression());
  
  // CORS configuration
  app.use(cors({
    origin: isProduction 
      ? [env.corsOrigin, env.frontendUrl].filter(Boolean)
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  
  // Rate limiting
  app.use(rateLimit({ 
    windowMs: 60_000, 
    max: env.apiRateLimit,
    message: { 
      success: false, 
      error: { message: 'Too many requests, please try again later.' } 
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(authenticate);

  app.use('/api/health', healthRoutes);
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

  app.use((req, res) => res.status(404).json({ success: false, error: { message: 'Not Found' } }));
  app.use((err: any, req: any, res: any, _next: any) => { try { req.log?.error?.(err); } catch {} res.status(500).json({ success: false, error: { message: 'Internal Server Error' } }); });
  return app;
}


