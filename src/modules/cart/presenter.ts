import * as repo from './repository.js';
import type { CartItem } from './model.js';

export async function getCart(userId: string) { return repo.getOrCreateCart(userId); }
export async function getGuestCart(sessionId: string) { return repo.getOrCreateGuestCart(sessionId); }
export async function mergeGuestCartToUser(guestSessionId: string, userId: string) { 
  return repo.mergeGuestCartToUser(guestSessionId, userId); 
}

export async function setItem(userId: string, item: CartItem) {
  const cart = await repo.getOrCreateCart(userId);
  const idx = cart.items.findIndex(i => i.productId === item.productId);
  if (idx >= 0) cart.items[idx].quantity = item.quantity; else cart.items.push(item);
  await repo.saveCart(cart);
  return cart;
}

export async function setGuestItem(sessionId: string, item: CartItem) {
  const cart = await repo.getOrCreateGuestCart(sessionId);
  const idx = cart.items.findIndex(i => i.productId === item.productId);
  if (idx >= 0) cart.items[idx].quantity = item.quantity; else cart.items.push(item);
  await repo.saveCart(cart);
  return cart;
}

export async function removeItem(userId: string, productId: string) {
  const cart = await repo.getOrCreateCart(userId);
  cart.items = cart.items.filter(i => i.productId !== productId);
  await repo.saveCart(cart);
  return cart;
}

export async function removeGuestItem(sessionId: string, productId: string) {
  const cart = await repo.getOrCreateGuestCart(sessionId);
  cart.items = cart.items.filter(i => i.productId !== productId);
  await repo.saveCart(cart);
  return cart;
}


