import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

router.get('/me', requireAuth, asyncHandler(controller.me));
router.patch('/me', requireAuth, asyncHandler(controller.updateMe));


