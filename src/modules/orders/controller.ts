import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import type { CreateOrderRequest } from './presenter.js';

// Validation helpers
const validateOrderData = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Required fields validation
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.phone) {
    errors.phone = 'Phone number is required';
  } else if (!/^(\+88)?01[3-9]\d{8}$/.test(data.phone)) {
    errors.phone = 'Please enter a valid Bangladesh phone number (01XXXXXXXXX)';
  }

  if (!data.address || data.address.trim().length < 10) {
    errors.address = 'Address must be at least 10 characters';
  }

  if (!data.city) {
    errors.city = 'City is required';
  }

  if (!data.area) {
    errors.area = 'Area/Thana is required';
  }

  if (!data.postalCode) {
    errors.postalCode = 'Postal code is required';
  } else if (!/^\d{4}$/.test(data.postalCode)) {
    errors.postalCode = 'Postal code must be 4 digits';
  }

  if (!data.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  } else if (!['bkash', 'nagad', 'rocket', 'card', 'cod'].includes(data.paymentMethod)) {
    errors.paymentMethod = 'Invalid payment method';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

// Create order from cart
export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Validate order data
  const validation = validateOrderData(req.body);
  if (!validation.valid) {
    return fail(res, { 
      message: 'Validation failed',
      code: 'VALIDATION_ERROR'
    }, 400);
  }

  try {
    const orderData: CreateOrderRequest = {
      firstName: req.body.firstName.trim(),
      lastName: req.body.lastName.trim(),
      email: req.body.email.toLowerCase().trim(),
      phone: req.body.phone.trim(),
      address: req.body.address.trim(),
      city: req.body.city.trim(),
      area: req.body.area.trim(),
      postalCode: req.body.postalCode.trim(),
      paymentMethod: req.body.paymentMethod,
      notes: req.body.notes?.trim() || undefined,
    };

    const order = await presenter.createFromCart(userId, orderData);
    ok(res, order);
  } catch (error: any) {
    if (error.message.includes('Cart is empty')) {
      return fail(res, { 
        message: 'Your cart is empty. Please add items before placing an order.',
        code: 'EMPTY_CART' 
      }, 400);
    }
    
    if (error.message.includes('not available')) {
      return fail(res, { 
        message: 'Some products in your cart are no longer available. Please review your cart.',
        code: 'PRODUCTS_UNAVAILABLE' 
      }, 400);
    }
    
    if (error.message.includes('Insufficient stock')) {
      return fail(res, { 
        message: error.message,
        code: 'INSUFFICIENT_STOCK' 
      }, 400);
    }
    
    throw error;
  }
});

// List user's orders
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const orders = await presenter.listMyOrders(userId);
    ok(res, orders);
  } catch (error) {
    throw error;
  }
});

// Get specific order by ID
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { orderId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!orderId) {
    return fail(res, { 
      message: 'Order ID is required',
      code: 'ORDER_ID_REQUIRED' 
    }, 400);
  }

  try {
    const order = await presenter.getOrderById(orderId, userId);
    ok(res, order);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, 404);
    }
    
    if (error.message.includes('Access denied')) {
      return fail(res, { 
        message: 'Access denied',
        code: 'ACCESS_DENIED' 
      }, 403);
    }
    
    throw error;
  }
});

// Cancel order
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { orderId } = req.params;
  const { reason } = req.body;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!orderId) {
    return fail(res, { 
      message: 'Order ID is required',
      code: 'ORDER_ID_REQUIRED' 
    }, 400);
  }

  try {
    const order = await presenter.cancelOrder(orderId, userId, reason);
    ok(res, order);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, 404);
    }
    
    if (error.message.includes('Access denied')) {
      return fail(res, { 
        message: 'Access denied',
        code: 'ACCESS_DENIED' 
      }, 403);
    }
    
    if (error.message.includes('cannot be cancelled')) {
      return fail(res, { 
        message: 'Order cannot be cancelled at this stage',
        code: 'CANNOT_CANCEL' 
      }, 400);
    }
    
    throw error;
  }
});


