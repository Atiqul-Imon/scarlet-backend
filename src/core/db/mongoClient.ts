import { MongoClient } from 'mongodb';
import { env } from '../../config/env.js';

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(env.mongoUri, { maxPoolSize: 20 });
    await client.connect();
  }
  return client;
}

export async function getDb(dbName = 'scarlet') {
  const c = await getMongoClient();
  return c.db(dbName);
}


