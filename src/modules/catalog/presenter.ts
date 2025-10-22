import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';
import { catalogCache } from './cache.js';

export async function getCategories() {
  return repo.listCategories();
}

export async function getProducts() {
  return repo.listProducts();
}

export async function getProductBySlug(slug: string) {
  if (!slug) {
    throw new AppError('Product slug is required', { status: 400 });
  }
  
  const product = await repo.getProductBySlug(slug);
  if (!product) {
    throw new AppError('Product not found', { status: 404 });
  }
  
  return product;
}

export async function getProductById(id: string) {
  if (!id) {
    throw new AppError('Product ID is required', { status: 400 });
  }
  
  const product = await repo.getProductById(id);
  if (!product) {
    throw new AppError('Product not found', { status: 404 });
  }
  
  return product;
}

export async function searchProducts(query: string, options: any = {}) {
  if (!query || query.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', { status: 400 });
  }
  
  // Try cache first
  const cached = await catalogCache.getSearchResults(query, options.filters);
  if (cached) {
    return cached;
  }
  
  const results = await repo.searchProducts(query.trim(), options);
  
  // Cache the results
  await catalogCache.setSearchResults(query, results, options.filters);
  
  // Track search query for analytics
  await catalogCache.trackSearchQuery(query);
  
  return results;
}

export async function getSearchSuggestions(query: string) {
  if (!query || query.trim().length < 2) {
    return { products: [], brands: [], categories: [] };
  }
  
  // Try cache first
  const cached = await catalogCache.getSearchSuggestions(query);
  if (cached) {
    return cached;
  }
  
  const suggestions = await repo.getSearchSuggestions(query.trim());
  
  // Cache the suggestions
  await catalogCache.setSearchSuggestions(query, suggestions);
  
  return suggestions;
}

export async function getPopularSearches() {
  // Try cache first
  const cached = await catalogCache.getPopularSearches();
  if (cached) {
    return cached;
  }
  
  const searches = await repo.getPopularSearches();
  
  // Cache the popular searches
  await catalogCache.setPopularSearches(searches);
  
  return searches;
}

export async function getProductsByCategory(categoryId: string) {
  if (!categoryId) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  return repo.getProductsByCategory(categoryId);
}

export async function getProductsByHomepageSection(homepageSection: string) {
  if (!homepageSection) {
    throw new AppError('Homepage section is required', { status: 400 });
  }
  
  return repo.getProductsByHomepageSection(homepageSection);
}

export async function createCategory(categoryData: any) {
  // Validate required fields
  if (!categoryData.name || !categoryData.slug) {
    throw new AppError('Category name and slug are required', { status: 400 });
  }
  
  // Validate slug format (alphanumeric, hyphens, underscores only)
  const slugRegex = /^[a-z0-9-_]+$/;
  if (!slugRegex.test(categoryData.slug)) {
    throw new AppError('Category slug must contain only lowercase letters, numbers, hyphens, and underscores', { status: 400 });
  }
  
  // Validate name length
  if (categoryData.name.length < 2 || categoryData.name.length > 100) {
    throw new AppError('Category name must be between 2 and 100 characters', { status: 400 });
  }
  
  // Validate slug length
  if (categoryData.slug.length < 2 || categoryData.slug.length > 50) {
    throw new AppError('Category slug must be between 2 and 50 characters', { status: 400 });
  }
  
  try {
    return await repo.createCategory(categoryData);
  } catch (error: any) {
    if (error.message && error.message.includes('already exists')) {
      throw new AppError(error.message, { status: 409 });
    }
    throw error;
  }
}

export async function updateCategory(id: string, categoryData: any) {
  if (!id) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  const existingCategory = await repo.getCategoryById(id);
  if (!existingCategory) {
    throw new AppError('Category not found', { status: 404 });
  }
  
  return repo.updateCategory(id, categoryData);
}

export async function deleteCategory(id: string) {
  if (!id) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  const existingCategory = await repo.getCategoryById(id);
  if (!existingCategory) {
    throw new AppError('Category not found', { status: 404 });
  }
  
  await repo.deleteCategory(id);
}

// Hierarchy-specific functions
export async function getCategoryTree() {
  return repo.getCategoryTree();
}

export async function getCategoryHierarchy() {
  return repo.getCategoryHierarchy();
}

export async function getCategoryChildren(parentId: string) {
  if (!parentId) {
    throw new AppError('Parent category ID is required', { status: 400 });
  }
  
  return repo.getCategoryChildren(parentId);
}

export async function getCategoryAncestors(categoryId: string) {
  if (!categoryId) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  return repo.getCategoryAncestors(categoryId);
}

export async function getCategoryPath(categoryId: string) {
  if (!categoryId) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  return repo.getCategoryPath(categoryId);
}

export async function updateCategoryHierarchy(categoryId: string, parentId: string | null) {
  if (!categoryId) {
    throw new AppError('Category ID is required', { status: 400 });
  }
  
  const existingCategory = await repo.getCategoryById(categoryId);
  if (!existingCategory) {
    throw new AppError('Category not found', { status: 404 });
  }
  
  if (parentId) {
    const parentCategory = await repo.getCategoryById(parentId);
    if (!parentCategory) {
      throw new AppError('Parent category not found', { status: 404 });
    }
  }
  
  return repo.updateCategoryHierarchy(categoryId, parentId);
}