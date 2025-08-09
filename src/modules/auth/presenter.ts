import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { User } from './model.js';
import * as repo from './repository.js';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';

export async function registerUser(input: { email: string; password: string; name?: string; role?: User['role'] }): Promise<{ id: string; email: string }> {
  const exists = await repo.findUserByEmail(input.email.toLowerCase());
  if (exists) throw new AppError('Email already registered', { status: 409, code: 'EMAIL_TAKEN' });
  const passwordHash = await argon2.hash(input.password);
  const created = await repo.insertUser({ email: input.email.toLowerCase(), name: input.name, role: input.role ?? 'customer', passwordHash });
  return { id: created._id!, email: created.email };
}

export async function loginUser(input: { email: string; password: string }): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await repo.findUserByEmail(input.email.toLowerCase());
  if (!user || !(await argon2.verify(user.passwordHash, input.password))) throw new AppError('Invalid credentials', { status: 401, code: 'INVALID_CREDENTIALS' });
  const accessToken = jwt.sign({ sub: user._id, role: user.role, email: user.email }, env.jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user._id }, env.jwtSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}


