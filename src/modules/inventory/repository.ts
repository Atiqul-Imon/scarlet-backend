import { ObjectId } from 'mongodb';
import { getDb } from '../../core/db/mongoClient.js';
import type { InventoryItem, StockMovement, LowStockAlert, InventoryStats } from './model.js';

export async function createInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const db = await getDb();
  const result = await db.collection<InventoryItem>('inventory').insertOne({
    ...item,
    availableStock: item.currentStock - item.reservedStock,
  });
  
  return { ...item, _id: result.insertedId.toString() };
}

export async function getInventoryItem(productId: string): Promise<InventoryItem | null> {
  const db = await getDb();
  return db.collection<InventoryItem>('inventory').findOne({ productId });
}

export async function getInventoryItemBySku(sku: string): Promise<InventoryItem | null> {
  const db = await getDb();
  return db.collection<InventoryItem>('inventory').findOne({ sku });
}

export async function getAllInventoryItems(page: number = 1, limit: number = 50): Promise<{ items: InventoryItem[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    db.collection<InventoryItem>('inventory')
      .find({})
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<InventoryItem>('inventory').countDocuments()
  ]);
  
  return { items, total };
}

export async function updateInventoryItem(productId: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  const db = await getDb();
  
  // Prepare the update document with proper MongoDB operators
  const updateDoc: any = {
    $set: {
      ...updates,
      updatedAt: new Date().toISOString()
    }
  };
  
  // Calculate availableStock if currentStock or reservedStock is being updated
  if (updates.currentStock !== undefined || updates.reservedStock !== undefined) {
    // Get current values to calculate availableStock
    const currentItem = await db.collection<InventoryItem>('inventory').findOne({ productId });
    if (currentItem) {
      const newCurrentStock = updates.currentStock !== undefined ? updates.currentStock : currentItem.currentStock;
      const newReservedStock = updates.reservedStock !== undefined ? updates.reservedStock : currentItem.reservedStock;
      updateDoc.$set.availableStock = newCurrentStock - newReservedStock;
    }
  }
  
  const result = await db.collection<InventoryItem>('inventory').findOneAndUpdate(
    { productId },
    updateDoc,
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function adjustStock(productId: string, quantity: number, type: 'in' | 'out' | 'adjustment'): Promise<InventoryItem | null> {
  const db = await getDb();
  
  // Get current inventory
  const currentItem = await getInventoryItem(productId);
  if (!currentItem) return null;
  
  let newStock = currentItem.currentStock;
  if (type === 'in') {
    newStock += quantity;
  } else if (type === 'out') {
    newStock = Math.max(0, newStock - quantity);
  } else if (type === 'adjustment') {
    newStock = quantity;
  }
  
  // Update inventory
  const updatedItem = await updateInventoryItem(productId, {
    currentStock: newStock,
    availableStock: newStock - currentItem.reservedStock,
    lastSold: type === 'out' ? new Date().toISOString() : currentItem.lastSold
  });
  
  return updatedItem;
}

export async function reserveStock(productId: string, quantity: number): Promise<boolean> {
  const db = await getDb();
  const currentItem = await getInventoryItem(productId);
  if (!currentItem || currentItem.availableStock < quantity) return false;
  
  await db.collection<InventoryItem>('inventory').updateOne(
    { productId },
    { 
      $inc: { reservedStock: quantity },
      $set: { 
        availableStock: currentItem.currentStock - (currentItem.reservedStock + quantity),
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  return true;
}

export async function unreserveStock(productId: string, quantity: number): Promise<boolean> {
  const db = await getDb();
  const currentItem = await getInventoryItem(productId);
  if (!currentItem || currentItem.reservedStock < quantity) return false;
  
  await db.collection<InventoryItem>('inventory').updateOne(
    { productId },
    { 
      $inc: { reservedStock: -quantity },
      $set: { 
        availableStock: currentItem.currentStock - (currentItem.reservedStock - quantity),
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  return true;
}

export async function createStockMovement(movement: Omit<StockMovement, '_id' | 'createdAt' | 'updatedAt'>): Promise<StockMovement> {
  const db = await getDb();
  const result = await db.collection<StockMovement>('stock_movements').insertOne({
    ...movement,
  });
  
  return { ...movement, _id: result.insertedId.toString() };
}

export async function getStockMovements(productId?: string, page: number = 1, limit: number = 50): Promise<{ movements: StockMovement[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  const filter = productId ? { productId } : {};
  
  const [movements, total] = await Promise.all([
    db.collection<StockMovement>('stock_movements')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<StockMovement>('stock_movements').countDocuments(filter)
  ]);
  
  return { movements, total };
}

export async function checkLowStockItems(): Promise<InventoryItem[]> {
  const db = await getDb();
  return db.collection<InventoryItem>('inventory').find({
    $expr: {
      $lte: ['$currentStock', '$minStockLevel']
    }
  }).toArray();
}

export async function createLowStockAlert(alert: Omit<LowStockAlert, '_id' | 'createdAt' | 'updatedAt'>): Promise<LowStockAlert> {
  const db = await getDb();
  const result = await db.collection<LowStockAlert>('low_stock_alerts').insertOne({
    ...alert,
  });
  
  return { ...alert, _id: result.insertedId.toString() };
}

export async function getLowStockAlerts(resolved: boolean = false): Promise<LowStockAlert[]> {
  const db = await getDb();
  return db.collection<LowStockAlert>('low_stock_alerts')
    .find({ isResolved: resolved })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function resolveLowStockAlert(alertId: string, resolvedBy: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<LowStockAlert>('low_stock_alerts').updateOne(
    { _id: new ObjectId(alertId) as any },
    { 
      $set: { 
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy,
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  return result.modifiedCount > 0;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const db = await getDb();
  
  // Get basic counts
  const [totalProducts, lowStockItems, outOfStockItems] = await Promise.all([
    db.collection<InventoryItem>('inventory').countDocuments(),
    db.collection<InventoryItem>('inventory').countDocuments({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }),
    db.collection<InventoryItem>('inventory').countDocuments({
      currentStock: 0
    })
  ]);
  
  // Calculate total value
  const inventoryItems = await db.collection<InventoryItem>('inventory').find({}).toArray();
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.costPrice), 0);
  
  // Get recently restocked (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentlyRestocked = await db.collection<InventoryItem>('inventory').countDocuments({
    lastRestocked: { $gte: sevenDaysAgo.toISOString() }
  });
  
  // Get top selling products (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const topSellingProducts = await db.collection<StockMovement>('stock_movements').aggregate([
    {
      $match: {
        type: 'out',
        createdAt: { $gte: thirtyDaysAgo.toISOString() }
      }
    },
    {
      $group: {
        _id: '$productId',
        totalQuantity: { $sum: '$quantity' },
        totalRevenue: { $sum: { $multiply: ['$quantity', '$newStock'] } } // This is approximate
      }
    },
    {
      $lookup: {
        from: 'inventory',
        localField: '_id',
        foreignField: 'productId',
        as: 'inventory'
      }
    },
    {
      $unwind: '$inventory'
    },
    {
      $project: {
        productId: '$_id',
        sku: '$inventory.sku',
        name: '$inventory.sku', // We'll need to join with products for actual names
        quantitySold: '$totalQuantity',
        revenue: '$totalRevenue'
      }
    },
    {
      $sort: { quantitySold: -1 }
    },
    {
      $limit: 10
    }
  ]).toArray();
  
  // Get stock movements for the last 30 days
  const stockMovements = await db.collection<StockMovement>('stock_movements').aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo.toISOString() }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } }
        },
        movements: { $sum: 1 },
        value: { $sum: { $multiply: ['$quantity', '$newStock'] } }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]).toArray();
  
  return {
    totalProducts,
    totalValue,
    lowStockItems,
    outOfStockItems,
    recentlyRestocked,
    topSellingProducts: topSellingProducts as any,
    stockMovements: stockMovements.map(item => ({
      date: item._id,
      movements: item.movements,
      value: item.value
    }))
  };
}
