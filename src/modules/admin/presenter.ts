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
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';

// Dashboard Analytics
export async function getDashboardStats(): Promise<AdminStats> {
  try {
    const stats = await repo.getDashboardStats();
    
    // Get top selling products (placeholder - would need order items collection)
    const topSellingProducts = [
      { productId: '1', name: 'Rose Glow Serum', sales: 45, revenue: 2250 },
      { productId: '2', name: 'Hydrating Face Mask', sales: 38, revenue: 1520 },
      { productId: '3', name: 'Vitamin C Cream', sales: 32, revenue: 1920 }
    ];
    
    return {
      ...stats,
      topSellingProducts
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard stats');
    throw new AppError('Failed to retrieve dashboard statistics', 'STATS_ERROR');
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
    throw new AppError('Failed to retrieve users', 'USER_FETCH_ERROR');
  }
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'customer'): Promise<void> {
  try {
    const success = await repo.updateUserRole(userId, role);
    if (!success) {
      throw new AppError('User not found or update failed', 'USER_UPDATE_ERROR');
    }
  } catch (error) {
    logger.error({ error, userId, role }, 'Failed to update user role');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update user role', 'USER_UPDATE_ERROR');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const success = await repo.deleteUser(userId);
    if (!success) {
      throw new AppError('User not found or deletion failed', 'USER_DELETE_ERROR');
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to delete user');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete user', 'USER_DELETE_ERROR');
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
    throw new AppError('Failed to retrieve products', 'PRODUCT_FETCH_ERROR');
  }
}

export async function updateProductStock(productId: string, stock: number): Promise<void> {
  try {
    if (stock < 0) {
      throw new AppError('Stock cannot be negative', 'INVALID_STOCK');
    }
    
    const success = await repo.updateProductStock(productId, stock);
    if (!success) {
      throw new AppError('Product not found or update failed', 'PRODUCT_UPDATE_ERROR');
    }
  } catch (error) {
    logger.error({ error, productId, stock }, 'Failed to update product stock');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update product stock', 'PRODUCT_UPDATE_ERROR');
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const success = await repo.deleteProduct(productId);
    if (!success) {
      throw new AppError('Product not found or deletion failed', 'PRODUCT_DELETE_ERROR');
    }
  } catch (error) {
    logger.error({ error, productId }, 'Failed to delete product');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to delete product', 'PRODUCT_DELETE_ERROR');
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
    throw new AppError('Failed to retrieve orders', 'ORDER_FETCH_ERROR');
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
  trackingNumber?: string
): Promise<void> {
  try {
    const success = await repo.updateOrderStatus(orderId, status, trackingNumber);
    if (!success) {
      throw new AppError('Order not found or update failed', 'ORDER_UPDATE_ERROR');
    }
  } catch (error) {
    logger.error({ error, orderId, status }, 'Failed to update order status');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update order status', 'ORDER_UPDATE_ERROR');
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
    throw new AppError('Failed to retrieve sales analytics', 'ANALYTICS_ERROR');
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
    throw new AppError('Failed to retrieve user analytics', 'ANALYTICS_ERROR');
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
    throw new AppError('Failed to retrieve system settings', 'SETTINGS_ERROR');
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  try {
    const success = await repo.updateSystemSettings(settings);
    if (!success) {
      throw new AppError('Failed to update system settings', 'SETTINGS_UPDATE_ERROR');
    }
  } catch (error) {
    logger.error({ error, settings }, 'Failed to update system settings');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update system settings', 'SETTINGS_UPDATE_ERROR');
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
    throw new AppError('Failed to retrieve activity logs', 'LOGS_ERROR');
  }
}
