import { getDb } from '../../core/db/mongoClient.js';
import type { Category, Product, CategoryTree, CategoryHierarchy } from './model.js';
import { catalogCache } from './cache.js';

export async function listCategories(): Promise<Category[]> {
  // Try cache first
  const cached = await catalogCache.getCategories();
  if (cached) {
    return cached;
  }

  const db = await getDb();
  const categories = await db.collection<Category>('categories')
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .limit(200)
    .toArray();
  
  // Cache the results
  await catalogCache.setCategories(categories);
  
  return categories;
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.collection<Product>('products').find({ isActive: { $ne: false } }).limit(200).toArray();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // Try cache first
  const cached = await catalogCache.getProductBySlug(slug);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const db = await getDb();
  const product = await db.collection<Product>('products').findOne({ slug, isActive: { $ne: false } });
  
  // Cache the result if found
  if (product) {
    await catalogCache.setProductBySlug(slug, product);
  }
  
  return product;
}

export async function getProductById(id: string): Promise<Product | null> {
  // Try cache first
  const cached = await catalogCache.getProductById(id);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const product = await db.collection<Product>('products').findOne({ _id: new ObjectId(id), isActive: { $ne: false } } as any);
  
  // Cache the result if found
  if (product) {
    await catalogCache.setProductBySlug(product.slug, product);
  }
  
  return product;
}

/**
 * ATOMIC STOCK OPERATIONS - Critical for e-commerce integrity
 */

/**
 * Atomically decrement product stock
 * Only succeeds if sufficient stock is available
 * Returns true if successful, false if insufficient stock
 */
export async function decrementStock(productId: string, quantity: number): Promise<boolean> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  try {
    const result = await db.collection('products').updateOne(
      { 
        _id: new ObjectId(productId),
        stock: { $gte: quantity } // Only update if sufficient stock
      },
      { 
        $inc: { stock: -quantity } // Atomic decrement
      }
    );
    
    // Invalidate cache after stock change
    if (result.modifiedCount > 0) {
      await catalogCache.invalidateProductStock(productId);
    }
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error decrementing stock:', error);
    return false;
  }
}

/**
 * Atomically increment product stock (for cancellations/refunds)
 */
export async function incrementStock(productId: string, quantity: number): Promise<boolean> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  try {
    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { 
        $inc: { stock: quantity } // Atomic increment
      }
    );
    
    // Invalidate cache after stock change
    if (result.modifiedCount > 0) {
      await catalogCache.invalidateProductStock(productId);
    }
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error incrementing stock:', error);
    return false;
  }
}

/**
 * Check if sufficient stock is available without modifying
 */
export async function checkStockAvailability(productId: string, quantity: number): Promise<boolean> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  try {
    const product = await db.collection('products').findOne(
      { 
        _id: new ObjectId(productId),
        stock: { $gte: quantity }
      },
      { projection: { _id: 1 } }
    );
    
    return product !== null;
  } catch (error) {
    console.error('Error checking stock availability:', error);
    return false;
  }
}

/**
 * Get current stock level for a product
 */
export async function getCurrentStock(productId: string): Promise<number> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  try {
    const product = await db.collection('products').findOne(
      { _id: new ObjectId(productId) },
      { projection: { stock: 1 } }
    );
    
    return product?.stock || 0;
  } catch (error) {
    console.error('Error getting current stock:', error);
    return 0;
  }
}

// Helper function to get all descendant category IDs for a given category
export async function getAllDescendantCategoryIds(categoryId: string): Promise<string[]> {
  const db = await getDb();
  
  const allCategoryIds = new Set<string>([categoryId]);
  const categoriesToProcess = [categoryId];
  
  while (categoriesToProcess.length > 0) {
    const currentCategoryId = categoriesToProcess.shift()!;
    
    // Find all direct children of the current category
    // Note: parentId is stored as string in database, so we need to convert to string
    const children = await db.collection<Category>('categories')
      .find({ 
        parentId: currentCategoryId.toString(),
        isActive: { $ne: false } 
      })
      .toArray();
    
    // Add children to the set and queue them for processing
    for (const child of children) {
      if (child._id && !allCategoryIds.has(child._id.toString())) {
        allCategoryIds.add(child._id.toString());
        categoriesToProcess.push(child._id.toString());
      }
    }
  }
  
  return Array.from(allCategoryIds);
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  // Try cache first
  const cached = await catalogCache.getProductsByCategory(categoryId);
  if (cached) {
    return cached;
  }
  
  // Get all descendant category IDs (including the category itself)
  const allCategoryIds = await getAllDescendantCategoryIds(categoryId);
  
  // Fetch from database
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const products = await db.collection<Product>('products')
    .find({ 
      categoryIds: { $in: allCategoryIds }, 
      isActive: { $ne: false } 
    })
    .limit(100)
    .toArray();
  
  // Cache the results
  await catalogCache.setProductsByCategory(categoryId, products);
  
  return products;
}

export interface SearchResult {
  products: Product[];
  total: number;
  suggestions?: string[];
  filters?: {
    brands: string[];
    categories: string[];
    priceRange: { min: number; max: number };
  };
}

export async function searchProducts(query: string, options: {
  limit?: number;
  page?: number;
  filters?: {
    brand?: string[];
    category?: string[];
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    rating?: number;
  };
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
} = {}): Promise<SearchResult> {
  const db = await getDb();
  const limit = options.limit || 50;
  const page = options.page || 1;
  const skip = (page - 1) * limit;
  
  // Build base query
  const baseQuery: any = {
    isActive: { $ne: false }
  };
  
  // Add text search with scoring
  if (query && query.trim().length > 0) {
    baseQuery.$text = { $search: query };
  }
  
  // Add filters
  if (options.filters) {
    if (options.filters.brand && options.filters.brand.length > 0) {
      baseQuery.brand = { $in: options.filters.brand };
    }
    if (options.filters.category && options.filters.category.length > 0) {
      baseQuery.categoryIds = { $in: options.filters.category };
    }
    if (options.filters.priceMin !== undefined || options.filters.priceMax !== undefined) {
      baseQuery['price.amount'] = {};
      if (options.filters.priceMin !== undefined) {
        baseQuery['price.amount'].$gte = options.filters.priceMin;
      }
      if (options.filters.priceMax !== undefined) {
        baseQuery['price.amount'].$lte = options.filters.priceMax;
      }
    }
    if (options.filters.inStock !== undefined) {
      baseQuery.stock = options.filters.inStock ? { $gt: 0 } : { $lte: 0 };
    }
    if (options.filters.rating !== undefined) {
      baseQuery['rating.average'] = { $gte: options.filters.rating };
    }
  }
  
  // Build sort criteria
  let sortCriteria: any = {};
  switch (options.sortBy) {
    case 'price_asc':
      sortCriteria = { 'price.amount': 1 };
      break;
    case 'price_desc':
      sortCriteria = { 'price.amount': -1 };
      break;
    case 'rating':
      sortCriteria = { 'rating.average': -1 };
      break;
    case 'newest':
      sortCriteria = { createdAt: -1 };
      break;
    case 'relevance':
    default:
      if (query && query.trim().length > 0) {
        sortCriteria = { score: { $meta: 'textScore' } };
      } else {
        sortCriteria = { isBestSeller: -1, 'rating.average': -1 };
      }
      break;
  }
  
  // Execute search with text scoring if query exists
  const searchOptions: any = {
    sort: sortCriteria,
    skip,
    limit
  };
  
  if (query && query.trim().length > 0) {
    searchOptions.projection = {
      score: { $meta: 'textScore' }
    };
  }
  
  const [products, total] = await Promise.all([
    db.collection<Product>('products')
      .find(baseQuery, searchOptions)
      .toArray(),
    db.collection('products').countDocuments(baseQuery)
  ]);
  
  // If no text search results, try partial matching
  if (products.length === 0 && query && query.trim().length > 0) {
    const partialQuery = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      isActive: { $ne: false }
    };
    
    const partialResults = await db.collection<Product>('products')
      .find(partialQuery)
      .sort({ isBestSeller: -1, 'rating.average': -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const partialTotal = await db.collection('products').countDocuments(partialQuery);
    
    return {
      products: partialResults,
      total: partialTotal,
      suggestions: await generateSearchSuggestions(query, db)
    };
  }
  
  // Get filter options for the search results
  const filterOptions = await getSearchFilterOptions(baseQuery, db);
  
  return {
    products,
    total,
    filters: filterOptions,
    suggestions: await generateSearchSuggestions(query, db)
  };
}

async function generateSearchSuggestions(query: string, db: any): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  
  const suggestions: string[] = [];
  
  // Get brand suggestions
  const brandSuggestions = await db.collection('products')
    .distinct('brand', {
      brand: { $regex: query, $options: 'i' },
      isActive: { $ne: false }
    });
  
  suggestions.push(...brandSuggestions);
  
  // Get tag suggestions
  const tagSuggestions = await db.collection('products')
    .distinct('tags', {
      tags: { $in: [new RegExp(query, 'i')] },
      isActive: { $ne: false }
    });
  
  suggestions.push(...tagSuggestions.flat());
  
  return [...new Set(suggestions)].slice(0, 5);
}

async function getSearchFilterOptions(baseQuery: any, db: any) {
  const [brands, categories, priceRange] = await Promise.all([
    db.collection('products').distinct('brand', baseQuery),
    db.collection('products').distinct('categoryIds', baseQuery),
    db.collection('products').aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          min: { $min: '$price.amount' },
          max: { $max: '$price.amount' }
        }
      }
    ]).toArray()
  ]);
  
  return {
    brands: [...new Set(brands.filter(Boolean))] as string[],
    categories: [...new Set(categories.filter(Boolean))] as string[],
    priceRange: priceRange[0] ? { min: priceRange[0].min, max: priceRange[0].max } : { min: 0, max: 10000 }
  };
}

export async function getSearchSuggestions(query: string, limit: number = 8): Promise<{
  products: Product[];
  brands: string[];
  categories: string[];
}> {
  const db = await getDb();
  
  if (!query || query.trim().length < 2) {
    return { products: [], brands: [], categories: [] };
  }
  
  const searchTerm = query.trim();
  
  // Get product suggestions
  const products = await db.collection<Product>('products')
    .find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ],
      isActive: { $ne: false }
    })
    .sort({ isBestSeller: -1, 'rating.average': -1 })
    .limit(limit)
    .toArray();
  
  // Get brand suggestions
  const brandResults = await db.collection('products')
    .aggregate([
      {
        $match: {
          brand: { $regex: searchTerm, $options: 'i' },
          isActive: { $ne: false }
        }
      },
      { $group: { _id: '$brand' } },
      { $limit: 5 },
      { $project: { _id: 0, brand: '$_id' } }
    ])
    .toArray();
  
  const brands = brandResults.map(item => item.brand).filter(Boolean);
  
  // Get category suggestions
  const categoryResults = await db.collection('products')
    .aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } },
            { tags: { $in: [new RegExp(searchTerm, 'i')] } }
          ],
          isActive: { $ne: false }
        }
      },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds' } },
      { $limit: 5 },
      { $project: { _id: 0, categoryId: '$_id' } }
    ])
    .toArray();
  
  const categories = [...new Set(categoryResults.map(item => item.categoryId).filter(Boolean))];
  
  return {
    products,
    brands: [...new Set(brands.filter(Boolean))] as string[],
    categories: categories as string[]
  };
}

export async function getPopularSearches(limit: number = 10): Promise<string[]> {
  const db = await getDb();
  
  // This would typically come from analytics, but for now we'll use product data
  // In a real implementation, you'd track search queries in a separate collection
  const popularBrands = await db.collection('products')
    .aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, brand: '$_id' } }
    ])
    .toArray();
  
  return popularBrands.map(item => item.brand).filter(Boolean);
}

export async function getProductsByHomepageSection(homepageSection: string): Promise<Product[]> {
  // Try cache first
  const cached = await catalogCache.getProductsBySection(homepageSection);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const db = await getDb();
  const products = await db.collection<Product>('products')
    .find({ 
      homepageSection: homepageSection as any,
      isActive: { $ne: false } 
    })
    .limit(30)
    .toArray();
  
  // Cache the results
  await catalogCache.setProductsBySection(homepageSection, products);
  
  return products;
}

export async function insertCategories(categories: Category[]): Promise<void> {
  const db = await getDb();
  await db.collection<Category>('categories').insertMany(categories);
}

export async function insertProducts(products: Product[]): Promise<void> {
  const db = await getDb();
  await db.collection<Product>('products').insertMany(products);
}

export async function clearCategories(): Promise<void> {
  const db = await getDb();
  await db.collection('categories').deleteMany({});
}

export async function clearProducts(): Promise<void> {
  const db = await getDb();
  await db.collection('products').deleteMany({});
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db.collection<Category>('categories').findOne({ _id: new ObjectId(id) } as any);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  return db.collection<Category>('categories').findOne({ slug });
}

export async function createCategory(categoryData: any): Promise<Category> {
  const db = await getDb();
  
  // Check if category with same slug already exists
  const existingCategory = await getCategoryBySlug(categoryData.slug);
  if (existingCategory) {
    throw new Error(`Category with slug '${categoryData.slug}' already exists`);
  }
  
  const category = {
    ...categoryData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const result = await db.collection<Category>('categories').insertOne(category);
  return { ...category, _id: result.insertedId.toString() };
}

export async function updateCategory(id: string, categoryData: any): Promise<Category> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  const updateData = {
    ...categoryData,
    updatedAt: new Date().toISOString()
  };
  
  await db.collection<Category>('categories').updateOne(
    { _id: new ObjectId(id) } as any,
    { $set: updateData }
  );
  
  const updatedCategory = await db.collection<Category>('categories').findOne({ _id: new ObjectId(id) } as any);
  return updatedCategory!;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  await db.collection<Category>('categories').deleteOne({ _id: new ObjectId(id) } as any);
}

// Hierarchy-specific functions
export async function getCategoryTree(): Promise<CategoryTree[]> {
  const db = await getDb();
  const categories = await db.collection<Category>('categories')
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  return buildCategoryTree(categories);
}

export async function getCategoryHierarchy(): Promise<CategoryHierarchy> {
  const db = await getDb();
  const categories = await db.collection<Category>('categories')
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  const rootCategories = buildCategoryTree(categories);
  const maxLevel = getMaxLevel(categories);

  return {
    rootCategories,
    allCategories: categories,
    maxLevel
  };
}

export async function getCategoryChildren(parentId: string): Promise<Category[]> {
  const db = await getDb();
  return db.collection<Category>('categories')
    .find({ 
      parentId: parentId,
      isActive: { $ne: false } 
    })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
}

export async function getCategoryAncestors(categoryId: string): Promise<Category[]> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const ancestors: Category[] = [];
  
  let currentCategory = await db.collection<Category>('categories')
    .findOne({ _id: new ObjectId(categoryId) } as any);
  
  while (currentCategory && currentCategory.parentId) {
    const parent = await db.collection<Category>('categories')
      .findOne({ _id: new ObjectId(currentCategory.parentId) } as any);
    
    if (parent) {
      ancestors.unshift(parent);
      currentCategory = parent;
    } else {
      break;
    }
  }
  
  return ancestors;
}

export async function getCategoryPath(categoryId: string): Promise<string> {
  const ancestors = await getCategoryAncestors(categoryId);
  const category = await getCategoryById(categoryId);
  
  if (!category) return '';
  
  const pathSegments = [...ancestors.map(cat => cat.slug), category.slug];
  return pathSegments.join('/');
}

export async function updateCategoryHierarchy(categoryId: string, parentId: string | null): Promise<Category> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  
  // Prevent circular references
  if (parentId) {
    const ancestors = await getCategoryAncestors(parentId);
    if (ancestors.some(ancestor => ancestor._id === categoryId)) {
      throw new Error('Cannot set parent: would create circular reference');
    }
  }
  
  // Calculate new level and path
  const level = parentId ? await getCategoryLevel(parentId) + 1 : 0;
  const path = parentId ? await getCategoryPath(parentId) + '/' + (await getCategoryById(categoryId))?.slug : (await getCategoryById(categoryId))?.slug || '';
  
  const updateData = {
    parentId: parentId || null,
    level,
    path,
    updatedAt: new Date().toISOString()
  };
  
  await db.collection<Category>('categories').updateOne(
    { _id: new ObjectId(categoryId) } as any,
    { $set: updateData }
  );
  
  // Update children's levels and paths
  await updateChildrenHierarchy(categoryId, level, path);
  
  const updatedCategory = await db.collection<Category>('categories').findOne({ _id: new ObjectId(categoryId) } as any);
  return updatedCategory!;
}

// Helper functions
function buildCategoryTree(categories: Category[]): CategoryTree[] {
  const categoryMap = new Map<string, CategoryTree>();
  const rootCategories: CategoryTree[] = [];
  
  // Create map of all categories
  categories.forEach(category => {
    categoryMap.set(category._id!, { ...category, children: [] });
  });
  
  // Build tree structure
  categories.forEach(category => {
    const categoryTree = categoryMap.get(category._id!)!;
    
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(categoryTree);
        parent.hasChildren = true;
        parent.childrenCount = (parent.childrenCount || 0) + 1;
      }
    } else {
      rootCategories.push(categoryTree);
    }
  });
  
  return rootCategories;
}

function getMaxLevel(categories: Category[]): number {
  return Math.max(...categories.map(cat => cat.level || 0), 0);
}

async function getCategoryLevel(categoryId: string): Promise<number> {
  const ancestors = await getCategoryAncestors(categoryId);
  return ancestors.length;
}

async function updateChildrenHierarchy(parentId: string, parentLevel: number, parentPath: string): Promise<void> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const children = await getCategoryChildren(parentId);
  
  for (const child of children) {
    const childLevel = parentLevel + 1;
    const childPath = parentPath + '/' + child.slug;
    
    await db.collection<Category>('categories').updateOne(
      { _id: new ObjectId(child._id!) } as any,
      { 
        $set: { 
          level: childLevel, 
          path: childPath,
          updatedAt: new Date().toISOString()
        } 
      }
    );
    
    // Recursively update grandchildren
    await updateChildrenHierarchy(child._id!, childLevel, childPath);
  }
}