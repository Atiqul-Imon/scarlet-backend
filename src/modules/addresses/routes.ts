import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Get user's addresses
router.get('/', requireAuth, controller.getAddresses);

// Get specific address
router.get('/:addressId', requireAuth, controller.getAddress);

// Create new address
router.post('/', requireAuth, controller.createAddress);

// Update address
router.put('/:addressId', requireAuth, controller.updateAddress);

// Delete address
router.delete('/:addressId', requireAuth, controller.deleteAddress);

// Set default address
router.patch('/:addressId/default', requireAuth, controller.setDefaultAddress);
