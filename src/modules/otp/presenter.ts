import * as repo from './repository.js';
import type { OTP, OTPRequest, OTPVerification, OTPResponse } from './model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';

// Generate a 4-digit OTP code
function generateOTPCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Validate Bangladesh phone number format
function validateBangladeshPhone(phone: string): boolean {
  // Remove any spaces, dashes, or other characters
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it matches Bangladesh mobile number patterns
  const patterns = [
    /^(\+8801|01)[3-9]\d{8}$/, // +8801XXXXXXXXX or 01XXXXXXXXX
    /^8801[3-9]\d{8}$/ // 8801XXXXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
}

// Normalize phone number to standard format
function normalizePhone(phone: string): string {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Convert to standard format: +8801XXXXXXXXX
  if (cleanPhone.startsWith('01')) {
    return '+88' + cleanPhone;
  } else if (cleanPhone.startsWith('8801')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.startsWith('+8801')) {
    return cleanPhone;
  }
  
  return cleanPhone;
}



// Generate and send OTP
export async function generateAndSendOTP(
  request: OTPRequest, 
  sessionId: string
): Promise<OTPResponse> {
  try {
    const { phone, purpose } = request;
    
    // Validate phone number
    if (!validateBangladeshPhone(phone)) {
      throw new AppError('Please enter a valid Bangladesh phone number (01XXXXXXXXX)', {
        status: 400,
        code: 'INVALID_PHONE'
      });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    // Check for recent OTP (rate limiting)
    const recentOTP = await repo.findRecentOTPByPhone(normalizedPhone, purpose);
    if (recentOTP) {
      const timeRemaining = Math.ceil(
        (new Date(recentOTP.expiresAt).getTime() - Date.now()) / 1000
      );
      
      throw new AppError(
        `Please wait ${timeRemaining} seconds before requesting another OTP`,
        {
          status: 429,
          code: 'RATE_LIMITED'
        }
      );
    }
    
    // Generate OTP
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Create OTP record
    const otp: OTP = {
      phone: normalizedPhone,
      code,
      sessionId,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to database
    const createdOTP = await repo.createOTP(otp);
    
    // Send SMS (in development, log to console)
    await sendOTPSMS(normalizedPhone, code, purpose);
    
    logger.info({
      phone: normalizedPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask phone for security
      purpose,
      sessionId,
      otpId: createdOTP._id
    }, 'OTP generated and sent');
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600, // 10 minutes
      attemptsRemaining: 5
      // OTP is NOT included in response for security
    };
    
  } catch (error) {
    logger.error({ error, request, sessionId }, 'Failed to generate and send OTP');
    throw error;
  }
}

// Verify OTP
export async function verifyOTP(
  verification: OTPVerification,
  purpose: string
): Promise<OTPResponse> {
  try {
    const { phone, code, sessionId } = verification;
    
    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);
    
    // Find valid OTP
    const otp = await repo.findValidOTP(normalizedPhone, sessionId, purpose);
    
    if (!otp) {
      throw new AppError('Invalid or expired OTP. Please request a new one.', {
        status: 400,
        code: 'INVALID_OTP'
      });
    }
    
    // Check if OTP is already verified
    if (otp.verifiedAt) {
      throw new AppError('OTP has already been used', {
        status: 400,
        code: 'OTP_ALREADY_USED'
      });
    }
    
    // Check attempts
    if (otp.attempts >= otp.maxAttempts) {
      throw new AppError('Maximum attempts exceeded. Please request a new OTP.', {
        status: 429,
        code: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }
    
    // Verify code
    if (otp.code !== code) {
      // Increment attempts
      await repo.updateOTPAttempts(otp._id!, otp.attempts + 1);
      
      const attemptsRemaining = otp.maxAttempts - (otp.attempts + 1);
      
      throw new AppError(
        `Invalid OTP. ${attemptsRemaining} attempts remaining.`,
        {
          status: 400,
          code: 'INVALID_OTP_CODE'
        }
      );
    }
    
    // Mark as verified
    await repo.markOTPAsVerified(otp._id!);
    
    logger.info({
      phone: normalizedPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask phone for security
      purpose,
      sessionId,
      otpId: otp._id
    }, 'OTP verified successfully');
    
    return {
      success: true,
      message: 'OTP verified successfully',
      attemptsRemaining: otp.maxAttempts - otp.attempts
    };
    
  } catch (error) {
    logger.error({ error, verification, purpose }, 'Failed to verify OTP');
    throw error;
  }
}

// Check OTP status (for frontend polling)
export async function checkOTPStatus(
  phone: string,
  sessionId: string,
  purpose: string
): Promise<{ verified: boolean; expiresAt?: string }> {
  try {
    const normalizedPhone = normalizePhone(phone);
    
    const otp = await repo.findOTPByPhoneAndSession(normalizedPhone, sessionId, purpose);
    
    if (!otp) {
      return { verified: false };
    }
    
    return {
      verified: !!otp.verifiedAt,
      expiresAt: otp.expiresAt
    };
    
  } catch (error) {
    logger.error({ error, phone, sessionId, purpose }, 'Failed to check OTP status');
    return { verified: false };
  }
}

// Cleanup expired OTPs (can be called periodically)
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    await repo.cleanupExpiredOTPs();
    logger.info({}, 'Expired OTPs cleaned up');
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup expired OTPs');
  }
}

// Export SMS function for use by other modules
export async function sendOrderSuccessSMS(phone: string, orderNumber: string): Promise<void> {
  try {
    // Import SSLWireless SMS service
    const { smsService } = await import('../../core/services/smsService.js');
    
    // Create message under 160 characters
    const total = 0; // TODO: Get actual total from order
    const message = `Order #${orderNumber} placed successfully! Your order is confirmed and will be processed soon. Thank you for choosing Scarlet Beauty!`;
    
    // Check if service is configured
    if (smsService.isConfigured()) {
      await smsService.sendOrderConfirmation(phone, orderNumber, total);
      logger.info({ phone, orderNumber }, 'Order confirmation SMS sent via SSLWireless');
    } else {
      // Fallback to console logging
      logger.info({
        phone,
        orderNumber,
        message,
        messageLength: message.length
      }, 'Order Success SMS logged (SSLWireless not configured)');
      
      console.log(`\n📱 Order Success SMS for ${phone}:`);
      console.log(`Message: ${message}`);
      console.log(`Length: ${message.length} characters\n`);
      console.log('⚠️ SSLWireless SMS not configured. SMS logged to console.');
    }
  } catch (error: any) {
    logger.error({ error: error.message, phone, orderNumber }, 'Failed to send order success SMS');
    console.log(`\n📱 Order Success SMS FALLBACK for ${phone}:`);
    console.log(`Order: ${orderNumber}`);
    console.log(`Error: ${error.message}\n`);
  }
}

// Send OTP SMS for login/verification (Production Ready)
export async function sendOTPSMS(phone: string, otp: string, purpose: 'phone_verification' | 'password_reset' | 'guest_checkout' = 'phone_verification'): Promise<void> {
  try {
    // Import SSLWireless SMS service
    const { smsService } = await import('../../core/services/smsService.js');
    
    // Check if service is configured
    if (smsService.isConfigured()) {
      // Map purpose to SMS service purpose
      const smsPurpose = purpose === 'password_reset' ? 'passwordReset' : 
                        purpose === 'phone_verification' ? 'verification' : 'verification';
      
      // Send via SSLWireless with bilingual message
      await smsService.sendOTP(phone, otp, smsPurpose);
      
      // Log OTP for debugging (only in server logs, not in API response)
      logger.info({ 
        phone, 
        otp, 
        purpose,
        maskedPhone: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') // Mask phone for security
      }, 'OTP SMS sent via SSLWireless');
      
    } else {
      // Fallback to console logging in development
      const message = `Your Scarlet verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
      
      logger.info({
        phone,
        otp,
        purpose,
        message,
        messageLength: message.length,
        maskedPhone: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      }, 'OTP SMS logged (SSLWireless not configured)');
      
      console.log(`\n📱 OTP SMS for ${phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}:`);
      console.log(`Code: ${otp}`);
      console.log(`Message: ${message}`);
      console.log(`Length: ${message.length} characters\n`);
      console.log('⚠️ SSLWireless SMS not configured. Add SSL_WIRELESS_API_TOKEN and SSL_WIRELESS_SID to environment variables.');
    }
  } catch (error: any) {
    // If SMS service fails, log to console as fallback
    // Don't throw error - we still want OTP to be created for manual verification
    logger.error({ 
      error: error.message,
      errorStack: error.stack,
      phone: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), 
      otp, 
      purpose 
    }, 'Failed to send OTP SMS - will be logged to console');
    
    // Log to console so admin can see OTP if SMS fails
    console.log(`\n📱 OTP SMS FALLBACK for ${phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}:`);
    console.log(`Code: ${otp}`);
    console.log(`Error: ${error.message}`);
    console.log(`Purpose: ${purpose}\n`);
  }
}
