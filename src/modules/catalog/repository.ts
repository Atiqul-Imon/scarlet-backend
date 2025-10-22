import { getDb } from '../../core/db/mongoClient.js';
import type { Category, Product, CategoryTree, CategoryHierarchy } from './model.js';
import { catalogCache } from './cache.js';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.collection<Category>('categories').find({ isActive: { $ne: false } }).limit(200).toArray();
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

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  // Try cache first
  const cached = await catalogCache.getProductsByCategory(categoryId);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  const products = await db.collection<Product>('products')
    .find({ 
      categoryIds: { $in: [categoryId] }, 
      isActive: { $ne: false } 
    })
    .limit(100)
    .toArray();
  
  // Cache the results
  await catalogCache.setProductsByCategory(categoryId, products);
  
  return products;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDb();
  return db.collection<Product>('products')
    .find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      isActive: { $ne: false }
    })
    .limit(50)
    .toArray();
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