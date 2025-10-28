import dotenv from 'dotenv';

dotenv.config();

function requireString(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function requireNumber(name: string, fallback?: number): number {
  const v = process.env[name];
  if (v === undefined) {
    if (fallback === undefined) throw new Error(`Missing env: ${name}`);
    return fallback;
  }
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Env ${name} must be a number`);
  return n;
}

const nodeEnv = (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production';
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,
  port: requireNumber('PORT', isProduction ? 10000 : 4000),
  mongoUri: requireString('MONGODB_URI', requireString('MONGO_URI')),
  dbName: process.env.DB_NAME, // Optional: override database name
  jwtSecret: requireString('JWT_SECRET', 'change-me-in-prod'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: requireNumber('BCRYPT_SALT_ROUNDS', 12),
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  apiRateLimit: requireNumber('API_RATE_LIMIT', 100),
  maxFileSize: requireNumber('MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB
  // Additional Atlas-specific configurations
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Mobile and cross-origin support
  allowedOrigins: [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    'https://scarletunlimited.net',
    'https://www.scarletunlimited.net',
    'https://scarlet-frontend.vercel.app',
    'https://scarlet-frontend.vercel.app/',
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter((origin): origin is string => Boolean(origin)),
  
  // Payment Gateway Configurations
  // bKash Configuration
  bkashAppKey: process.env.BKASH_APP_KEY,
  bkashAppSecret: process.env.BKASH_APP_SECRET,
  bkashUsername: process.env.BKASH_USERNAME,
  bkashPassword: process.env.BKASH_PASSWORD,
  bkashSandbox: process.env.BKASH_SANDBOX || 'true',
  bkashBaseUrl: process.env.BKASH_BASE_URL,
  bkashCallbackUrl: process.env.BKASH_CALLBACK_URL,
  bkashMerchantId: process.env.BKASH_MERCHANT_ID,
  
  // Nagad Configuration
  nagadMerchantId: process.env.NAGAD_MERCHANT_ID,
  nagadMerchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY,
  nagadPublicKey: process.env.NAGAD_PUBLIC_KEY,
  nagadSandbox: process.env.NAGAD_SANDBOX || 'true',
  nagadBaseUrl: process.env.NAGAD_BASE_URL,
  nagadCallbackUrl: process.env.NAGAD_CALLBACK_URL,
  
  // Rocket Configuration
  rocketApiKey: process.env.ROCKET_API_KEY,
  rocketSecretKey: process.env.ROCKET_SECRET_KEY,
  rocketSandbox: process.env.ROCKET_SANDBOX || 'true',
  rocketBaseUrl: process.env.ROCKET_BASE_URL,
  rocketCallbackUrl: process.env.ROCKET_CALLBACK_URL,
  
  // Redis Configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD,
  redisDb: requireNumber('REDIS_DB', 0),
  
  // Security Configuration
  sessionSecret: process.env.SESSION_SECRET || requireString('JWT_SECRET', 'change-me-in-prod'),
  encryptionKey: process.env.ENCRYPTION_KEY || requireString('JWT_SECRET', 'change-me-in-prod'),
  
  // Rate Limiting Configuration
  rateLimitWindowMs: requireNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: requireNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // Token Configuration
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  passwordResetTokenExpiry: process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1h',
  emailVerificationTokenExpiry: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '72h',
  
  // Courier Service Configurations
  // Pathao Configuration
  pathaoClientId: process.env.PATHAO_CLIENT_ID,
  pathaoClientSecret: process.env.PATHAO_CLIENT_SECRET,
  pathaoStoreId: process.env.PATHAO_STORE_ID,
  pathaoSandbox: process.env.PATHAO_SANDBOX || 'true',
  
  // Redx Configuration
  redxApiKey: process.env.REDX_API_KEY,
  redxSecretKey: process.env.REDX_SECRET_KEY,
  redxStoreId: process.env.REDX_STORE_ID,
  redxSandbox: process.env.REDX_SANDBOX || 'true',
  
  // Steadfast Configuration
  steadfastApiKey: process.env.STEADFAST_API_KEY,
  steadfastSecretKey: process.env.STEADFAST_SECRET_KEY,
  steadfastStoreId: process.env.STEADFAST_STORE_ID,
  steadfastSandbox: process.env.STEADFAST_SANDBOX || 'true',
  
  // SSLWireless SMS Configuration
  sslWirelessApiToken: process.env.SSL_WIRELESS_API_TOKEN,
  sslWirelessSid: process.env.SSL_WIRELESS_SID,
  sslWirelessMasking: process.env.SSL_WIRELESS_MASKING || 'SCARLET',
  sslWirelessApiUser: process.env.SSL_WIRELESS_API_USER,
  sslWirelessApiPassword: process.env.SSL_WIRELESS_API_PASSWORD
};

export { isProduction };
