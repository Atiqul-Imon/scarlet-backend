import { ObjectId } from 'mongodb';

export interface BlogAuthor {
  name?: string;
  email?: string;
  avatar?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface BlogCategory {
  _id?: ObjectId | string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BlogPost {
  _id?: ObjectId | string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  author: BlogAuthor;
  categories: string[]; // Array of category IDs
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date | string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  readingTime: number; // in minutes
  viewCount: number;
  isFeatured?: boolean;
  isPinned?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BlogQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'title';
}

export interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalCategories: number;
  mostPopularPost?: {
    title: string;
    slug: string;
    viewCount: number;
  };
  recentPosts: BlogPost[];
}

export interface BlogComment {
  _id?: ObjectId | string;
  postId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
