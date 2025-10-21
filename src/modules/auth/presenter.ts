import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { 
  User, 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse,
  AuthTokens 
} from './model.js';
import * as repo from './repository.js';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import { tokenManager } from '../../core/cache/tokenManager.js';

// Legacy token blacklist (deprecated - use tokenManager instead)
export const tokenBlacklist = new Set<string>();

// OTP Storage (In-memory for development - replace with Redis in production)
interface OtpData {
  otp: string;
  phone: string;
  userId: string;
  expiresAt: Date;
}

const otpStore = new Map<string, OtpData>();

// Generate 4-digit OTP
const generateOtp = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Clean expired OTPs
const cleanExpiredOtps = () => {
  const now = new Date();
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(key);
    }
  }
};

// Helper functions
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
    // Normalize phone to +8801XXXXXXXXX format
    if (identifier.startsWith('01')) {
      return '+8801' + identifier.substring(2); // Remove '01' and add '+8801'
    }
    return identifier;
  }
  return identifier;
};

const generateTokens = async (user: User, rememberMe = false, ip?: string): Promise<AuthTokens> => {
  const accessTokenExpiry = '15m';
  const refreshTokenExpiry = rememberMe ? '30d' : '7d';
  const expiresIn = 15 * 60; // 15 minutes in seconds

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

  // Store tokens in Redis for proper management
  try {
    await tokenManager.storeToken(accessToken, {
      userId: user._id!,
      type: 'access',
      metadata: { ip, userAgent: 'unknown' }
    }, expiresIn);

    const refreshExpiresIn = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // Convert to seconds
    await tokenManager.storeToken(refreshToken, {
      userId: user._id!,
      type: 'refresh',
      metadata: { ip, userAgent: 'unknown' }
    }, refreshExpiresIn);
  } catch (error) {
    logger.error({ error }, 'Failed to store tokens in Redis');
    // Continue with token generation even if Redis fails
  }

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

const sanitizeUser = (user: User): Omit<User, 'passwordHash'> => {
  const { passwordHash, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Register user
export async function registerUser(input: RegisterRequest): Promise<AuthResponse> {
  try {
    // Check if user already exists
    let existingUser = null;
    
    if (input.email) {
      const normalizedEmail = normalizeIdentifier(input.email);
      existingUser = await repo.findUserByEmail(normalizedEmail);
    }
    
    if (!existingUser && input.phone) {
      const normalizedPhone = normalizeIdentifier(input.phone);
      existingUser = await repo.findUserByPhone(normalizedPhone);
    }

    if (existingUser) {
      throw new AppError('User already exists with this email or phone number', { 
        status: 409, 
        code: 'USER_EXISTS' 
      });
    }

    // Hash password
    const passwordHash = await argon2.hash(input.password);

    // Create user object
    const newUser: User = {
      email: input.email ? normalizeIdentifier(input.email) : undefined,
      phone: input.phone ? normalizeIdentifier(input.phone) : undefined,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim(),
      role: 'customer',
      isEmailVerified: false,
      isPhoneVerified: false,
      preferences: {
        newsletter: input.newsletter || false,
        smsNotifications: false,
        language: 'en',
        currency: 'BDT'
      },
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert user
    const createdUser = await repo.insertUser(newUser);

    // Generate tokens
    const tokens = await generateTokens(createdUser);

    logger.info({ userId: createdUser._id }, 'User registered successfully');

    return {
      user: sanitizeUser(createdUser),
      tokens
    };
  } catch (error) {
    logger.error({ error, input: { ...input, password: '[REDACTED]' } }, 'User registration failed');
    throw error;
  }
}

// Login user
export async function loginUser(input: LoginRequest): Promise<AuthResponse> {
  try {
    const normalizedIdentifier = normalizeIdentifier(input.identifier);
    
    // Find user by email or phone using the unified function
    const user = await repo.findUserByIdentifier(normalizedIdentifier);

    // Verify user and password
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      logger.warn({ identifier: normalizedIdentifier }, 'Login attempt with invalid credentials');
      throw new AppError('Invalid credentials', { 
        status: 401, 
        code: 'INVALID_CREDENTIALS' 
      });
    }

    // Generate tokens
    const tokens = await generateTokens(user, input.rememberMe);

    // Update last login
    await repo.updateUserById(user._id!, { 
      updatedAt: new Date().toISOString() 
    });

    logger.info({ userId: user._id }, 'User logged in successfully');

    return {
      user: sanitizeUser(user),
      tokens
    };
  } catch (error) {
    logger.error({ error, identifier: input.identifier }, 'User login failed');
    throw error;
  }
}

// Refresh token
export async function refreshUserToken(refreshToken: string): Promise<AuthTokens> {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(refreshToken)) {
      throw new AppError('Invalid refresh token', { 
        status: 401, 
        code: 'INVALID_REFRESH_TOKEN' 
      });
    }

    // Verify token
    const decoded = jwt.verify(refreshToken, env.jwtSecret) as any;
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', { 
        status: 401, 
        code: 'INVALID_TOKEN_TYPE' 
      });
    }

    // Find user
    const user = await repo.findUserById(decoded.sub);
    if (!user) {
      throw new AppError('User not found', { 
        status: 404, 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Generate new tokens
    const tokens = await generateTokens(user);

    // Blacklist old refresh token
    tokenBlacklist.add(refreshToken);

    logger.info({ userId: user._id }, 'Token refreshed successfully');

    return tokens;
  } catch (error) {
    logger.error({ error }, 'Token refresh failed');
    throw error;
  }
}

// Logout user
export async function logoutUser(accessToken: string): Promise<void> {
  try {
    // Decode token to get user info (don't verify as it might be expired)
    const decoded = jwt.decode(accessToken) as any;
    
    // Revoke token using token manager
    await tokenManager.revokeToken(accessToken, 'access');
    
    // Also add to legacy blacklist for backward compatibility
    tokenBlacklist.add(accessToken);
    
    if (decoded?.sub) {
      logger.info({ userId: decoded.sub }, 'User logged out successfully');
    }
  } catch (error) {
    logger.error({ error }, 'Logout failed');
    // Don't throw error for logout - always succeed for security
  }
}

// Change password
export async function changeUserPassword(
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  try {
    // Find user
    const user = await repo.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', { 
        status: 404, 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Verify current password
    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new AppError('Invalid current password', { 
        status: 400, 
        code: 'INVALID_CURRENT_PASSWORD' 
      });
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(newPassword);

    // Update password
    await repo.updateUserById(userId, {
      passwordHash: newPasswordHash,
      updatedAt: new Date().toISOString()
    });

    logger.info({ userId }, 'Password changed successfully');
  } catch (error) {
    logger.error({ error, userId }, 'Password change failed');
    throw error;
  }
}

// Initiate password reset
export async function initiatePasswordReset(identifier: string, ip?: string): Promise<void> {
  try {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    
    // Find user
    let user: User | null = null;
    
    if (validateEmail(normalizedIdentifier)) {
      user = await repo.findUserByEmail(normalizedIdentifier);
    } else if (validatePhone(normalizedIdentifier)) {
      user = await repo.findUserByPhone(normalizedIdentifier);
    }

    if (!user) {
      // Don't throw error for security - always return success
      logger.warn({ identifier: normalizedIdentifier }, 'Password reset requested for non-existent user');
      return;
    }

    // Generate secure reset token using token manager
    const { token: resetToken, expiresAt } = await tokenManager.generatePasswordResetToken(
      user._id!,
      normalizedIdentifier,
      1 // 1 hour expiration
    );

    // TODO: Send reset email/SMS with the token
    // For now, just log the token (remove in production)
    logger.info({ 
      userId: user._id, 
      resetToken, 
      identifier: normalizedIdentifier,
      expiresAt: new Date(expiresAt).toISOString(),
      ip
    }, 'Password reset token generated');

  } catch (error) {
    logger.error({ error, identifier }, 'Password reset initiation failed');
    // Don't throw error for security
  }
}

// Reset password
export async function resetUserPassword(token: string, newPassword: string): Promise<void> {
  try {
    // Get reset token from token manager
    const resetData = await tokenManager.getToken(token, 'password_reset');
    
    if (!resetData) {
      throw new AppError('Invalid or expired reset token', { 
        status: 400, 
        code: 'INVALID_RESET_TOKEN' 
      });
    }

    // Find user
    const user = await repo.findUserById(resetData.userId);
    if (!user) {
      // Revoke token if user not found
      await tokenManager.revokeToken(token, 'password_reset');
      throw new AppError('User not found', { 
        status: 404, 
        code: 'USER_NOT_FOUND' 
      });
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password
    await repo.updateUserById(user._id!, {
      passwordHash,
      updatedAt: new Date().toISOString()
    });

    // Revoke all user tokens for security
    await tokenManager.revokeAllUserTokens(user._id!, 'access');
    await tokenManager.revokeAllUserTokens(user._id!, 'refresh');

    // Remove reset token
    await tokenManager.revokeToken(token, 'password_reset');

    logger.info({ userId: user._id }, 'Password reset successfully');
  } catch (error) {
    logger.error({ error }, 'Password reset failed');
    throw error;
  }
}

// Get user profile
export async function getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
  try {
    const user = await repo.findUserById(userId);
    
    if (!user) {
      throw new AppError('User not found', { 
        status: 404, 
        code: 'USER_NOT_FOUND' 
      });
    }

    return sanitizeUser(user);
  } catch (error) {
    logger.error({ error, userId }, 'Get user profile failed');
    throw error;
  }
}

// Send phone OTP
export async function sendPhoneOtp(userId: string, phone: string): Promise<{ message: string; otp?: string }> {
  try {
    // Clean expired OTPs
    cleanExpiredOtps();

    // Generate 4-digit OTP
    const otp = generateOtp();
    
    // Store OTP with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const otpKey = `${userId}:${phone}`;
    
    otpStore.set(otpKey, {
      otp,
      phone,
      userId,
      expiresAt,
    });

    logger.info({ userId, phone, otp }, 'OTP generated for phone verification');

    // In development mode, return the OTP in the response
    // In production, this should send SMS via external service
    if (env.nodeEnv === 'development') {
      return {
        message: 'OTP sent successfully (Development Mode)',
        otp, // Return OTP for development
      };
    }

    // TODO: Integrate with SMS service (e.g., Twilio, AWS SNS, etc.)
    // await sendSMS(phone, `Your verification code is: ${otp}`);

    return {
      message: 'OTP sent successfully via SMS',
    };
  } catch (error) {
    logger.error({ error, userId, phone }, 'Send phone OTP failed');
    throw new AppError('Failed to send OTP', { 
      status: 500, 
      code: 'OTP_SEND_FAILED' 
    });
  }
}

// Verify phone OTP
export async function verifyPhoneOtp(userId: string, phone: string, otp: string): Promise<{ message: string; verified: boolean }> {
  try {
    // Clean expired OTPs
    cleanExpiredOtps();

    const otpKey = `${userId}:${phone}`;
    const storedOtpData = otpStore.get(otpKey);

    if (!storedOtpData) {
      throw new AppError('OTP not found or expired', { 
        status: 400, 
        code: 'OTP_NOT_FOUND' 
      });
    }

    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      throw new AppError('Invalid OTP', { 
        status: 400, 
        code: 'INVALID_OTP' 
      });
    }

    // Check if OTP is expired
    if (storedOtpData.expiresAt < new Date()) {
      otpStore.delete(otpKey);
      throw new AppError('OTP has expired', { 
        status: 400, 
        code: 'OTP_EXPIRED' 
      });
    }

    // OTP is valid, remove it from store
    otpStore.delete(otpKey);

    logger.info({ userId, phone }, 'Phone OTP verified successfully');

    return {
      message: 'Phone number verified successfully',
      verified: true,
    };
  } catch (error) {
    logger.error({ error, userId, phone }, 'Verify phone OTP failed');
    throw error;
  }
}

/**
 * Auto-create account for guest users who place orders
 * PHONE is PRIMARY - email is optional in Bangladesh
 * Returns userId if account created successfully, undefined otherwise
 */
export async function autoCreateGuestAccount(data: {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}): Promise<string | undefined> {
  try {
    // PHONE is mandatory - normalize it
    const normalizedPhone = normalizeIdentifier(data.phone);
    
    // Email is optional - normalize only if provided
    const normalizedEmail = data.email && data.email.includes('@') 
      ? normalizeIdentifier(data.email) 
      : undefined;
    
    // Check if user already exists by PHONE (primary identifier)
    let existingUser = await repo.findUserByPhone(normalizedPhone);
    if (existingUser) {
      logger.info({ phone: data.phone }, 'User already exists with this phone');
      return existingUser._id?.toString();
    }
    
    // Check by email only if provided
    if (normalizedEmail) {
      existingUser = await repo.findUserByEmail(normalizedEmail);
      if (existingUser) {
        logger.info({ email: data.email }, 'User already exists with this email');
        return existingUser._id?.toString();
      }
    }

    // Generate a random temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    // Create user object - PHONE is mandatory, email is optional
    const newUser: User = {
      phone: normalizedPhone, // PRIMARY identifier
      email: normalizedEmail, // Optional
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName?.trim(),
      role: 'customer',
      isEmailVerified: false,
      isPhoneVerified: true, // Auto-verify phone from order (they received SMS)
      preferences: {
        newsletter: false,
        smsNotifications: true,
        language: 'en',
        currency: 'BDT'
      },
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert user
    const createdUser = await repo.insertUser(newUser);
    
    logger.info({ 
      userId: createdUser._id, 
      phone: data.phone,
      hasEmail: !!normalizedEmail
    }, 'Auto-created account for guest user');

    // TODO: Send SMS with account activation instructions
    // await sendWelcomeSMS(data.phone, createdUser._id);
    
    // TODO: If email provided, send welcome email
    // if (normalizedEmail) {
    //   await sendWelcomeEmail(normalizedEmail);
    // }

    return createdUser._id?.toString();
  } catch (error) {
    logger.error({ error, phone: data.phone }, 'Failed to auto-create guest account');
    return undefined; // Don't fail order creation if account creation fails
  }
}


