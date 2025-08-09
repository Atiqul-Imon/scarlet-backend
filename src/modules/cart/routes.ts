import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();
router.get('/', requireAuth, asyncHandler(controller.getCart));
router.post('/items', requireAuth, asyncHandler(controller.setItem));
router.delete('/items/:productId', requireAuth, asyncHandler(controller.removeItem));


