import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { WishlistItem, CreateWishlistItemRequest } from './model.js';

export async function addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // Check if item already exists in wishlist
  const existingItem = await db.collection<WishlistItem>('wishlist')
    .findOne({ userId, productId });
  
  if (existingItem) {
    throw new Error('Product already in wishlist');
  }
  
  // Get product details
  const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
  if (!product) {
    throw new Error('Product not found');
  }
  
  const wishlistItem = {
    userId,
    productId,
    product: {
      _id: product._id.toString(),
      title: product.title,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      images: product.images || [],
      price: product.price,
      brand: product.brand,
      stock: product.stock,
      categoryIds: product.categoryIds || [],
      rating: product.rating,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
    addedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.collection<WishlistItem>('wishlist').insertOne(wishlistItem as any);
  return { ...wishlistItem, _id: result.insertedId.toString() } as WishlistItem;
}

export async function getWishlistByUser(userId: string): Promise<WishlistItem[]> {
  const db = await getDb();
  const wishlistItems = await db.collection<WishlistItem>('wishlist')
    .find({ userId })
    .sort({ addedAt: -1 })
    .toArray();
  
  // Update product information for each item
  const updatedItems = await Promise.all(
    wishlistItems.map(async (item) => {
      const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });
      if (product) {
        return {
          ...item,
          product: {
            _id: product._id.toString(),
            title: product.title,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            images: product.images || [],
            price: product.price,
            brand: product.brand,
            stock: product.stock,
            categoryIds: product.categoryIds || [],
            rating: product.rating,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          },
        };
      }
      return item;
    })
  );
  
  return updatedItems;
}

export async function removeFromWishlist(userId: string, productId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<WishlistItem>('wishlist')
    .deleteOne({ userId, productId });
  
  return result.deletedCount > 0;
}

export async function clearWishlist(userId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<WishlistItem>('wishlist')
    .deleteMany({ userId });
  
  return result.deletedCount > 0;
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const db = await getDb();
  const item = await db.collection<WishlistItem>('wishlist')
    .findOne({ userId, productId });
  
  return !!item;
}

export async function getWishlistCount(userId: string): Promise<number> {
  const db = await getDb();
  return db.collection<WishlistItem>('wishlist')
    .countDocuments({ userId });
}
