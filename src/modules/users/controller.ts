import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function me(req: any, res: any) {
  const data = await presenter.getProfile(req.user!.id);
  ok(res, data);
}

export async function updateMe(req: any, res: any) {
  const name = req.body?.name?.toString();
  if (!name) return fail(res, { message: 'name required' }, 400);
  const data = await presenter.updateProfile(req.user!.id, name);
  ok(res, data);
}


