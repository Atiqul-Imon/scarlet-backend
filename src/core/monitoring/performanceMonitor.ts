import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../logging/logger.js';
import { advancedRedis, CacheKeys } from '../cache/advancedRedisClient.js';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  memory?: {
    used: number;
    total: number;
  };
  cpu?: number;
}

interface ErrorMetric {
  endpoint: string;
  method: string;
  error: string;
  stack?: string;
  timestamp: number;
  userId?: string;
  ip?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly MAX_ERRORS = 500;

  // Middleware to track performance
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = process.hrtime.bigint();
      const startMemory = process.memoryUsage();

      res.on('finish', async () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
        const endMemory = process.memoryUsage();

        const metric: PerformanceMetric = {
          endpoint: req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          timestamp: Date.now(),
          memory: {
            used: endMemory.heapUsed - startMemory.heapUsed,
            total: endMemory.heapTotal
          }
        };

        this.recordMetric(metric);

        // Log slow requests
        if (duration > 1000) {
          logger.warn('Slow request detected', {
            endpoint: req.path,
            method: req.method,
            duration: `${duration.toFixed(2)}ms`,
            statusCode: res.statusCode
          });
        }

        // Cache metrics in Redis for analytics
        if (advancedRedis.isAvailable()) {
          await advancedRedis.lpush(
            CacheKeys.analytics('performance', 'recent'),
            metric
          );
        }
      });

      next();
    };
  }

  // Record a performance metric
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only the last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  // Record an error
  public recordError(error: ErrorMetric) {
    this.errors.push(error);

    // Keep only the last MAX_ERRORS
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    // Log error
    logger.error('Application error recorded', error);

    // Cache error in Redis
    if (advancedRedis.isAvailable()) {
      advancedRedis.lpush(
        CacheKeys.analytics('errors', 'recent'),
        error
      ).catch(err => logger.error('Failed to cache error metric:', err));
    }
  }

  // Get average response time for an endpoint
  public getAverageResponseTime(endpoint?: string): number {
    const filteredMetrics = endpoint
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }

  // Get error rate
  public getErrorRate(): number {
    if (this.metrics.length === 0) return 0;

    const errorCount = this.metrics.filter(m => m.statusCode >= 400).length;
    return (errorCount / this.metrics.length) * 100;
  }

  // Get slowest endpoints
  public getSlowestEndpoints(limit: number = 10): Array<{ endpoint: string; avgDuration: number; count: number }> {
    const endpointStats: Map<string, { total: number; count: number }> = new Map();

    for (const metric of this.metrics) {
      const stats = endpointStats.get(metric.endpoint) || { total: 0, count: 0 };
      stats.total += metric.duration;
      stats.count += 1;
      endpointStats.set(metric.endpoint, stats);
    }

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.total / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  // Get most common errors
  public getMostCommonErrors(limit: number = 10): Array<{ error: string; count: number }> {
    const errorCounts: Map<string, number> = new Map();

    for (const error of this.errors) {
      const count = errorCounts.get(error.error) || 0;
      errorCounts.set(error.error, count + 1);
    }

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Get performance summary
  public getPerformanceSummary() {
    const now = Date.now();
    const last5Min = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000);
    const last1Hour = this.metrics.filter(m => now - m.timestamp < 60 * 60 * 1000);

    return {
      overall: {
        totalRequests: this.metrics.length,
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate(),
        slowestEndpoints: this.getSlowestEndpoints(5)
      },
      last5Minutes: {
        requestCount: last5Min.length,
        averageResponseTime: last5Min.reduce((sum, m) => sum + m.duration, 0) / (last5Min.length || 1),
        errorCount: last5Min.filter(m => m.statusCode >= 400).length
      },
      lastHour: {
        requestCount: last1Hour.length,
        averageResponseTime: last1Hour.reduce((sum, m) => sum + m.duration, 0) / (last1Hour.length || 1),
        errorCount: last1Hour.filter(m => m.statusCode >= 400).length
      },
      errors: {
        totalErrors: this.errors.length,
        mostCommon: this.getMostCommonErrors(5)
      },
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
  }

  // Clear old metrics (for memory management)
  public clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThanMs;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    logger.info(`Cleared metrics older than ${olderThanMs}ms`);
  }

  // Export metrics for external monitoring
  public exportMetrics() {
    return {
      metrics: this.metrics,
      errors: this.errors,
      summary: this.getPerformanceSummary()
    };
  }
}

// Error tracking middleware
export const errorTracker = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorMetric: ErrorMetric = {
    endpoint: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    timestamp: Date.now(),
    userId: (req as any).user?.id,
    ip: req.ip
  };

  performanceMonitor.recordError(errorMetric);

  // Pass to next error handler
  next(err);
};

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Core Web Vitals tracking middleware for API responses
export const coreWebVitalsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set Server-Timing header for performance tracking
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('Server-Timing', `total;dur=${duration}`);
  });

  next();
};
