import { Router } from 'express';
import { requireAuth, requireAdmin, requireAdminOrStaff, auditLog } from '../../core/middleware/auth.js';

import * as controller from './controller.js';

export const router = Router();

// All payment routes require authentication
router.use(requireAuth);

// Payment creation and verification
router.post('/create', auditLog('CREATE_PAYMENT'), controller.createPayment);
router.post('/verify', auditLog('VERIFY_PAYMENT'), controller.verifyPayment);

// Payment status and history
router.get('/status/:paymentId', auditLog('VIEW_PAYMENT_STATUS'), controller.getPaymentStatus);
router.get('/order/:orderId', auditLog('VIEW_ORDER_PAYMENTS'), controller.getPaymentsByOrder);
router.get('/user', auditLog('VIEW_USER_PAYMENTS'), controller.getUserPayments);

// Webhook endpoints (no auth required)
router.post('/webhook/:gateway', controller.processWebhook);

// Admin only routes
router.post('/refund/:paymentId', requireAdminOrStaff, auditLog('REFUND_PAYMENT'), controller.refundPayment);
router.get('/stats', requireAdminOrStaff, auditLog('VIEW_PAYMENT_STATS'), controller.getPaymentStats);
