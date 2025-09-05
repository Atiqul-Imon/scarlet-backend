import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';

// Add item to wishlist
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  const { productId } = req.body;
  
  if (!productId) {
    return fail(res, { 
      message: 'Product ID is required',
      code: 'PRODUCT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const wishlistItem = await presenter.addToWishlist(userId, productId);
    ok(res, wishlistItem);
  } catch (error: any) {
    if (error.message.includes('already in wishlist')) {
      return fail(res, { 
        message: 'Product is already in your wishlist',
        code: 'ALREADY_IN_WISHLIST' 
      }, 409);
    }
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});

// Get user's wishlist
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const wishlist = await presenter.getWishlist(userId);
    ok(res, wishlist);
  } catch (error) {
    throw error;
  }
});

// Remove item from wishlist
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { productId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!productId) {
    return fail(res, { 
      message: 'Product ID is required',
      code: 'PRODUCT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.removeFromWishlist(userId, productId);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Item not found in wishlist',
        code: 'ITEM_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});

// Clear entire wishlist
export const clearWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const result = await presenter.clearWishlist(userId);
    ok(res, result);
  } catch (error) {
    throw error;
  }
});

// Check if product is in wishlist
export const checkWishlistStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { productId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!productId) {
    return fail(res, { 
      message: 'Product ID is required',
      code: 'PRODUCT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.checkWishlistStatus(userId, productId);
    ok(res, result);
  } catch (error) {
    throw error;
  }
});

// Get wishlist statistics
export const getWishlistStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const stats = await presenter.getWishlistStats(userId);
    ok(res, stats);
  } catch (error) {
    throw error;
  }
});
