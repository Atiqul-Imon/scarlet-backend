import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../core/middleware/auth';
import {
  createBrandController,
  getBrandsController,
  getBrandByIdController,
  getBrandBySlugController,
  updateBrandController,
  deleteBrandController,
  getFeaturedBrandsController,
  getBrandsByCategoryController,
  searchBrandsController,
  getBrandStatsController,
  getBrandTreeController,
  getBrandHierarchyController,
  toggleBrandStatusController,
  toggleBrandFeaturedController,
  updateBrandProductCountController
} from './controller';

const router = Router();

// Public routes
router.get('/', getBrandsController);
router.get('/featured', getFeaturedBrandsController);
router.get('/search', searchBrandsController);
router.get('/stats', getBrandStatsController);
router.get('/tree', getBrandTreeController);
router.get('/hierarchy', getBrandHierarchyController);
router.get('/slug/:slug', getBrandBySlugController);
router.get('/category/:category', getBrandsByCategoryController);
router.get('/:id', getBrandByIdController);

// Protected routes (require authentication)
router.use(requireAuth);

// Admin routes (require admin role)
router.post('/', requireAdmin, createBrandController);
router.put('/:id', requireAdmin, updateBrandController);
router.delete('/:id', requireAdmin, deleteBrandController);
router.patch('/:id/toggle-status', requireAdmin, toggleBrandStatusController);
router.patch('/:id/toggle-featured', requireAdmin, toggleBrandFeaturedController);
router.patch('/:id/update-product-count', requireAdmin, updateBrandProductCountController);

export { router };
