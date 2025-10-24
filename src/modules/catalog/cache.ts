import { redisClient } from '../../core/cache/redisClient.js';
import type { Product } from './model.js';

const CACHE_TTL = {
  PRODUCT_DETAIL: 60 * 60, // 1 hour
  PRODUCT_LIST: 60 * 5, // 5 minutes
  CATEGORY_LIST: 60 * 60, // 1 hour
  RELATED_PRODUCTS: 60 * 30, // 30 minutes
  SEARCH_RESULTS: 60 * 10, // 10 minutes
  SEARCH_SUGGESTIONS: 60 * 5, // 5 minutes
  POPULAR_SEARCHES: 60 * 60, // 1 hour
  SEARCH_ANALYTICS: 60 * 60 * 24 // 24 hours
};

const CACHE_PREFIX = {
  PRODUCT_BY_SLUG: 'product:slug:',
  PRODUCT_BY_ID: 'product:id:',
  PRODUCTS_BY_CATEGORY: 'products:category:',
  PRODUCTS_BY_SECTION: 'products:section:',
  RELATED_PRODUCTS: 'products:related:',
  SEARCH_RESULTS: 'search:results:',
  SEARCH_SUGGESTIONS: 'search:suggestions:',
  POPULAR_SEARCHES: 'search:popular:',
  SEARCH_ANALYTICS: 'search:analytics:',
  CATEGORIES: 'categories:list'
};

export class CatalogCache {
  private redis = redisClient;
  
  constructor() {
    // Redis client is already initialized as a singleton
  }
  
  /**
   * Get categories from cache
   */
  async getCategories(): Promise<any[] | null> {
    try {
      const cached = await this.redis.get(CACHE_PREFIX.CATEGORIES);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Categories cache get error:', error);
      return null;
    }
  }

  /**
   * Set categories in cache
   */
  async setCategories(categories: any[]): Promise<void> {
    try {
      await this.redis.set(
        CACHE_PREFIX.CATEGORIES,
        JSON.stringify(categories),
        CACHE_TTL.CATEGORY_LIST
      );
    } catch (error) {
      console.error('Categories cache set error:', error);
    }
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
   * Invalidate product stock cache specifically
   * Used when stock levels change to ensure fresh data
   */
  async invalidateProductStock(productId: string): Promise<void> {
    try {
      // Invalidate all product-related caches
      await this.redis.del(`${CACHE_PREFIX.PRODUCT_BY_ID}${productId}`);
      
      // Get product slug to invalidate slug-based cache
      const { getDb } = await import('../../core/db/mongoClient.js');
      const db = await getDb();
      const { ObjectId } = await import('mongodb');
      const product = await db.collection('products').findOne(
        { _id: new ObjectId(productId) },
        { projection: { slug: 1 } }
      );
      
      if (product?.slug) {
        await this.redis.del(`${CACHE_PREFIX.PRODUCT_BY_SLUG}${product.slug}`);
      }
      
      // Invalidate product lists that might show stock
      await this.invalidateListCaches();
    } catch (error) {
      console.error('Stock cache invalidation error:', error);
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
      const categoriesKey = CACHE_PREFIX.CATEGORIES;
      
      const allKeys = [...categoryKeys, ...sectionKeys, ...relatedKeys, categoriesKey];
      
      // Delete each key individually
      for (const key of allKeys) {
        await this.redis.del(key);
      }
      
      console.log('Cache invalidated for category order changes');
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Get search results from cache
   */
  async getSearchResults(query: string, filters?: any): Promise<any | null> {
    try {
      const cacheKey = `${CACHE_PREFIX.SEARCH_RESULTS}${query}:${JSON.stringify(filters || {})}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Search cache get error:', error);
      return null;
    }
  }

  /**
   * Set search results in cache
   */
  async setSearchResults(query: string, results: any, filters?: any): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX.SEARCH_RESULTS}${query}:${JSON.stringify(filters || {})}`;
      await this.redis.set(
        cacheKey,
        JSON.stringify(results),
        CACHE_TTL.SEARCH_RESULTS
      );
    } catch (error) {
      console.error('Search cache set error:', error);
    }
  }

  /**
   * Get search suggestions from cache
   */
  async getSearchSuggestions(query: string): Promise<any | null> {
    try {
      const cacheKey = `${CACHE_PREFIX.SEARCH_SUGGESTIONS}${query}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Search suggestions cache get error:', error);
      return null;
    }
  }

  /**
   * Set search suggestions in cache
   */
  async setSearchSuggestions(query: string, suggestions: any): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX.SEARCH_SUGGESTIONS}${query}`;
      await this.redis.set(
        cacheKey,
        JSON.stringify(suggestions),
        CACHE_TTL.SEARCH_SUGGESTIONS
      );
    } catch (error) {
      console.error('Search suggestions cache set error:', error);
    }
  }

  /**
   * Get popular searches from cache
   */
  async getPopularSearches(): Promise<string[] | null> {
    try {
      const cached = await this.redis.get(CACHE_PREFIX.POPULAR_SEARCHES);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Popular searches cache get error:', error);
      return null;
    }
  }

  /**
   * Set popular searches in cache
   */
  async setPopularSearches(searches: string[]): Promise<void> {
    try {
      await this.redis.set(
        CACHE_PREFIX.POPULAR_SEARCHES,
        JSON.stringify(searches),
        CACHE_TTL.POPULAR_SEARCHES
      );
    } catch (error) {
      console.error('Popular searches cache set error:', error);
    }
  }

  /**
   * Track search query for analytics
   */
  async trackSearchQuery(query: string): Promise<void> {
    try {
      const analyticsKey = `${CACHE_PREFIX.SEARCH_ANALYTICS}queries`;
      await this.redis.zincrby(analyticsKey, 1, query.toLowerCase());
      await this.redis.expire(analyticsKey, CACHE_TTL.SEARCH_ANALYTICS);
    } catch (error) {
      console.error('Search analytics tracking error:', error);
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    try {
      const analyticsKey = `${CACHE_PREFIX.SEARCH_ANALYTICS}queries`;
      const results = await this.redis.zrevrange(analyticsKey, 0, limit - 1, 'WITHSCORES');
      
      const analytics: Array<{ query: string; count: number }> = [];
      for (let i = 0; i < results.length; i += 2) {
        analytics.push({
          query: results[i],
          count: parseInt(results[i + 1])
        });
      }
      
      return analytics;
    } catch (error) {
      console.error('Search analytics get error:', error);
      return [];
    }
  }

  /**
   * Invalidate search caches
   */
  async invalidateSearchCaches(): Promise<void> {
    try {
      const searchKeys = await this.redis.keys(`${CACHE_PREFIX.SEARCH_RESULTS}*`);
      const suggestionKeys = await this.redis.keys(`${CACHE_PREFIX.SEARCH_SUGGESTIONS}*`);
      
      const allKeys = [...searchKeys, ...suggestionKeys];
      
      for (const key of allKeys) {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Search cache invalidation error:', error);
    }
  }

  /**
   * Clear all catalog caches
   */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await this.redis.keys('product:*');
      const sectionKeys = await this.redis.keys('products:*');
      const searchKeys = await this.redis.keys('search:*');
      
      const keys = [...allKeys, ...sectionKeys, ...searchKeys];
      
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

