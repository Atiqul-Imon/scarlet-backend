import * as repo from './repository.js';
import type { 
  AdminStats, 
  AdminUserFilters, 
  AdminProductFilters, 
  AdminOrderFilters,
  SystemSettings,
  SalesAnalytics,
  UserAnalytics 
} from './model.js';
import type { Order } from '../orders/model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import { getDb } from '../../core/db/mongoClient.js';

// Dashboard Analytics
export async function getDashboardStats(): Promise<AdminStats> {
  try {
    const [stats, topSellingProducts] = await Promise.all([
      repo.getDashboardStats(),
      repo.getTopSellingProducts(5)
    ]);
    
    return {
      ...stats,
      topSellingProducts
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard stats');
    throw new AppError('Failed to retrieve dashboard statistics', { code: 'STATS_ERROR' });
  }
}

// User Management
export async function getUsers(filters: AdminUserFilters = {}, page: number = 1, limit: number = 50) {
  try {
    const result = await repo.getUsers(filters, page, limit);
    return {
      users: result.users.map(user => ({
        ...user,
        passwordHash: undefined // Never expose password hash
      })),
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    logger.error({ error, filters }, 'Failed to get users');
    throw new AppError('Failed to retrieve users', { code: 'USER_FETCH_ERROR' });
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'customer'): Promise<void> {
  try {
    const success = await repo.updateUserRole(userId, role);
    if (!success) {
      throw new AppError('User not found or update failed', { code: 'USER_UPDATE_ERROR' });
    }
  } catch (error) {
    logger.error({ error, userId, role }, 'Failed to update user role');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update user role', { code: 'USER_UPDATE_ERROR' });
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const success = await repo.deleteUser(userId);
    if (!success) {
      throw new AppError('User not found or deletion failed', { code: 'USER_DELETE_ERROR' });
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to delete user');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete user', { code: 'USER_DELETE_ERROR' });
  }
}

// Product Management
export async function getProducts(filters: AdminProductFilters = {}, page: number = 1, limit: number = 50) {
  try {
    const result = await repo.getProducts(filters, page, limit);
    return {
      products: result.products,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    logger.error({ error, filters }, 'Failed to get products');
    throw new AppError('Failed to retrieve products', { code: 'PRODUCT_FETCH_ERROR' });
  }
}

export async function getProduct(productId: string) {
  try {
    const product = await repo.getProduct(productId);
    return product;
  } catch (error) {
    logger.error({ error, productId }, 'Failed to get product');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to retrieve product', { code: 'PRODUCT_FETCH_ERROR' });
  }
}

export async function createProduct(productData: any) {
  try {
    // Transform frontend data to match backend model
    const product = {
      title: productData.name,
      slug: productData.slug,
      description: productData.description || '',
      shortDescription: productData.shortDescription || '',
      price: {
        amount: productData.price,
        currency: 'BDT',
        originalAmount: productData.comparePrice || undefined
      },
      sku: productData.sku,
      barcode: productData.barcode || '',
      brand: productData.brand || '',
      images: productData.images || [],
      stock: productData.stock || 0,
      lowStockThreshold: productData.lowStockThreshold || 10,
      trackInventory: productData.trackInventory !== false,
      status: productData.status || 'draft',
      weight: productData.weight || 0,
      dimensions: productData.dimensions || { length: 0, width: 0, height: 0 },
      seoTitle: productData.seoTitle || productData.name,
      seoDescription: productData.seoDescription || productData.shortDescription || '',
      seoKeywords: productData.seoKeywords || [],
      tags: productData.tags || [],
      categoryIds: productData.category ? [productData.category] : [],
      attributes: {
        category: productData.category,
        subcategory: productData.subcategory,
        cost: productData.cost || 0
      },
      homepageSection: productData.homepageSection || null,
      variants: productData.variants || []
    };

    const createdProduct = await repo.createProduct(product);
    
    // Note: trackInventory field is kept for future expansion but no automatic inventory creation
    
    return createdProduct;
  } catch (error) {
    logger.error({ error, productData }, 'Failed to create product');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create product', { code: 'PRODUCT_CREATE_ERROR' });
  }
}

export async function updateProduct(productId: string, productData: any) {
  try {
    // STOCK VALIDATION - Check for negative stock values
    const newStock = productData.stock || 0;
    if (newStock < 0) {
      throw new AppError('Stock cannot be negative', { code: 'INVALID_STOCK' });
    }

    // Get current product to check for stock changes
    const currentProduct = await repo.getProduct(productId);
    if (!currentProduct) {
      throw new AppError('Product not found', { code: 'PRODUCT_NOT_FOUND' });
    }

    // STOCK CHANGE VALIDATION - Warn if stock is being reduced significantly
    const currentStock = currentProduct.stock || 0;
    const stockReduction = currentStock - newStock;
    
    if (stockReduction > 0 && stockReduction > (currentStock * 0.5)) {
      logger.warn(`Significant stock reduction for product ${productId}: ${currentStock} → ${newStock} (${stockReduction} units)`);
    }

    // Transform frontend data to match backend model
    const product = {
      title: productData.name,
      slug: productData.slug,
      description: productData.description || '',
      shortDescription: productData.shortDescription || '',
      price: {
        amount: productData.price,
        currency: 'BDT',
        originalAmount: productData.comparePrice || undefined
      },
      sku: productData.sku,
      barcode: productData.barcode || '',
      brand: productData.brand || '',
      images: productData.images || [],
      stock: newStock,
      lowStockThreshold: productData.lowStockThreshold || 10,
      trackInventory: productData.trackInventory !== false,
      status: productData.status || 'draft',
      weight: productData.weight || 0,
      dimensions: productData.dimensions || { length: 0, width: 0, height: 0 },
      seoTitle: productData.seoTitle || productData.name,
      seoDescription: productData.seoDescription || productData.shortDescription || '',
      seoKeywords: productData.seoKeywords || [],
      tags: productData.tags || [],
      categoryIds: productData.category ? [productData.category] : [],
      attributes: {
        category: productData.category,
        subcategory: productData.subcategory,
        cost: productData.cost || 0
      },
      homepageSection: productData.homepageSection || null,
      variants: productData.variants || []
    };

    const updatedProduct = await repo.updateProduct(productId, product);
    
    // Log stock change for audit
    if (currentStock !== newStock) {
      logger.info(`Product ${productId} stock updated: ${currentStock} → ${newStock} (change: ${newStock - currentStock})`);
    }
    
    return updatedProduct;
  } catch (error) {
    logger.error({ error, productId, productData }, 'Failed to update product');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update product', { code: 'PRODUCT_UPDATE_ERROR' });
  }
}


export async function deleteProduct(productId: string): Promise<void> {
  try {
    const success = await repo.deleteProduct(productId);
    if (!success) {
      throw new AppError('Product not found or deletion failed', { code: 'PRODUCT_DELETE_ERROR' });
    }
  } catch (error) {
    logger.error({ error, productId }, 'Failed to delete product');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete product', { code: 'PRODUCT_DELETE_ERROR' });
  }
}

// Order Management
export async function getOrders(filters: AdminOrderFilters = {}, page: number = 1, limit: number = 50) {
  try {
    const result = await repo.getOrders(filters, page, limit);
    return {
      orders: result.orders,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    logger.error({ error, filters }, 'Failed to get orders');
    throw new AppError('Failed to retrieve orders', { code: 'ORDER_FETCH_ERROR' });
  }
}

export async function getOrderById(orderId: string): Promise<Order> {
  try {
    const order = await repo.getOrderById(orderId);
    if (!order) {
      throw new AppError('Order not found', { code: 'ORDER_NOT_FOUND' });
    }
    return order;
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to get order by ID');
    throw new AppError('Failed to retrieve order', { code: 'ORDER_FETCH_ERROR' });
  }
}

// Category Management
export async function updateCategory(categoryId: string, categoryData: any) {
  try {
    const updatedCategory = await repo.updateCategory(categoryId, categoryData);
    return updatedCategory;
  } catch (error) {
    logger.error({ error, categoryId, categoryData }, 'Failed to update category');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update category', { code: 'CATEGORY_UPDATE_ERROR' });
  }
}

export async function updateCategorySortOrder(categoryUpdates: Array<{id: string, sortOrder: number}>) {
  try {
    const results = await Promise.all(
      categoryUpdates.map(update => 
        repo.updateCategory(update.id, { sortOrder: update.sortOrder })
      )
    );
    
    // Invalidate category cache after bulk update
    const { catalogCache } = await import('../catalog/cache.js');
    await catalogCache.invalidateListCaches();
    
    logger.info(`Updated sort order for ${categoryUpdates.length} categories`);
    return results;
  } catch (error) {
    logger.error({ error, categoryUpdates }, 'Failed to update category sort order');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update category sort order', { code: 'CATEGORY_SORT_UPDATE_ERROR' });
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'refunded'
): Promise<void> {
  try {
    // Get the order first to handle inventory
    const order = await repo.getOrderById(orderId);
    if (!order) {
      throw new AppError('Order not found', { code: 'ORDER_NOT_FOUND' });
    }

    // STOCK RESTORATION LOGIC - Restore stock for cancelled/refunded orders
    if (status === 'cancelled' || status === 'refunded') {
      try {
        // Import catalog repository for stock operations
        const catalogRepo = await import('../catalog/repository.js');
        
        // Restore stock for each item in the order
        for (const item of order.items) {
          const stockRestored = await catalogRepo.incrementStock(item.productId, item.quantity);
          if (stockRestored) {
            logger.info(`Restored ${item.quantity} units of stock for product ${item.productId} (${item.title})`);
          } else {
            logger.warn(`Failed to restore stock for product ${item.productId} (${item.title})`);
          }
        }
        
        logger.info(`Stock restoration completed for order ${orderId} (${order.orderNumber})`);
      } catch (stockError) {
        logger.error({ stockError, orderId }, 'Failed to restore stock during order cancellation');
        // Don't throw error - order status update should still proceed
      }
    }

    // Update the order status with proper timestamp and payment status
    const success = await repo.updateOrderStatus(orderId, status);
    if (!success) {
      throw new AppError('Order not found or update failed', { code: 'ORDER_UPDATE_ERROR' });
    }

    // Update payment status to 'refunded' when order is refunded
    if (status === 'refunded') {
      await repo.updateOrderPaymentStatus(orderId, 'refunded');
    }
    
    logger.info(`Order ${orderId} status updated to ${status}`);
  } catch (error) {
    logger.error({ error, orderId, status }, 'Failed to update order status');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update order status', { code: 'ORDER_UPDATE_ERROR' });
  }
}

// Analytics
export async function getSalesAnalytics(dateFrom: Date, dateTo: Date): Promise<SalesAnalytics> {
  try {
    // This would be implemented with proper aggregation queries
    // For now, returning mock data structure
    return {
      period: `${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`,
      revenue: 25750.50,
      orders: 156,
      averageOrderValue: 165.07,
      topProducts: [
        { productId: '1', name: 'Rose Glow Serum', quantity: 45, revenue: 2250 },
        { productId: '2', name: 'Hydrating Face Mask', quantity: 38, revenue: 1520 },
        { productId: '3', name: 'Vitamin C Cream', quantity: 32, revenue: 1920 }
      ],
      revenueByCategory: [
        { category: 'Skincare', revenue: 15200 },
        { category: 'Makeup', revenue: 8550 },
        { category: 'Bath & Body', revenue: 2000 }
      ],
      dailyRevenue: [] // Would be populated with daily breakdown
    };
  } catch (error) {
    logger.error({ error, dateFrom, dateTo }, 'Failed to get sales analytics');
    throw new AppError('Failed to retrieve sales analytics', { code: 'ANALYTICS_ERROR' });
  }
}

export async function getUserAnalytics(): Promise<UserAnalytics> {
  try {
    // This would be implemented with proper aggregation queries
    return {
      totalUsers: 1248,
      newUsers: 23,
      activeUsers: 456,
      usersByRole: [
        { role: 'customer', count: 1245 },
        { role: 'staff', count: 2 },
        { role: 'admin', count: 1 }
      ],
      registrationTrend: [], // Would be populated with daily registration counts
      topCustomers: [
        { userId: '1', name: 'Sarah Ahmed', totalOrders: 12, totalSpent: 2340 },
        { userId: '2', name: 'Fatima Khan', totalOrders: 8, totalSpent: 1890 },
        { userId: '3', name: 'Ayesha Rahman', totalOrders: 6, totalSpent: 1560 }
      ]
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get user analytics');
    throw new AppError('Failed to retrieve user analytics', { code: 'ANALYTICS_ERROR' });
  }
}

// System Settings
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const settings = await repo.getSystemSettings();
    
    // Return default settings if none exist
    if (!settings) {
      return {
        siteName: 'Scarlet Beauty',
        siteDescription: 'Premium Beauty & Skincare Store',
        contactEmail: 'info@scarletbeauty.com',
        contactPhone: '+880-1234-567890',
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
        lowStockThreshold: 10,
        emailNotifications: true,
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: false,
        socialMedia: {},
        paymentGateways: {
          stripe: { enabled: false },
          paypal: { enabled: false }
        },
        shippingZones: [
          { name: 'Dhaka', areas: ['Dhaka City', 'Uttara', 'Dhanmondi'], cost: 60, freeShippingThreshold: 1500 },
          { name: 'Chittagong', areas: ['Chittagong City'], cost: 100, freeShippingThreshold: 2000 }
        ]
      };
    }
    
    return settings;
  } catch (error) {
    logger.error({ error }, 'Failed to get system settings');
    throw new AppError('Failed to retrieve system settings', { code: 'SETTINGS_ERROR' });
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  try {
    const success = await repo.updateSystemSettings(settings);
    if (!success) {
      throw new AppError('Failed to update system settings', { code: 'SETTINGS_UPDATE_ERROR' });
    }
  } catch (error) {
    logger.error({ error, settings }, 'Failed to update system settings');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update system settings', { code: 'SETTINGS_UPDATE_ERROR' });
  }
}

// Activity Logging
export async function logActivity(
  userId: string,
  userEmail: string,
  action: string,
  details?: any,
  ip?: string,
  userAgent?: string
): Promise<void> {
  try {
    await repo.logAdminActivity({
      userId,
      userEmail,
      action,
      details,
      timestamp: new Date(),
      ip: ip || 'unknown',
      userAgent
    });
  } catch (error) {
    logger.error({ error, userId, action }, 'Failed to log admin activity');
    // Don't throw error for logging failures
  }
}

export async function getActivityLogs(page: number = 1, limit: number = 50) {
  try {
    const result = await repo.getAdminActivityLogs(page, limit);
    return {
      logs: result.logs,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get activity logs');
    throw new AppError('Failed to retrieve activity logs', { code: 'LOGS_ERROR' });
  }
}

// Category Management
export async function getCategories(filters: any = {}, page: number = 1, limit: number = 50) {
  try {
    const result = await repo.getCategories(filters, page, limit);
    return {
      categories: result.categories,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    logger.error({ error, filters, page, limit }, 'Failed to get categories');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get categories', { code: 'CATEGORIES_FETCH_ERROR' });
  }
}

export async function getCategory(categoryId: string) {
  try {
    const category = await repo.getCategory(categoryId);
    return category;
  } catch (error) {
    logger.error({ error, categoryId }, 'Failed to get category');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get category', { code: 'CATEGORY_FETCH_ERROR' });
  }
}

export async function createCategory(categoryData: any) {
  try {
    // Transform frontend data to match backend model
    const category = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || '',
      parentId: categoryData.parentId || null,
      image: categoryData.image || '',
      isActive: categoryData.isActive !== false,
      showInHomepage: categoryData.showInHomepage || false,
      sortOrder: categoryData.sortOrder || 0,
      icon: categoryData.icon || ''
    };

    const createdCategory = await repo.createCategory(category);
    return createdCategory;
  } catch (error) {
    logger.error({ error, categoryData }, 'Failed to create category');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to create category', { code: 'CATEGORY_CREATE_ERROR' });
  }
}


export async function updateCategoryStatus(categoryId: string, isActive: boolean) {
  try {
    await repo.updateCategoryStatus(categoryId, isActive);
    return { success: true };
  } catch (error) {
    logger.error({ error, categoryId, isActive }, 'Failed to update category status');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update category status', { code: 'CATEGORY_STATUS_UPDATE_ERROR' });
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await repo.deleteCategory(categoryId);
    return { success: true };
  } catch (error) {
    logger.error({ error, categoryId }, 'Failed to delete category');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete category', { code: 'CATEGORY_DELETE_ERROR' });
  }
}

