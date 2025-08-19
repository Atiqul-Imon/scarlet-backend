import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from './core/logging/logger.js';
import { authenticate } from './core/middleware/auth.js';

import { router as healthRoutes } from './modules/health/routes.js';
import { router as authRoutes } from './modules/auth/routes.js';
import { router as userRoutes } from './modules/users/routes.js';
import { router as catalogRoutes } from './modules/catalog/routes.js';
import { router as cartRoutes } from './modules/cart/routes.js';
import { router as orderRoutes } from './modules/orders/routes.js';
import { router as adminRoutes } from './modules/admin/routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(rateLimit({ windowMs: 60_000, max: 300 }));

  app.use(authenticate);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((req, res) => res.status(404).json({ success: false, error: { message: 'Not Found' } }));
  app.use((err: any, req: any, res: any, _next: any) => { try { req.log?.error?.(err); } catch {} res.status(500).json({ success: false, error: { message: 'Internal Server Error' } }); });
  return app;
}


