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