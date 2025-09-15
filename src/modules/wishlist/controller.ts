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

  const { productId, notifyWhenInStock, customerNotes, priority } = req.body;
  
  if (!productId) {
    return fail(res, { 
      message: 'Product ID is required',
      code: 'PRODUCT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const wishlistItem = await presenter.addToWishlist(userId, productId, {
      notifyWhenInStock,
      customerNotes,
      priority
    });
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

// Admin: Get out-of-stock wishlist items
export const getOutOfStockWishlistItems = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  try {
    const items = await presenter.getOutOfStockWishlistItems();
    ok(res, items);
  } catch (error) {
    throw error;
  }
});

// Admin: Get wishlist analytics
export const getWishlistAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  try {
    const analytics = await presenter.getWishlistAnalytics();
    ok(res, analytics);
  } catch (error) {
    throw error;
  }
});

// Admin: Send notification to customers about restocked items
export const notifyCustomersAboutRestock = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  const { productId, message, estimatedRestockDate } = req.body;
  
  if (!productId) {
    return fail(res, { 
      message: 'Product ID is required',
      code: 'PRODUCT_ID_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.notifyCustomersAboutRestock(productId, {
      message,
      estimatedRestockDate
    });
    ok(res, result);
  } catch (error) {
    throw error;
  }
});

// Admin: Update wishlist item priority
export const updateWishlistItemPriority = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin' && userRole !== 'staff') {
    return fail(res, { 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED' 
    }, 403);
  }

  const { wishlistItemId } = req.params;
  const { priority, estimatedRestockDate, adminNotes } = req.body;
  
  if (!wishlistItemId) {
    return fail(res, { 
      message: 'Wishlist item ID is required',
      code: 'WISHLIST_ITEM_ID_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.updateWishlistItemPriority(wishlistItemId, {
      priority,
      estimatedRestockDate,
      adminNotes
    });
    ok(res, result);
  } catch (error) {
    throw error;
  }
});
