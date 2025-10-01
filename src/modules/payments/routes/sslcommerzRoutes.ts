import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from '../controllers/sslcommerzController.js';

export const router = Router();

// Public routes (no authentication required for callbacks)
router.post('/create-session', requireAuth, controller.createPaymentSession);
router.get('/success', controller.paymentSuccess);
router.get('/fail', controller.paymentFailure);
router.get('/cancel', controller.paymentCancellation);
router.post('/ipn', controller.ipnHandler);

// Admin routes
router.get('/methods', requireAuth, controller.getPaymentMethods);
router.get('/config-status', requireAuth, controller.getConfigStatus);
router.post('/validate', requireAuth, controller.validatePayment);
