export interface PasswordResetOTPRequest {
  identifier: string; // email or phone
}

export interface PasswordResetOTPVerification {
  identifier: string;
  code: string;
  sessionId: string;
}

export interface PasswordResetOTPVerificationResponse {
  success: boolean;
  resetToken: string; // Temporary token to set new password
  expiresAt: string;
  user: {
    _id: string;
    email?: string;
    phone?: string;
    firstName: string;
  };
}

export interface SetNewPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface SetNewPasswordResponse {
  success: boolean;
  user: {
    _id: string;
    email?: string;
    phone?: string;
    firstName: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

