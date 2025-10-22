import type { Request, Response } from 'express';
import { ok } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function categories(_req: Request, res: Response) {
  const result = await presenter.getCategories();
  ok(res, result);
}

export async function products(_req: Request, res: Response) {
  const result = await presenter.getProducts();
  ok(res, result);
}

export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const result = await presenter.getProductBySlug(slug);
  ok(res, result);
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params;
  const result = await presenter.getProductById(id);
  ok(res, result);
}

export async function searchProducts(req: Request, res: Response) {
  const { q, page, limit, sortBy, brand, category, priceMin, priceMax, inStock, rating } = req.query;
  
  const options = {
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 50,
    sortBy: sortBy as string || 'relevance',
    filters: {
      brand: brand ? (brand as string).split(',') : undefined,
      category: category ? (category as string).split(',') : undefined,
      priceMin: priceMin ? parseFloat(priceMin as string) : undefined,
      priceMax: priceMax ? parseFloat(priceMax as string) : undefined,
      inStock: inStock ? inStock === 'true' : undefined,
      rating: rating ? parseFloat(rating as string) : undefined
    }
  };
  
  const result = await presenter.searchProducts(q as string, options);
  ok(res, result);
}

export async function getSearchSuggestions(req: Request, res: Response) {
  const { q } = req.query;
  const result = await presenter.getSearchSuggestions(q as string);
  ok(res, result);
}

export async function getPopularSearches(req: Request, res: Response) {
  const result = await presenter.getPopularSearches();
  ok(res, result);
}

export async function getProductsByCategory(req: Request, res: Response) {
  const { categoryId } = req.params;
  const result = await presenter.getProductsByCategory(categoryId);
  ok(res, result);
}

export async function getProductsByHomepageSection(req: Request, res: Response) {
  const { section } = req.params;
  const result = await presenter.getProductsByHomepageSection(section);
  ok(res, result);
}

export async function createCategory(req: Request, res: Response) {
  const result = await presenter.createCategory(req.body);
  ok(res, result);
}

// Hierarchy endpoints
export async function getCategoryTree(_req: Request, res: Response) {
  const result = await presenter.getCategoryTree();
  ok(res, result);
}

export async function getCategoryHierarchy(_req: Request, res: Response) {
  const result = await presenter.getCategoryHierarchy();
  ok(res, result);
}

export async function getCategoryChildren(req: Request, res: Response) {
  const { parentId } = req.params;
  const result = await presenter.getCategoryChildren(parentId);
  ok(res, result);
}

export async function getCategoryAncestors(req: Request, res: Response) {
  const { categoryId } = req.params;
  const result = await presenter.getCategoryAncestors(categoryId);
  ok(res, result);
}

export async function getCategoryPath(req: Request, res: Response) {
  const { categoryId } = req.params;
  const result = await presenter.getCategoryPath(categoryId);
  ok(res, result);
}

export async function updateCategoryHierarchy(req: Request, res: Response) {
  const { categoryId } = req.params;
  const { parentId } = req.body;
  const result = await presenter.updateCategoryHierarchy(categoryId, parentId);
  ok(res, result);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const result = await presenter.updateCategory(id, req.body);
  ok(res, result);
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  await presenter.deleteCategory(id);
  ok(res, { message: 'Category deleted successfully' });
}