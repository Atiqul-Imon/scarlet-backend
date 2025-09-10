import { redisClient } from './redisClient.js';
import { logger } from '../logging/logger.js';
import crypto from 'crypto';

export interface TokenData {
  userId: string;
  type: 'access' | 'refresh' | 'password_reset' | 'email_verification';
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export class TokenManager {
  private static instance: TokenManager;
  private fallbackStorage = new Map<string, TokenData>();

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private getKeyPrefix(type: string): string {
    return `token:${type}`;
  }

  private generateTokenId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async storeToken(
    token: string,
    data: Omit<TokenData, 'createdAt' | 'expiresAt'>,
    ttlSeconds: number
  ): Promise<boolean> {
    const tokenData: TokenData = {
      ...data,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };

    const key = `${this.getKeyPrefix(data.type)}:${token}`;
    
    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const success = await redisClient.set(
          key,
          JSON.stringify(tokenData),
          ttlSeconds
        );
        if (success) {
          logger.debug(`Token stored in Redis: ${data.type}:${token.substring(0, 8)}...`);
          return true;
        }
      }

      // Fallback to in-memory storage
      this.fallbackStorage.set(key, tokenData);
      logger.debug(`Token stored in memory: ${data.type}:${token.substring(0, 8)}...`);
      return true;
    } catch (error) {
      logger.error({ error }, 'Error storing token');
      return false;
    }
  }

  async getToken(token: string, type: string): Promise<TokenData | null> {
    const key = `${this.getKeyPrefix(type)}:${token}`;

    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const data = await redisClient.get(key);
        if (data) {
          const tokenData = JSON.parse(data) as TokenData;
          
          // Check if token is expired
          if (Date.now() > tokenData.expiresAt) {
            await this.revokeToken(token, type);
            return null;
          }

          return tokenData;
        }
      }

      // Fallback to in-memory storage
      const tokenData = this.fallbackStorage.get(key);
      if (tokenData) {
        // Check if token is expired
        if (Date.now() > tokenData.expiresAt) {
          this.fallbackStorage.delete(key);
          return null;
        }
        return tokenData;
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Error retrieving token');
      return null;
    }
  }

  async revokeToken(token: string, type: string): Promise<boolean> {
    const key = `${this.getKeyPrefix(type)}:${token}`;

    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const success = await redisClient.del(key);
        if (success) {
          logger.debug(`Token revoked from Redis: ${type}:${token.substring(0, 8)}...`);
        }
      }

      // Also remove from fallback storage
      const removed = this.fallbackStorage.delete(key);
      if (removed) {
        logger.debug(`Token revoked from memory: ${type}:${token.substring(0, 8)}...`);
      }

      return true;
    } catch (error) {
      logger.error({ error }, 'Error revoking token');
      return false;
    }
  }

  async revokeAllUserTokens(userId: string, type?: string): Promise<boolean> {
    try {
      const types = type ? [type] : ['access', 'refresh', 'password_reset', 'email_verification'];
      let allSuccess = true;

      for (const tokenType of types) {
        const pattern = `${this.getKeyPrefix(tokenType)}:*`;
        
        // Try Redis first
        const redisAvailable = await redisClient.isAvailable();
        if (redisAvailable) {
          const keys = await redisClient.keys(pattern);
          for (const key of keys) {
            const data = await redisClient.get(key);
            if (data) {
              const tokenData = JSON.parse(data) as TokenData;
              if (tokenData.userId === userId) {
                await redisClient.del(key);
                logger.debug(`Revoked user token from Redis: ${tokenType}:${key}`);
              }
            }
          }
        }

        // Also check fallback storage
        for (const [key, tokenData] of this.fallbackStorage.entries()) {
          if (key.startsWith(this.getKeyPrefix(tokenType)) && tokenData.userId === userId) {
            this.fallbackStorage.delete(key);
            logger.debug(`Revoked user token from memory: ${tokenType}:${key}`);
          }
        }
      }

      return allSuccess;
    } catch (error) {
      logger.error({ error }, 'Error revoking user tokens');
      return false;
    }
  }

  async isTokenBlacklisted(token: string, type: string): Promise<boolean> {
    const key = `${this.getKeyPrefix(type)}:${token}`;

    try {
      // Try Redis first
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const exists = await redisClient.exists(key);
        return exists;
      }

      // Check fallback storage
      return this.fallbackStorage.has(key);
    } catch (error) {
      logger.error({ error }, 'Error checking token blacklist');
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    try {
      // Clean up Redis tokens
      const redisAvailable = await redisClient.isAvailable();
      if (redisAvailable) {
        const types = ['access', 'refresh', 'password_reset', 'email_verification'];
        
        for (const type of types) {
          const pattern = `${this.getKeyPrefix(type)}:*`;
          const keys = await redisClient.keys(pattern);
          
          for (const key of keys) {
            const data = await redisClient.get(key);
            if (data) {
              const tokenData = JSON.parse(data) as TokenData;
              if (now > tokenData.expiresAt) {
                await redisClient.del(key);
                cleanedCount++;
              }
            }
          }
        }
      }

      // Clean up fallback storage
      for (const [key, tokenData] of this.fallbackStorage.entries()) {
        if (now > tokenData.expiresAt) {
          this.fallbackStorage.delete(key);
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired tokens`);
      return cleanedCount;
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired tokens');
      return cleanedCount;
    }
  }

  async getTokenStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    redisAvailable: boolean;
  }> {
    const stats = {
      total: 0,
      byType: {} as Record<string, number>,
      redisAvailable: await redisClient.isAvailable()
    };

    try {
      const types = ['access', 'refresh', 'password_reset', 'email_verification'];
      
      for (const type of types) {
        let count = 0;
        
        // Count Redis tokens
        if (stats.redisAvailable) {
          const pattern = `${this.getKeyPrefix(type)}:*`;
          const keys = await redisClient.keys(pattern);
          count += keys.length;
        }

        // Count fallback storage tokens
        for (const [key] of this.fallbackStorage.entries()) {
          if (key.startsWith(this.getKeyPrefix(type))) {
            count++;
          }
        }

        stats.byType[type] = count;
        stats.total += count;
      }

      return stats;
    } catch (error) {
      logger.error({ error }, 'Error getting token stats');
      return stats;
    }
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate password reset token with metadata
  async generatePasswordResetToken(
    userId: string,
    email: string,
    ttlHours: number = 24
  ): Promise<{ token: string; expiresAt: number }> {
    const token = this.generateSecureToken(32);
    const ttlSeconds = ttlHours * 3600;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    await this.storeToken(token, {
      userId,
      type: 'password_reset',
      metadata: { email, ip: 'unknown' } // IP will be set by the calling function
    }, ttlSeconds);

    return { token, expiresAt };
  }

  // Generate email verification token
  async generateEmailVerificationToken(
    userId: string,
    email: string,
    ttlHours: number = 72
  ): Promise<{ token: string; expiresAt: number }> {
    const token = this.generateSecureToken(32);
    const ttlSeconds = ttlHours * 3600;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    await this.storeToken(token, {
      userId,
      type: 'email_verification',
      metadata: { email }
    }, ttlSeconds);

    return { token, expiresAt };
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();
