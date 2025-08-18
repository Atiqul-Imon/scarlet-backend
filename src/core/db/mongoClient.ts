import { MongoClient, type MongoClientOptions } from 'mongodb';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

let client: MongoClient | null = null;

// MongoDB Atlas optimized connection options
const mongoOptions: MongoClientOptions = {
  // Connection pool settings
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  
  // Connection timeout settings
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  
  // Retry settings for Atlas
  retryWrites: true,
  retryReads: true,
  
  // Compression for better performance over network
  compressors: ['snappy', 'zlib'],
  
  // Write concern for data safety
  writeConcern: {
    w: 'majority',
    wtimeout: 5000
  },
  
  // Read preference for Atlas replica sets
  readPreference: 'primaryPreferred',
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000,
  
  // TLS settings for Atlas (automatically enabled for mongodb+srv)
  tls: env.mongoUri.startsWith('mongodb+srv://'),
  
  // Application name for Atlas monitoring
  appName: 'Scarlet-ECommerce'
};

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    try {
      logger.info('Connecting to MongoDB Atlas...');
      
      client = new MongoClient(env.mongoUri, mongoOptions);
      
      // Connect with timeout
      await client.connect();
      
      // Verify connection
      await client.db('admin').command({ ping: 1 });
      
      logger.info('Successfully connected to MongoDB Atlas');
      
      // Handle connection events
      client.on('connectionPoolCreated', () => {
        logger.info('MongoDB connection pool created');
      });
      
      client.on('connectionPoolClosed', () => {
        logger.info('MongoDB connection pool closed');
      });
      
      client.on('error', (error) => {
        logger.error({ error }, 'MongoDB connection error');
      });
      
    } catch (error) {
      logger.error({ error }, 'Failed to connect to MongoDB Atlas');
      throw new Error(`MongoDB Atlas connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return client;
}

export async function getDb(dbName?: string) {
  const c = await getMongoClient();
  
  // Use database name from environment or connection string, fallback to 'scarlet'
  const databaseName = dbName || env.dbName || extractDbNameFromUri(env.mongoUri) || 'scarlet';
  
  return c.db(databaseName);
}

// Extract database name from MongoDB URI
function extractDbNameFromUri(uri: string): string | null {
  try {
    const url = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    return url.pathname.slice(1).split('?')[0] || null;
  } catch {
    return null;
  }
}

// Graceful shutdown function
export async function closeMongoConnection(): Promise<void> {
  if (client) {
    logger.info('Closing MongoDB Atlas connection...');
    await client.close();
    client = null;
    logger.info('MongoDB Atlas connection closed');
  }
}

// Health check function
export async function checkMongoHealth(): Promise<boolean> {
  try {
    if (!client) {
      return false;
    }
    
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch (error) {
    logger.error({ error }, 'MongoDB health check failed');
    return false;
  }
}

// Get connection stats for monitoring
export async function getConnectionStats() {
  try {
    if (!client) {
      return null;
    }
    
    const db = await getDb();
    const stats = await db.stats();
    const serverStatus = await db.admin().serverStatus();
    
    return {
      database: stats.db,
      collections: stats.collections,
      objects: stats.objects,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      connections: serverStatus.connections,
      uptime: serverStatus.uptime,
      version: serverStatus.version
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get MongoDB stats');
    return null;
  }
}


