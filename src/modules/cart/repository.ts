import { getDb } from '../../core/db/mongoClient.js';
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

export async function saveCart(cart: Cart): Promise<void> {
  const db = await getDb();
  const col = db.collection('carts');
  await col.updateOne(
    { userId: cart.userId },
    { $set: { items: cart.items, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}


