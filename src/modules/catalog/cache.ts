import { redisClient } from '../../core/cache/redisClient.js';
import type { Product } from './model.js';

const CACHE_TTL = {
  PRODUCT_DETAIL: 60 * 60, // 1 hour
  PRODUCT_LIST: 60 * 5, // 5 minutes
  CATEGORY_LIST: 60 * 60, // 1 hour
  RELATED_PRODUCTS: 60 * 30 // 30 minutes
};

const CACHE_PREFIX = {
  PRODUCT_BY_SLUG: 'product:slug:',
  PRODUCT_BY_ID: 'product:id:',
  PRODUCTS_BY_CATEGORY: 'products:category:',
  PRODUCTS_BY_SECTION: 'products:section:',
  RELATED_PRODUCTS: 'products:related:'
};

export class CatalogCache {
  private redis = redisClient;
  
  constructor() {
    // Redis client is already initialized as a singleton
  }
  
  /**
   * Get product by slug from cache
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX.PRODUCT_BY_SLUG}${slug}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set product in cache by slug
   */
  async setProductBySlug(slug: string, product: Product): Promise<void> {
    try {
      await this.redis.set(
        `${CACHE_PREFIX.PRODUCT_BY_SLUG}${slug}`,
        JSON.stringify(product),
        CACHE_TTL.PRODUCT_DETAIL
      );
      
      // Also cache by ID for consistency
      if (product._id) {
        await this.redis.set(
          `${CACHE_PREFIX.PRODUCT_BY_ID}${product._id}`,
          JSON.stringify(product),
          CACHE_TTL.PRODUCT_DETAIL
        );
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  /**
   * Get product by ID from cache
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX.PRODUCT_BY_ID}${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Get products by category from cache
   */
  async getProductsByCategory(categoryId: string): Promise<Product[] | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX.PRODUCTS_BY_CATEGORY}${categoryId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set products by category in cache
   */
  async setProductsByCategory(categoryId: string, products: Product[]): Promise<void> {
    try {
      await this.redis.set(
        `${CACHE_PREFIX.PRODUCTS_BY_CATEGORY}${categoryId}`,
        JSON.stringify(products),
        CACHE_TTL.RELATED_PRODUCTS
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  /**
   * Get products by homepage section from cache
   */
  async getProductsBySection(section: string): Promise<Product[] | null> {
    try {
      const cached = await this.redis.get(`${CACHE_PREFIX.PRODUCTS_BY_SECTION}${section}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set products by homepage section in cache
   */
  async setProductsBySection(section: string, products: Product[]): Promise<void> {
    try {
      await this.redis.set(
        `${CACHE_PREFIX.PRODUCTS_BY_SECTION}${section}`,
        JSON.stringify(products),
        CACHE_TTL.PRODUCT_LIST
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  /**
   * Invalidate product cache
   */
  async invalidateProduct(productId?: string, slug?: string): Promise<void> {
    try {
      if (productId) {
        await this.redis.del(`${CACHE_PREFIX.PRODUCT_BY_ID}${productId}`);
      }
      
      if (slug) {
        await this.redis.del(`${CACHE_PREFIX.PRODUCT_BY_SLUG}${slug}`);
      }
      
      // Also invalidate related caches (category lists, section lists)
      await this.invalidateListCaches();
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Invalidate all list caches (categories, sections)
   */
  async invalidateListCaches(): Promise<void> {
    try {
      // Get all list cache keys and delete them
      const categoryKeys = await this.redis.keys(`${CACHE_PREFIX.PRODUCTS_BY_CATEGORY}*`);
      const sectionKeys = await this.redis.keys(`${CACHE_PREFIX.PRODUCTS_BY_SECTION}*`);
      const relatedKeys = await this.redis.keys(`${CACHE_PREFIX.RELATED_PRODUCTS}*`);
      
      const allKeys = [...categoryKeys, ...sectionKeys, ...relatedKeys];
      
      // Delete each key individually
      for (const key of allKeys) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Clear all catalog caches
   */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await this.redis.keys('product:*');
      const sectionKeys = await this.redis.keys('products:*');
      
      const keys = [...allKeys, ...sectionKeys];
      
      // Delete each key individually
      for (const key of keys) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Export singleton instance
export const catalogCache = new CatalogCache();

