import { ObjectId } from 'mongodb';
import { getDb } from '../../../core/db/mongoClient.js';
import type { UserSession, CreateSessionParams } from './model.js';

const COLLECTION_NAME = 'user_sessions';

export async function createSession(params: CreateSessionParams): Promise<UserSession> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  
  const session: Omit<UserSession, '_id'> = {
    userId: params.userId,
    tokenId: params.tokenId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    device: params.device,
    browser: params.browser,
    os: params.os,
    location: params.location,
    country: params.country,
    city: params.city,
    isCurrent: false, // Will be set when fetching sessions
    lastActive: now,
    createdAt: now,
    expiresAt: params.expiresAt,
  };

  const result = await col.insertOne(session);
  return {
    ...session,
    _id: result.insertedId.toString()
  };
}

export async function getSessionByTokenId(tokenId: string): Promise<UserSession | null> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  const session = await col.findOne({ tokenId }) as any;
  if (!session) return null;
  
  return {
    ...session,
    _id: session._id.toString()
  };
}

export async function getSessionsByUserId(userId: string, currentTokenId?: string): Promise<UserSession[]> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  // Find all active sessions (not expired)
  const now = new Date().toISOString();
  const sessions = await col.find({
    userId,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: now } }
    ]
  }).sort({ lastActive: -1 }).toArray() as any[];
  
  return sessions.map(session => ({
    ...session,
    _id: session._id.toString(),
    isCurrent: currentTokenId ? session.tokenId === currentTokenId : false
  }));
}

export async function updateSessionLastActive(sessionId: string): Promise<void> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  await col.updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: { lastActive: new Date().toISOString() } }
  );
}

export async function updateSessionLastActiveByTokenId(tokenId: string): Promise<void> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  await col.updateOne(
    { tokenId },
    { $set: { lastActive: new Date().toISOString() } }
  );
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  const result = await col.deleteOne({ _id: new ObjectId(sessionId) });
  return result.deletedCount > 0;
}

export async function deleteSessionByTokenId(tokenId: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  const result = await col.deleteOne({ tokenId });
  return result.deletedCount > 0;
}

export async function deleteAllSessionsForUser(userId: string, exceptTokenId?: string): Promise<number> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  const filter: any = { userId };
  if (exceptTokenId) {
    filter.tokenId = { $ne: exceptTokenId };
  }
  
  const result = await col.deleteMany(filter);
  return result.deletedCount;
}

export async function deleteExpiredSessions(): Promise<number> {
  const db = await getDb();
  const col = db.collection(COLLECTION_NAME);
  
  const now = new Date().toISOString();
  const result = await col.deleteMany({
    expiresAt: { $exists: true, $lt: now }
  });
  
  return result.deletedCount;
}

