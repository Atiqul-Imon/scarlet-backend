import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
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
  return db.collection<Order>('orders')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = await getDb();
  return db.collection<Order>('orders')
    .findOne({ _id: new ObjectId(orderId) } as any);
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  const db = await getDb();
  return db.collection<Order>('orders')
    .findOne({ orderNumber });
}

export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order> {
  const db = await getDb();
  const now = new Date().toISOString();
  const updatedOrder = await db.collection<Order>('orders')
    .findOneAndUpdate(
      { _id: new ObjectId(orderId) } as any,
      { $set: { ...updates, updatedAt: now } },
      { returnDocument: 'after' }
    );
  
  if (!updatedOrder) {
    throw new Error('Order not found');
  }
  
  return updatedOrder;
}

export async function listOrdersPaginated(
  filters: {
    userId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
  page: number = 1,
  limit: number = 10
): Promise<{ orders: Order[]; total: number; totalPages: number }> {
  const db = await getDb();
  const collection = db.collection<Order>('orders');
  
  // Build query
  const query: any = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom.toISOString();
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo.toISOString();
  }
  
  // Get total count
  const total = await collection.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  
  // Get paginated results
  const orders = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  
  return { orders, total, totalPages };
}


