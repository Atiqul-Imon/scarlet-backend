import { Router } from 'express';
import { authenticate, requireAdmin } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

const router = Router();

/**
 * Public routes (accessible to authenticated users)
 */

// Track shipment by tracking number (public)
router.get('/track/:trackingNumber', controller.trackShipment);

/**
 * User routes (requires authentication)
 */

// Get delivery rates
router.post('/rates', authenticate, controller.getRates);

// Check courier availability
router.post('/availability', authenticate, controller.checkAvailability);

// Get shipments for user's order
router.get('/order/:orderId', authenticate, controller.getOrderShipments);

/**
 * Admin routes (requires admin authentication)
 */

// List all shipments with filters
router.get('/', authenticate, requireAdmin, controller.listShipments);

// Get shipment statistics
router.get('/stats', authenticate, requireAdmin, controller.getStats);

// Get specific shipment
router.get('/:id', authenticate, requireAdmin, controller.getShipment);

// Create new shipment
router.post('/', authenticate, requireAdmin, controller.createShipment);

// Update shipment status
router.patch('/:id/status', authenticate, requireAdmin, controller.updateShipmentStatus);

// Cancel shipment
router.post('/:id/cancel', authenticate, requireAdmin, controller.cancelShipment);

// Sync all active shipment statuses
router.post('/sync-statuses', authenticate, requireAdmin, controller.syncStatuses);

export { router };
export default router;

