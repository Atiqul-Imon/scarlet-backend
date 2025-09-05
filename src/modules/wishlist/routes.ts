import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Get user's wishlist
router.get('/', requireAuth, controller.getWishlist);

// Add item to wishlist
router.post('/', requireAuth, controller.addToWishlist);

// Remove item from wishlist
router.delete('/:productId', requireAuth, controller.removeFromWishlist);

// Clear entire wishlist
router.delete('/', requireAuth, controller.clearWishlist);

// Check if product is in wishlist
router.get('/:productId/status', requireAuth, controller.checkWishlistStatus);

// Get wishlist statistics
router.get('/stats', requireAuth, controller.getWishlistStats);
