import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, created } from '../../core/http/response.js';
import { AppError } from '../../core/errors/AppError.js';
import * as presenter from './presenter.js';
import type { CreateInventoryItemRequest, UpdateStockRequest, StockAdjustmentRequest } from './model.js';

export async function createInventoryItem(req: Request, res: Response) {
  const data: CreateInventoryItemRequest = req.body;
  
  // Validation
  if (!data.productId || !data.sku || data.currentStock < 0) {
    throw new AppError('Invalid inventory data', { status: 400 });
  }
  
  const result = await presenter.createInventoryItem(data);
  created(res, result);
}

export async function getInventoryItem(req: Request, res: Response) {
  const { productId } = req.params;
  const result = await presenter.getInventoryItem(productId);
  ok(res, result);
}

export async function getAllInventoryItems(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  
  const result = await presenter.getAllInventoryItems(page, limit);
  ok(res, result);
}

export async function updateInventoryItem(req: Request, res: Response) {
  const { productId } = req.params;
  const updates = req.body;
  
  const result = await presenter.updateInventoryItem(productId, updates);
  ok(res, result);
}

export async function adjustStock(req: Request, res: Response) {
  const data: UpdateStockRequest = req.body;
  
  // Validation
  if (!data.productId || !data.quantity || data.quantity <= 0) {
    throw new AppError('Invalid stock adjustment data', { status: 400 });
  }
  
  const result = await presenter.adjustStock(data);
  ok(res, result);
}

export async function reserveStock(req: Request, res: Response) {
  const { productId } = req.params;
  const { quantity } = req.body;
  
  if (!quantity || quantity <= 0) {
    throw new AppError('Invalid quantity for stock reservation', { status: 400 });
  }
  
  const result = await presenter.reserveStock(productId, quantity);
  ok(res, { success: result });
}

export async function unreserveStock(req: Request, res: Response) {
  const { productId } = req.params;
  const { quantity } = req.body;
  
  if (!quantity || quantity <= 0) {
    throw new AppError('Invalid quantity for stock unreservation', { status: 400 });
  }
  
  const result = await presenter.unreserveStock(productId, quantity);
  ok(res, { success: result });
}

export async function getStockMovements(req: Request, res: Response) {
  const { productId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  
  const result = await presenter.getStockMovements(productId, page, limit);
  ok(res, result);
}

export async function getLowStockAlerts(req: Request, res: Response) {
  const resolved = req.query.resolved === 'true';
  const result = await presenter.getLowStockAlerts(resolved);
  ok(res, result);
}

export async function resolveLowStockAlert(req: Request, res: Response) {
  const { alertId } = req.params;
  const { resolvedBy } = req.body;
  
  if (!resolvedBy) {
    throw new AppError('Resolved by user ID is required', { status: 400 });
  }
  
  const result = await presenter.resolveLowStockAlert(alertId, resolvedBy);
  ok(res, { success: result });
}

export async function getInventoryStats(req: Request, res: Response) {
  const result = await presenter.getInventoryStats();
  ok(res, result);
}
