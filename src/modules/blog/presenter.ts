import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import * as repo from './repository.js';
import type { BlogPost, BlogCategory, BlogQuery, BlogStats } from './model.js';

// Blog Posts Presenter
export async function getBlogPosts(query: BlogQuery = {}) {
  try {
    const posts = await repo.getBlogPosts(query);
    return posts;
  } catch (error) {
    logger.error({ error, query }, 'Failed to get blog posts');
    throw new AppError('Failed to fetch blog posts', { 
      status: 500, 
      code: 'BLOG_POSTS_FETCH_ERROR' 
    });
  }
}

export async function getBlogPostBySlug(slug: string) {
  if (!slug) {
    throw new AppError('Blog post slug is required', { 
      status: 400, 
      code: 'BLOG_SLUG_REQUIRED' 
    });
  }

  try {
    const post = await repo.getBlogPostBySlug(slug);
    
    if (!post) {
      throw new AppError('Blog post not found', { 
        status: 404, 
        code: 'BLOG_POST_NOT_FOUND' 
      });
    }

    // Increment view count asynchronously
    repo.incrementViewCount(slug).catch(error => {
      logger.warn({ error, slug }, 'Failed to increment view count');
    });

    return post;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, slug }, 'Failed to get blog post by slug');
    throw new AppError('Failed to fetch blog post', { 
      status: 500, 
      code: 'BLOG_POST_FETCH_ERROR' 
    });
  }
}

export async function getBlogPostById(id: string) {
  if (!id) {
    throw new AppError('Blog post ID is required', { 
      status: 400, 
      code: 'BLOG_ID_REQUIRED' 
    });
  }

  try {
    const post = await repo.getBlogPostById(id);
    
    if (!post) {
      throw new AppError('Blog post not found', { 
        status: 404, 
        code: 'BLOG_POST_NOT_FOUND' 
      });
    }

    return post;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, id }, 'Failed to get blog post by ID');
    throw new AppError('Failed to fetch blog post', { 
      status: 500, 
      code: 'BLOG_POST_FETCH_ERROR' 
    });
  }
}

export async function createBlogPost(postData: any) {
  // Validation
  if (!postData.title) {
    throw new AppError('Blog post title is required', { 
      status: 400, 
      code: 'BLOG_TITLE_REQUIRED' 
    });
  }

  if (!postData.content) {
    throw new AppError('Blog post content is required', { 
      status: 400, 
      code: 'BLOG_CONTENT_REQUIRED' 
    });
  }

  if (!postData.slug) {
    throw new AppError('Blog post slug is required', { 
      status: 400, 
      code: 'BLOG_SLUG_REQUIRED' 
    });
  }

  if (!postData.author || !postData.author.name) {
    throw new AppError('Blog post author is required', { 
      status: 400, 
      code: 'BLOG_AUTHOR_REQUIRED' 
    });
  }

  try {
    // Calculate reading time (average 200 words per minute)
    const wordCount = postData.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const blogPost = {
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      excerpt: postData.excerpt || postData.content.substring(0, 200) + '...',
      featuredImage: postData.featuredImage,
      author: {
        name: postData.author.name,
        email: postData.author.email,
        avatar: postData.author.avatar,
        bio: postData.author.bio,
        socialLinks: postData.author.socialLinks
      },
      categories: postData.categories || [],
      tags: postData.tags || [],
      status: postData.status || 'draft',
      publishedAt: postData.status === 'published' ? new Date() : undefined,
      seoTitle: postData.seoTitle || postData.title,
      seoDescription: postData.seoDescription || postData.excerpt,
      seoKeywords: postData.seoKeywords || [],
      readingTime,
      viewCount: 0,
      isFeatured: postData.isFeatured || false,
      isPinned: postData.isPinned || false
    };

    const createdPost = await repo.createBlogPost(blogPost);
    logger.info({ postId: createdPost._id, title: createdPost.title }, 'Blog post created successfully');
    
    return createdPost;
  } catch (error) {
    logger.error({ error, postData }, 'Failed to create blog post');
    throw new AppError('Failed to create blog post', { 
      status: 500, 
      code: 'BLOG_POST_CREATE_ERROR' 
    });
  }
}

export async function updateBlogPost(id: string, postData: any) {
  if (!id) {
    throw new AppError('Blog post ID is required', { 
      status: 400, 
      code: 'BLOG_ID_REQUIRED' 
    });
  }

  try {
    // Recalculate reading time if content is updated
    if (postData.content) {
      const wordCount = postData.content.split(/\s+/).length;
      postData.readingTime = Math.ceil(wordCount / 200);
    }

    // Update publishedAt if status changes to published
    if (postData.status === 'published') {
      const existingPost = await repo.getBlogPostById(id);
      if (existingPost && existingPost.status !== 'published') {
        postData.publishedAt = new Date();
      }
    }

    const updatedPost = await repo.updateBlogPost(id, postData);
    
    if (!updatedPost) {
      throw new AppError('Blog post not found', { 
        status: 404, 
        code: 'BLOG_POST_NOT_FOUND' 
      });
    }

    logger.info({ postId: id, title: updatedPost.title }, 'Blog post updated successfully');
    return updatedPost;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, id, postData }, 'Failed to update blog post');
    throw new AppError('Failed to update blog post', { 
      status: 500, 
      code: 'BLOG_POST_UPDATE_ERROR' 
    });
  }
}

export async function deleteBlogPost(id: string) {
  if (!id) {
    throw new AppError('Blog post ID is required', { 
      status: 400, 
      code: 'BLOG_ID_REQUIRED' 
    });
  }

  try {
    const deleted = await repo.deleteBlogPost(id);
    
    if (!deleted) {
      throw new AppError('Blog post not found', { 
        status: 404, 
        code: 'BLOG_POST_NOT_FOUND' 
      });
    }

    logger.info({ postId: id }, 'Blog post deleted successfully');
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, id }, 'Failed to delete blog post');
    throw new AppError('Failed to delete blog post', { 
      status: 500, 
      code: 'BLOG_POST_DELETE_ERROR' 
    });
  }
}

// Blog Categories Presenter
export async function getBlogCategories() {
  try {
    const categories = await repo.getBlogCategories();
    return categories;
  } catch (error) {
    logger.error({ error }, 'Failed to get blog categories');
    throw new AppError('Failed to fetch blog categories', { 
      status: 500, 
      code: 'BLOG_CATEGORIES_FETCH_ERROR' 
    });
  }
}

export async function createBlogCategory(categoryData: any) {
  if (!categoryData.name) {
    throw new AppError('Category name is required', { 
      status: 400, 
      code: 'BLOG_CATEGORY_NAME_REQUIRED' 
    });
  }

  if (!categoryData.slug) {
    throw new AppError('Category slug is required', { 
      status: 400, 
      code: 'BLOG_CATEGORY_SLUG_REQUIRED' 
    });
  }

  try {
    const category = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      color: categoryData.color,
      isActive: categoryData.isActive !== false
    };

    const createdCategory = await repo.createBlogCategory(category);
    logger.info({ categoryId: createdCategory._id, name: createdCategory.name }, 'Blog category created successfully');
    
    return createdCategory;
  } catch (error) {
    logger.error({ error, categoryData }, 'Failed to create blog category');
    throw new AppError('Failed to create blog category', { 
      status: 500, 
      code: 'BLOG_CATEGORY_CREATE_ERROR' 
    });
  }
}

export async function updateBlogCategory(id: string, categoryData: any) {
  if (!id) {
    throw new AppError('Category ID is required', { 
      status: 400, 
      code: 'BLOG_CATEGORY_ID_REQUIRED' 
    });
  }

  try {
    const updatedCategory = await repo.updateBlogCategory(id, categoryData);
    
    if (!updatedCategory) {
      throw new AppError('Blog category not found', { 
        status: 404, 
        code: 'BLOG_CATEGORY_NOT_FOUND' 
      });
    }

    logger.info({ categoryId: id, name: updatedCategory.name }, 'Blog category updated successfully');
    return updatedCategory;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, id, categoryData }, 'Failed to update blog category');
    throw new AppError('Failed to update blog category', { 
      status: 500, 
      code: 'BLOG_CATEGORY_UPDATE_ERROR' 
    });
  }
}

export async function deleteBlogCategory(id: string) {
  if (!id) {
    throw new AppError('Category ID is required', { 
      status: 400, 
      code: 'BLOG_CATEGORY_ID_REQUIRED' 
    });
  }

  try {
    const deleted = await repo.deleteBlogCategory(id);
    
    if (!deleted) {
      throw new AppError('Blog category not found', { 
        status: 404, 
        code: 'BLOG_CATEGORY_NOT_FOUND' 
      });
    }

    logger.info({ categoryId: id }, 'Blog category deleted successfully');
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error({ error, id }, 'Failed to delete blog category');
    throw new AppError('Failed to delete blog category', { 
      status: 500, 
      code: 'BLOG_CATEGORY_DELETE_ERROR' 
    });
  }
}

// Blog Stats Presenter
export async function getBlogStats() {
  try {
    const stats = await repo.getBlogStats();
    return stats;
  } catch (error) {
    logger.error({ error }, 'Failed to get blog stats');
    throw new AppError('Failed to fetch blog stats', { 
      status: 500, 
      code: 'BLOG_STATS_FETCH_ERROR' 
    });
  }
}
