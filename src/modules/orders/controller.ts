import { ok } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function create(req: any, res: any) { ok(res, await presenter.createFromCart(req.user!.id)); }
export async function listMine(req: any, res: any) { ok(res, await presenter.listMyOrders(req.user!.id)); }


