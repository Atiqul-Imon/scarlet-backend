import type { Request, Response } from 'express';
import { ok, fail } from '../../core/http/response.js';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import type { OTPRequest, OTPVerification } from './model.js';

// Generate and send OTP
export const generateOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose }: OTPRequest = req.body;
  const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
  
  // Validation
  if (!phone) {
    return fail(res, {
      message: 'Phone number is required',
      code: 'PHONE_REQUIRED'
    }, 400);
  }
  
  if (!purpose) {
    return fail(res, {
      message: 'Purpose is required',
      code: 'PURPOSE_REQUIRED'
    }, 400);
  }
  
  if (!sessionId) {
    return fail(res, {
      message: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED'
    }, 400);
  }
  
  // Validate purpose
  const validPurposes = ['guest_checkout', 'phone_verification', 'password_reset'];
  if (!validPurposes.includes(purpose)) {
    return fail(res, {
      message: 'Invalid purpose',
      code: 'INVALID_PURPOSE'
    }, 400);
  }
  
  try {
    const result = await presenter.generateAndSendOTP({ phone, purpose }, sessionId);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('valid Bangladesh phone number')) {
      return fail(res, {
        message: error.message,
        code: 'INVALID_PHONE'
      }, 400);
    }
    
    if (error.message.includes('Please wait')) {
      return fail(res, {
        message: error.message,
        code: 'RATE_LIMITED'
      }, 429);
    }
    
    throw error;
  }
});

// Verify OTP
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, code, sessionId, purpose }: OTPVerification & { purpose: string } = req.body;
  
  // Validation
  if (!phone) {
    return fail(res, {
      message: 'Phone number is required',
      code: 'PHONE_REQUIRED'
    }, 400);
  }
  
  if (!code) {
    return fail(res, {
      message: 'OTP code is required',
      code: 'CODE_REQUIRED'
    }, 400);
  }
  
  if (!sessionId) {
    return fail(res, {
      message: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED'
    }, 400);
  }
  
  if (!purpose) {
    return fail(res, {
      message: 'Purpose is required',
      code: 'PURPOSE_REQUIRED'
    }, 400);
  }
  
  try {
    const result = await presenter.verifyOTP({ phone, code, sessionId }, purpose);
    ok(res, result);
  } catch (error: any) {
    if (error.message.includes('Invalid or expired OTP')) {
      return fail(res, {
        message: error.message,
        code: 'INVALID_OTP'
      }, 400);
    }
    
    if (error.message.includes('already been used')) {
      return fail(res, {
        message: error.message,
        code: 'OTP_ALREADY_USED'
      }, 400);
    }
    
    if (error.message.includes('Maximum attempts exceeded')) {
      return fail(res, {
        message: error.message,
        code: 'MAX_ATTEMPTS_EXCEEDED'
      }, 429);
    }
    
    if (error.message.includes('Invalid OTP')) {
      return fail(res, {
        message: error.message,
        code: 'INVALID_OTP_CODE'
      }, 400);
    }
    
    throw error;
  }
});

// Check OTP status
export const checkOTPStatus = asyncHandler(async (req: Request, res: Response) => {
  const { phone, sessionId, purpose } = req.query;
  
  // Validation
  if (!phone || typeof phone !== 'string') {
    return fail(res, {
      message: 'Phone number is required',
      code: 'PHONE_REQUIRED'
    }, 400);
  }
  
  if (!sessionId || typeof sessionId !== 'string') {
    return fail(res, {
      message: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED'
    }, 400);
  }
  
  if (!purpose || typeof purpose !== 'string') {
    return fail(res, {
      message: 'Purpose is required',
      code: 'PURPOSE_REQUIRED'
    }, 400);
  }
  
  try {
    const result = await presenter.checkOTPStatus(phone, sessionId, purpose);
    ok(res, result);
  } catch (error: any) {
    throw error;
  }
});

// Cleanup expired OTPs (admin endpoint)
export const cleanupExpiredOTPs = asyncHandler(async (req: Request, res: Response) => {
  try {
    await presenter.cleanupExpiredOTPs();
    ok(res, { message: 'Expired OTPs cleaned up successfully' });
  } catch (error: any) {
    throw error;
  }
});
