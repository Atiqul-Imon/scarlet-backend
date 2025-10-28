export interface OTP {
  _id?: string;
  phone: string;
  code: string;
  sessionId: string;
  purpose: 'guest_checkout' | 'phone_verification' | 'password_reset';
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OTPRequest {
  phone: string;
  purpose: 'guest_checkout' | 'phone_verification' | 'password_reset';
}

export interface OTPVerification {
  phone: string;
  code: string;
  sessionId: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  expiresIn?: number; // seconds until expiration
  attemptsRemaining?: number;
  // OTP is NOT included in response for security - only sent via SMS
}
