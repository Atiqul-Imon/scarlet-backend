import { ObjectId } from 'mongodb';
import { getDb } from '../../core/db/mongoClient.js';
import type { Brand, BrandTree, BrandHierarchy } from './model.js';

// Create a new brand
export async function createBrand(brandData: Partial<Brand>): Promise<Brand> {
  const db = await getDb();
  
  const brand: Brand = {
    name: brandData.name!,
    slug: brandData.slug!,
    description: brandData.description!,
    shortDescription: brandData.shortDescription || '',
    logo: brandData.logo || '',
    banner: brandData.banner || '',
    website: brandData.website || '',
    establishedYear: brandData.establishedYear,
    origin: brandData.origin || '',
    category: brandData.category!,
    specialties: brandData.specialties || [],
    about: brandData.about || '',
    isActive: brandData.isActive !== false,
    isFeatured: brandData.isFeatured || false,
    sortOrder: brandData.sortOrder || 0,
    productCount: 0,
    seoTitle: brandData.seoTitle || brandData.name,
    seoDescription: brandData.seoDescription || brandData.description,
    seoKeywords: brandData.seoKeywords || [],
    socialLinks: brandData.socialLinks || {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: brandData.createdBy!,
    updatedBy: brandData.updatedBy
  };

  const result = await db.collection<Brand>('brands').insertOne(brand);
  brand._id = result.insertedId;
  
  return brand;
}

// Get all brands
export async function getBrands(): Promise<Brand[]> {
  const db = await getDb();
  return await db.collection<Brand>('brands')
    .find({})
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
}

// Get brand by ID
export async function getBrandById(brandId: string): Promise<Brand | null> {
  const db = await getDb();
  return await db.collection<Brand>('brands').findOne({ 
    _id: new ObjectId(brandId) 
  });
}

// Get brand by slug
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const db = await getDb();
  return await db.collection<Brand>('brands').findOne({ 
    slug,
    isActive: { $ne: false }
  });
}

// Update brand
export async function updateBrand(brandId: string, updateData: Partial<Brand>): Promise<Brand | null> {
  const db = await getDb();
  
  const updateFields: Partial<Brand> = {
    ...updateData,
    updatedAt: new Date()
  };

  const result = await db.collection<Brand>('brands').findOneAndUpdate(
    { _id: new ObjectId(brandId) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  return result;
}

// Delete brand
export async function deleteBrand(brandId: string): Promise<boolean> {
  const db = await getDb();
  
  // Check if brand has products
  const productCount = await db.collection('products').countDocuments({
    brandId: new ObjectId(brandId)
  });

  if (productCount > 0) {
    throw new Error('Cannot delete brand with associated products');
  }

  const result = await db.collection<Brand>('brands').deleteOne({
    _id: new ObjectId(brandId)
  });

  return result.deletedCount > 0;
}

// Get featured brands
export async function getFeaturedBrands(limit: number = 8): Promise<Brand[]> {
  const db = await getDb();
  return await db.collection<Brand>('brands')
    .find({ 
      isActive: { $ne: false },
      isFeatured: true 
    })
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .toArray();
}

// Get brands by category
export async function getBrandsByCategory(category: string): Promise<Brand[]> {
  const db = await getDb();
  return await db.collection<Brand>('brands')
    .find({ 
      category,
      isActive: { $ne: false }
    })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();
}

// Search brands
export async function searchBrands(query: string, limit: number = 20): Promise<Brand[]> {
  const db = await getDb();
  return await db.collection<Brand>('brands')
    .find({
      $and: [
        { isActive: { $ne: false } },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { specialties: { $in: [new RegExp(query, 'i')] } }
          ]
        }
      ]
    })
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .toArray();
}

// Update brand product count
export async function updateBrandProductCount(brandId: string): Promise<void> {
  const db = await getDb();
  
  const productCount = await db.collection('products').countDocuments({
    brandId: new ObjectId(brandId),
    isActive: { $ne: false }
  });

  await db.collection<Brand>('brands').updateOne(
    { _id: new ObjectId(brandId) },
    { $set: { productCount, updatedAt: new Date() } }
  );
}

// Get brand statistics
export async function getBrandStats(): Promise<{
  totalBrands: number;
  activeBrands: number;
  featuredBrands: number;
  totalProducts: number;
  categories: string[];
}> {
  const db = await getDb();
  
  const [totalBrands, activeBrands, featuredBrands, totalProducts, categories] = await Promise.all([
    db.collection('brands').countDocuments(),
    db.collection('brands').countDocuments({ isActive: { $ne: false } }),
    db.collection('brands').countDocuments({ isActive: { $ne: false }, isFeatured: true }),
    db.collection('products').countDocuments({ isActive: { $ne: false } }),
    db.collection('brands').distinct('category', { isActive: { $ne: false } })
  ]);

  return {
    totalBrands,
    activeBrands,
    featuredBrands,
    totalProducts,
    categories: categories.sort()
  };
}

// Hierarchy-specific functions
export async function getBrandTree(): Promise<BrandTree[]> {
  const db = await getDb();
  const brands = await db.collection<Brand>('brands')
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  return buildBrandTree(brands);
}

export async function getBrandHierarchy(): Promise<BrandHierarchy> {
  const db = await getDb();
  const brands = await db.collection<Brand>('brands')
    .find({ isActive: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .toArray();

  const rootBrands = buildBrandTree(brands);
  const maxLevel = getMaxLevel(brands);

  return {
    rootBrands,
    allBrands: brands,
    maxLevel
  };
}

// Helper functions
function buildBrandTree(brands: Brand[]): BrandTree[] {
  const brandMap = new Map<string, BrandTree>();
  const rootBrands: BrandTree[] = [];
  
  // Create map of all brands
  brands.forEach(brand => {
    brandMap.set(brand._id!.toString(), { ...brand, children: [] });
  });
  
  // Build tree structure
  brands.forEach(brand => {
    const brandTree = brandMap.get(brand._id!.toString())!;
    
    // For now, all brands are root level
    // In the future, we could add parent-child relationships
    rootBrands.push(brandTree);
  });
  
  return rootBrands;
}

function getMaxLevel(brands: Brand[]): number {
  return Math.max(...brands.map(brand => brand.level || 0), 0);
}
