import type { Brand, BrandTree, BrandHierarchy } from './model.js';
import {
  createBrand as repoCreateBrand,
  getBrands as repoGetBrands,
  getBrandById as repoGetBrandById,
  getBrandBySlug as repoGetBrandBySlug,
  updateBrand as repoUpdateBrand,
  deleteBrand as repoDeleteBrand,
  getFeaturedBrands as repoGetFeaturedBrands,
  getBrandsByCategory as repoGetBrandsByCategory,
  searchBrands as repoSearchBrands,
  updateBrandProductCount as repoUpdateBrandProductCount,
  getBrandStats as repoGetBrandStats,
  getBrandTree as repoGetBrandTree,
  getBrandHierarchy as repoGetBrandHierarchy
} from './repository.js';

// Create brand
export async function createBrand(brandData: Partial<Brand>): Promise<Brand> {
  // Validate required fields
  if (!brandData.name || !brandData.slug || !brandData.description || !brandData.category) {
    throw new Error('Missing required fields: name, slug, description, category');
  }

  // Check if slug already exists
  const existingBrand = await repoGetBrandBySlug(brandData.slug);
  if (existingBrand) {
    throw new Error('Brand with this slug already exists');
  }

  // Generate slug if not provided
  if (!brandData.slug) {
    brandData.slug = brandData.name!
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set default values
  brandData.isActive = brandData.isActive !== false;
  brandData.isFeatured = brandData.isFeatured || false;
  brandData.sortOrder = brandData.sortOrder || 0;
  brandData.productCount = 0;

  return await repoCreateBrand(brandData);
}

// Get all brands
export async function getBrands(): Promise<Brand[]> {
  return await repoGetBrands();
}

// Get brand by ID
export async function getBrandById(brandId: string): Promise<Brand | null> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }
  return await repoGetBrandById(brandId);
}

// Get brand by slug
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  if (!slug) {
    throw new Error('Brand slug is required');
  }
  return await repoGetBrandBySlug(slug);
}

// Update brand
export async function updateBrand(brandId: string, updateData: Partial<Brand>): Promise<Brand | null> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }

  // Check if brand exists
  const existingBrand = await repoGetBrandById(brandId);
  if (!existingBrand) {
    throw new Error('Brand not found');
  }

  // If slug is being updated, check for conflicts
  if (updateData.slug && updateData.slug !== existingBrand.slug) {
    const slugExists = await repoGetBrandBySlug(updateData.slug);
    if (slugExists) {
      throw new Error('Brand with this slug already exists');
    }
  }

  return await repoUpdateBrand(brandId, updateData);
}

// Delete brand
export async function deleteBrand(brandId: string): Promise<boolean> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }

  return await repoDeleteBrand(brandId);
}

// Get featured brands
export async function getFeaturedBrands(limit: number = 8): Promise<Brand[]> {
  return await repoGetFeaturedBrands(limit);
}

// Get brands by category
export async function getBrandsByCategory(category: string): Promise<Brand[]> {
  if (!category) {
    throw new Error('Category is required');
  }
  return await repoGetBrandsByCategory(category);
}

// Search brands
export async function searchBrands(query: string, limit: number = 20): Promise<Brand[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  return await repoSearchBrands(query.trim(), limit);
}

// Update brand product count
export async function updateBrandProductCount(brandId: string): Promise<void> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }
  await repoUpdateBrandProductCount(brandId);
}

// Get brand statistics
export async function getBrandStats(): Promise<{
  totalBrands: number;
  activeBrands: number;
  featuredBrands: number;
  totalProducts: number;
  categories: string[];
}> {
  return await repoGetBrandStats();
}

// Get brand tree
export async function getBrandTree(): Promise<BrandTree[]> {
  return await repoGetBrandTree();
}

// Get brand hierarchy
export async function getBrandHierarchy(): Promise<BrandHierarchy> {
  return await repoGetBrandHierarchy();
}

// Toggle brand active status
export async function toggleBrandStatus(brandId: string): Promise<Brand | null> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }

  const brand = await repoGetBrandById(brandId);
  if (!brand) {
    throw new Error('Brand not found');
  }

  return await repoUpdateBrand(brandId, { isActive: !brand.isActive });
}

// Toggle brand featured status
export async function toggleBrandFeatured(brandId: string): Promise<Brand | null> {
  if (!brandId) {
    throw new Error('Brand ID is required');
  }

  const brand = await repoGetBrandById(brandId);
  if (!brand) {
    throw new Error('Brand not found');
  }

  return await repoUpdateBrand(brandId, { isFeatured: !brand.isFeatured });
}
