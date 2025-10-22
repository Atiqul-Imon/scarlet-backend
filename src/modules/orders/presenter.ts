import * as cartRepo from '../cart/repository.js';
import * as catalogRepo from '../catalog/repository.js';
import * as orderRepo from './repository.js';
import * as analyticsPresenter from '../analytics/presenter.js';
import { sendOrderSuccessSMS } from '../otp/presenter.js';
import type { Order, OrderItem, ShippingAddress, PaymentMethod } from './model.js';
import { AppError } from '../../core/errors/AppError.js';
import { ObjectId } from 'mongodb';

export interface CreateOrderRequest {
  // Shipping Information
  firstName: string;
  lastName?: string; // Made optional
  email?: string; // Made optional
  phone: string;
  address: string;
  city: string;
  area: string;
  postalCode: string;
  
  // Payment Information
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  
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

  // Create order items with product details and check stock
  const orderItems: OrderItem[] = [];
  
  for (const cartItem of cart.items) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check product stock availability
    if (product.stock !== undefined && product.stock < cartItem.quantity) {
      throw new AppError(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${cartItem.quantity}`, { status: 400 });
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

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = 100; // Fixed shipping cost
  const total = subtotal + shippingCost;

  // Create shipping address
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName || '',
    email: orderData.email || '',
    phone: orderData.phone,
    address: orderData.address,
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
      status: orderData.paymentStatus === 'paid' ? 'completed' : orderData.paymentStatus
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
  await cartRepo.saveCart({ userId, items: [] });

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

  // Send SMS notification
  try {
    await sendOrderSuccessSMS(orderData.phone, createdOrder.orderNumber);
  } catch (error) {
    console.error('Failed to send order SMS:', error);
  }

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

  // Create order items with product details and check stock
  const orderItems: OrderItem[] = [];
  
  for (const cartItem of cartItems) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check product stock availability
    if (product.stock !== undefined && product.stock < cartItem.quantity) {
      throw new AppError(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${cartItem.quantity}`, { status: 400 });
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

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = 100; // Fixed shipping cost
  const total = subtotal + shippingCost;

  // Create shipping address
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName || '',
    email: orderData.email || '',
    phone: orderData.phone,
    address: orderData.address,
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
      status: orderData.paymentStatus === 'paid' ? 'completed' : orderData.paymentStatus
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

  // Send SMS notification
  try {
    await sendOrderSuccessSMS(orderData.phone, createdOrder.orderNumber);
  } catch (error) {
    console.error('Failed to send order SMS:', error);
  }

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
