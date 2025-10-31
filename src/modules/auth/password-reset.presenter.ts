import * as repo from './repository.js';
import * as otpPresenter from '../otp/presenter.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import { tokenManager } from '../../core/cache/tokenManager.js';
import type { User, AuthTokens } from './model.js';
import type { 
  PasswordResetOTPRequest, 
  PasswordResetOTPVerificationResponse,
  SetNewPasswordResponse 
} from './password-reset.types.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

// Helper functions (duplicated from presenter.ts)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+8801|01)[3-9]\d{8}$/;
  return phoneRegex.test(phone);
};

const normalizeIdentifier = (identifier: string): string => {
  if (validateEmail(identifier)) {
    return identifier.toLowerCase();
  }
  if (validatePhone(identifier)) {
    // Normalize phone to +8801XXXXXXXXX format (matches database format)
    // This ensures user lookup works regardless of input format
    const cleanPhone = identifier.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
    
    if (cleanPhone.startsWith('+8801')) {
      // Already in correct format: +8801XXXXXXXXX
      return cleanPhone;
    } else if (cleanPhone.startsWith('8801')) {
      // 8801XXXXXXXXX -> +8801XXXXXXXXX
      return '+' + cleanPhone;
    } else if (cleanPhone.startsWith('01')) {
      // 01XXXXXXXXX -> +8801XXXXXXXXX
      return '+8801' + cleanPhone.substring(2);
    }
    
    // Try to extract digits and normalize
    const digits = cleanPhone.replace(/\D/g, ''); // Extract only digits
    if (digits.length === 13 && digits.startsWith('8801')) {
      return '+' + digits; // 8801XXXXXXXXX -> +8801XXXXXXXXX
    } else if (digits.length === 11 && digits.startsWith('01')) {
      return '+8801' + digits.substring(2); // 01XXXXXXXXX -> +8801XXXXXXXXX
    }
    
    // Return as-is if can't normalize (validation will catch invalid formats)
    return identifier;
  }
  return identifier;
};

/**
 * Generate tokens for user (duplicated from presenter.ts to avoid circular dependency)
 */
async function generateTokensForUser(user: User, rememberMe = false, ip?: string): Promise<AuthTokens> {
  const isAdmin = user.role === 'admin';
  const accessTokenExpiry = isAdmin ? '2h' : '15m';
  const refreshTokenExpiry = rememberMe ? '30d' : (isAdmin ? '7d' : '7d');
  const expiresIn = isAdmin ? 2 * 60 * 60 : 15 * 60;

  const accessToken = jwt.sign(
    { 
      sub: user._id, 
      role: user.role, 
      email: user.email,
      phone: user.phone,
      type: 'access'
    }, 
    env.jwtSecret, 
    { expiresIn: accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { 
      sub: user._id, 
      type: 'refresh'
    }, 
    env.jwtSecret, 
    { expiresIn: refreshTokenExpiry }
  );

  // Store tokens
  try {
    await tokenManager.storeToken(accessToken, {
      userId: user._id!,
      type: 'access',
      metadata: { ip, userAgent: 'unknown' }
    }, expiresIn);

    const refreshExpiresIn = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    await tokenManager.storeToken(refreshToken, {
      userId: user._id!,
      type: 'refresh',
      metadata: { ip, userAgent: 'unknown' }
    }, refreshExpiresIn);
  } catch (error) {
    logger.error({ error }, 'Failed to store tokens');
  }

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
}

/**
 * Send OTP for password reset
 */
export async function sendPasswordResetOTP(
  request: PasswordResetOTPRequest,
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { identifier } = request;
    const normalizedIdentifier = normalizeIdentifier(identifier);
    
    // Find user by email or phone
    let user: User | null = null;
    
    if (validateEmail(normalizedIdentifier)) {
      user = await repo.findUserByEmail(normalizedIdentifier);
    } else if (validatePhone(normalizedIdentifier)) {
      // Use normalized identifier for lookup (matches database format: +8801XXXXXXXXX)
      // The normalizedIdentifier is now in +8801XXXXXXXXX format, which matches DB
      user = await repo.findUserByPhone(normalizedIdentifier);
      
      // If not found with normalized format, try flexible lookup as fallback
      if (!user) {
        user = await repo.findUserByPhoneFlexible(identifier);
      }
    } else {
      throw new AppError('Please enter a valid email or phone number', {
        status: 400,
        code: 'INVALID_IDENTIFIER'
      });
    }

    if (!user) {
      // Don't reveal if user exists for security
      logger.warn({ identifier, normalizedIdentifier }, 'Password reset OTP requested for non-existent user');
      // Still return success to prevent user enumeration
      return {
        success: true,
        message: 'If an account exists, you will receive a verification code'
      };
    }

    // Extract phone number for OTP
    if (!user.phone) {
      throw new AppError('This account does not have a phone number. Please contact support.', {
        status: 400,
        code: 'NO_PHONE_NUMBER'
      });
    }

    // Normalize user phone to ensure correct format for OTP
    // Database stores phones as +8801XXXXXXXXX (from normalizeIdentifier during registration)
    // Guest checkout works because it uses phone directly from user input (01XXXXXXXXX)
    // Password reset needs to convert database phone (+8801XXXXXXXXX) to 01XXXXXXXXX format
    // Use the same robust extraction logic as guest checkout
    let phoneForOTP = user.phone;
    
    // Extract digits only first
    const digitsOnly = phoneForOTP.replace(/\D/g, ''); // Remove all non-digits
    
    // Convert to 01XXXXXXXXX format (same as guest checkout)
    // Handle all possible formats: +8801XXXXXXXXX, 8801XXXXXXXXX, 01XXXXXXXXX
    if (digitsOnly.startsWith('8801') && digitsOnly.length === 13) {
      // 8801714918360 -> 01714918360 (skip first 2 digits: 88, result already starts with 0)
      phoneForOTP = digitsOnly.substring(2);
    } else if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
      // Already in correct format
      phoneForOTP = digitsOnly;
    } else if (digitsOnly.length === 13 && digitsOnly.startsWith('880')) {
      // +8801714918360 -> 01714918360 (skip first 2 digits: 88, result already starts with 0)
      phoneForOTP = digitsOnly.substring(2);
    } else if (digitsOnly.length >= 11) {
      // Try to extract: get last 11 digits, if they start with 01, use them
      const last11 = digitsOnly.slice(-11);
      if (last11.startsWith('01')) {
        phoneForOTP = last11;
      } else {
        // Fallback: assume last 11 digits are the phone, prepend 01 if needed
        phoneForOTP = last11.startsWith('0') ? last11 : '0' + last11.slice(-10);
      }
    } else {
      // If we can't determine format, use original and let validation handle it
      logger.warn({ 
        originalPhone: user.phone,
        digitsOnly,
        phoneLength: digitsOnly.length
      }, 'Could not normalize phone number format, using original');
    }
    
    logger.info({ 
      userId: user._id, 
      identifier: normalizedIdentifier,
      userPhoneOriginal: user.phone,
      phoneForOTP: phoneForOTP,
      phoneFormat: user.phone.startsWith('+') ? 'with-plus' : user.phone.startsWith('88') ? 'without-plus' : 'local-format'
    }, 'Preparing to send password reset OTP');

    // Send OTP via SMS with password_reset purpose
    // Use normalized phone format
    await otpPresenter.generateAndSendOTP(
      { phone: phoneForOTP, purpose: 'password_reset' },
      sessionId
    );

    logger.info({ 
      userId: user._id, 
      identifier: normalizedIdentifier,
      phone: user.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
    }, 'Password reset OTP sent successfully');

    return {
      success: true,
      message: 'Verification code sent to your phone number'
    };
  } catch (error) {
    logger.error({ error, identifier: request.identifier }, 'Failed to send password reset OTP');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to send verification code', {
      status: 500,
      code: 'OTP_SEND_FAILED'
    });
  }
}

/**
 * Verify OTP and generate reset token
 */
export async function verifyPasswordResetOTP(
  identifier: string,
  code: string,
  sessionId: string
): Promise<PasswordResetOTPVerificationResponse> {
  try {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    
    // Find user
    let user: User | null = null;
    
    if (validateEmail(normalizedIdentifier)) {
      user = await repo.findUserByEmail(normalizedIdentifier);
    } else if (validatePhone(normalizedIdentifier)) {
      // Use normalized identifier for lookup (matches database format: +8801XXXXXXXXX)
      // The normalizedIdentifier is now in +8801XXXXXXXXX format, which matches DB
      user = await repo.findUserByPhone(normalizedIdentifier);
      
      // If not found with normalized format, try flexible lookup as fallback
      if (!user) {
        user = await repo.findUserByPhoneFlexible(identifier);
      }
    }

    if (!user || !user.phone) {
      throw new AppError('User not found', {
        status: 404,
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify OTP
    try {
      await otpPresenter.verifyOTP(
        { phone: user.phone, code, sessionId },
        'password_reset'
      );
      // If no error thrown, OTP is valid
    } catch (otpError: any) {
      // OTP verification failed
      if (otpError.message.includes('Invalid') || otpError.message.includes('expired')) {
        throw new AppError('Invalid or expired verification code', {
          status: 400,
          code: 'INVALID_OTP'
        });
      }
      throw otpError;
    }

    // Generate secure reset token (valid for 10 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresIn = 10 * 60; // 10 minutes
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store reset token in token manager
    await tokenManager.storeToken(
      resetToken,
      {
        userId: user._id!,
        type: 'password_reset',
        metadata: { 
          identifier: normalizedIdentifier,
          verified: true,
          ip: 'unknown' 
        }
      },
      expiresIn
    );

    logger.info({ userId: user._id }, 'Password reset OTP verified, reset token generated');

    return {
      success: true,
      resetToken,
      expiresAt,
      user: {
        _id: user._id!,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName
      }
    };
  } catch (error) {
    logger.error({ error, identifier }, 'Failed to verify password reset OTP');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to verify code', {
      status: 500,
      code: 'OTP_VERIFY_FAILED'
    });
  }
}

/**
 * Set new password using reset token and auto-login user
 */
export async function setNewPasswordWithToken(
  resetToken: string,
  newPassword: string,
  req?: any
): Promise<SetNewPasswordResponse> {
  try {
    // Get reset token
    const resetData = await tokenManager.getToken(resetToken, 'password_reset');
    
    if (!resetData) {
      throw new AppError('Invalid or expired reset token', { 
        status: 400, 
        code: 'INVALID_RESET_TOKEN' 
      });
    }

    // Find user
    const user = await repo.findUserById(resetData.userId);
    if (!user) {
      await tokenManager.revokeToken(resetToken, 'password_reset');
      throw new AppError('User not found', { 
        status: 404, 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Validate password strength
    if (newPassword.length < 4) {
      throw new AppError('Password must be at least 4 characters long', {
        status: 400,
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash new password
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash(newPassword);

    // Update password
    await repo.updateUserById(user._id!, {
      passwordHash,
      updatedAt: new Date().toISOString()
    });

    // Revoke all existing tokens for security
    await tokenManager.revokeAllUserTokens(user._id!, 'access');
    await tokenManager.revokeAllUserTokens(user._id!, 'refresh');

    // Revoke reset token
    await tokenManager.revokeToken(resetToken, 'password_reset');

    // Generate new tokens and auto-login
    const tokens = await generateTokensForUser(user, false, req?.ip);

    // Create session if request is provided
    if (req) {
      try {
        const { createSession } = await import('./sessions/presenter.js');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        await createSession(user._id!, tokens.refreshToken, req, expiresAt);
      } catch (sessionError) {
        logger.warn({ error: sessionError, userId: user._id }, 'Failed to create session after password reset');
      }
    }

    logger.info({ userId: user._id }, 'Password reset successfully, user auto-logged in');

    return {
      success: true,
      user: {
        _id: user._id!,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName
      },
      tokens
    };
  } catch (error) {
    logger.error({ error }, 'Failed to set new password');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to reset password', {
      status: 500,
      code: 'PASSWORD_RESET_FAILED'
    });
  }
}

