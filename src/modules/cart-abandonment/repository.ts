import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { CartAbandonment, CartAbandonmentRecovery } from './model.js';

export async function createCartAbandonment(abandonment: CartAbandonment): Promise<CartAbandonment> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  const result = await col.insertOne(abandonment as any);
  return { ...abandonment, _id: result.insertedId.toString() };
}

export async function getCartAbandonmentBySessionId(sessionId: string): Promise<CartAbandonment | null> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  return (await col.findOne({ sessionId })) as any as CartAbandonment | null;
}

export async function getCartAbandonmentByUserId(userId: string): Promise<CartAbandonment | null> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  return (await col.findOne({ userId, recovered: false })) as any as CartAbandonment | null;
}

export async function updateCartAbandonment(id: string, updates: Partial<CartAbandonment>): Promise<void> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  await col.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date().toISOString() 
      } 
    }
  );
}

export async function markCartAbandonmentAsRecovered(id: string, orderId: string): Promise<void> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  await col.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        recovered: true,
        recoveredAt: new Date().toISOString(),
        recoveredOrderId: orderId,
        updatedAt: new Date().toISOString()
      } 
    }
  );
}

export async function getAbandonedCartsForRecovery(): Promise<CartAbandonment[]> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  
  // Get carts abandoned more than 1 hour ago but less than 7 days ago
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return (await col.find({
    recovered: false,
    abandonedAt: { $gte: sevenDaysAgo, $lte: oneHourAgo },
    $or: [
      { email: { $exists: true, $ne: null } },
      { userId: { $exists: true, $ne: null } }
    ]
  }).toArray()) as any as CartAbandonment[];
}

export async function createRecoveryRecord(recovery: CartAbandonmentRecovery): Promise<CartAbandonmentRecovery> {
  const db = await getDb();
  const col = db.collection('cart_abandonment_recoveries');
  const result = await col.insertOne(recovery as any);
  return { ...recovery, _id: result.insertedId.toString() };
}

export async function incrementRecoveryCount(abandonmentId: string, type: 'email' | 'sms'): Promise<void> {
  const db = await getDb();
  const col = db.collection('cart_abandonments');
  
  const field = type === 'email' ? 'recoveryEmailsSent' : 'recoverySmsSent';
  await col.updateOne(
    { _id: new ObjectId(abandonmentId) },
    { 
      $inc: { [field]: 1 },
      $set: { updatedAt: new Date().toISOString() }
    }
  );
}
