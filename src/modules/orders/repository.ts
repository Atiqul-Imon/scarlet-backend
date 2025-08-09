import { getDb } from '../../core/db/mongoClient.js';
import type { Order } from './model.js';

export async function insertOrder(order: Order): Promise<Order> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = { ...order, createdAt: now, updatedAt: now };
  const res = await db.collection<Order>('orders').insertOne(doc as any);
  return { ...doc, _id: res.insertedId.toString() } as Order;
}

export async function listOrdersByUser(userId: string): Promise<Order[]> {
  const db = await getDb();
  return db.collection<Order>('orders').find({ userId }).sort({ createdAt: -1 }).toArray();
}


