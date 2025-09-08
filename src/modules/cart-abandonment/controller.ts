import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';

// Mark cart as abandoned (called when user leaves checkout or cart page)
export async function markAbandoned(req: any, res: any) {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  const userId = req.user?._id?.toString();
  const { email, phone } = req.body;

  if (!sessionId && !userId) {
    return fail(res, { 
      message: 'Session ID or user authentication required',
      code: 'IDENTIFIER_REQUIRED' 
    }, 400);
  }

  try {
    await presenter.markCartAsAbandoned(sessionId, userId);
    ok(res, { message: 'Cart marked as abandoned' });
  } catch (error) {
    fail(res, { message: 'Failed to mark cart as abandoned' }, 500);
  }
}

// Process cart abandonment recovery (admin endpoint)
export async function processRecovery(req: any, res: any) {
  try {
    await presenter.processCartAbandonmentRecovery();
    ok(res, { message: 'Cart abandonment recovery processed' });
  } catch (error) {
    fail(res, { message: 'Failed to process cart abandonment recovery' }, 500);
  }
}

// Get abandoned carts for admin dashboard
export async function getAbandonedCarts(req: any, res: any) {
  try {
    const abandonedCarts = await presenter.getAbandonedCartsForRecovery();
    ok(res, abandonedCarts);
  } catch (error) {
    fail(res, { message: 'Failed to get abandoned carts' }, 500);
  }
}
