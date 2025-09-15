import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { WishlistItem, CreateWishlistItemRequest, OutOfStockWishlistItem, WishlistAnalytics } from './model.js';

export async function addToWishlist(userId: string, productId: string, options?: {
  notifyWhenInStock?: boolean;
  customerNotes?: string;
  priority?: 'low' | 'medium' | 'high';
}): Promise<WishlistItem> {
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
  
  const isOutOfStock = product.stock === 0 || product.stock === undefined;
  
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
    // Enhanced fields for out-of-stock notifications
    isOutOfStock,
    notifyWhenInStock: options?.notifyWhenInStock ?? isOutOfStock,
    notificationSent: false,
    priority: options?.priority || (isOutOfStock ? 'medium' : 'low'),
    customerNotes: options?.customerNotes,
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

// Admin functions for out-of-stock wishlist management
export async function getOutOfStockWishlistItems(): Promise<OutOfStockWishlistItem[]> {
  const db = await getDb();
  
  const pipeline = [
    {
      $match: {
        isOutOfStock: true,
        notifyWhenInStock: true
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'product.stock': 0
      }
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        productId: 1,
        product: {
          _id: { $toString: '$product._id' },
          title: '$product.title',
          slug: '$product.slug',
          description: '$product.description',
          shortDescription: '$product.shortDescription',
          images: '$product.images',
          price: '$product.price',
          brand: '$product.brand',
          stock: '$product.stock',
          categoryIds: '$product.categoryIds',
          rating: '$product.rating',
          createdAt: '$product.createdAt',
          updatedAt: '$product.updatedAt'
        },
        customer: {
          _id: { $toString: '$user._id' },
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          email: '$user.email',
          phone: '$user.phone'
        },
        addedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        isOutOfStock: 1,
        notifyWhenInStock: 1,
        notificationSent: 1,
        priority: 1,
        customerNotes: 1,
        estimatedRestockDate: 1
      }
    },
    {
      $sort: {
        priority: -1, // high priority first
        addedAt: -1
      }
    }
  ];
  
  return await db.collection('wishlist').aggregate(pipeline).toArray() as OutOfStockWishlistItem[];
}

export async function getWishlistAnalytics(): Promise<WishlistAnalytics> {
  const db = await getDb();
  
  const [
    totalWishlistItems,
    outOfStockItems,
    inStockItems,
    mostWishedProducts,
    recentActivity
  ] = await Promise.all([
    // Total wishlist items
    db.collection('wishlist').countDocuments(),
    
    // Out of stock items
    db.collection('wishlist').countDocuments({ isOutOfStock: true }),
    
    // In stock items
    db.collection('wishlist').countDocuments({ isOutOfStock: false }),
    
    // Most wished products
    db.collection('wishlist').aggregate([
      {
        $group: {
          _id: '$productId',
          wishlistCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productId: { $toString: '$_id' },
          productName: '$product.title',
          wishlistCount: 1,
          isOutOfStock: { $eq: ['$product.stock', 0] }
        }
      },
      {
        $sort: { wishlistCount: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray(),
    
    // Recent wishlist activity
    db.collection('wishlist').aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          userId: 1,
          productId: 1,
          action: 'added',
          timestamp: '$addedAt'
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $limit: 20
      }
    ]).toArray()
  ]);
  
  return {
    totalWishlistItems,
    outOfStockItems,
    inStockItems,
    mostWishedProducts,
    recentWishlistActivity: recentActivity
  };
}

export async function notifyCustomersAboutRestock(productId: string, options: {
  message?: string;
  estimatedRestockDate?: string;
}): Promise<{ notified: number; message: string }> {
  const db = await getDb();
  
  // Find all wishlist items for this product that are out of stock
  const wishlistItems = await db.collection('wishlist').find({
    productId,
    isOutOfStock: true,
    notifyWhenInStock: true
  }).toArray();
  
  // Update notification status
  const updateResult = await db.collection('wishlist').updateMany(
    {
      productId,
      isOutOfStock: true,
      notifyWhenInStock: true
    },
    {
      $set: {
        notificationSent: true,
        estimatedRestockDate: options.estimatedRestockDate,
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  // TODO: Implement actual notification sending (email, SMS, etc.)
  // For now, we'll just log the notification
  console.log(`Notifying ${wishlistItems.length} customers about restock of product ${productId}`);
  
  return {
    notified: updateResult.modifiedCount,
    message: `Notified ${updateResult.modifiedCount} customers about product restock`
  };
}

export async function updateWishlistItemPriority(wishlistItemId: string, options: {
  priority?: 'low' | 'medium' | 'high';
  estimatedRestockDate?: string;
  adminNotes?: string;
}): Promise<{ updated: boolean }> {
  const db = await getDb();
  
  const updateData: any = {
    updatedAt: new Date().toISOString()
  };
  
  if (options.priority) updateData.priority = options.priority;
  if (options.estimatedRestockDate) updateData.estimatedRestockDate = options.estimatedRestockDate;
  if (options.adminNotes) updateData.adminNotes = options.adminNotes;
  
  const result = await db.collection('wishlist').updateOne(
    { _id: new ObjectId(wishlistItemId) },
    { $set: updateData }
  );
  
  return { updated: result.modifiedCount > 0 };
}
