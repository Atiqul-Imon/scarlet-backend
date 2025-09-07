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
  mongoUri: requireString('MONGODB_URI', requireString('MONGO_URI', 'mongodb+srv://imonatikulislam:1LhIjsSyfIWCVlgz@cluster0.08anqce.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')),
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
  rocketCallbackUrl: process.env.ROCKET_CALLBACK_URL
};

export { isProduction };
