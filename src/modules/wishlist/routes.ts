import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Customer wishlist routes
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

// Admin wishlist management routes
// Get out-of-stock wishlist items
router.get('/admin/out-of-stock', requireAuth, controller.getOutOfStockWishlistItems);

// Get wishlist analytics
router.get('/admin/analytics', requireAuth, controller.getWishlistAnalytics);

// Notify customers about restocked items
router.post('/admin/notify-restock', requireAuth, controller.notifyCustomersAboutRestock);

// Update wishlist item priority
router.patch('/admin/items/:wishlistItemId/priority', requireAuth, controller.updateWishlistItemPriority);
