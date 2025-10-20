export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  _id?: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  role: UserRole;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  avatar?: string;
  dateOfBirth?: string;
  preferences?: {
    newsletter: boolean;
    smsNotifications: boolean;
    language: string;
    currency: string;
  };
  addresses?: Address[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

// Registration interfaces
export interface RegisterRequest {
  // Either email or phone is required
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName?: string;
  acceptTerms: boolean;
  newsletter?: boolean;
}

export interface LoginRequest {
  // Can login with either email or phone
  identifier: string; // email or phone
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  identifier: string; // email or phone
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}


