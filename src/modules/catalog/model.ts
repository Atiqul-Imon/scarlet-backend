export interface Category {
  _id?: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  image?: string;
  isActive?: boolean;
  showInHomepage?: boolean;
  sortOrder?: number;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
  // Hierarchy support
  level?: number;
  path?: string; // e.g., "skincare/face-care/cleansers"
  childrenCount?: number;
  hasChildren?: boolean;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}

export interface CategoryHierarchy {
  rootCategories: CategoryTree[];
  allCategories: Category[];
  maxLevel: number;
}

export interface ProductPrice {
  currency: string;
  amount: number;
  originalAmount?: number; // For sale prices
  discountPercentage?: number;
}

export interface ProductAttribute {
  name: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'boolean' | 'select';
  displayName?: string;
}

export interface Product {
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: string[];
  price: ProductPrice;
  brand?: string;
  stock?: number;
  categoryIds: string[];
  attributes?: Record<string, string | number | boolean>;
  tags?: string[];
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  isActive?: boolean;
  isFeatured?: boolean;
  trackInventory?: boolean;
  homepageSection?: 'new-arrivals' | 'skincare-essentials' | 'makeup-collection' | null;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}