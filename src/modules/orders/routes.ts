import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();
router.post('/create', requireAuth, asyncHandler(controller.create));
router.get('/', requireAuth, asyncHandler(controller.listMine));


