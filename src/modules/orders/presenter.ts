import * as cartRepo from '../cart/repository.js';
import * as catalogRepo from '../catalog/repository.js';
import * as orderRepo from './repository.js';
import * as analyticsPresenter from '../analytics/presenter.js';
// import { sendOrderSuccessSMS } from '../otp/presenter.js'; // Removed - SMS now sent only when admin confirms order
import type { Order, OrderItem, ShippingAddress, PaymentMethod } from './model.js';
import { AppError } from '../../core/errors/AppError.js';
import { ObjectId } from 'mongodb';

// Location-based delivery charges
const DELIVERY_CHARGE_INSIDE_DHAKA = 80;
const DELIVERY_CHARGE_OUTSIDE_DHAKA = 150;
const FREE_SHIPPING_THRESHOLD = 2000; // Free shipping for orders above 2000 BDT

/**
 * Calculate shipping cost based on delivery area and order subtotal
 * @param deliveryArea - 'inside_dhaka' or 'outside_dhaka'
 * @param subtotal - Order subtotal amount
 * @returns Shipping cost in BDT
 */
function calculateShippingCost(
  deliveryArea: 'inside_dhaka' | 'outside_dhaka',
  subtotal: number
): number {
  // Free shipping for orders above threshold
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  // Location-based delivery charges
  if (deliveryArea === 'inside_dhaka') {
    return DELIVERY_CHARGE_INSIDE_DHAKA;
  } else if (deliveryArea === 'outside_dhaka') {
    return DELIVERY_CHARGE_OUTSIDE_DHAKA;
  }

  // Fallback: default to outside Dhaka charge if area is not specified
  return DELIVERY_CHARGE_OUTSIDE_DHAKA;
}

export interface CreateOrderRequest {
  // Shipping Information
  firstName: string;
  lastName?: string; // Made optional
  email?: string; // Made optional
  phone: string;
  address: string;
  // Location-based fields
  deliveryArea: 'inside_dhaka' | 'outside_dhaka'; // Delivery location selection
  dhakaArea?: string; // Thana/Area in Dhaka (for inside_dhaka)
  division?: string; // Division/City (for outside_dhaka)
  district?: string; // District/Zilla (for outside_dhaka)
  upazilla?: string; // Upazilla (for outside_dhaka)
  // Legacy fields (keep for backward compatibility)
  city: string;
  area: string;
  postalCode: string;
  
  // Payment Information
  paymentMethod: PaymentMethod;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'; // Made optional, defaults to 'pending'
  
  // Optional fields
  notes?: string;
  couponCode?: string;
}

export async function createFromCart(userId: string, orderData: CreateOrderRequest): Promise<Order> {
  // Fetch cart and validate
  const cart = await cartRepo.getOrCreateCart(userId);
  if (!cart.items.length) {
    throw new AppError('Cart is empty', { status: 400 });
  }

  // Fetch product details for all cart items
  const productIds = cart.items.map(item => item.productId);
  const products = await Promise.all(
    productIds.map(id => catalogRepo.getProductById(id))
  );

  // Validate all products exist and are active
  const validProducts = products.filter(p => p && p.isActive !== false);
  if (validProducts.length !== cart.items.length) {
    throw new AppError('Some products in cart are no longer available', { status: 400 });
  }

  // Create order items with ATOMIC stock operations
  const orderItems: OrderItem[] = [];
  const stockOperations: Array<{ productId: string; quantity: number }> = [];
  
  // First pass: Validate products and prepare stock operations
  for (const cartItem of cart.items) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check if product tracks inventory
    if (product.trackInventory !== false && product.stock !== undefined) {
      // Add to stock operations for atomic processing
      stockOperations.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity
      });
    }

    orderItems.push({
      productId: cartItem.productId,
      title: product.title,
      slug: product.slug,
      price: product.price.amount,
      quantity: cartItem.quantity,
      image: product.images[0] || '',
      sku: product.sku || '',
      brand: product.brand || ''
    });
  }

  // ATOMIC STOCK OPERATIONS - Process all stock decrements atomically
  for (const stockOp of stockOperations) {
    const stockDecremented = await catalogRepo.decrementStock(stockOp.productId, stockOp.quantity);
    if (!stockDecremented) {
      // If any stock operation fails, we need to restore previously decremented stock
      // This is a critical rollback mechanism
      for (const rollbackOp of stockOperations) {
        if (rollbackOp.productId === stockOp.productId) break; // Don't rollback the failed one
        await catalogRepo.incrementStock(rollbackOp.productId, rollbackOp.quantity);
      }
      
      // Get current stock for error message
      const currentStock = await catalogRepo.getCurrentStock(stockOp.productId);
      const product = validProducts.find(p => p!._id!.toString() === stockOp.productId);
      throw new AppError(
        `Insufficient stock for ${product?.title || 'product'}. Available: ${currentStock}, Requested: ${stockOp.quantity}`, 
        { status: 400 }
      );
    }
  }

  // Validate delivery area
  if (!orderData.deliveryArea) {
    throw new AppError('Delivery area is required (inside_dhaka or outside_dhaka)', { status: 400 });
  }

  // Validate location fields based on delivery area
  if (orderData.deliveryArea === 'inside_dhaka') {
    if (!orderData.dhakaArea) {
      throw new AppError('Dhaka area (Thana) is required for inside Dhaka delivery', { status: 400 });
    }
  } else if (orderData.deliveryArea === 'outside_dhaka') {
    if (!orderData.division || !orderData.district || !orderData.upazilla) {
      throw new AppError('Division, District, and Upazilla are required for outside Dhaka delivery', { status: 400 });
    }
  }

  // Calculate totals with location-based shipping
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = calculateShippingCost(orderData.deliveryArea, subtotal);
  const total = subtotal + shippingCost;

  // Create shipping address with location-based fields
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName,
    email: orderData.email,
    phone: orderData.phone,
    address: orderData.address,
    // Location-based fields
    deliveryArea: orderData.deliveryArea,
    dhakaArea: orderData.dhakaArea,
    division: orderData.division,
    district: orderData.district,
    upazilla: orderData.upazilla,
    // Legacy fields (keep for backward compatibility)
    city: orderData.city,
    area: orderData.area,
    postalCode: orderData.postalCode
  };

  // Generate order number
  const orderNumber = generateOrderNumber();

  // Create order
  const order: Omit<Order, '_id' | 'createdAt' | 'updatedAt'> = {
    orderNumber,
    userId: userId,
    items: orderItems,
    shippingAddress,
    paymentInfo: {
      method: orderData.paymentMethod,
      status: orderData.paymentStatus === 'paid' ? 'completed' : (orderData.paymentStatus || 'pending')
    },
    status: 'pending',
    subtotal,
    shipping: shippingCost,
    tax: 0,
    discount: 0,
    total,
    currency: 'BDT',
    notes: orderData.notes || ''
  };

  const createdOrder = await orderRepo.insertOrder(order as any);

  // Clear cart after successful order creation
  await cartRepo.saveCart({ userId, items: [], updatedAt: new Date().toISOString() });

  // Track analytics events
  try {
    await analyticsPresenter.trackEvent({
      sessionId: userId,
      eventType: 'order_created',
      eventData: {
        orderId: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        total: createdOrder.total,
        itemCount: createdOrder.items.length
      }
    });
  } catch (error) {
    console.error('Failed to track order creation:', error);
  }

  // SMS notification removed - will be sent only when admin confirms the order
  // Previously sent automatically on order creation, now sent only when status changes from 'pending' to 'confirmed'

  return createdOrder;
}

export async function createFromGuestCart(cartItems: any[], orderData: CreateOrderRequest): Promise<Order> {
  if (!cartItems.length) {
    throw new AppError('Cart is empty', { status: 400 });
  }

  // Fetch product details for all cart items
  const productIds = cartItems.map(item => item.productId);
  const products = await Promise.all(
    productIds.map(id => catalogRepo.getProductById(id))
  );

  // Validate all products exist and are active
  const validProducts = products.filter(p => p && p.isActive !== false);
  if (validProducts.length !== cartItems.length) {
    throw new AppError('Some products in cart are no longer available', { status: 400 });
  }

  // Create order items with ATOMIC stock operations
  const orderItems: OrderItem[] = [];
  const stockOperations: Array<{ productId: string; quantity: number }> = [];
  
  // First pass: Validate products and prepare stock operations
  for (const cartItem of cartItems) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check if product tracks inventory
    if (product.trackInventory !== false && product.stock !== undefined) {
      // Add to stock operations for atomic processing
      stockOperations.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity
      });
    }

    orderItems.push({
      productId: cartItem.productId,
      title: product.title,
      slug: product.slug,
      price: product.price.amount,
      quantity: cartItem.quantity,
      image: product.images[0] || '',
      sku: product.sku || '',
      brand: product.brand || ''
    });
  }

  // ATOMIC STOCK OPERATIONS - Process all stock decrements atomically
  for (const stockOp of stockOperations) {
    const stockDecremented = await catalogRepo.decrementStock(stockOp.productId, stockOp.quantity);
    if (!stockDecremented) {
      // If any stock operation fails, we need to restore previously decremented stock
      // This is a critical rollback mechanism
      for (const rollbackOp of stockOperations) {
        if (rollbackOp.productId === stockOp.productId) break; // Don't rollback the failed one
        await catalogRepo.incrementStock(rollbackOp.productId, rollbackOp.quantity);
      }
      
      // Get current stock for error message
      const currentStock = await catalogRepo.getCurrentStock(stockOp.productId);
      const product = validProducts.find(p => p!._id!.toString() === stockOp.productId);
      throw new AppError(
        `Insufficient stock for ${product?.title || 'product'}. Available: ${currentStock}, Requested: ${stockOp.quantity}`, 
        { status: 400 }
      );
    }
  }

  // Validate delivery area
  if (!orderData.deliveryArea) {
    throw new AppError('Delivery area is required (inside_dhaka or outside_dhaka)', { status: 400 });
  }

  // Validate location fields based on delivery area
  if (orderData.deliveryArea === 'inside_dhaka') {
    if (!orderData.dhakaArea) {
      throw new AppError('Dhaka area (Thana) is required for inside Dhaka delivery', { status: 400 });
    }
  } else if (orderData.deliveryArea === 'outside_dhaka') {
    if (!orderData.division || !orderData.district || !orderData.upazilla) {
      throw new AppError('Division, District, and Upazilla are required for outside Dhaka delivery', { status: 400 });
    }
  }

  // Calculate totals with location-based shipping
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = calculateShippingCost(orderData.deliveryArea, subtotal);
  const total = subtotal + shippingCost;

  // Create shipping address with location-based fields
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName,
    email: orderData.email,
    phone: orderData.phone,
    address: orderData.address,
    // Location-based fields
    deliveryArea: orderData.deliveryArea,
    dhakaArea: orderData.dhakaArea,
    division: orderData.division,
    district: orderData.district,
    upazilla: orderData.upazilla,
    // Legacy fields (keep for backward compatibility)
    city: orderData.city,
    area: orderData.area,
    postalCode: orderData.postalCode
  };

  // Generate order number
  const orderNumber = generateOrderNumber();

  // Create order
  const order: Omit<Order, '_id' | 'createdAt' | 'updatedAt'> = {
    orderNumber,
    userId: undefined, // Guest order
    items: orderItems,
    shippingAddress,
    paymentInfo: {
      method: orderData.paymentMethod,
      status: orderData.paymentStatus === 'paid' ? 'completed' : (orderData.paymentStatus || 'pending')
    },
    status: 'pending',
    subtotal,
    shipping: shippingCost,
    tax: 0,
    discount: 0,
    total,
    currency: 'BDT',
    notes: orderData.notes || ''
  };

  const createdOrder = await orderRepo.insertOrder(order as any);

  // Track analytics events
  try {
    await analyticsPresenter.trackEvent({
      sessionId: 'guest',
      eventType: 'guest_order_created',
      eventData: {
        orderId: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        total: createdOrder.total,
        itemCount: createdOrder.items.length
      }
    });
  } catch (error) {
    console.error('Failed to track guest order creation:', error);
  }

  // SMS notification removed - will be sent only when admin confirms the order
  // Previously sent automatically on order creation, now sent only when status changes from 'pending' to 'confirmed'

  return createdOrder;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SC-${timestamp}${random}`;
}

export async function getOrdersByUser(userId: string, page: number = 1, limit: number = 10): Promise<{ orders: Order[]; total: number }> {
  const orders = await orderRepo.listOrdersByUser(userId);
  return { orders, total: orders.length };
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  return orderRepo.getOrderById(orderId);
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order | null> {
  const success = await orderRepo.updateOrderStatus(orderId, status as any);
  if (success) {
    return orderRepo.getOrderById(orderId);
  }
  return null;
}

export async function getOrders(page: number = 1, limit: number = 10, filters: any = {}): Promise<{ orders: Order[]; total: number }> {
  return orderRepo.getOrders(page, limit, filters);
}
