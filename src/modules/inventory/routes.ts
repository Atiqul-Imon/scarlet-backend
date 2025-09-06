import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Get inventory stats (public for admin)
router.get('/stats', requireAuth, controller.getInventoryStats);

// Get all inventory items
router.get('/', requireAuth, controller.getAllInventoryItems);

// Get specific inventory item
router.get('/:productId', requireAuth, controller.getInventoryItem);

// Create new inventory item
router.post('/', requireAuth, controller.createInventoryItem);

// Update inventory item
router.put('/:productId', requireAuth, controller.updateInventoryItem);

// Adjust stock
router.post('/:productId/adjust', requireAuth, controller.adjustStock);

// Reserve stock
router.post('/:productId/reserve', requireAuth, controller.reserveStock);

// Unreserve stock
router.post('/:productId/unreserve', requireAuth, controller.unreserveStock);

// Get stock movements
router.get('/:productId/movements', requireAuth, controller.getStockMovements);

// Get low stock alerts
router.get('/alerts/low-stock', requireAuth, controller.getLowStockAlerts);

// Resolve low stock alert
router.patch('/alerts/:alertId/resolve', requireAuth, controller.resolveLowStockAlert);
