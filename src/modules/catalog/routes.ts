import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { rateLimits } from '../../core/middleware/rateLimiting.js';
import * as controller from './controller.js';

export const router = Router();

// Categories
router.get('/categories', asyncHandler(controller.categories));
router.post('/categories', asyncHandler(controller.createCategory));
router.put('/categories/:id', asyncHandler(controller.updateCategory));
router.delete('/categories/:id', asyncHandler(controller.deleteCategory));

// Category Hierarchy
router.get('/categories/tree', asyncHandler(controller.getCategoryTree));
router.get('/categories/hierarchy', asyncHandler(controller.getCategoryHierarchy));
router.get('/categories/:parentId/children', asyncHandler(controller.getCategoryChildren));
router.get('/categories/:categoryId/ancestors', asyncHandler(controller.getCategoryAncestors));
router.get('/categories/:categoryId/path', asyncHandler(controller.getCategoryPath));
router.put('/categories/:categoryId/hierarchy', asyncHandler(controller.updateCategoryHierarchy));

// Products
router.get('/products', asyncHandler(controller.products));
router.get('/products/search', rateLimits.search, asyncHandler(controller.searchProducts));
router.get('/products/category/:categoryId', asyncHandler(controller.getProductsByCategory));
router.get('/products/:slug', asyncHandler(controller.getProductBySlug));