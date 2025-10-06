import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';

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

export async function searchProducts(query: string) {
  if (!query || query.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', { status: 400 });
  }
  
  return repo.searchProducts(query.trim());
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
  if (!categoryData.name || !categoryData.slug) {
    throw new AppError('Category name and slug are required', { status: 400 });
  }
  
  return repo.createCategory(categoryData);
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