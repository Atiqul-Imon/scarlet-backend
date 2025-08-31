import { getDb } from '../../core/db/mongoClient.js';
import type { Category, Product } from './model.js';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.collection<Category>('categories').find({ isActive: { $ne: false } }).limit(200).toArray();
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.collection<Product>('products').find({ isActive: { $ne: false } }).limit(200).toArray();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const db = await getDb();
  return db.collection<Product>('products').findOne({ slug, isActive: { $ne: false } });
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db.collection<Product>('products').findOne({ _id: new ObjectId(id), isActive: { $ne: false } } as any);
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const db = await getDb();
  const { ObjectId } = await import('mongodb');
  return db.collection<Product>('products')
    .find({ 
      categoryIds: { $in: [categoryId] }, 
      isActive: { $ne: false } 
    })
    .limit(100)
    .toArray();
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