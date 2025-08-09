import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function getCart(req: any, res: any) { ok(res, await presenter.getCart(req.user!.id)); }
export async function setItem(req: any, res: any) {
  const { productId, quantity } = req.body ?? {};
  if (!productId || typeof quantity !== 'number' || quantity < 1)
    return fail(res, { message: 'productId and quantity>=1 required' }, 400);
  ok(res, await presenter.setItem(req.user!.id, { productId, quantity: Math.floor(quantity) }));
}
export async function removeItem(req: any, res: any) { ok(res, await presenter.removeItem(req.user!.id, req.params.productId)); }


