import { getDb } from '../../core/db/mongoClient.js';
import { ObjectId } from 'mongodb';
import type { Cart } from './model.js';

export async function getOrCreateCart(userId: string): Promise<Cart> {
  const db = await getDb();
  const col = db.collection('carts');
  let found = (await col.findOne({ userId })) as any as Cart | null;
  if (!found) {
    const toInsert: Cart = { userId, items: [], updatedAt: new Date().toISOString() };
    const res = await col.insertOne(toInsert as any);
    found = { ...toInsert, _id: res.insertedId.toString() };
  }
  return found;
}

export async function getOrCreateGuestCart(sessionId: string): Promise<Cart> {
  const db = await getDb();
  const col = db.collection('carts');
  let found = (await col.findOne({ sessionId })) as any as Cart | null;
  if (!found) {
    const toInsert: Cart = { 
      sessionId, 
      items: [], 
      updatedAt: new Date().toISOString(),
      isGuestCart: true
    };
    const res = await col.insertOne(toInsert as any);
    found = { ...toInsert, _id: res.insertedId.toString() };
  }
  return found;
}

export async function mergeGuestCartToUser(guestSessionId: string, userId: string): Promise<Cart> {
  const db = await getDb();
  const col = db.collection('carts');
  
  // Get guest cart
  const guestCart = await col.findOne({ sessionId: guestSessionId }) as any as Cart | null;
  
  if (!guestCart || !guestCart.items.length) {
    // No guest cart or empty, just return user cart
    return getOrCreateCart(userId);
  }
  
  // Get or create user cart
  const userCart = await getOrCreateCart(userId);
  
  // Merge items from guest cart to user cart
  const mergedItems = [...userCart.items];
  
  for (const guestItem of guestCart.items) {
    const existingItem = mergedItems.find(item => item.productId === guestItem.productId);
    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
    } else {
      mergedItems.push(guestItem);
    }
  }
  
  // Update user cart with merged items
  await col.updateOne(
    { _id: new ObjectId(userCart._id!) },
    { 
      $set: { 
        items: mergedItems,
        updatedAt: new Date().toISOString()
      }
    }
  );
  
  // Delete guest cart
  await col.deleteOne({ _id: new ObjectId(guestCart._id!) });
  
  return { ...userCart, items: mergedItems };
}

export async function saveCart(cart: Cart): Promise<void> {
  const db = await getDb();
  const col = db.collection('carts');
  
  // Handle both user carts and guest carts
  const filter = cart.userId ? { userId: cart.userId } : { sessionId: cart.sessionId };
  
  await col.updateOne(
    filter,
    { $set: { items: cart.items, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}


