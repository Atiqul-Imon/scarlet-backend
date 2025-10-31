import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './password-reset.presenter.js';
import type { 
  PasswordResetOTPRequest,
  PasswordResetOTPVerification,
  SetNewPasswordRequest
} from './password-reset.types.js';
import crypto from 'crypto';

// Generate session ID for OTP
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Send OTP for password reset
 */
export const sendPasswordResetOTP = asyncHandler(async (req: Request, res: Response) => {
  const { identifier }: PasswordResetOTPRequest = req.body;

  if (!identifier) {
    return fail(res, {
      message: 'Email or phone number is required',
      code: 'IDENTIFIER_REQUIRED'
    }, 400);
  }

  // Generate session ID if not provided
  const sessionId = req.headers['x-session-id'] as string || req.body.sessionId || generateSessionId();

  try {
    const result = await presenter.sendPasswordResetOTP({ identifier }, sessionId);
    
    // Return session ID so frontend can use it for verification
    ok(res, {
      ...result,
      sessionId
    });
  } catch (error: any) {
    if (error.message.includes('valid email or phone') || error.message.includes('Invalid')) {
      return fail(res, {
        message: error.message,
        code: error.code || 'INVALID_IDENTIFIER'
      }, 400);
    }
    
    if (error.message.includes('does not have a phone number')) {
      return fail(res, {
        message: error.message,
        code: 'NO_PHONE_NUMBER'
      }, 400);
    }
    
    // For security, don't reveal if user exists
    ok(res, {
      success: true,
      message: 'If an account exists, you will receive a verification code',
      sessionId
    });
  }
});

/**
 * Verify OTP and get reset token
 */
export const verifyPasswordResetOTP = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, code, sessionId }: PasswordResetOTPVerification = req.body;

  if (!identifier) {
    return fail(res, {
      message: 'Email or phone number is required',
      code: 'IDENTIFIER_REQUIRED'
    }, 400);
  }

  if (!code) {
    return fail(res, {
      message: 'Verification code is required',
      code: 'CODE_REQUIRED'
    }, 400);
  }

  if (!sessionId) {
    return fail(res, {
      message: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED'
    }, 400);
  }

  try {
    const result = await presenter.verifyPasswordResetOTP(identifier, code, sessionId);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('not found')) {
      return fail(res, {
        message: error.message,
        code: error.code || 'INVALID_OTP'
      }, 400);
    }
    throw error;
  }
});

/**
 * Set new password using reset token and auto-login
 */
export const setNewPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, newPassword }: SetNewPasswordRequest = req.body;

  if (!resetToken) {
    return fail(res, {
      message: 'Reset token is required',
      code: 'TOKEN_REQUIRED'
    }, 400);
  }

  if (!newPassword) {
    return fail(res, {
      message: 'New password is required',
      code: 'PASSWORD_REQUIRED'
    }, 400);
  }

  // Basic password validation
  if (newPassword.length < 4) {
    return fail(res, {
      message: 'Password must be at least 4 characters long',
      code: 'INVALID_PASSWORD'
    }, 400);
  }

  try {
    const result = await presenter.setNewPasswordWithToken(resetToken, newPassword, req);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      return fail(res, {
        message: error.message,
        code: error.code || 'INVALID_TOKEN'
      }, 400);
    }
    
    if (error.message.includes('not found')) {
      return fail(res, {
        message: error.message,
        code: error.code || 'USER_NOT_FOUND'
      }, 404);
    }
    throw error;
  }
});

