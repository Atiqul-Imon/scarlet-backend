import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Create new order from cart
router.post('/create', requireAuth, controller.create);

// Get user's orders
router.get('/', requireAuth, controller.listMine);

// Get specific order by ID
router.get('/:orderId', requireAuth, controller.getOrder);

// Cancel order
router.post('/:orderId/cancel', requireAuth, controller.cancelOrder);


