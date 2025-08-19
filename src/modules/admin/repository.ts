import { getDb } from '../../core/db/mongoClient.js';
import type { 
  AdminActivityLog, 
  AdminUserFilters, 
  AdminProductFilters, 
  AdminOrderFilters,
  SystemSettings 
} from './model.js';
import type { User } from '../auth/model.js';
import type { Product } from '../catalog/model.js';
import type { Order } from '../orders/model.js';

// Activity Logging
export async function logAdminActivity(log: Omit<AdminActivityLog, '_id'>): Promise<void> {
  const db = getDb();
  await db.collection('admin_activity_logs').insertOne({
    ...log,
    timestamp: new Date()
  });
}

export async function getAdminActivityLogs(
  page: number = 1, 
  limit: number = 50
): Promise<{ logs: AdminActivityLog[]; total: number }> {
  const db = getDb();
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    db.collection('admin_activity_logs')
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('admin_activity_logs').countDocuments({})
  ]);
  
  return { logs: logs as AdminActivityLog[], total };
}

// User Management
export async function getUsers(
  filters: AdminUserFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ users: User[]; total: number }> {
  const db = getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  if (filters.role) query.role = filters.role;
  if (filters.isEmailVerified !== undefined) query.isEmailVerified = filters.isEmailVerified;
  if (filters.isPhoneVerified !== undefined) query.isPhoneVerified = filters.isPhoneVerified;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }
  if (filters.search) {
    query.$or = [
      { firstName: { $regex: filters.search, $options: 'i' } },
      { lastName: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  const [users, total] = await Promise.all([
    db.collection('users')
      .find(query, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('users').countDocuments(query)
  ]);
  
  return { users: users as User[], total };
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'customer'): Promise<boolean> {
  const db = getDb();
  const result = await db.collection('users').updateOne(
    { _id: userId },
    { $set: { role, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.collection('users').deleteOne({ _id: userId });
  return result.deletedCount > 0;
}

// Product Management
export async function getProducts(
  filters: AdminProductFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ products: Product[]; total: number }> {
  const db = getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  if (filters.category) query.category = filters.category;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    query.price = {};
    if (filters.priceMin !== undefined) query.price.$gte = filters.priceMin;
    if (filters.priceMax !== undefined) query.price.$lte = filters.priceMax;
  }
  if (filters.inStock !== undefined) {
    query.stock = filters.inStock ? { $gt: 0 } : { $lte: 0 };
  }
  if (filters.lowStock) {
    query.stock = { $lte: 10 }; // Low stock threshold
  }
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { sku: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  const [products, total] = await Promise.all([
    db.collection('products')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('products').countDocuments(query)
  ]);
  
  return { products: products as Product[], total };
}

export async function updateProductStock(productId: string, stock: number): Promise<boolean> {
  const db = getDb();
  const result = await db.collection('products').updateOne(
    { _id: productId },
    { $set: { stock, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.collection('products').deleteOne({ _id: productId });
  return result.deletedCount > 0;
}

// Order Management
export async function getOrders(
  filters: AdminOrderFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ orders: Order[]; total: number }> {
  const db = getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  if (filters.status) query.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    query.total = {};
    if (filters.minAmount !== undefined) query.total.$gte = filters.minAmount;
    if (filters.maxAmount !== undefined) query.total.$lte = filters.maxAmount;
  }
  if (filters.search) {
    query.$or = [
      { orderNumber: { $regex: filters.search, $options: 'i' } },
      { 'customer.email': { $regex: filters.search, $options: 'i' } },
      { 'customer.phone': { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  const [orders, total] = await Promise.all([
    db.collection('orders')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('orders').countDocuments(query)
  ]);
  
  return { orders: orders as Order[], total };
}

export async function updateOrderStatus(
  orderId: string, 
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
  trackingNumber?: string
): Promise<boolean> {
  const db = getDb();
  const updateData: any = { status, updatedAt: new Date() };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  
  const result = await db.collection('orders').updateOne(
    { _id: orderId },
    { $set: updateData }
  );
  return result.modifiedCount > 0;
}

// Analytics
export async function getDashboardStats(): Promise<any> {
  const db = getDb();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    newUsersToday,
    ordersToday,
    pendingOrders,
    lowStockProducts,
    revenueData,
    revenueTodayData
  ] = await Promise.all([
    db.collection('users').countDocuments({}),
    db.collection('orders').countDocuments({}),
    db.collection('products').countDocuments({}),
    db.collection('users').countDocuments({ createdAt: { $gte: today } }),
    db.collection('orders').countDocuments({ createdAt: { $gte: today } }),
    db.collection('orders').countDocuments({ status: 'pending' }),
    db.collection('products').countDocuments({ stock: { $lte: 10 } }),
    db.collection('orders').aggregate([
      { $match: { status: { $in: ['delivered', 'processing', 'shipped'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray(),
    db.collection('orders').aggregate([
      { 
        $match: { 
          createdAt: { $gte: today },
          status: { $in: ['delivered', 'processing', 'shipped'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray()
  ]);
  
  const totalRevenue = revenueData[0]?.total || 0;
  const revenueToday = revenueTodayData[0]?.total || 0;
  
  return {
    totalUsers,
    totalOrders,
    totalRevenue,
    totalProducts,
    newUsersToday,
    ordersToday,
    revenueToday,
    pendingOrders,
    lowStockProducts
  };
}

// System Settings
export async function getSystemSettings(): Promise<SystemSettings | null> {
  const db = getDb();
  const settings = await db.collection('system_settings').findOne({});
  return settings as SystemSettings | null;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  const db = getDb();
  const result = await db.collection('system_settings').updateOne(
    {},
    { $set: { ...settings, updatedAt: new Date() } },
    { upsert: true }
  );
  return result.acknowledged;
}
