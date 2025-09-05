import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';
import type { CreateWishlistItemRequest } from './model.js';

export async function addToWishlist(userId: string, productId: string) {
  if (!productId || productId.trim().length === 0) {
    throw new AppError('Product ID is required', { status: 400 });
  }

  try {
    return await repo.addToWishlist(userId, productId);
  } catch (error: any) {
    if (error.message.includes('already in wishlist')) {
      throw new AppError('Product is already in your wishlist', { status: 409 });
    }
    if (error.message.includes('not found')) {
      throw new AppError('Product not found', { status: 404 });
    }
    throw error;
  }
}

export async function getWishlist(userId: string) {
  try {
    const items = await repo.getWishlistByUser(userId);
    return {
      items,
      total: items.length,
    };
  } catch (error) {
    throw error;
  }
}

export async function removeFromWishlist(userId: string, productId: string) {
  if (!productId || productId.trim().length === 0) {
    throw new AppError('Product ID is required', { status: 400 });
  }

  try {
    const removed = await repo.removeFromWishlist(userId, productId);
    if (!removed) {
      throw new AppError('Item not found in wishlist', { status: 404 });
    }
    return { removed: true };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      throw new AppError('Item not found in wishlist', { status: 404 });
    }
    throw error;
  }
}

export async function clearWishlist(userId: string) {
  try {
    const cleared = await repo.clearWishlist(userId);
    return { cleared: true, count: cleared ? 1 : 0 };
  } catch (error) {
    throw error;
  }
}

export async function checkWishlistStatus(userId: string, productId: string) {
  if (!productId || productId.trim().length === 0) {
    throw new AppError('Product ID is required', { status: 400 });
  }

  try {
    const isInWishlist = await repo.isInWishlist(userId, productId);
    return { isInWishlist };
  } catch (error) {
    throw error;
  }
}

export async function getWishlistStats(userId: string) {
  try {
    const count = await repo.getWishlistCount(userId);
    return { count };
  } catch (error) {
    throw error;
  }
}
