import { Collection, type Filter, type FindOptions, type Document } from 'mongodb';
import { logger } from '../logging/logger.js';
import { advancedRedis, CacheKeys, CacheTTL } from '../cache/advancedRedisClient.js';

// Query optimization utilities

interface QueryCacheOptions {
  ttl?: number;
  cacheKey?: string;
  skipCache?: boolean;
}

// Cached find operation
export async function cachedFind<T = Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  options?: FindOptions & QueryCacheOptions
): Promise<T[]> {
  const { ttl = CacheTTL.MEDIUM, cacheKey, skipCache = false, ...findOptions } = options || {};

  // Generate cache key if not provided
  const key = cacheKey || `query:${collection.collectionName}:${JSON.stringify(filter)}:${JSON.stringify(findOptions)}`;

  // Try to get from cache
  if (!skipCache && advancedRedis.isAvailable()) {
    const cached = await advancedRedis.get<T[]>(key);
    if (cached) {
      logger.debug(`Cache hit for query: ${key}`);
      return cached;
    }
  }

  // Execute query
  const start = Date.now();
  const results = await collection.find(filter, findOptions).toArray();
  const duration = Date.now() - start;

  // Log slow queries
  if (duration > 1000) {
    logger.warn('Slow query detected', {
      collection: collection.collectionName,
      duration: `${duration}ms`,
      filter,
      resultsCount: results.length
    });
  }

  // Cache results
  if (!skipCache && advancedRedis.isAvailable()) {
    await advancedRedis.set(key, results, ttl);
    logger.debug(`Cached query results: ${key}`);
  }

  return results;
}

// Cached findOne operation
export async function cachedFindOne<T = Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  options?: FindOptions & QueryCacheOptions
): Promise<T | null> {
  const { ttl = CacheTTL.MEDIUM, cacheKey, skipCache = false, ...findOptions } = options || {};

  // Generate cache key
  const key = cacheKey || `query:one:${collection.collectionName}:${JSON.stringify(filter)}:${JSON.stringify(findOptions)}`;

  // Try to get from cache
  if (!skipCache && advancedRedis.isAvailable()) {
    const cached = await advancedRedis.get<T | null>(key);
    if (cached !== null) {
      logger.debug(`Cache hit for findOne: ${key}`);
      return cached;
    }
  }

  // Execute query
  const start = Date.now();
  const result = await collection.findOne(filter, findOptions);
  const duration = Date.now() - start;

  // Log slow queries
  if (duration > 500) {
    logger.warn('Slow findOne query', {
      collection: collection.collectionName,
      duration: `${duration}ms`,
      filter
    });
  }

  // Cache result
  if (!skipCache && advancedRedis.isAvailable()) {
    await advancedRedis.set(key, result, ttl);
    logger.debug(`Cached findOne result: ${key}`);
  }

  return result;
}

// Invalidate cache for a collection
export async function invalidateCollectionCache(collectionName: string): Promise<number> {
  if (!advancedRedis.isAvailable()) {
    return 0;
  }

  const pattern = `query:*:${collectionName}:*`;
  const deleted = await advancedRedis.deletePattern(pattern);
  
  logger.info(`Invalidated ${deleted} cache entries for collection: ${collectionName}`);
  return deleted;
}

// Batch insert with cache invalidation
export async function batchInsert<T = Document>(
  collection: Collection<T>,
  documents: T[]
): Promise<any> {
  const start = Date.now();
  
  // Perform batch insert
  const result = await collection.insertMany(documents as any);
  
  const duration = Date.now() - start;
  logger.info('Batch insert completed', {
    collection: collection.collectionName,
    count: documents.length,
    duration: `${duration}ms`
  });

  // Invalidate cache
  await invalidateCollectionCache(collection.collectionName);

  return result;
}

// Optimized aggregation pipeline
export async function cachedAggregate<T = Document>(
  collection: Collection,
  pipeline: Document[],
  options?: { ttl?: number; cacheKey?: string; skipCache?: boolean }
): Promise<T[]> {
  const { ttl = CacheTTL.LONG, cacheKey, skipCache = false } = options || {};

  // Generate cache key
  const key = cacheKey || `agg:${collection.collectionName}:${JSON.stringify(pipeline)}`;

  // Try to get from cache
  if (!skipCache && advancedRedis.isAvailable()) {
    const cached = await advancedRedis.get<T[]>(key);
    if (cached) {
      logger.debug(`Cache hit for aggregation: ${key}`);
      return cached;
    }
  }

  // Execute aggregation
  const start = Date.now();
  const results = await collection.aggregate<T>(pipeline).toArray();
  const duration = Date.now() - start;

  // Log slow aggregations
  if (duration > 2000) {
    logger.warn('Slow aggregation detected', {
      collection: collection.collectionName,
      duration: `${duration}ms`,
      pipelineStages: pipeline.length,
      resultsCount: results.length
    });
  }

  // Cache results
  if (!skipCache && advancedRedis.isAvailable()) {
    await advancedRedis.set(key, results, ttl);
    logger.debug(`Cached aggregation results: ${key}`);
  }

  return results;
}

// Query performance analyzer
export class QueryAnalyzer {
  private queries: Array<{
    collection: string;
    operation: string;
    duration: number;
    timestamp: number;
  }> = [];

  recordQuery(collection: string, operation: string, duration: number) {
    this.queries.push({
      collection,
      operation,
      duration,
      timestamp: Date.now()
    });

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000);
    }
  }

  getSlowQueries(minDuration: number = 1000) {
    return this.queries
      .filter(q => q.duration > minDuration)
      .sort((a, b) => b.duration - a.duration);
  }

  getAverageQueryTime(collection?: string) {
    const filteredQueries = collection
      ? this.queries.filter(q => q.collection === collection)
      : this.queries;

    if (filteredQueries.length === 0) return 0;

    const total = filteredQueries.reduce((sum, q) => sum + q.duration, 0);
    return total / filteredQueries.length;
  }

  getQueryStats() {
    const stats: Record<string, { count: number; avgDuration: number; slowest: number }> = {};

    for (const query of this.queries) {
      if (!stats[query.collection]) {
        stats[query.collection] = { count: 0, avgDuration: 0, slowest: 0 };
      }

      stats[query.collection].count++;
      stats[query.collection].slowest = Math.max(
        stats[query.collection].slowest,
        query.duration
      );
    }

    // Calculate averages
    for (const [collection, data] of Object.entries(stats)) {
      const collectionQueries = this.queries.filter(q => q.collection === collection);
      const total = collectionQueries.reduce((sum, q) => sum + q.duration, 0);
      data.avgDuration = total / collectionQueries.length;
    }

    return stats;
  }
}

// Export singleton analyzer
export const queryAnalyzer = new QueryAnalyzer();

// Database connection pool monitor
export function monitorConnectionPool(client: any) {
  if (!client) return;

  // Log pool statistics periodically
  setInterval(() => {
    try {
      const poolStats = {
        timestamp: new Date().toISOString(),
        // Note: These stats may not be directly available in all MongoDB driver versions
        // Adjust based on your driver version
      };

      logger.debug('Connection pool stats', poolStats);
    } catch (error) {
      logger.error(`Failed to get pool stats: ${error instanceof Error ? error.message : error}`);
    }
  }, 60000); // Every minute
}

// Bulk write optimization
export async function optimizedBulkWrite<T = Document>(
  collection: Collection<T>,
  operations: any[],
  chunkSize: number = 1000
): Promise<any> {
  const chunks = [];
  for (let i = 0; i < operations.length; i += chunkSize) {
    chunks.push(operations.slice(i, i + chunkSize));
  }

  logger.info(`Executing bulk write in ${chunks.length} chunks of ${chunkSize}`);

  const results = [];
  for (const chunk of chunks) {
    const start = Date.now();
    const result = await collection.bulkWrite(chunk, { ordered: false });
    const duration = Date.now() - start;

    logger.debug(`Bulk write chunk completed in ${duration}ms`);
    results.push(result);
  }

  // Invalidate cache
  await invalidateCollectionCache(collection.collectionName);

  return results;
}

// Index suggestion analyzer
export async function analyzeQueryForIndexes<T = Document>(
  collection: Collection<T>,
  filter: Filter<T>
): Promise<string[]> {
  const suggestions: string[] = [];
  const filterKeys = Object.keys(filter);

  // Get existing indexes
  const indexes = await collection.listIndexes().toArray();
  const existingIndexFields = indexes.map(idx => Object.keys(idx.key));

  // Suggest indexes for filter fields
  for (const key of filterKeys) {
    const hasIndex = existingIndexFields.some(fields => 
      fields.includes(key as string)
    );

    if (!hasIndex) {
      suggestions.push(`Consider adding index on field: ${key}`);
    }
  }

  return suggestions;
}
