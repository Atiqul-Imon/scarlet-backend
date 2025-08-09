import { getDb } from '../../core/db/mongoClient.js';
import type { User } from './model.js';

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>('users').findOne({ email });
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db.collection<User>('users').findOne({ _id: new ObjectId(id) } as any);
}

export async function insertUser(user: User): Promise<User> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = { ...user, createdAt: now, updatedAt: now } as User;
  const res = await db.collection<User>('users').insertOne(doc as any);
  return { ...doc, _id: res.insertedId.toString() };
}


