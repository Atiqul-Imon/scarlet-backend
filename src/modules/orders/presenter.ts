import * as cartRepo from '../cart/repository.js';
import * as catalogRepo from '../catalog/repository.js';
import * as orderRepo from './repository.js';
import * as inventoryPresenter from '../inventory/presenter.js';
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
  
  // Special Instructions
  notes?: string;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SCT${timestamp}${random}`;
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

  // Create order items with product details and check inventory
  const orderItems: OrderItem[] = [];
  const inventoryItems = [];
  
  for (const cartItem of cart.items) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check inventory availability
    try {
      const inventoryItem = await inventoryPresenter.getInventoryItem(cartItem.productId);
      if (inventoryItem.availableStock < cartItem.quantity) {
        throw new AppError(`Insufficient stock for ${product.title}. Available: ${inventoryItem.availableStock}, Requested: ${cartItem.quantity}`, { status: 400 });
      }
      
      // Reserve stock
      await inventoryPresenter.reserveStock(cartItem.productId, cartItem.quantity);
      inventoryItems.push({ productId: cartItem.productId, quantity: cartItem.quantity });
    } catch (error) {
      // If inventory item doesn't exist, check product stock as fallback
      if (product.stock !== undefined && product.stock < cartItem.quantity) {
        throw new AppError(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${cartItem.quantity}`, { status: 400 });
      }
    }

    orderItems.push({
      productId: cartItem.productId,
      title: product.title,
      slug: product.slug,
      image: product.images[0] || '',
      price: product.price.amount,
      quantity: cartItem.quantity,
      brand: product.brand,
      sku: product.sku,
    });
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeShippingThreshold = 2000; // BDT 2000
  const standardShipping = 100; // BDT 100
  const shipping = subtotal >= freeShippingThreshold ? 0 : standardShipping;
  const tax = 0; // No VAT for small amounts in Bangladesh
  const discount = 0; // TODO: Implement discount logic
  const total = subtotal + shipping + tax - discount;

  // Create shipping address
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName || '',
    email: orderData.email || '',
    phone: orderData.phone,
    address: orderData.address,
    city: orderData.city,
    area: orderData.area,
    postalCode: orderData.postalCode,
  };

  // Create order object
  const order: Order = {
    orderNumber: generateOrderNumber(),
    userId,
    items: orderItems,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    currency: 'BDT',
    status: 'pending',
    shippingAddress,
    paymentInfo: {
      method: orderData.paymentMethod,
      status: orderData.paymentMethod === 'cod' ? 'pending' : 'pending',
    },
    notes: orderData.notes,
  };

  // Insert order
  const createdOrder = await orderRepo.insertOrder(order);

  // Clear cart after successful order creation
  await cartRepo.saveCart({ userId, items: [] });

  // Process inventory stock reduction
  if (inventoryItems.length > 0) {
    await inventoryPresenter.processOrderStockReduction(inventoryItems);
  }

  // Track analytics events
  try {
    await analyticsPresenter.trackEvent({
      sessionId: `order_${createdOrder._id}`,
      eventType: 'purchase',
      eventData: {
        orderId: createdOrder._id,
        value: createdOrder.total,
        currency: createdOrder.currency,
        items: orderItems.length
      }
    });
  } catch (error) {
    console.error('Failed to track purchase analytics:', error);
  }

  // Send order success SMS notification
  try {
    await sendOrderSuccessSMS(createdOrder.shippingAddress.phone, createdOrder.orderNumber);
  } catch (error) {
    console.error('Failed to send order success SMS:', error);
    // Don't fail the order creation if SMS fails
  }

  // TODO: In production, integrate with:
  // - Payment gateway for non-COD orders
  // - Email service for order confirmation

  return createdOrder;
}

// Create guest order from cart
export async function createGuestOrderFromCart(sessionId: string, orderData: CreateOrderRequest): Promise<Order> {
  // Fetch guest cart and validate
  const cart = await cartRepo.getOrCreateGuestCart(sessionId);
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

  // Create order items with product details and check inventory
  const orderItems: OrderItem[] = [];
  const inventoryItems = [];
  
  for (const cartItem of cart.items) {
    const product = validProducts.find(p => p!._id!.toString() === cartItem.productId);
    if (!product) {
      throw new AppError(`Product ${cartItem.productId} not found`, { status: 400 });
    }

    // Check inventory availability
    try {
      const inventoryItem = await inventoryPresenter.getInventoryItem(cartItem.productId);
      if (inventoryItem.availableStock < cartItem.quantity) {
        throw new AppError(`Insufficient stock for ${product.title}. Available: ${inventoryItem.availableStock}, Requested: ${cartItem.quantity}`, { status: 400 });
      }
      
      // Reserve stock
      await inventoryPresenter.reserveStock(cartItem.productId, cartItem.quantity);
      inventoryItems.push({ productId: cartItem.productId, quantity: cartItem.quantity });
    } catch (error) {
      // If inventory item doesn't exist, check product stock as fallback
      if (product.stock !== undefined && product.stock < cartItem.quantity) {
        throw new AppError(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${cartItem.quantity}`, { status: 400 });
      }
    }

    orderItems.push({
      productId: cartItem.productId,
      title: product.title,
      slug: product.slug,
      image: product.images[0] || '',
      price: product.price.amount,
      quantity: cartItem.quantity,
      brand: product.brand,
      sku: product.sku,
    });
  }

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeShippingThreshold = 2000; // BDT 2000
  const standardShipping = 100; // BDT 100
  const shipping = subtotal >= freeShippingThreshold ? 0 : standardShipping;
  const tax = 0; // No VAT for small amounts in Bangladesh
  const discount = 0; // TODO: Implement discount logic
  const total = subtotal + shipping + tax - discount;

  // Create shipping address
  const shippingAddress: ShippingAddress = {
    firstName: orderData.firstName,
    lastName: orderData.lastName || '',
    email: orderData.email || '',
    phone: orderData.phone,
    address: orderData.address,
    city: orderData.city,
    area: orderData.area,
    postalCode: orderData.postalCode,
  };

  // Create guest order object
  const order: Order = {
    orderNumber: generateOrderNumber(),
    guestId: sessionId,
    items: orderItems,
    subtotal,
    shipping,
    tax,
    discount,
    total,
    currency: 'BDT',
    status: 'pending',
    shippingAddress,
    paymentInfo: {
      method: orderData.paymentMethod,
      status: orderData.paymentMethod === 'cod' ? 'pending' : 'pending',
    },
    notes: orderData.notes,
    isGuestOrder: true,
  };

  // Insert order
  const createdOrder = await orderRepo.insertOrder(order);

  // Clear the guest cart after successful order
  await cartRepo.saveCart({ ...cart, items: [] });

  // Send order success SMS notification
  try {
    await sendOrderSuccessSMS(createdOrder.shippingAddress.phone, createdOrder.orderNumber);
  } catch (error) {
    console.error('Failed to send order success SMS:', error);
    // Don't fail the order creation if SMS fails
  }

  return createdOrder;
}

export async function listMyOrders(userId: string): Promise<Order[]> {
  return orderRepo.listOrdersByUser(userId);
}

export async function getOrderById(orderId: string, userId: string): Promise<Order> {
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', { status: 404 });
  }
  
  // Ensure user can only access their own orders
  if (order.userId !== userId) {
    throw new AppError('Access denied', { status: 403 });
  }
  
  return order;
}

export async function getOrderByIdPublic(orderId: string): Promise<Order> {
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', { status: 404 });
  }
  
  // Return order details without user authentication check
  // This is used for order confirmation pages
  return order;
}

export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<Order> {
  const order = await orderRepo.getOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', { status: 404 });
  }
  
  // Ensure user can only cancel their own orders
  if (order.userId !== userId) {
    throw new AppError('Access denied', { status: 403 });
  }
  
  // Check if order can be cancelled
  if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled', { status: 400 });
  }
  
  // Update order status
  const updatedOrder = await orderRepo.updateOrder(orderId, {
    status: 'cancelled',
    notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}`.trim() : order.notes,
  });
  
  // TODO: In production:
  // - Restore inventory/stock
  // - Process refund if payment was made
  // - Send cancellation notification
  
  return updatedOrder;
}


