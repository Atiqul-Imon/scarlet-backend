import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import type { 
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from './model.js';

// Input validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Bangladesh phone number format: +8801XXXXXXXXX or 01XXXXXXXXX
  const phoneRegex = /^(\+8801|01)[3-9]\d{8}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};

// Register user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { 
    email, 
    phone, 
    password, 
    firstName, 
    lastName, 
    acceptTerms, 
    newsletter 
  }: RegisterRequest = req.body;

  // Validation
  const errors: Record<string, string> = {};

  // Either email or phone is required
  if (!email && !phone) {
    errors.identifier = 'Either email or phone number is required';
  }

  // Validate email if provided
  if (email && !validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Validate phone if provided
  if (phone && !validatePhone(phone)) {
    errors.phone = 'Please enter a valid Bangladesh phone number (01XXXXXXXXX)';
  }

  // Validate password
  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message!;
    }
  }

  // Validate firstName
  if (!firstName || !validateName(firstName)) {
    errors.firstName = 'First name must be between 2 and 50 characters';
  }

  // Validate lastName if provided
  if (lastName && !validateName(lastName)) {
    errors.lastName = 'Last name must be between 2 and 50 characters';
  }

  // Validate terms acceptance
  if (!acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions';
  }

  // Return validation errors if any
  if (Object.keys(errors).length > 0) {
    return fail(res, { message: 'Validation failed', code: 'VALIDATION_ERROR' }, 400);
  }

  try {
    const result = await presenter.registerUser({
      email,
      phone,
      password,
      firstName,
      lastName,
      acceptTerms,
      newsletter: newsletter || false
    });

    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return fail(res, { 
        message: 'An account with this email or phone number already exists',
        code: 'USER_EXISTS' 
      }, 409);
    }
    throw error;
  }
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password, rememberMe }: LoginRequest = req.body;

  // Validation
  if (!identifier) {
    return fail(res, { 
      message: 'Email or phone number is required',
      code: 'IDENTIFIER_REQUIRED' 
    }, 400);
  }

  if (!password) {
    return fail(res, { 
      message: 'Password is required',
      code: 'PASSWORD_REQUIRED' 
    }, 400);
  }

  // Validate identifier format
  const isEmail = validateEmail(identifier);
  const isPhone = validatePhone(identifier);

  if (!isEmail && !isPhone) {
    return fail(res, { 
      message: 'Please enter a valid email or phone number',
      code: 'INVALID_IDENTIFIER' 
    }, 400);
  }

  try {
    const result = await presenter.loginUser({ identifier, password, rememberMe });
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Invalid credentials')) {
      return fail(res, { 
        message: 'Invalid email/phone or password',
        code: 'INVALID_CREDENTIALS' 
      }, 401);
    }
    throw error;
  }
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: RefreshTokenRequest = req.body;

  if (!refreshToken) {
    return fail(res, { 
      message: 'Refresh token is required',
      code: 'REFRESH_TOKEN_REQUIRED' 
    }, 400);
  }

  try {
    const result = await presenter.refreshUserToken(refreshToken);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return fail(res, { 
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN' 
      }, 401);
    }
    throw error;
  }
});

// Logout user
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return fail(res, { 
      message: 'Access token is required',
      code: 'TOKEN_REQUIRED' 
    }, 400);
  }

  try {
    await presenter.logoutUser(token);
    ok(res, { message: 'Logged out successfully' });
  } catch (error: any) {
    // Even if logout fails, return success for security
    ok(res, { message: 'Logged out successfully' });
  }
});

// Change password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword }: ChangePasswordRequest = req.body;
  const userId = req.user?._id?.toString();

  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!currentPassword || !newPassword) {
    return fail(res, { 
      message: 'Current password and new password are required',
      code: 'PASSWORDS_REQUIRED' 
    }, 400);
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return fail(res, { 
      message: passwordValidation.message!,
      code: 'INVALID_PASSWORD' 
    }, 400);
  }

  if (currentPassword === newPassword) {
    return fail(res, { 
      message: 'New password must be different from current password',
      code: 'SAME_PASSWORD' 
    }, 400);
  }

  try {
    await presenter.changeUserPassword(userId, currentPassword, newPassword);
    ok(res, { message: 'Password changed successfully' });
  } catch (error: any) {
    if (error.message.includes('Invalid current password')) {
      return fail(res, { 
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD' 
      }, 400);
    }
    throw error;
  }
});

// Forgot password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { identifier }: ForgotPasswordRequest = req.body;

  if (!identifier) {
    return fail(res, { 
      message: 'Email or phone number is required',
      code: 'IDENTIFIER_REQUIRED' 
    }, 400);
  }

  // Validate identifier format
  const isEmail = validateEmail(identifier);
  const isPhone = validatePhone(identifier);

  if (!isEmail && !isPhone) {
    return fail(res, { 
      message: 'Please enter a valid email or phone number',
      code: 'INVALID_IDENTIFIER' 
    }, 400);
  }

  try {
    await presenter.initiatePasswordReset(identifier);
    // Always return success for security (don't reveal if user exists)
    ok(res, { 
      message: 'If an account exists with this email/phone, you will receive reset instructions' 
    });
  } catch (error: any) {
    // Always return success for security
    ok(res, { 
      message: 'If an account exists with this email/phone, you will receive reset instructions' 
    });
  }
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword }: ResetPasswordRequest = req.body;

  if (!token || !newPassword) {
    return fail(res, { 
      message: 'Reset token and new password are required',
      code: 'TOKEN_PASSWORD_REQUIRED' 
    }, 400);
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return fail(res, { 
      message: passwordValidation.message!,
      code: 'INVALID_PASSWORD' 
    }, 400);
  }

  try {
    await presenter.resetUserPassword(token, newPassword);
    ok(res, { message: 'Password reset successfully' });
  } catch (error: any) {
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return fail(res, { 
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN' 
      }, 400);
    }
    throw error;
  }
});

// Get current user profile
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    const user = await presenter.getUserProfile(userId);
    ok(res, user);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return fail(res, { 
        message: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, 404);
    }
    throw error;
  }
});


