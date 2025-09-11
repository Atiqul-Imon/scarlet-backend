import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Authenticated user cart routes
router.get('/', requireAuth, asyncHandler(controller.getCart));
router.post('/items', requireAuth, asyncHandler(controller.addItem));
router.put('/items', requireAuth, asyncHandler(controller.updateItem));
router.delete('/items/:productId', requireAuth, asyncHandler(controller.removeItem));

// Guest cart routes (no authentication required)
router.get('/guest', asyncHandler(controller.getGuestCart));
router.post('/guest/items', asyncHandler(controller.addGuestItem));
router.put('/guest/items', asyncHandler(controller.updateGuestItem));
router.delete('/guest/items/:productId', asyncHandler(controller.removeGuestItem));

// Merge guest cart to user cart (requires authentication)
router.post('/merge-guest', requireAuth, asyncHandler(controller.mergeGuestCart));


