import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, created, fail } from '../../core/http/response.js';
import {
  createBrand,
  getBrands,
  getBrandById,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
  getFeaturedBrands,
  getBrandsByCategory,
  searchBrands,
  updateBrandProductCount,
  getBrandStats,
  getBrandTree,
  getBrandHierarchy,
  toggleBrandStatus,
  toggleBrandFeatured
} from './presenter.js';

// Create brand
export const createBrandController = asyncHandler(async (req: Request, res: Response) => {
  const brandData = {
    ...req.body,
    createdBy: req.user?._id,
    updatedBy: req.user?._id
  };

  const brand = await createBrand(brandData);
  
  return created(res, brand);
});

// Get all brands
export const getBrandsController = asyncHandler(async (req: Request, res: Response) => {
  const brands = await getBrands();
  return ok(res, brands);
});

// Get brand by ID
export const getBrandByIdController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const brand = await getBrandById(id);
  
  if (!brand) {
    return fail(res, { message: 'Brand not found' }, 404);
  }
  
  return ok(res, brand);
});

// Get brand by slug
export const getBrandBySlugController = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const brand = await getBrandBySlug(slug);
  
  if (!brand) {
    return fail(res, { message: 'Brand not found' }, 404);
  }
  
  return ok(res, brand);
});

// Update brand
export const updateBrandController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = {
    ...req.body,
    updatedBy: req.user?._id
  };

  const brand = await updateBrand(id, updateData);
  
  if (!brand) {
    return fail(res, { message: 'Brand not found' }, 404);
  }
  
  return ok(res, brand);
});

// Delete brand
export const deleteBrandController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const deleted = await deleteBrand(id);
  
  if (!deleted) {
    return fail(res, { message: 'Brand not found or cannot be deleted' }, 404);
  }
  
  return ok(res, { message: 'Brand deleted successfully' });
});

// Get featured brands
export const getFeaturedBrandsController = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 8;
  const brands = await getFeaturedBrands(limit);
  return ok(res, brands);
});

// Get brands by category
export const getBrandsByCategoryController = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const brands = await getBrandsByCategory(category);
  return ok(res, brands);
});

// Search brands
export const searchBrandsController = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit } = req.query;
  
  if (!q) {
    return fail(res, { message: 'Search query is required' }, 400);
  }
  
  const searchLimit = parseInt(limit as string) || 20;
  const brands = await searchBrands(q as string, searchLimit);
  return ok(res, brands);
});

// Get brand statistics
export const getBrandStatsController = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getBrandStats();
  return ok(res, stats);
});

// Get brand tree
export const getBrandTreeController = asyncHandler(async (req: Request, res: Response) => {
  const tree = await getBrandTree();
  return ok(res, tree);
});

// Get brand hierarchy
export const getBrandHierarchyController = asyncHandler(async (req: Request, res: Response) => {
  const hierarchy = await getBrandHierarchy();
  return ok(res, hierarchy);
});

// Toggle brand status
export const toggleBrandStatusController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const brand = await toggleBrandStatus(id);
  
  if (!brand) {
    return fail(res, { message: 'Brand not found' }, 404);
  }
  
  return ok(res, brand);
});

// Toggle brand featured status
export const toggleBrandFeaturedController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const brand = await toggleBrandFeatured(id);
  
  if (!brand) {
    return fail(res, { message: 'Brand not found' }, 404);
  }
  
  return ok(res, brand);
});

// Update brand product count
export const updateBrandProductCountController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await updateBrandProductCount(id);
  return ok(res, { message: 'Brand product count updated successfully' });
});
