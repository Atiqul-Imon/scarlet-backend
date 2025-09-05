export interface WishlistItem {
  _id?: string;
  userId: string;
  productId: string;
  product: Product;
  addedAt: string;
  createdAt?: string;
  updatedAt?: string;
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
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}
