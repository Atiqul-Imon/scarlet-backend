/**
 * Database Indexes Setup
 * Creates optimized indexes for all collections to improve query performance
 */

import { getDb } from './mongoClient.js';
import { logger } from '../logging/logger.js';

/**
 * Create all database indexes
 * This should be run on application startup or during deployment
 */
export async function createAllIndexes(): Promise<void> {
  try {
    logger.info('Creating database indexes...');
    
    await Promise.all([
      createProductIndexes(),
      createUserIndexes(),
      createOrderIndexes(),
      createCartIndexes(),
      createCategoryIndexes(),
      createBlogIndexes(),
      createWishlistIndexes(),
    ]);
    
    logger.info('✅ All database indexes created successfully');
  } catch (error: any) {
    logger.error('Failed to create database indexes', error);
    throw error;
  }
}

/**
 * Create indexes for products collection
 */
async function createProductIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('products');
  
  await collection.createIndexes([
    // Unique slug for product URLs
    { key: { slug: 1 }, unique: true, name: 'slug_unique' },
    
    // Text search for title, description, and brand
    { 
      key: { title: 'text', description: 'text', brand: 'text', tags: 'text' },
      name: 'product_text_search',
      weights: { title: 10, brand: 5, tags: 3, description: 1 }
    },
    
    // Category filtering
    { key: { categoryIds: 1 }, name: 'category_filter' },
    
    // Price range queries
    { key: { 'price.amount': 1 }, name: 'price_range' },
    
    // Stock management
    { key: { stock: 1 }, name: 'stock_check' },
    { key: { stock: 1, lowStockThreshold: 1 }, name: 'low_stock_alert' },
    
    // Sorting by creation date
    { key: { createdAt: -1 }, name: 'newest_first' },
    
    // Featured and bestseller queries
    { key: { isFeatured: 1, createdAt: -1 }, name: 'featured_products' },
    { key: { isBestSeller: 1, createdAt: -1 }, name: 'bestseller_products' },
    { key: { isNewArrival: 1, createdAt: -1 }, name: 'new_arrivals' },
    
    // Active products (isActive filter is common)
    { key: { isActive: 1, createdAt: -1 }, name: 'active_products' },
    
    // Homepage sections
    { key: { homepageSection: 1 }, name: 'homepage_section' },
  ]);
  
  logger.info('✅ Product indexes created');
}

/**
 * Create indexes for users collection
 */
async function createUserIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('users');
  
  await collection.createIndexes([
    // Unique email for authentication
    { key: { email: 1 }, unique: true, name: 'email_unique' },
    
    // Unique phone (sparse for optional phones)
    { key: { phone: 1 }, unique: true, sparse: true, name: 'phone_unique' },
    
    // User role queries
    { key: { role: 1 }, name: 'user_role' },
    
    // Account creation date
    { key: { createdAt: -1 }, name: 'user_created' },
    
    // Email and phone verification status
    { key: { isEmailVerified: 1 }, name: 'email_verified' },
    { key: { isPhoneVerified: 1 }, name: 'phone_verified' },
  ]);
  
  logger.info('✅ User indexes created');
}

/**
 * Create indexes for orders collection
 */
async function createOrderIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('orders');
  
  await collection.createIndexes([
    // User's orders
    { key: { userId: 1, createdAt: -1 }, name: 'user_orders' },
    
    // Unique order number
    { key: { orderNumber: 1 }, unique: true, name: 'order_number_unique' },
    
    // Order status filtering
    { key: { status: 1, createdAt: -1 }, name: 'order_status' },
    
    // Payment status
    { key: { 'payment.status': 1 }, name: 'payment_status' },
    
    // Order creation date
    { key: { createdAt: -1 }, name: 'order_created' },
    
    // Customer email and phone for quick lookup
    { key: { 'customer.email': 1 }, name: 'customer_email' },
    { key: { 'customer.phone': 1 }, name: 'customer_phone' },
    
    // Total amount queries
    { key: { total: 1 }, name: 'order_total' },
  ]);
  
  logger.info('✅ Order indexes created');
}

/**
 * Create indexes for carts collection
 */
async function createCartIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('carts');
  
  await collection.createIndexes([
    // User cart lookup
    { key: { userId: 1 }, name: 'user_cart' },
    
    // Guest cart lookup
    { key: { sessionId: 1 }, name: 'guest_cart' },
    
    // Cart expiration (for cleanup)
    { key: { updatedAt: 1 }, expireAfterSeconds: 2592000, name: 'cart_expiry' }, // 30 days
  ]);
  
  logger.info('✅ Cart indexes created');
}

/**
 * Create indexes for categories collection
 */
async function createCategoryIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('categories');
  
  await collection.createIndexes([
    // Unique slug
    { key: { slug: 1 }, unique: true, name: 'category_slug_unique' },
    
    // Parent category for hierarchy
    { key: { parentId: 1 }, name: 'parent_category' },
    
    // Category ordering
    { key: { order: 1 }, name: 'category_order' },
    
    // Active categories
    { key: { isActive: 1 }, name: 'active_categories' },
  ]);
  
  logger.info('✅ Category indexes created');
}

/**
 * Create indexes for blog posts collection
 */
async function createBlogIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('blogPosts');
  
  await collection.createIndexes([
    // Unique slug
    { key: { slug: 1 }, unique: true, name: 'blog_slug_unique' },
    
    // Text search
    { 
      key: { title: 'text', excerpt: 'text', content: 'text' },
      name: 'blog_text_search',
      weights: { title: 10, excerpt: 5, content: 1 }
    },
    
    // Category filtering
    { key: { categoryIds: 1 }, name: 'blog_category' },
    
    // Publication date
    { key: { publishedAt: -1 }, name: 'blog_published' },
    
    // Status filtering
    { key: { status: 1, publishedAt: -1 }, name: 'blog_status' },
    
    // Featured posts
    { key: { isFeatured: 1, publishedAt: -1 }, name: 'featured_posts' },
  ]);
  
  logger.info('✅ Blog indexes created');
}

/**
 * Create indexes for wishlist collection
 */
async function createWishlistIndexes(): Promise<void> {
  const db = await getDb();
  const collection = db.collection('wishlists');
  
  await collection.createIndexes([
    // User wishlist lookup
    { key: { userId: 1 }, name: 'user_wishlist' },
    
    // Product in wishlist check
    { key: { userId: 1, productId: 1 }, unique: true, name: 'user_product_wishlist' },
    
    // Creation date
    { key: { createdAt: -1 }, name: 'wishlist_created' },
  ]);
  
  logger.info('✅ Wishlist indexes created');
}

/**
 * Drop all indexes (use with caution, mainly for development/testing)
 */
export async function dropAllIndexes(): Promise<void> {
  try {
    const db = await getDb();
    const collections = ['products', 'users', 'orders', 'carts', 'categories', 'blogPosts', 'wishlists'];
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).dropIndexes();
        logger.info(`Dropped indexes for ${collectionName}`);
      } catch (error: any) {
        // Ignore errors for non-existent collections
        logger.warn(`Could not drop indexes for ${collectionName}:`, error);
      }
    }
    
    logger.info('✅ All indexes dropped');
  } catch (error: any) {
    logger.error('Failed to drop indexes', error);
    throw error;
  }
}

/**
 * List all indexes for a collection
 */
export async function listIndexes(collectionName: string): Promise<any[]> {
  try {
    const db = await getDb();
    const indexes = await db.collection(collectionName).indexes();
    logger.info(`Indexes for ${collectionName}:`);
    return indexes as any;
  } catch (error: any) {
    logger.error(`Failed to list indexes for ${collectionName}`, error);
    throw error;
  }
}

