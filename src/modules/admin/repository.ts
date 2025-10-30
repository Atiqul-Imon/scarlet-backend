import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { 
  AdminActivityLog, 
  AdminUserFilters, 
  AdminProductFilters, 
  AdminOrderFilters,
  SystemSettings 
} from './model.js';
import type { Category } from '../catalog/model.js';
import { getAllDescendantCategoryIds } from '../catalog/repository.js';
import type { User } from '../auth/model.js';
import type { Product } from '../catalog/model.js';
import type { Order } from '../orders/model.js';

// Activity Logging
export async function logAdminActivity(log: Omit<AdminActivityLog, '_id'>): Promise<void> {
  const db = await getDb();
  await db.collection('admin_activity_logs').insertOne({
    ...log,
    timestamp: new Date()
  });
}

export async function getAdminActivityLogs(
  page: number = 1, 
  limit: number = 50
): Promise<{ logs: AdminActivityLog[]; total: number }> {
  const db = await getDb();
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
  
  return { logs: logs as unknown as AdminActivityLog[], total };
}

// User Management
export async function getUsers(
  filters: AdminUserFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ users: User[]; total: number }> {
  const db = await getDb();
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
  
  return { users: users as unknown as User[], total };
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'customer'): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { role, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
  return result.deletedCount > 0;
}

// Product Management
export async function getProducts(
  filters: AdminProductFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ products: Product[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  if (filters.category) {
    // Get all descendant category IDs (including the category itself)
    const allCategoryIds = await getAllDescendantCategoryIds(filters.category);
    query.categoryIds = { $in: allCategoryIds }; // Product uses categoryIds array
  }
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    query['price.amount'] = {}; // Price is an object with amount field
    if (filters.priceMin !== undefined) query['price.amount'].$gte = filters.priceMin;
    if (filters.priceMax !== undefined) query['price.amount'].$lte = filters.priceMax;
  }
  if (filters.inStock !== undefined) {
    query.stock = filters.inStock ? { $gt: 0 } : { $lte: 0 };
  }
  if (filters.lowStock) {
    query.stock = { $lte: 10 }; // Low stock threshold
  }
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } }, // Changed from 'name' to 'title'
      { description: { $regex: filters.search, $options: 'i' } },
      { slug: { $regex: filters.search, $options: 'i' } }, // Changed from 'sku' to 'slug'
      { brand: { $regex: filters.search, $options: 'i' } } // Added brand search
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
  
  return { products: products as unknown as Product[], total };
}

export async function getProduct(productId: string): Promise<Product | null> {
  const db = await getDb();
  
  try {
    const objectId = new ObjectId(productId);
    const product = await db.collection('products').findOne({ _id: objectId });
    return product as Product | null;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
}

export async function createProduct(productData: any): Promise<Product> {
  const db = await getDb();
  
  // Check if product with same slug already exists
  const existingProduct = await db.collection('products').findOne({ slug: productData.slug });
  if (existingProduct) {
    throw new Error('Product with this slug already exists');
  }
  
  // Check if product with same SKU already exists
  const existingSku = await db.collection('products').findOne({ sku: productData.sku });
  if (existingSku) {
    throw new Error('Product with this SKU already exists');
  }
  
  const product = {
    ...productData,
    _id: new ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: productData.status === 'active',
    isNewArrival: true, // New products are marked as new arrivals
    isBestSeller: false,
    isFeatured: false,
    salesCount: 0,
    viewCount: 0
  };
  
  await db.collection('products').insertOne(product);
  return product as Product;
}

export async function updateProduct(productId: string, productData: any): Promise<Product | null> {
  const db = await getDb();
  
  // Check if product exists
  const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(productId) });
  if (!existingProduct) {
    return null;
  }
  
  // Check if slug is being changed and if new slug already exists
  if (productData.slug && productData.slug !== existingProduct.slug) {
    const slugExists = await db.collection('products').findOne({ 
      slug: productData.slug, 
      _id: { $ne: new ObjectId(productId) } 
    });
    if (slugExists) {
      throw new Error('Product with this slug already exists');
    }
  }
  
  // Check if SKU is being changed and if new SKU already exists
  if (productData.sku && productData.sku !== existingProduct.sku) {
    const skuExists = await db.collection('products').findOne({ 
      sku: productData.sku, 
      _id: { $ne: new ObjectId(productId) } 
    });
    if (skuExists) {
      throw new Error('Product with this SKU already exists');
    }
  }
  
  const updateData = {
    ...productData,
    updatedAt: new Date(),
    isActive: productData.status === 'active'
  };
  
  const result = await db.collection('products').updateOne(
    { _id: new ObjectId(productId) },
    { $set: updateData }
  );
  
  if (result.modifiedCount > 0) {
    const updatedProduct = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    return updatedProduct as unknown as Product;
  }
  
  return null;
}


export async function deleteProduct(productId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
  return result.deletedCount > 0;
}

// Category Management
export async function updateCategory(categoryId: string, categoryData: any): Promise<any> {
  const db = await getDb();
  
  try {
    const updateData = {
      ...categoryData,
      updatedAt: new Date().toISOString()
    };
    
    const result = await db.collection('categories').updateOne(
      { _id: new ObjectId(categoryId) },
      { $set: updateData }
    );
    
    if (result.modifiedCount > 0) {
      const updatedCategory = await db.collection('categories').findOne({ _id: new ObjectId(categoryId) });
      return updatedCategory;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

// Order Management
export async function getOrders(
  filters: AdminOrderFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ orders: Order[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  // Business rule: Only show SSLCommerz orders after successful payment
  // Show all non-SSLCommerz orders (e.g., COD) regardless of payment status
  query.$or = [
    { 'paymentInfo.method': { $ne: 'sslcommerz' } },
    { 'paymentInfo.status': 'completed' }
  ];
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
  
  return { orders: orders as unknown as Order[], total };
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = await getDb();
  return db.collection<Order>('orders')
    .findOne({ _id: new ObjectId(orderId) } as any);
}

export async function updateOrderStatus(
  orderId: string, 
  status: 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
): Promise<boolean> {
  const db = await getDb();
  const updateData: any = { status, updatedAt: new Date() };
  
  // Set deliveredAt timestamp when status changes to delivered
  if (status === 'delivered') {
    updateData.deliveredAt = new Date().toISOString();
  }
  
  const result = await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    { $set: updateData }
  );
  return result.modifiedCount > 0;
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('orders').updateOne(
    { _id: new ObjectId(orderId) },
    { 
      $set: { 
        'paymentInfo.status': paymentStatus,
        updatedAt: new Date()
      }
    }
  );
  return result.modifiedCount > 0;
}

// Analytics
export async function getDashboardStats(): Promise<any> {
  const db = await getDb();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    newUsersToday,
    ordersToday,
    pendingOrders,
    refundedOrders,
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
    db.collection('orders').countDocuments({ status: 'refunded' }),
    db.collection('products').countDocuments({ stock: { $lte: 10 } }),
    db.collection('orders').aggregate([
      { 
        $match: { 
          status: { $in: ['delivered', 'processing', 'confirmed'] },
          // Exclude refunded orders from revenue
          $nor: [{ status: 'refunded' }, { status: 'cancelled' }]
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray(),
    db.collection('orders').aggregate([
      { 
        $match: { 
          createdAt: { $gte: today },
          status: { $in: ['delivered', 'processing', 'confirmed'] },
          // Exclude refunded orders from today's revenue
          $nor: [{ status: 'refunded' }, { status: 'cancelled' }]
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
    refundedOrders,
    lowStockProducts
  };
}

// Get top selling products from orders
export async function getTopSellingProducts(limit: number = 5): Promise<Array<{
  productId: string;
  name: string;
  sales: number;
  revenue: number;
}>> {
  const db = await getDb();
  
  try {
    const pipeline = [
      // Match only delivered, processing, or confirmed orders (exclude cancelled/refunded)
      {
        $match: {
          status: { $in: ['delivered', 'processing', 'confirmed'] },
          $nor: [{ status: 'refunded' }, { status: 'cancelled' }]
        }
      },
      // Unwind the items array to work with individual products
      { $unwind: '$items' },
      // Group by productId and sum quantities and revenue
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      // Unwind the product array (should have only one product)
      { $unwind: '$product' },
      // Project the required fields
      {
        $project: {
          productId: '$_id',
          name: '$product.title',
          sales: '$totalQuantity',
          revenue: '$totalRevenue'
        }
      },
      // Sort by sales quantity (descending)
      { $sort: { sales: -1 } },
      // Limit results
      { $limit: limit }
    ];

    const results = await db.collection('orders').aggregate(pipeline).toArray();
    
    return results.map(result => ({
      productId: result.productId.toString(),
      name: result.name,
      sales: result.sales,
      revenue: result.revenue
    }));
  } catch (error) {
    console.error('Error fetching top selling products:', error);
    // Return empty array on error
    return [];
  }
}

// System Settings
export async function getSystemSettings(): Promise<SystemSettings | null> {
  const db = await getDb();
  const settings = await db.collection('system_settings').findOne({});
  return settings as SystemSettings | null;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('system_settings').updateOne(
    {},
    { $set: { ...settings, updatedAt: new Date() } },
    { upsert: true }
  );
  return result.acknowledged;
}

// Category Management
export async function getCategories(
  filters: any = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<{ categories: Category[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  // Build query
  const query: any = {};
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  const [categories, total] = await Promise.all([
    db.collection('categories')
      .find(query)
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('categories').countDocuments(query)
  ]);
  
  return { categories: categories as unknown as Category[], total };
}

export async function getCategory(categoryId: string): Promise<Category | null> {
  const db = await getDb();
  const category = await db.collection('categories').findOne({ _id: new ObjectId(categoryId) });
  return category as Category | null;
}

export async function createCategory(categoryData: any): Promise<Category> {
  const db = await getDb();
  const now = new Date();
  
  const category = {
    ...categoryData,
    createdAt: now,
    updatedAt: now
  };
  
  const result = await db.collection('categories').insertOne(category);
  return { ...category, _id: result.insertedId } as Category;
}


export async function updateCategoryStatus(categoryId: string, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('categories').updateOne(
    { _id: new ObjectId(categoryId) },
    { $set: { isActive, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('categories').deleteOne({ _id: new ObjectId(categoryId) });
  return result.deletedCount > 0;
}
