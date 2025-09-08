import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Create new order from cart (authenticated user)
router.post('/create', requireAuth, asyncHandler(controller.create));

// Create guest order from cart (no authentication required)
router.post('/guest/create', asyncHandler(controller.createGuestOrder));

// Get user's orders
router.get('/', requireAuth, asyncHandler(controller.listMine));

// Get specific order by ID
router.get('/:orderId', requireAuth, asyncHandler(controller.getOrder));

// Cancel order
router.post('/:orderId/cancel', requireAuth, asyncHandler(controller.cancelOrder));


