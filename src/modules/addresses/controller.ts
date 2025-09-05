import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import type { CreateAddressRequest } from './model.js';

// Validation helpers
const validateAddressData = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Required fields validation
  const requiredFields = ['label', 'firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'country'];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim().length === 0) {
      errors[field] = `${field} is required`;
    }
  });

  // Phone validation (optional)
  if (data.phone && data.phone.trim() && !/^(\+88)?01[3-9]\d{8}$/.test(data.phone.trim())) {
    errors.phone = 'Please enter a valid Bangladesh phone number (01XXXXXXXXX)';
  }

  // ZIP code validation
  if (data.zipCode && !/^\d{4}$/.test(data.zipCode)) {
    errors.zipCode = 'ZIP code must be 4 digits';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

// Create new address
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  // Validate address data
  const validation = validateAddressData(req.body);
  if (!validation.valid) {
    return fail(res, { 
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  try {
    const addressData: CreateAddressRequest = {
      label: req.body.label.trim(),
      firstName: req.body.firstName.trim(),
      lastName: req.body.lastName.trim(),
      address: req.body.address.trim(),
      address2: req.body.address2?.trim() || undefined,
      city: req.body.city.trim(),
      state: req.body.state.trim(),
      zipCode: req.body.zipCode.trim(),
      country: req.body.country.trim(),
      phone: req.body.phone?.trim() || undefined,
      isDefault: req.body.isDefault || false,
    };

    const address = await presenter.createAddress(userId, addressData);
    ok(res, address);
  } catch (error: any) {
    if (error.message.includes('required')) {
      return fail(res, { 
        message: error.message,
        code: 'VALIDATION_ERROR' 
      }, 400);
    }
    
    throw error;
  }
});

// Get user's addresses
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const addresses = await presenter.getAddresses(userId);
    ok(res, addresses);
  } catch (error) {
    throw error;
  }
});

// Get specific address
export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { addressId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!addressId) {
    return fail(res, { 
      message: 'Address ID is required',
      code: 'ADDRESS_ID_REQUIRED' 
    }, 400);
  }

  try {
    const address = await presenter.getAddress(addressId, userId);
    ok(res, address);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});

// Update address
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { addressId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!addressId) {
    return fail(res, { 
      message: 'Address ID is required',
      code: 'ADDRESS_ID_REQUIRED' 
    }, 400);
  }

  // Validate address data
  const validation = validateAddressData(req.body);
  if (!validation.valid) {
    return fail(res, { 
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  try {
    const updates: Partial<CreateAddressRequest> = {};
    
    if (req.body.label) updates.label = req.body.label.trim();
    if (req.body.firstName) updates.firstName = req.body.firstName.trim();
    if (req.body.lastName) updates.lastName = req.body.lastName.trim();
    if (req.body.address) updates.address = req.body.address.trim();
    if (req.body.address2 !== undefined) updates.address2 = req.body.address2?.trim() || undefined;
    if (req.body.city) updates.city = req.body.city.trim();
    if (req.body.state) updates.state = req.body.state.trim();
    if (req.body.zipCode) updates.zipCode = req.body.zipCode.trim();
    if (req.body.country) updates.country = req.body.country.trim();
    if (req.body.phone !== undefined) updates.phone = req.body.phone?.trim() || undefined;
    if (req.body.isDefault !== undefined) updates.isDefault = req.body.isDefault;

    const address = await presenter.updateAddress(addressId, userId, updates);
    ok(res, address);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND' 
      }, 404);
    }
    
    if (error.message.includes('required') || error.message.includes('valid')) {
      return fail(res, { 
        message: error.message,
        code: 'VALIDATION_ERROR' 
      }, 400);
    }
    
    throw error;
  }
});

// Delete address
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { addressId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!addressId) {
    return fail(res, { 
      message: 'Address ID is required',
      code: 'ADDRESS_ID_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.deleteAddress(addressId, userId);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});

// Set default address
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const { addressId } = req.params;
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!addressId) {
    return fail(res, { 
      message: 'Address ID is required',
      code: 'ADDRESS_ID_REQUIRED' 
    }, 400);
  }

  try {
    const address = await presenter.setDefaultAddress(addressId, userId);
    ok(res, address);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'Address not found',
        code: 'ADDRESS_NOT_FOUND' 
      }, 404);
    }
    
    throw error;
  }
});
