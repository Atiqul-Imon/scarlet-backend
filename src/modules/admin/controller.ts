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
    return fail(res, { message: 'Invalid role specified', code: 'INVALID_ROLE' }, 400);
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
    return fail(res, { message: 'Cannot delete your own account', code: 'CANNOT_DELETE_SELF' }, 400);
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

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  
  const product = await presenter.getProduct(productId);
  
  if (!product) {
    return fail(res, { message: 'Product not found', code: 'PRODUCT_NOT_FOUND' }, 404);
  }
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_PRODUCT',
      { productId },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const productData = req.body;
  
  // Validate required fields
  if (!productData.name || !productData.slug || !productData.price || !productData.sku) {
    return fail(res, { message: 'Missing required fields: name, slug, price, and sku are required', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const product = await presenter.createProduct(productData);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'CREATE_PRODUCT',
      { productId: product._id, productName: product.title },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  created(res, product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const productData = req.body;
  
  // Validate required fields
  if (!productData.name || !productData.slug || !productData.price || !productData.sku) {
    return fail(res, { message: 'Missing required fields: name, slug, price, and sku are required', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const product = await presenter.updateProduct(productId, productData);
  
  if (!product) {
    return fail(res, { message: 'Product not found', code: 'PRODUCT_NOT_FOUND' }, 404);
  }
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_PRODUCT',
      { productId, productName: product.title },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, product);
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

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  
  if (!orderId) {
    return fail(res, { 
      message: 'Order ID is required',
      code: 'ORDER_ID_REQUIRED' 
    }, 400);
  }
  
  try {
    const order = await presenter.getOrderById(orderId);
    
    // Log admin activity
    if (req.user) {
      await presenter.logActivity(
        req.user._id!.toString(),
        req.user.email || req.user.phone || 'unknown',
        'VIEW_ORDER_DETAILS',
        { orderId },
        req.ip,
        req.headers['user-agent']
      );
    }
    
    ok(res, order);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'refunded'];
  if (!status || !validStatuses.includes(status)) {
    return fail(res, { message: 'Invalid order status', code: 'INVALID_STATUS' }, 400);
  }
  
  await presenter.updateOrderStatus(orderId, status);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_ORDER_STATUS',
      { orderId, status },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Order status updated successfully' });
});

// Category Management
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const categoryData = req.body;
  
  const category = await presenter.updateCategory(categoryId, categoryData);
  
  if (!category) {
    return fail(res, { message: 'Category not found', code: 'CATEGORY_NOT_FOUND' }, 404);
  }
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_CATEGORY',
      { categoryId, categoryName: category.name },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, category);
});

export const updateCategorySortOrder = asyncHandler(async (req: Request, res: Response) => {
  const { categoryUpdates } = req.body;
  
  if (!Array.isArray(categoryUpdates) || categoryUpdates.length === 0) {
    return fail(res, { message: 'Category updates array is required', code: 'INVALID_CATEGORY_UPDATES' }, 400);
  }
  
  // Validate each update
  for (const update of categoryUpdates) {
    if (!update.id || typeof update.sortOrder !== 'number') {
      return fail(res, { message: 'Each update must have id and sortOrder', code: 'INVALID_UPDATE_FORMAT' }, 400);
    }
  }
  
  await presenter.updateCategorySortOrder(categoryUpdates);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_CATEGORY_SORT_ORDER',
      { categoryCount: categoryUpdates.length },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Category sort order updated successfully' });
});

// Analytics
export const getSalesAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query;
  
  if (!dateFrom || !dateTo) {
    return fail(res, { message: 'Date range is required', code: 'MISSING_DATE_RANGE' }, 400);
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

// Category Management
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { 
    isActive, 
    search, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const filters = {
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    search: search as string
  };
  
  const result = await presenter.getCategories(filters, Number(page), Number(limit));
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_CATEGORIES',
      { filters, page, limit },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, result);
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  
  const category = await presenter.getCategory(categoryId);
  
  if (!category) {
    return fail(res, { message: 'Category not found', code: 'CATEGORY_NOT_FOUND' }, 404);
  }
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'VIEW_CATEGORY',
      { categoryId },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const categoryData = req.body;
  
  // Validate required fields
  if (!categoryData.name || !categoryData.slug) {
    return fail(res, { message: 'Missing required fields: name and slug are required', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const category = await presenter.createCategory(categoryData);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'CREATE_CATEGORY',
      { categoryId: category._id, categoryName: category.name },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  created(res, category);
});


export const updateCategoryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { isActive } = req.body;
  
  if (typeof isActive !== 'boolean') {
    return fail(res, { message: 'Invalid status value', code: 'INVALID_STATUS' }, 400);
  }
  
  await presenter.updateCategoryStatus(categoryId, isActive);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'UPDATE_CATEGORY_STATUS',
      { categoryId, isActive },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Category status updated successfully' });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  
  await presenter.deleteCategory(categoryId);
  
  // Log admin activity
  if (req.user) {
    await presenter.logActivity(
      req.user._id!.toString(),
      req.user.email || req.user.phone || 'unknown',
      'DELETE_CATEGORY',
      { categoryId },
      req.ip,
      req.headers['user-agent']
    );
  }
  
  ok(res, { message: 'Category deleted successfully' });
});

// Activity Logs
export const getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  
  const result = await presenter.getActivityLogs(Number(page), Number(limit));
  
  ok(res, result);
});
