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

export const env = {
  nodeEnv: (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production',
  port: requireNumber('PORT', 4000),
  mongoUri: requireString('MONGO_URI', 'mongodb://localhost:27017/scarlet'),
  dbName: process.env.DB_NAME, // Optional: override database name
  jwtSecret: requireString('JWT_SECRET', 'change-me-in-prod'),
  // Additional Atlas-specific configurations
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api`,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

export const isProduction = env.nodeEnv === 'production';
