import type { Request, Response } from 'express';
import { ok, fail } from '../../../core/http/response.js';
import { asyncHandler } from '../../../core/http/asyncHandler.js';
import * as presenter from './presenter.js';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';

/**
 * Get all active sessions for the current user
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    // Get current token ID from refresh token if available
    const authHeader = req.headers.authorization;
    let currentTokenId: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length);
      try {
        // Decode token to get its ID (we use the token itself as ID since JWTs don't have separate IDs)
        // For session tracking, we use the refresh token as the session identifier
        currentTokenId = token;
      } catch (e) {
        // Token parsing failed, continue without it
      }
    }

    // If we have a refresh token in cookies, use that
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      currentTokenId = refreshToken;
    }

    const sessions = await presenter.getUserSessions(userId, currentTokenId);
    ok(res, { 
      success: true,
      data: { sessions }
    });
  } catch (error: any) {
    return fail(res, { 
      message: error.message || 'Failed to fetch sessions',
      code: 'FETCH_SESSIONS_FAILED' 
    }, 500);
  }
});

/**
 * Terminate a specific session
 */
export const terminateSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const sessionId = req.params.id;

  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  if (!sessionId) {
    return fail(res, { 
      message: 'Session ID is required',
      code: 'SESSION_ID_REQUIRED' 
    }, 400);
  }

  try {
    const deleted = await presenter.terminateSession(sessionId, userId);
    if (deleted) {
      ok(res, { message: 'Session terminated successfully' });
    } else {
      return fail(res, { 
        message: 'Session not found or could not be terminated',
        code: 'SESSION_NOT_FOUND' 
      }, 404);
    }
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return fail(res, { 
        message: 'Session not found or does not belong to you',
        code: 'SESSION_NOT_FOUND' 
      }, 404);
    }
    return fail(res, { 
      message: error.message || 'Failed to terminate session',
      code: 'TERMINATE_SESSION_FAILED' 
    }, 500);
  }
});

/**
 * Terminate all other sessions (except current)
 */
export const terminateAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return fail(res, { 
      message: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    }, 401);
  }

  try {
    // Get current token ID
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];
    let currentTokenId: string | undefined;

    if (refreshToken) {
      currentTokenId = refreshToken;
    } else {
      // Try to get from access token (though we prefer refresh token for session tracking)
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice('Bearer '.length);
        try {
          // Decode to get user info, but we need refresh token for session ID
          const decoded = jwt.decode(token) as any;
          // We can't get session ID from access token, so we'll terminate all except we need to identify current
          // For now, just terminate all - user will need to re-login
        } catch (e) {
          // Continue
        }
      }
    }

    if (!currentTokenId) {
      return fail(res, { 
        message: 'Current session token not found. Cannot safely terminate other sessions.',
        code: 'CURRENT_TOKEN_NOT_FOUND' 
      }, 400);
    }

    const deletedCount = await presenter.terminateAllOtherSessions(userId, currentTokenId);
    ok(res, { 
      message: `Terminated ${deletedCount} session(s)`,
      deletedCount 
    });
  } catch (error: any) {
    return fail(res, { 
      message: error.message || 'Failed to terminate sessions',
      code: 'TERMINATE_SESSIONS_FAILED' 
    }, 500);
  }
});

