import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Mark cart as abandoned (public endpoint)
router.post('/mark-abandoned', asyncHandler(controller.markAbandoned));

// Admin endpoints for cart abandonment management
router.get('/abandoned-carts', requireAuth, asyncHandler(controller.getAbandonedCarts));
router.post('/process-recovery', requireAuth, asyncHandler(controller.processRecovery));
