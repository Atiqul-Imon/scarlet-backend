import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';
import type { BlogQuery } from './model.js';
import { logger } from '../../core/logging/logger.js';

// Blog Posts Controller
export const getBlogPosts = async (req: Request, res: Response) => {
  const query: BlogQuery = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    category: req.query.category as string,
    tag: req.query.tag as string,
    search: req.query.search as string,
    status: req.query.status as 'draft' | 'published' | 'archived',
    featured: req.query.featured === 'true',
    sortBy: req.query.sortBy as 'newest' | 'oldest' | 'popular' | 'title'
  };

  const posts = await presenter.getBlogPosts(query);
  ok(res, posts);
};

export const getBlogPostBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  
  if (!slug) {
    return fail(res, { 
      message: 'Blog post slug is required',
      code: 'BLOG_SLUG_REQUIRED' 
    }, 400);
  }

  const post = await presenter.getBlogPostBySlug(slug);
  ok(res, post);
};

export const getBlogPostById = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return fail(res, { 
      message: 'Blog post ID is required',
      code: 'BLOG_ID_REQUIRED' 
    }, 400);
  }

  const post = await presenter.getBlogPostById(id);
  ok(res, post);
};

export const createBlogPost = async (req: Request, res: Response) => {
  const postData = req.body;
  
  // Basic validation
  if (!postData.title) {
    return fail(res, { 
      message: 'Blog post title is required',
      code: 'BLOG_TITLE_REQUIRED' 
    }, 400);
  }

  if (!postData.content) {
    return fail(res, { 
      message: 'Blog post content is required',
      code: 'BLOG_CONTENT_REQUIRED' 
    }, 400);
  }

  if (!postData.slug) {
    return fail(res, { 
      message: 'Blog post slug is required',
      code: 'BLOG_SLUG_REQUIRED' 
    }, 400);
  }

  const post = await presenter.createBlogPost(postData);
  ok(res, post);
};

export const updateBlogPost = async (req: Request, res: Response) => {
  const { id } = req.params;
  const postData = req.body;
  
  if (!id) {
    return fail(res, { 
      message: 'Blog post ID is required',
      code: 'BLOG_ID_REQUIRED' 
    }, 400);
  }

  const post = await presenter.updateBlogPost(id, postData);
  ok(res, post);
};

export const deleteBlogPost = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return fail(res, { 
      message: 'Blog post ID is required',
      code: 'BLOG_ID_REQUIRED' 
    }, 400);
  }

  const result = await presenter.deleteBlogPost(id);
  ok(res, result);
};

// Blog Categories Controller
export const getBlogCategories = async (req: Request, res: Response) => {
  const categories = await presenter.getBlogCategories();
  ok(res, categories);
};

export const createBlogCategory = async (req: Request, res: Response) => {
  const categoryData = req.body;
  
  if (!categoryData.name) {
    return fail(res, { 
      message: 'Category name is required',
      code: 'BLOG_CATEGORY_NAME_REQUIRED' 
    }, 400);
  }

  if (!categoryData.slug) {
    return fail(res, { 
      message: 'Category slug is required',
      code: 'BLOG_CATEGORY_SLUG_REQUIRED' 
    }, 400);
  }

  const category = await presenter.createBlogCategory(categoryData);
  ok(res, category);
};

export const updateBlogCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const categoryData = req.body;
  
  if (!id) {
    return fail(res, { 
      message: 'Category ID is required',
      code: 'BLOG_CATEGORY_ID_REQUIRED' 
    }, 400);
  }

  const category = await presenter.updateBlogCategory(id, categoryData);
  ok(res, category);
};

export const deleteBlogCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return fail(res, { 
      message: 'Category ID is required',
      code: 'BLOG_CATEGORY_ID_REQUIRED' 
    }, 400);
  }

  const result = await presenter.deleteBlogCategory(id);
  ok(res, result);
};

// Blog Stats Controller
export const getBlogStats = async (req: Request, res: Response) => {
  const stats = await presenter.getBlogStats();
  ok(res, stats);
};

// Search Blog Posts
export const searchBlogPosts = async (req: Request, res: Response) => {
  const { q, page = 1, limit = 10 } = req.query;
  
  if (!q) {
    return fail(res, { 
      message: 'Search query is required',
      code: 'SEARCH_QUERY_REQUIRED' 
    }, 400);
  }

  const query: BlogQuery = {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    search: q as string,
    status: 'published'
  };

  const posts = await presenter.getBlogPosts(query);
  ok(res, posts);
};

// Get Related Blog Posts
export const getRelatedBlogPosts = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { limit = 5 } = req.query;
  
  if (!slug) {
    return fail(res, { 
      message: 'Blog post slug is required',
      code: 'BLOG_SLUG_REQUIRED' 
    }, 400);
  }

  // First get the current post to find related posts
  const currentPost = await presenter.getBlogPostBySlug(slug);
  
  if (!currentPost) {
    return fail(res, { 
      message: 'Blog post not found',
      code: 'BLOG_POST_NOT_FOUND' 
    }, 404);
  }

  // Find related posts by categories and tags
  const query: BlogQuery = {
    limit: parseInt(limit as string),
    status: 'published',
    category: currentPost.categories[0] // Use first category
  };

  const relatedPosts = await presenter.getBlogPosts(query);
  
  // Filter out the current post
  const filteredPosts = relatedPosts.filter(post => post.slug !== slug);
  
  ok(res, filteredPosts);
};