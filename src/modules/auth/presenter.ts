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

// Token blacklist for logout (in production, use Redis)
export const tokenBlacklist = new Set<string>();

// Password reset tokens (in production, use Redis with TTL)
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

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
      return '+880' + identifier;
    }
    return identifier;
  }
  return identifier;
};

const generateTokens = (user: User, rememberMe = false): AuthTokens => {
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
    const tokens = generateTokens(createdUser);

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
    const tokens = generateTokens(user, input.rememberMe);

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
    const tokens = generateTokens(user);

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
    
    // Add token to blacklist
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
export async function initiatePasswordReset(identifier: string): Promise<void> {
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    resetTokens.set(resetToken, {
      userId: user._id!,
      expiresAt
    });

    // TODO: Send reset email/SMS
    // For now, just log the token (remove in production)
    logger.info({ 
      userId: user._id, 
      resetToken, 
      identifier: normalizedIdentifier 
    }, 'Password reset token generated');

  } catch (error) {
    logger.error({ error, identifier }, 'Password reset initiation failed');
    // Don't throw error for security
  }
}

// Reset password
export async function resetUserPassword(token: string, newPassword: string): Promise<void> {
  try {
    // Find reset token
    const resetData = resetTokens.get(token);
    
    if (!resetData || resetData.expiresAt < new Date()) {
      resetTokens.delete(token); // Clean up expired token
      throw new AppError('Invalid or expired reset token', { 
        status: 400, 
        code: 'INVALID_RESET_TOKEN' 
      });
    }

    // Find user
    const user = await repo.findUserById(resetData.userId);
    if (!user) {
      resetTokens.delete(token);
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

    // Remove reset token
    resetTokens.delete(token);

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


