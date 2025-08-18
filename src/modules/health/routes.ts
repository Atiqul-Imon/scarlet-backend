import { Router } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { checkMongoHealth, getConnectionStats } from '../../core/db/mongoClient.js';
import { env } from '../../config/env.js';

export const router = Router();

// Basic health check
router.get('/', (_req, res) => {
  ok(res, { 
    status: 'ok', 
    uptime: process.uptime(), 
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check with MongoDB Atlas status
router.get('/detailed', async (_req, res) => {
  try {
    const mongoHealthy = await checkMongoHealth();
    const mongoStats = await getConnectionStats();
    
    const health = {
      status: mongoHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        api: {
          status: 'healthy',
          uptime: process.uptime()
        },
        database: {
          status: mongoHealthy ? 'healthy' : 'unhealthy',
          type: 'MongoDB Atlas',
          stats: mongoStats
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        pid: process.pid
      }
    };

    if (mongoHealthy) {
      ok(res, health);
    } else {
      fail(res, { message: 'Service unhealthy - MongoDB Atlas connection failed' }, 503);
    }
  } catch (error) {
    fail(res, { 
      message: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR'
    }, 500);
  }
});

// MongoDB Atlas specific health check
router.get('/database', async (_req, res) => {
  try {
    const mongoHealthy = await checkMongoHealth();
    const mongoStats = await getConnectionStats();
    
    if (mongoHealthy) {
      ok(res, {
        status: 'healthy',
        type: 'MongoDB Atlas',
        timestamp: new Date().toISOString(),
        stats: mongoStats
      });
    } else {
      fail(res, { 
        message: 'MongoDB Atlas connection failed',
        code: 'DATABASE_UNHEALTHY'
      }, 503);
    }
  } catch (error) {
    fail(res, { 
      message: 'Database health check failed',
      code: 'DATABASE_CHECK_ERROR'
    }, 500);
  }
});


