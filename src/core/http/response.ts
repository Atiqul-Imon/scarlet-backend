import type { Response } from 'express';

export function ok<T>(res: Response, data: T) {
  return res.status(200).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function fail(res: Response, error: { message: string; code?: string }, status = 400) {
  return res.status(status).json({ success: false, error });
}


