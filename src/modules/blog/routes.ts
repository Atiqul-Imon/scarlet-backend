import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Public Blog Routes
router.get('/posts', asyncHandler(controller.getBlogPosts));
router.get('/posts/slug/:slug', asyncHandler(controller.getBlogPostBySlug));
router.get('/posts/search', asyncHandler(controller.searchBlogPosts));
router.get('/posts/:slug/related', asyncHandler(controller.getRelatedBlogPosts));
router.get('/categories', asyncHandler(controller.getBlogCategories));
router.get('/stats', asyncHandler(controller.getBlogStats));

// Protected Blog Routes (Admin only)
router.get('/posts/:id', requireAuth, asyncHandler(controller.getBlogPostById));
router.post('/posts', requireAuth, asyncHandler(controller.createBlogPost));
router.put('/posts/:id', requireAuth, asyncHandler(controller.updateBlogPost));
router.delete('/posts/:id', requireAuth, asyncHandler(controller.deleteBlogPost));
router.post('/categories', requireAuth, asyncHandler(controller.createBlogCategory));
router.put('/categories/:id', requireAuth, asyncHandler(controller.updateBlogCategory));
router.delete('/categories/:id', requireAuth, asyncHandler(controller.deleteBlogCategory));
