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
  const { q } = req.query;
  const result = await presenter.searchProducts(q as string);
  ok(res, result);
}

export async function getProductsByCategory(req: Request, res: Response) {
  const { categoryId } = req.params;
  const result = await presenter.getProductsByCategory(categoryId);
  ok(res, result);
}

export async function createCategory(req: Request, res: Response) {
  const result = await presenter.createCategory(req.body);
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