import { AppError } from '../../core/errors/AppError.js';
import * as repo from './repository.js';
import type { InventoryItem, StockMovement, LowStockAlert, CreateInventoryItemRequest, UpdateStockRequest, StockAdjustmentRequest } from './model.js';
import { catalogCache } from '../catalog/cache.js';

export async function createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
  // Check if inventory item already exists
  const existing = await repo.getInventoryItem(data.productId);
  if (existing) {
    throw new AppError('Inventory item already exists for this product', { status: 400 });
  }
  
  // Check if SKU already exists
  const existingSku = await repo.getInventoryItemBySku(data.sku);
  if (existingSku) {
    throw new AppError('SKU already exists', { status: 400 });
  }
  
  const inventoryItem: Omit<InventoryItem, '_id' | 'createdAt' | 'updatedAt'> = {
    productId: data.productId,
    sku: data.sku,
    currentStock: data.currentStock,
    reservedStock: 0,
    availableStock: data.currentStock,
    minStockLevel: data.minStockLevel,
    maxStockLevel: data.maxStockLevel,
    reorderPoint: data.reorderPoint,
    costPrice: data.costPrice,
    sellingPrice: data.sellingPrice,
    supplier: data.supplier,
    location: data.location,
  };
  
  const created = await repo.createInventoryItem(inventoryItem);
  
  // Check for low stock alert
  if (created.currentStock <= created.minStockLevel) {
    await createLowStockAlert(created);
  }
  
  return created;
}

export async function getInventoryItem(productId: string): Promise<InventoryItem> {
  const item = await repo.getInventoryItem(productId);
  if (!item) {
    throw new AppError('Inventory item not found', { status: 404 });
  }
  return item;
}

export async function getAllInventoryItems(page: number = 1, limit: number = 50) {
  return repo.getAllInventoryItems(page, limit);
}

export async function updateInventoryItem(productId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  const existing = await repo.getInventoryItem(productId);
  if (!existing) {
    throw new AppError('Inventory item not found', { status: 404 });
  }
  
  const updated = await repo.updateInventoryItem(productId, updates);
  if (!updated) {
    throw new AppError('Failed to update inventory item', { status: 500 });
  }
  
  // Check for low stock alert
  if (updated.currentStock <= updated.minStockLevel) {
    await createLowStockAlert(updated);
  }
  
  return updated;
}

export async function adjustStock(data: UpdateStockRequest): Promise<InventoryItem> {
  const existing = await repo.getInventoryItem(data.productId);
  if (!existing) {
    throw new AppError('Inventory item not found', { status: 404 });
  }
  
  const previousStock = existing.currentStock;
  const updated = await repo.adjustStock(data.productId, data.quantity, data.type);
  if (!updated) {
    throw new AppError('Failed to adjust stock', { status: 500 });
  }
  
  // Create stock movement record
  await repo.createStockMovement({
    productId: data.productId,
    sku: existing.sku,
    type: data.type,
    quantity: data.quantity,
    previousStock,
    newStock: updated.currentStock,
    reason: data.reason,
    reference: data.reference,
    userId: (data as any).userId,
    notes: data.notes,
  });
  
  // Check for low stock alert
  if (updated.currentStock <= updated.minStockLevel) {
    await createLowStockAlert(updated);
  }
  
  // Invalidate product cache to ensure fresh stock data
  await catalogCache.invalidateProduct(data.productId);
  
  return updated;
}

export async function reserveStock(productId: string, quantity: number): Promise<boolean> {
  const success = await repo.reserveStock(productId, quantity);
  if (!success) {
    throw new AppError('Insufficient stock available for reservation', { status: 400 });
  }
  
  // Create stock movement record
  const existing = await repo.getInventoryItem(productId);
  if (existing) {
    await repo.createStockMovement({
      productId,
      sku: existing.sku,
      type: 'reserved',
      quantity,
      previousStock: existing.currentStock,
      newStock: existing.currentStock,
      reason: 'Stock reserved for order',
      userId: 'system',
    });
  }
  
  // Invalidate product cache to ensure fresh stock data
  await catalogCache.invalidateProduct(productId);
  
  return true;
}

export async function unreserveStock(productId: string, quantity: number): Promise<boolean> {
  const success = await repo.unreserveStock(productId, quantity);
  if (!success) {
    throw new AppError('Failed to unreserve stock', { status: 400 });
  }
  
  // Create stock movement record
  const existing = await repo.getInventoryItem(productId);
  if (existing) {
    await repo.createStockMovement({
      productId,
      sku: existing.sku,
      type: 'unreserved',
      quantity,
      previousStock: existing.currentStock,
      newStock: existing.currentStock,
      reason: 'Stock unreserved from cancelled order',
      userId: 'system',
    });
  }
  
  // Invalidate product cache to ensure fresh stock data
  await catalogCache.invalidateProduct(productId);
  
  return true;
}

export async function getStockMovements(productId?: string, page: number = 1, limit: number = 50) {
  return repo.getStockMovements(productId, page, limit);
}

export async function getLowStockAlerts(resolved: boolean = false): Promise<LowStockAlert[]> {
  return repo.getLowStockAlerts(resolved);
}

export async function resolveLowStockAlert(alertId: string, resolvedBy: string): Promise<boolean> {
  return repo.resolveLowStockAlert(alertId, resolvedBy);
}

export async function getInventoryStats() {
  return repo.getInventoryStats();
}

async function createLowStockAlert(item: InventoryItem): Promise<void> {
  // Check if there's already an unresolved alert for this item
  const existingAlerts = await repo.getLowStockAlerts(false);
  const hasExistingAlert = existingAlerts.some(alert => alert.productId === item.productId);
  
  if (hasExistingAlert) return;
  
  let severity: 'low' | 'critical' | 'out_of_stock' = 'low';
  if (item.currentStock === 0) {
    severity = 'out_of_stock';
  } else if (item.currentStock <= item.reorderPoint) {
    severity = 'critical';
  }
  
  await repo.createLowStockAlert({
    productId: item.productId,
    sku: item.sku,
    currentStock: item.currentStock,
    minStockLevel: item.minStockLevel,
    severity,
    isResolved: false,
  });
}

export async function processOrderStockReduction(orderItems: Array<{ productId: string; quantity: number }>): Promise<void> {
  for (const item of orderItems) {
    // First unreserve the stock
    await repo.unreserveStock(item.productId, item.quantity);
    
    // Then reduce the actual stock
    await repo.adjustStock(item.productId, item.quantity, 'out');
    
    // Invalidate product cache to ensure fresh stock data
    await catalogCache.invalidateProduct(item.productId);
  }
}
