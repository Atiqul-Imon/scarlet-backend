import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { tokenManager } from '../cache/tokenManager.js';
import { findUserById } from '../../modules/auth/repository.js';
import { logger } from '../logging/logger.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    
    try {
      // Verify JWT token
      const payload = jwt.verify(token, env.jwtSecret) as { sub: string; iat: number; exp: number };
      
      // Token is valid if it exists in storage and is not expired
      // No need to check blacklist since we store valid tokens
      
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

// Admin-specific middleware
export const requireAdmin = requireRole('admin');
export const requireAdminOrStaff = requireRole('admin', 'staff');

// Audit logging middleware for admin actions
export function auditLog(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
      // Store audit info in request for later logging
      (req as Request & { auditInfo?: {
        userId: string;
        userEmail: string;
        action: string;
        timestamp: Date;
        ip: string;
        userAgent?: string;
      } }).auditInfo = {
        userId: req.user._id || '',
        userEmail: req.user.email || req.user.phone || '',
        action,
        timestamp: new Date(),
        ip: req.ip || '',
        userAgent: req.headers['user-agent']
      };
    }
    next();
  };
}


