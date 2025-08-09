import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as controller from './controller.js';

export const router = Router();
router.get('/categories', asyncHandler(controller.categories));
router.get('/products', asyncHandler(controller.products));


