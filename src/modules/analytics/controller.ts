import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, created } from '../../core/http/response.js';
import { AppError } from '../../core/errors/AppError.js';
import * as presenter from './presenter.js';
import type { CreateAnalyticsEventRequest, AnalyticsFilters } from './model.js';

export async function trackEvent(req: Request, res: Response) {
  const data: CreateAnalyticsEventRequest = req.body;
  
  // Validation
  if (!data.sessionId || !data.eventType || !data.eventData) {
    throw new AppError('Missing required fields: sessionId, eventType, eventData', { status: 400 });
  }
  
  // Add user ID if authenticated
  if (req.userId) {
    (data as any).userId = req.userId;
  }
  
  // Add IP address and user agent
  data.ipAddress = req.ip;
  data.userAgent = req.get('User-Agent');
  data.referrer = req.get('Referer');
  
  await presenter.trackEvent(data);
  created(res, { success: true });
}

export async function getAnalyticsEvents(req: Request, res: Response) {
  const filters: AnalyticsFilters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    eventType: req.query.eventType as string,
    userId: req.query.userId as string,
    productId: req.query.productId as string,
    categoryId: req.query.categoryId as string,
  };
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  
  const result = await presenter.getAnalyticsEvents(filters, page, limit);
  ok(res, result);
}

export async function getSalesAnalytics(req: Request, res: Response) {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  const result = await presenter.getSalesAnalytics(startDate, endDate);
  ok(res, result);
}

export async function getTrafficAnalytics(req: Request, res: Response) {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  const result = await presenter.getTrafficAnalytics(startDate, endDate);
  ok(res, result);
}

export async function getRealTimeAnalytics(req: Request, res: Response) {
  const result = await presenter.getRealTimeAnalytics();
  ok(res, result);
}

export async function getUserBehavior(req: Request, res: Response) {
  const { userId } = req.params;
  
  if (!userId) {
    throw new AppError('User ID is required', { status: 400 });
  }
  
  const result = await presenter.getUserBehavior(userId);
  ok(res, result);
}

export async function getDashboardAnalytics(req: Request, res: Response) {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  const result = await presenter.getDashboardAnalytics(startDate, endDate);
  ok(res, result);
}
