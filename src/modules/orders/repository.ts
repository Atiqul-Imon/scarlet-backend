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
  // Hide SSLCommerz orders until payment is completed
  const query: any = {
    userId,
    $or: [
      { 'paymentInfo.method': { $ne: 'sslcommerz' } },
      { 'paymentInfo.status': 'completed' }
    ]
  };
  return db.collection<Order>('orders')
    .find(query)
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

/**
 * Update order payment status specifically
 */
export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  try {
    const result = await db.collection<Order>('orders').updateOne(
      { _id: new ObjectId(orderId) } as any,
      { 
        $set: { 
          'paymentInfo.status': paymentStatus,
          updatedAt: now 
        } 
      }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating order payment status:', error);
    return false;
  }
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

export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Order>('orders').updateOne(
    { _id: new ObjectId(orderId) } as any,
    { $set: { status: status as any, updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

export async function getOrders(page: number = 1, limit: number = 10, filters: any = {}): Promise<{ orders: Order[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  const [orders, total] = await Promise.all([
    db.collection<Order>('orders')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<Order>('orders').countDocuments()
  ]);
  
  return { orders, total };
}


