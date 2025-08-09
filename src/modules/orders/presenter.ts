import * as cartRepo from '../cart/repository.js';
import * as orderRepo from './repository.js';
import type { Order } from './model.js';
import { AppError } from '../../core/errors/AppError.js';

export async function createFromCart(userId: string): Promise<Order> {
  const cart = await cartRepo.getOrCreateCart(userId);
  if (!cart.items.length) throw new AppError('Cart is empty', { status: 400 });
  // Note: In production, fetch product details/pricing here
  const items = cart.items.map(i => ({ productId: i.productId, title: 'Product', price: 0, quantity: i.quantity }));
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = 0;
  const total = subtotal - discount;
  return orderRepo.insertOrder({ userId, items, subtotal, discount, total, status: 'pending' });
}

export async function listMyOrders(userId: string) { return orderRepo.listOrdersByUser(userId); }


