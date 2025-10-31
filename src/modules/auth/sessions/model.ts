export interface UserSession {
  _id?: string;
  userId: string;
  tokenId: string; // JWT token ID or refresh token ID
  device?: string; // e.g., "MacBook Pro", "iPhone 15", "Windows PC"
  browser?: string; // e.g., "Chrome 120.0", "Safari 17.0"
  os?: string; // e.g., "macOS", "iOS", "Windows"
  userAgent?: string; // Full user agent string
  ipAddress: string;
  location?: string; // e.g., "New York, NY" or "Dhaka, Bangladesh"
  country?: string;
  city?: string;
  isCurrent?: boolean; // Whether this is the current session
  lastActive: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp - when token expires
}

export interface CreateSessionParams {
  userId: string;
  tokenId: string;
  ipAddress: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  country?: string;
  city?: string;
  expiresAt?: string;
}

