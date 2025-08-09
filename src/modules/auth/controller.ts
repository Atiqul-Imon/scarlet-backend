import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function register(req: any, res: any) {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password) return fail(res, { message: 'email and password required' }, 400);
  const result = await presenter.registerUser({ email, password, name, role });
  ok(res, result);
}

export async function login(req: any, res: any) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return fail(res, { message: 'email and password required' }, 400);
  const tokens = await presenter.loginUser({ email, password });
  ok(res, tokens);
}


