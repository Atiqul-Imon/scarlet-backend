import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

// Authenticated user cart endpoints
export async function getCart(req: any, res: any) { ok(res, await presenter.getCart(req.userId)); }
export async function addItem(req: any, res: any) {
  const { productId, quantity } = req.body ?? {};
  if (!productId || typeof quantity !== 'number' || quantity < 1)
    return fail(res, { message: 'productId and quantity>=1 required' }, 400);
  ok(res, await presenter.addItem(req.userId, { productId, quantity: Math.floor(quantity) }));
}
export async function updateItem(req: any, res: any) {
  const { productId, quantity } = req.body ?? {};
  if (!productId || typeof quantity !== 'number' || quantity < 0)
    return fail(res, { message: 'productId and quantity>=0 required' }, 400);
  if (quantity === 0) {
    // Remove item if quantity is 0
    ok(res, await presenter.removeItem(req.userId, productId));
  } else {
    ok(res, await presenter.updateItem(req.userId, { productId, quantity: Math.floor(quantity) }));
  }
}
export async function removeItem(req: any, res: any) { ok(res, await presenter.removeItem(req.userId, req.params.productId)); }
export async function clearCart(req: any, res: any) { ok(res, await presenter.clearCart(req.userId)); }

// Guest cart endpoints
export async function getGuestCart(req: any, res: any) { 
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required for guest cart' }, 400);
  }
  ok(res, await presenter.getGuestCart(sessionId)); 
}

export async function addGuestItem(req: any, res: any) {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required for guest cart' }, 400);
  }
  
  const { productId, quantity } = req.body ?? {};
  if (!productId || typeof quantity !== 'number' || quantity < 1)
    return fail(res, { message: 'productId and quantity>=1 required' }, 400);
  ok(res, await presenter.addGuestItem(sessionId, { productId, quantity: Math.floor(quantity) }));
}

export async function updateGuestItem(req: any, res: any) {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required for guest cart' }, 400);
  }
  
  const { productId, quantity } = req.body ?? {};
  if (!productId || typeof quantity !== 'number' || quantity < 0)
    return fail(res, { message: 'productId and quantity>=0 required' }, 400);
  if (quantity === 0) {
    // Remove item if quantity is 0
    ok(res, await presenter.removeGuestItem(sessionId, productId));
  } else {
    ok(res, await presenter.updateGuestItem(sessionId, { productId, quantity: Math.floor(quantity) }));
  }
}

export async function removeGuestItem(req: any, res: any) { 
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required for guest cart' }, 400);
  }
  ok(res, await presenter.removeGuestItem(sessionId, req.params.productId)); 
}

export async function clearGuestCart(req: any, res: any) {
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required for guest cart' }, 400);
  }
  ok(res, await presenter.clearGuestCart(sessionId));
}

// Merge guest cart to user cart
export async function mergeGuestCart(req: any, res: any) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  if (!sessionId) {
    return fail(res, { message: 'Session ID required' }, 400);
  }
  
  try {
    const mergedCart = await presenter.mergeGuestCartToUser(sessionId, req.userId);
    ok(res, mergedCart);
  } catch (error) {
    fail(res, { message: 'Failed to merge guest cart' }, 500);
  }
}


