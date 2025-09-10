import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { rateLimits } from '../../core/middleware/rateLimiting.js';
import * as controller from './controller.js';

export const router = Router();

// Categories
router.get('/categories', asyncHandler(controller.categories));

// Products
router.get('/products', asyncHandler(controller.products));
router.get('/products/search', rateLimits.search, asyncHandler(controller.searchProducts));
router.get('/products/category/:categoryId', asyncHandler(controller.getProductsByCategory));
router.get('/products/:slug', asyncHandler(controller.getProductBySlug));