import { getDb } from '../../core/db/mongoClient.js';
import type { User } from '../auth/model.js';

export async function findById(userId: string): Promise<User | null> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db.collection<User>('users').findOne({ _id: new ObjectId(userId) } as any);
}

export async function updateProfile(userId: string, patch: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'preferences' | 'dateOfBirth'>>): Promise<void> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  // Clean up undefined values, but allow empty strings for optional fields
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([_, value]) => value !== undefined)
  );
  
  await db.collection<User>('users').updateOne(
    { _id: new ObjectId(userId) } as any,
    { $set: { ...cleanPatch, updatedAt: new Date().toISOString() } }
  );
}


