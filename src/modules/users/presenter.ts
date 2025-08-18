import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';

export async function getProfile(userId: string) {
  const u = await repo.findById(userId);
  if (!u) throw new AppError('User not found', { status: 404 });
  return { id: u._id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role };
}

export async function updateProfile(userId: string, firstName: string, lastName: string) {
  await repo.updateProfile(userId, { firstName, lastName });
  return { updated: true };
}


