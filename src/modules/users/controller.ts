import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function me(req: any, res: any) {
  const data = await presenter.getProfile(req.user!._id?.toString());
  ok(res, data);
}

export async function updateMe(req: any, res: any) {
  const firstName = req.body?.firstName?.toString();
  const lastName = req.body?.lastName?.toString();
  if (!firstName || !lastName) return fail(res, { message: 'firstName and lastName required' }, 400);
  const data = await presenter.updateProfile(req.user!._id?.toString(), firstName, lastName);
  ok(res, data);
}


