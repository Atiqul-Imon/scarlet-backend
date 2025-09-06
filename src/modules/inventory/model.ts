// BaseEntity interface for MongoDB documents
interface BaseEntity {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem extends BaseEntity {
  productId: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  location?: string;
  lastRestocked?: string;
  lastSold?: string;
}

export interface StockMovement extends BaseEntity {
  productId: string;
  sku: string;
  type: 'in' | 'out' | 'adjustment' | 'reserved' | 'unreserved';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string; // Order ID, Purchase ID, etc.
  userId?: string; // Who made the change
  notes?: string;
}

export interface LowStockAlert extends BaseEntity {
  productId: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  severity: 'low' | 'critical' | 'out_of_stock';
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentlyRestocked: number;
  topSellingProducts: Array<{
    productId: string;
    sku: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  stockMovements: Array<{
    date: string;
    movements: number;
    value: number;
  }>;
}

export interface CreateInventoryItemRequest {
  productId: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  location?: string;
}

export interface UpdateStockRequest {
  productId: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  reference?: string;
  notes?: string;
}

export interface StockAdjustmentRequest {
  productId: string;
  newStock: number;
  reason: string;
  notes?: string;
}
