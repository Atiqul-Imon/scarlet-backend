import { ObjectId } from 'mongodb';
import { getDb } from '../../core/db/mongoClient.js';
import type { Shipment, ShipmentStatus } from './model.js';
import { logger } from '../../core/logging/logger.js';

/**
 * Initialize collection with indexes
 */
export async function initShippingIndexes(): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection<Shipment>('shipments');
    
    await collection.createIndex({ orderId: 1 });
    await collection.createIndex({ orderNumber: 1 });
    await collection.createIndex({ trackingNumber: 1 });
    await collection.createIndex({ courierOrderId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ courier: 1 });
    await collection.createIndex({ createdAt: -1 });
    
    logger.info('Shipping indexes created');
  } catch (error) {
    logger.error('Failed to create shipping indexes:', error as any);
  }
}

/**
 * Create a new shipment
 */
export async function createShipment(shipment: Shipment): Promise<Shipment> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc = {
    ...shipment,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.collection<Shipment>('shipments').insertOne(doc as any);
  return {
    ...doc,
    _id: result.insertedId.toString(),
  };
}

/**
 * Find shipment by ID
 */
export async function findShipmentById(id: string): Promise<Shipment | null> {
  if (!ObjectId.isValid(id)) return null;
  
  const db = await getDb();
  const shipment = await db.collection<Shipment>('shipments').findOne({ _id: new ObjectId(id) } as any);
  if (!shipment) return null;
  
  return {
    ...shipment,
    _id: shipment._id?.toString(),
  };
}

/**
 * Find shipment by order ID
 */
export async function findShipmentByOrderId(orderId: string): Promise<Shipment | null> {
  const db = await getDb();
  const shipment = await db.collection<Shipment>('shipments').findOne({ orderId });
  if (!shipment) return null;
  
  return {
    ...shipment,
    _id: shipment._id?.toString(),
  };
}

/**
 * Find shipment by tracking number
 */
export async function findShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
  const db = await getDb();
  const shipment = await db.collection<Shipment>('shipments').findOne({ trackingNumber });
  if (!shipment) return null;
  
  return {
    ...shipment,
    _id: shipment._id?.toString(),
  };
}

/**
 * Find all shipments for an order
 */
export async function findAllShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
  const db = await getDb();
  const shipments = await db.collection<Shipment>('shipments')
    .find({ orderId })
    .sort({ createdAt: -1 })
    .toArray();
  
  return shipments.map(s => ({
    ...s,
    _id: s._id?.toString(),
  }));
}

/**
 * Update shipment
 */
export async function updateShipment(id: string, updates: Partial<Shipment>): Promise<Shipment | null> {
  if (!ObjectId.isValid(id)) return null;
  
  const db = await getDb();
  const result = await db.collection<Shipment>('shipments').findOneAndUpdate(
    { _id: new ObjectId(id) } as any,
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
    { returnDocument: 'after' }
  );
  
  if (!result) return null;
  
  return {
    ...result,
    _id: result._id.toString(),
  };
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
  message?: string
): Promise<Shipment | null> {
  if (!ObjectId.isValid(id)) return null;
  
  const shipment = await findShipmentById(id);
  if (!shipment) return null;
  
  const trackingUpdate = {
    status,
    message: message || `Status updated to ${status}`,
    timestamp: new Date().toISOString(),
  };
  
  const updates: Partial<Shipment> = {
    status,
    trackingHistory: [...shipment.trackingHistory, trackingUpdate],
  };
  
  if (status === 'delivered') {
    updates.actualDeliveryDate = new Date().toISOString();
  }
  
  return updateShipment(id, updates);
}

/**
 * Find shipments with filters
 */
export async function findShipments(filters: {
  status?: ShipmentStatus;
  courier?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}): Promise<{ shipments: Shipment[]; total: number }> {
  const db = await getDb();
  const query: any = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.courier) {
    query.courier = filters.courier;
  }
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }
  
  const total = await db.collection<Shipment>('shipments').countDocuments(query);
  
  const shipments = await db.collection<Shipment>('shipments')
    .find(query)
    .sort({ createdAt: -1 })
    .skip(filters.skip || 0)
    .limit(filters.limit || 50)
    .toArray();
  
  return {
    shipments: shipments.map(s => ({
      ...s,
      _id: s._id?.toString(),
    })),
    total,
  };
}

/**
 * Get shipment statistics
 */
export async function getShipmentStats(filters?: {
  startDate?: string;
  endDate?: string;
  courier?: string;
}): Promise<{
  total: number;
  byStatus: Record<ShipmentStatus, number>;
  byCourier: Record<string, number>;
}> {
  const db = await getDb();
  const query: any = {};
  
  if (filters?.courier) {
    query.courier = filters.courier;
  }
  
  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }
  
  const total = await db.collection<Shipment>('shipments').countDocuments(query);
  
  // Get counts by status
  const statusCounts = await db.collection<Shipment>('shipments')
    .aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();
  
  const byStatus: any = {};
  statusCounts.forEach(item => {
    byStatus[item._id] = item.count;
  });
  
  // Get counts by courier
  const courierCounts = await db.collection<Shipment>('shipments')
    .aggregate([
      { $match: query },
      { $group: { _id: '$courier', count: { $sum: 1 } } },
    ])
    .toArray();
  
  const byCourier: any = {};
  courierCounts.forEach(item => {
    byCourier[item._id] = item.count;
  });
  
  return { total, byStatus, byCourier };
}
