import type { Request, Response } from 'express';
import { ok, created, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import { logger } from '../../core/logging/logger.js';

// Dashboard
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await presenter.getDashboardStats();
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_DASHBOARD',
      undefined,
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, stats);
});

// User Management
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { 
    role, 
    isEmailVerified, 
    isPhoneVerified, 
    dateFrom, 
    dateTo, 
    search, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const filters = {
    role: role as any,
    isEmailVerified: isEmailVerified === 'true' ? true : isEmailVerified === 'false' ? false : undefined,
    isPhoneVerified: isPhoneVerified === 'true' ? true : isPhoneVerified === 'false' ? false : undefined,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    search: search as string
  };
  
  const result = await presenter.getUsers(filters, Number(page), Number(limit));
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_USERS',
      { filters, page, limit },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, result);
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  
  if (!role || !['admin', 'staff', 'customer'].includes(role)) {
    return fail(res, 'Invalid role specified', 'INVALID_ROLE', 400);
  }
  
  await presenter.updateUserRole(userId, role);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_USER_ROLE',
      { userId, role },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'User role updated successfully' });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  // Prevent admin from deleting themselves
  if (req.user && req.user._id?.toString() === userId) {
    return fail(res, 'Cannot delete your own account', 'CANNOT_DELETE_SELF', 400);
  }
  
  await presenter.deleteUser(userId);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'DELETE_USER',
      { userId },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'User deleted successfully' });
});

// Product Management
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { 
    category, 
    priceMin, 
    priceMax, 
    inStock, 
    lowStock, 
    search, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const filters = {
    category: category as string,
    priceMin: priceMin ? Number(priceMin) : undefined,
    priceMax: priceMax ? Number(priceMax) : undefined,
    inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
    lowStock: lowStock === 'true',
    search: search as string
  };
  
  const result = await presenter.getProducts(filters, Number(page), Number(limit));
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_PRODUCTS',
      { filters, page, limit },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, result);
});

export const updateProductStock = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { stock } = req.body;
  
  if (typeof stock !== 'number' || stock < 0) {
    return fail(res, 'Invalid stock value', 'INVALID_STOCK', 400);
  }
  
  await presenter.updateProductStock(productId, stock);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_PRODUCT_STOCK',
      { productId, stock },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Product stock updated successfully' });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  
  await presenter.deleteProduct(productId);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'DELETE_PRODUCT',
      { productId },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Product deleted successfully' });
});

// Order Management
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const { 
    status, 
    dateFrom, 
    dateTo, 
    minAmount, 
    maxAmount, 
    search, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const filters = {
    status: status as any,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    search: search as string
  };
  
  const result = await presenter.getOrders(filters, Number(page), Number(limit));
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_ORDERS',
      { filters, page, limit },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, result);
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, trackingNumber } = req.body;
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!status || !validStatuses.includes(status)) {
    return fail(res, 'Invalid order status', 'INVALID_STATUS', 400);
  }
  
  await presenter.updateOrderStatus(orderId, status, trackingNumber);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_ORDER_STATUS',
      { orderId, status, trackingNumber },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Order status updated successfully' });
});

// Analytics
export const getSalesAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  
  if (!dateFrom || !dateTo) {
    return fail(res, 'Date range is required', 'MISSING_DATE_RANGE', 400);
  }
  
  const analytics = await presenter.getSalesAnalytics(
    new Date(dateFrom as string), 
    new Date(dateTo as string)
  );
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_SALES_ANALYTICS',
      { dateFrom, dateTo },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, analytics);
});

export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await presenter.getUserAnalytics();
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_USER_ANALYTICS',
      undefined,
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, analytics);
});

// System Settings
export const getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await presenter.getSystemSettings();
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_SYSTEM_SETTINGS',
      undefined,
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, settings);
});

export const updateSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = req.body;
  
  await presenter.updateSystemSettings(settings);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_SYSTEM_SETTINGS',
      settings,
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'System settings updated successfully' });
});

// Activity Logs
export const getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  
  const result = await presenter.getActivityLogs(Number(page), Number(limit));
  
  ok(res, result);
});
