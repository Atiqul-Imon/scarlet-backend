import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { tokenBlacklist } from '../../modules/auth/presenter.js';
import { findUserById } from '../../modules/auth/repository.js';
import { logger } from '../logging/logger.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return next();
    }
    
    try {
      const payload = jwt.verify(token, env.jwtSecret) as any;
      
      // Get full user data from database
      const user = await findUserById(payload.sub);
      if (user) {
        req.user = user;
        req.userId = user._id?.toString();
      }
    } catch (error) {
      logger.warn({ error, token: token.substring(0, 10) + '...' }, 'Invalid JWT token');
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Authentication required' } 
    });
  }
  next();
}

export function requireRole(...roles: Array<'admin' | 'staff' | 'customer'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Authentication required' } 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Insufficient permissions' } 
      });
    }
    
    next();
  };
}


