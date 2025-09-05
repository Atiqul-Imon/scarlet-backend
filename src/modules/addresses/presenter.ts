import * as repo from './repository.js';
import { AppError } from '../../core/errors/AppError.js';
import type { CreateAddressRequest, UpdateAddressRequest } from './model.js';

export async function createAddress(userId: string, addressData: CreateAddressRequest) {
  // Validate required fields
  const requiredFields = ['label', 'firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'country'];
  for (const field of requiredFields) {
    if (!addressData[field as keyof CreateAddressRequest]?.toString().trim()) {
      throw new AppError(`${field} is required`, { status: 400 });
    }
  }

  // Validate phone format if provided
  if (addressData.phone && !/^(\+88)?01[3-9]\d{8}$/.test(addressData.phone)) {
    throw new AppError('Please enter a valid Bangladesh phone number', { status: 400 });
  }

  // Validate ZIP code format (4 digits for Bangladesh)
  if (!/^\d{4}$/.test(addressData.zipCode)) {
    throw new AppError('ZIP code must be 4 digits', { status: 400 });
  }

  return await repo.createAddress(userId, addressData);
}

export async function getAddresses(userId: string) {
  return await repo.getAddressesByUser(userId);
}

export async function getAddress(addressId: string, userId: string) {
  const address = await repo.getAddressById(addressId, userId);
  if (!address) {
    throw new AppError('Address not found', { status: 404 });
  }
  return address;
}

export async function updateAddress(addressId: string, userId: string, updates: Partial<CreateAddressRequest>) {
  // Check if address exists and belongs to user
  const existingAddress = await repo.getAddressById(addressId, userId);
  if (!existingAddress) {
    throw new AppError('Address not found', { status: 404 });
  }

  // Validate phone format if provided
  if (updates.phone && !/^(\+88)?01[3-9]\d{8}$/.test(updates.phone)) {
    throw new AppError('Please enter a valid Bangladesh phone number', { status: 400 });
  }

  // Validate ZIP code format if provided
  if (updates.zipCode && !/^\d{4}$/.test(updates.zipCode)) {
    throw new AppError('ZIP code must be 4 digits', { status: 400 });
  }

  const updatedAddress = await repo.updateAddress(addressId, userId, updates);
  if (!updatedAddress) {
    throw new AppError('Failed to update address', { status: 500 });
  }

  return updatedAddress;
}

export async function deleteAddress(addressId: string, userId: string) {
  const deleted = await repo.deleteAddress(addressId, userId);
  if (!deleted) {
    throw new AppError('Address not found', { status: 404 });
  }
  return { deleted: true };
}

export async function setDefaultAddress(addressId: string, userId: string) {
  const address = await repo.getAddressById(addressId, userId);
  if (!address) {
    throw new AppError('Address not found', { status: 404 });
  }

  const updatedAddress = await repo.setDefaultAddress(addressId, userId);
  if (!updatedAddress) {
    throw new AppError('Failed to set default address', { status: 500 });
  }

  return updatedAddress;
}
