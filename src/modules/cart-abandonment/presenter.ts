import * as repo from './repository.js';
import * as cartRepo from '../cart/repository.js';
import * as catalogRepo from '../catalog/repository.js';
import type { CartAbandonment, CartAbandonmentRecovery } from './model.js';
import { logger } from '../../core/logging/logger.js';

export async function createCartAbandonment(sessionId: string, userId?: string, email?: string, phone?: string): Promise<CartAbandonment | null> {
  try {
    // Get the cart (either guest or user cart)
    let cart;
    if (userId) {
      cart = await cartRepo.getOrCreateCart(userId);
    } else {
      cart = await cartRepo.getOrCreateGuestCart(sessionId);
    }

    if (!cart.items.length) {
      return null; // No items to abandon
    }

    // Enrich cart items with product details
    const enrichedItems = [];
    for (const item of cart.items) {
      const product = await catalogRepo.getProductById(item.productId);
      if (product) {
        enrichedItems.push({
          productId: item.productId,
          title: product.title,
          slug: product.slug,
          image: product.images[0] || '',
          price: product.price.amount,
          quantity: item.quantity,
          brand: product.brand,
        });
      }
    }

    if (!enrichedItems.length) {
      return null; // No valid products
    }

    const totalValue = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const abandonment: CartAbandonment = {
      sessionId,
      userId,
      items: enrichedItems,
      totalValue,
      currency: 'BDT',
      email,
      phone,
      abandonedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      recoveryEmailsSent: 0,
      recoverySmsSent: 0,
      recovered: false,
    };

    return await repo.createCartAbandonment(abandonment);
  } catch (error) {
    logger.error({ error, sessionId, userId }, 'Failed to create cart abandonment record');
    return null;
  }
}

export async function markCartAsAbandoned(sessionId: string, userId?: string): Promise<void> {
  try {
    // Check if already exists
    const existing = userId 
      ? await repo.getCartAbandonmentByUserId(userId)
      : await repo.getCartAbandonmentBySessionId(sessionId);

    if (existing) {
      // Update last activity
      await repo.updateCartAbandonment(existing._id!, {
        lastActivityAt: new Date().toISOString()
      });
      return;
    }

    // Create new abandonment record
    await createCartAbandonment(sessionId, userId);
  } catch (error) {
    logger.error({ error, sessionId, userId }, 'Failed to mark cart as abandoned');
  }
}

export async function markCartAsRecovered(abandonmentId: string, orderId: string): Promise<void> {
  try {
    await repo.markCartAbandonmentAsRecovered(abandonmentId, orderId);
    logger.info({ abandonmentId, orderId }, 'Cart abandonment marked as recovered');
  } catch (error) {
    logger.error({ error, abandonmentId, orderId }, 'Failed to mark cart as recovered');
  }
}

export async function getAbandonedCartsForRecovery(): Promise<CartAbandonment[]> {
  try {
    return await repo.getAbandonedCartsForRecovery();
  } catch (error) {
    logger.error({ error }, 'Failed to get abandoned carts for recovery');
    return [];
  }
}

export async function sendRecoveryEmail(abandonment: CartAbandonment): Promise<boolean> {
  try {
    // TODO: Implement email service integration
    // For now, just log the recovery email
    logger.info({
      abandonmentId: abandonment._id,
      email: abandonment.email,
      totalValue: abandonment.totalValue,
      itemCount: abandonment.items.length
    }, 'Recovery email would be sent');

    // Create recovery record
    const recovery: CartAbandonmentRecovery = {
      cartAbandonmentId: abandonment._id!,
      type: 'email',
      sentAt: new Date().toISOString(),
    };
    await repo.createRecoveryRecord(recovery);

    // Increment recovery count
    await repo.incrementRecoveryCount(abandonment._id!, 'email');

    return true;
  } catch (error) {
    logger.error({ error, abandonmentId: abandonment._id }, 'Failed to send recovery email');
    return false;
  }
}

export async function sendRecoverySms(abandonment: CartAbandonment): Promise<boolean> {
  try {
    // TODO: Implement SMS service integration
    // For now, just log the recovery SMS
    logger.info({
      abandonmentId: abandonment._id,
      phone: abandonment.phone,
      totalValue: abandonment.totalValue,
      itemCount: abandonment.items.length
    }, 'Recovery SMS would be sent');

    // Create recovery record
    const recovery: CartAbandonmentRecovery = {
      cartAbandonmentId: abandonment._id!,
      type: 'sms',
      sentAt: new Date().toISOString(),
    };
    await repo.createRecoveryRecord(recovery);

    // Increment recovery count
    await repo.incrementRecoveryCount(abandonment._id!, 'sms');

    return true;
  } catch (error) {
    logger.error({ error, abandonmentId: abandonment._id }, 'Failed to send recovery SMS');
    return false;
  }
}

export async function processCartAbandonmentRecovery(): Promise<void> {
  try {
    const abandonedCarts = await getAbandonedCartsForRecovery();
    
    for (const cart of abandonedCarts) {
      // Send recovery email if email is available and not too many sent
      if (cart.email && cart.recoveryEmailsSent < 3) {
        await sendRecoveryEmail(cart);
      }

      // Send recovery SMS if phone is available and not too many sent
      if (cart.phone && cart.recoverySmsSent < 2) {
        await sendRecoverySms(cart);
      }
    }

    logger.info({ count: abandonedCarts.length }, 'Processed cart abandonment recovery');
  } catch (error) {
    logger.error({ error }, 'Failed to process cart abandonment recovery');
  }
}
