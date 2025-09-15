export interface WishlistItem {
  _id?: string;
  userId: string;
  productId: string;
  product: Product;
  addedAt: string;
  createdAt?: string;
  updatedAt?: string;
  // Enhanced fields for out-of-stock notifications
  isOutOfStock?: boolean;
  notifyWhenInStock?: boolean;
  notificationSent?: boolean;
  priority?: 'low' | 'medium' | 'high';
  customerNotes?: string;
  estimatedRestockDate?: string;
}

export interface Product {
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: string[];
  price: {
    currency: string;
    amount: number;
    originalAmount?: number;
    discountPercentage?: number;
  };
  brand?: string;
  stock?: number;
  categoryIds: string[];
  rating?: {
    average: number;
    count: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWishlistItemRequest {
  productId: string;
  notifyWhenInStock?: boolean;
  customerNotes?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

// New interfaces for out-of-stock wishlist management
export interface OutOfStockWishlistItem extends WishlistItem {
  isOutOfStock: true;
  notifyWhenInStock: true;
  customer: {
    _id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  product: Product & {
    stock: 0;
    stockStatus: 'out_of_stock';
  };
}

export interface WishlistNotificationRequest {
  productId: string;
  message?: string;
  estimatedRestockDate?: string;
}

export interface WishlistAnalytics {
  totalWishlistItems: number;
  outOfStockItems: number;
  inStockItems: number;
  mostWishedProducts: Array<{
    productId: string;
    productName: string;
    wishlistCount: number;
    isOutOfStock: boolean;
  }>;
  recentWishlistActivity: Array<{
    userId: string;
    productId: string;
    action: 'added' | 'removed';
    timestamp: string;
  }>;
}
