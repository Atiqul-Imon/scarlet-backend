import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length);
    try {
      const payload = jwt.verify(token, env.jwtSecret) as any;
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {}
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  next();
}

export function requireRole(...roles: Array<'admin' | 'staff' | 'customer'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    next();
  };
}


