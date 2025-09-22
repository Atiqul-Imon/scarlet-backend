import { ObjectId } from 'mongodb';
import { getDb } from '../../core/db/mongoClient.js';
import type { BlogPost, BlogCategory, BlogQuery, BlogStats, BlogComment } from './model.js';
import { logger } from '../../core/logging/logger.js';

// Blog Posts Repository
export async function getBlogPosts(query: BlogQuery = {}): Promise<BlogPost[]> {
  const db = await getDb();
  const {
    page = 1,
    limit = 10,
    category,
    tag,
    search,
    status = 'published',
    featured,
    sortBy = 'newest'
  } = query;

  const filter: any = {};

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Category filter
  if (category) {
    filter.categories = category;
  }

  // Tag filter
  if (tag) {
    filter.tags = { $in: [tag] };
  }

  // Search filter
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Featured filter
  if (featured !== undefined) {
    filter.isFeatured = featured;
  }

  // Sort options
  let sort: any = {};
  switch (sortBy) {
    case 'newest':
      sort = { publishedAt: -1, createdAt: -1 };
      break;
    case 'oldest':
      sort = { publishedAt: 1, createdAt: 1 };
      break;
    case 'popular':
      sort = { viewCount: -1, publishedAt: -1 };
      break;
    case 'title':
      sort = { title: 1 };
      break;
    default:
      sort = { publishedAt: -1, createdAt: -1 };
  }

  const skip = (page - 1) * limit;

  try {
    const posts = await db.collection<BlogPost>('blog_posts')
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    return posts;
  } catch (error) {
    logger.error({ error, query }, 'Failed to fetch blog posts');
    throw error;
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = await getDb();
  
  try {
    const post = await db.collection<BlogPost>('blog_posts')
      .findOne({ slug, status: 'published' });
    
    return post;
  } catch (error) {
    logger.error({ error, slug }, 'Failed to fetch blog post by slug');
    throw error;
  }
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const db = await getDb();
  
  try {
    const post = await db.collection<BlogPost>('blog_posts')
      .findOne({ _id: new ObjectId(id) });
    
    return post;
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch blog post by ID');
    throw error;
  }
}

export async function createBlogPost(postData: Omit<BlogPost, '_id' | 'createdAt' | 'updatedAt'>): Promise<BlogPost> {
  const db = await getDb();
  
  const now = new Date();
  const post: BlogPost = {
    ...postData,
    viewCount: 0,
    createdAt: now,
    updatedAt: now
  };

  try {
    const result = await db.collection<BlogPost>('blog_posts').insertOne(post);
    return { ...post, _id: result.insertedId };
  } catch (error) {
    logger.error({ error, postData }, 'Failed to create blog post');
    throw error;
  }
}

export async function updateBlogPost(id: string, postData: Partial<BlogPost>): Promise<BlogPost | null> {
  const db = await getDb();
  
  try {
    const updateData = {
      ...postData,
      updatedAt: new Date()
    };

    const result = await db.collection<BlogPost>('blog_posts')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    return result;
  } catch (error) {
    logger.error({ error, id, postData }, 'Failed to update blog post');
    throw error;
  }
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const db = await getDb();
  
  try {
    const result = await db.collection<BlogPost>('blog_posts')
      .deleteOne({ _id: new ObjectId(id) });
    
    return result.deletedCount > 0;
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete blog post');
    throw error;
  }
}

export async function incrementViewCount(slug: string): Promise<void> {
  const db = await getDb();
  
  try {
    await db.collection<BlogPost>('blog_posts')
      .updateOne(
        { slug },
        { $inc: { viewCount: 1 } }
      );
  } catch (error) {
    logger.error({ error, slug }, 'Failed to increment view count');
    // Don't throw error for view count increment
  }
}

// Blog Categories Repository
export async function getBlogCategories(): Promise<BlogCategory[]> {
  const db = await getDb();
  
  try {
    const categories = await db.collection<BlogCategory>('blog_categories')
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    
    return categories;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch blog categories');
    throw error;
  }
}

export async function createBlogCategory(categoryData: Omit<BlogCategory, '_id' | 'createdAt' | 'updatedAt'>): Promise<BlogCategory> {
  const db = await getDb();
  
  const now = new Date();
  const category: BlogCategory = {
    ...categoryData,
    createdAt: now,
    updatedAt: now
  };

  try {
    const result = await db.collection<BlogCategory>('blog_categories').insertOne(category);
    return { ...category, _id: result.insertedId };
  } catch (error) {
    logger.error({ error, categoryData }, 'Failed to create blog category');
    throw error;
  }
}

export async function updateBlogCategory(id: string, categoryData: Partial<BlogCategory>): Promise<BlogCategory | null> {
  const db = await getDb();
  
  try {
    const updateData = {
      ...categoryData,
      updatedAt: new Date()
    };

    const result = await db.collection<BlogCategory>('blog_categories')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    return result;
  } catch (error) {
    logger.error({ error, id, categoryData }, 'Failed to update blog category');
    throw error;
  }
}

export async function deleteBlogCategory(id: string): Promise<boolean> {
  const db = await getDb();
  
  try {
    const result = await db.collection<BlogCategory>('blog_categories')
      .deleteOne({ _id: new ObjectId(id) });
    
    return result.deletedCount > 0;
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete blog category');
    throw error;
  }
}

// Blog Stats
export async function getBlogStats(): Promise<BlogStats> {
  const db = await getDb();
  
  try {
    const [totalPosts, publishedPosts, draftPosts, totalViews, totalCategories, mostPopularPost, recentPosts] = await Promise.all([
      db.collection<BlogPost>('blog_posts').countDocuments(),
      db.collection<BlogPost>('blog_posts').countDocuments({ status: 'published' }),
      db.collection<BlogPost>('blog_posts').countDocuments({ status: 'draft' }),
      db.collection<BlogPost>('blog_posts').aggregate([
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ]).toArray(),
      db.collection<BlogCategory>('blog_categories').countDocuments({ isActive: true }),
      db.collection<BlogPost>('blog_posts')
        .find({ status: 'published' })
        .sort({ viewCount: -1 })
        .limit(1)
        .toArray(),
      db.collection<BlogPost>('blog_posts')
        .find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(5)
        .toArray()
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      totalViews: totalViews[0]?.total || 0,
      totalCategories,
      mostPopularPost: mostPopularPost[0] ? {
        title: mostPopularPost[0].title,
        slug: mostPopularPost[0].slug,
        viewCount: mostPopularPost[0].viewCount
      } : undefined,
      recentPosts
    };
  } catch (error) {
    logger.error({ error }, 'Failed to fetch blog stats');
    throw error;
  }
}
