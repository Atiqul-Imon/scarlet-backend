import { Document, ObjectId } from 'mongodb';

export interface Brand extends Document {
  _id?: ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  website?: string;
  establishedYear?: number;
  origin?: string;
  category: string;
  specialties?: string[];
  about?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productCount: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
}

export interface BrandTree extends Brand {
  children?: BrandTree[];
  hasChildren?: boolean;
  childrenCount?: number;
  level?: number;
  path?: string[];
}

export interface BrandHierarchy {
  rootBrands: BrandTree[];
  allBrands: Brand[];
  maxLevel: number;
}
