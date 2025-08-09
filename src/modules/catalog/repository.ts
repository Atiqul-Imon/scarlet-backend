import { getDb } from '../../core/db/mongoClient.js';
import type { Category, Product } from './model.js';

export async function listCategories(): Promise<Category[]> { const db = await getDb(); return db.collection<Category>('categories').find({}).limit(200).toArray(); }
export async function listProducts(): Promise<Product[]> { const db = await getDb(); return db.collection<Product>('products').find({}).limit(200).toArray(); }


