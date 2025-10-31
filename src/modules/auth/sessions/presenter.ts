import type { UserSession, CreateSessionParams } from './model.js';
import * as repo from './repository.js';
import { parseUserAgent, getClientIp, getLocationFromIp } from './utils.js';
import { logger } from '../../../core/logging/logger.js';

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  tokenId: string,
  req: any, // Express Request
  expiresAt?: string
): Promise<UserSession> {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];
    
    // Parse user agent
    const parsed = parseUserAgent(userAgent);
    
    // Get location (async, but we won't wait if it fails)
    let locationData: { location?: string; country?: string; city?: string } = {};
    try {
      locationData = await getLocationFromIp(ipAddress);
    } catch (error) {
      logger.warn({ error, ipAddress }, 'Failed to get location, continuing without it');
    }

    const sessionParams: CreateSessionParams = {
      userId,
      tokenId,
      ipAddress,
      userAgent,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      location: locationData.location,
      country: locationData.country,
      city: locationData.city,
      expiresAt
    };

    const session = await repo.createSession(sessionParams);
    logger.info({ userId, sessionId: session._id, device: parsed.device }, 'Session created');

    return session;
  } catch (error) {
    logger.error({ error, userId, tokenId }, 'Failed to create session');
    throw error;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string, currentTokenId?: string): Promise<UserSession[]> {
  try {
    const sessions = await repo.getSessionsByUserId(userId, currentTokenId);
    return sessions;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user sessions');
    throw error;
  }
}

/**
 * Terminate a specific session
 */
export async function terminateSession(sessionId: string, userId: string): Promise<boolean> {
  try {
    // Verify session belongs to user
    const sessions = await repo.getSessionsByUserId(userId);
    const session = sessions.find(s => s._id === sessionId);
    
    if (!session) {
      throw new Error('Session not found or does not belong to user');
    }

    const deleted = await repo.deleteSession(sessionId);
    if (deleted) {
      logger.info({ userId, sessionId }, 'Session terminated');
    }
    return deleted;
  } catch (error) {
    logger.error({ error, userId, sessionId }, 'Failed to terminate session');
    throw error;
  }
}

/**
 * Terminate all other sessions (except current)
 */
export async function terminateAllOtherSessions(userId: string, currentTokenId: string): Promise<number> {
  try {
    const deletedCount = await repo.deleteAllSessionsForUser(userId, currentTokenId);
    logger.info({ userId, currentTokenId, deletedCount }, 'All other sessions terminated');
    return deletedCount;
  } catch (error) {
    logger.error({ error, userId, currentTokenId }, 'Failed to terminate all sessions');
    throw error;
  }
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(tokenId: string): Promise<void> {
  try {
    await repo.updateSessionLastActiveByTokenId(tokenId);
  } catch (error) {
    // Silent fail - session activity update is best effort
    logger.debug({ error, tokenId }, 'Failed to update session activity');
  }
}

