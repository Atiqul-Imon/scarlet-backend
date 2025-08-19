import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeMongoConnection } from './core/db/mongoClient.js';
import { logger } from './core/logging/logger.js';

export function createServer() {
  const app = createApp();
  const server = app.listen(env.port, () => {
    if (process.env.NODE_ENV !== 'test') {
      logger.info(`🚀 Scarlet API server started successfully`);
      logger.info(`📡 Server listening on http://localhost:${env.port}`);
      logger.info(`🌍 Environment: ${env.nodeEnv}`);
      logger.info(`🍃 MongoDB Atlas connection ready`);
    }
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Close HTTP server
    server.close(async (err) => {
      if (err) {
        logger.error({ error: err }, 'Error closing HTTP server');
        process.exit(1);
      }
      
      logger.info('HTTP server closed');
      
      try {
        // Close MongoDB Atlas connection
        await closeMongoConnection();
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during MongoDB shutdown');
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('❌ Forced shutdown after 30 seconds');
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    shutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${String(promise)} reason: ${String(reason)}`);
    shutdown('UNHANDLED_REJECTION');
  });

  return server;
}

// Auto-start server unless in test mode
if (process.env.NODE_ENV !== 'test') {
  createServer();
}


