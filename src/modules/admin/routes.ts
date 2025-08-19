import { Router } from 'express';
import { requireAuth, requireAdmin, requireAdminOrStaff, auditLog } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// All admin routes require authentication
router.use(requireAuth);

// Dashboard - accessible by admin and staff
router.get('/dashboard/stats', requireAdminOrStaff, controller.getDashboardStats);

// User Management - admin only
router.get('/users', requireAdmin, auditLog('VIEW_USERS'), controller.getUsers);
router.patch('/users/:userId/role', requireAdmin, auditLog('UPDATE_USER_ROLE'), controller.updateUserRole);
router.delete('/users/:userId', requireAdmin, auditLog('DELETE_USER'), controller.deleteUser);

// Product Management - admin and staff
router.get('/products', requireAdminOrStaff, auditLog('VIEW_PRODUCTS'), controller.getProducts);
router.patch('/products/:productId/stock', requireAdminOrStaff, auditLog('UPDATE_PRODUCT_STOCK'), controller.updateProductStock);
router.delete('/products/:productId', requireAdmin, auditLog('DELETE_PRODUCT'), controller.deleteProduct);

// Order Management - admin and staff
router.get('/orders', requireAdminOrStaff, auditLog('VIEW_ORDERS'), controller.getOrders);
router.patch('/orders/:orderId/status', requireAdminOrStaff, auditLog('UPDATE_ORDER_STATUS'), controller.updateOrderStatus);

// Analytics - admin and staff
router.get('/analytics/sales', requireAdminOrStaff, auditLog('VIEW_SALES_ANALYTICS'), controller.getSalesAnalytics);
router.get('/analytics/users', requireAdminOrStaff, auditLog('VIEW_USER_ANALYTICS'), controller.getUserAnalytics);

// System Settings - admin only
router.get('/settings', requireAdmin, auditLog('VIEW_SYSTEM_SETTINGS'), controller.getSystemSettings);
router.patch('/settings', requireAdmin, auditLog('UPDATE_SYSTEM_SETTINGS'), controller.updateSystemSettings);

// Activity Logs - admin only
router.get('/logs/activity', requireAdmin, controller.getActivityLogs);
