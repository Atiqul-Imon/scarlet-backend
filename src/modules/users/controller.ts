import { ok, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function me(req: any, res: any) {
  const data = await presenter.getProfile(req.user!._id?.toString());
  ok(res, data);
}

export async function updateMe(req: any, res: any) {
  const { firstName, lastName, phone, preferences, dateOfBirth } = req.body;
  
  // Validate required fields
  if (!firstName) {
    return fail(res, { message: 'firstName is required' }, 400);
  }

  // Phone is now required
  if (!phone) {
    return fail(res, { message: 'phone is required' }, 400);
  }

  // Validate email if provided (should not be changed via profile update)
  if (req.body.email && req.body.email !== req.user?.email) {
    return fail(res, { message: 'Email cannot be changed via profile update' }, 400);
  }

  const data = await presenter.updateProfile(req.user!._id?.toString(), {
    firstName: firstName.toString(),
    lastName: lastName?.toString() || '',
    phone: phone.toString(),
    preferences,
    dateOfBirth: dateOfBirth?.toString()
  });
  
  ok(res, data);
}


