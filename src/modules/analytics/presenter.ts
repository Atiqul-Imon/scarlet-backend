import { AppError } from '../../core/errors/AppError.js';
import * as repo from './repository.js';
import type { CreateAnalyticsEventRequest, AnalyticsFilters } from './model.js';

export async function trackEvent(data: CreateAnalyticsEventRequest): Promise<void> {
  // Validate event type
  const validEventTypes = [
    'page_view', 'product_view', 'add_to_cart', 'remove_from_cart',
    'checkout_start', 'checkout_complete', 'purchase', 'search',
    'filter', 'wishlist_add', 'wishlist_remove'
  ];
  
  if (!validEventTypes.includes(data.eventType)) {
    throw new AppError('Invalid event type', { status: 400 });
  }
  
  const event = {
    userId: (data as any).userId,
    sessionId: data.sessionId,
    eventType: data.eventType as any,
    eventData: data.eventData,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    referrer: data.referrer,
    timestamp: new Date().toISOString(),
  };
  
  await repo.createAnalyticsEvent(event);
}

export async function getAnalyticsEvents(filters: AnalyticsFilters = {}, page: number = 1, limit: number = 100) {
  return repo.getAnalyticsEvents(filters, page, limit);
}

export async function getSalesAnalytics(startDate?: string, endDate?: string) {
  return repo.getSalesAnalytics(startDate, endDate);
}

export async function getTrafficAnalytics(startDate?: string, endDate?: string) {
  return repo.getTrafficAnalytics(startDate, endDate);
}

export async function getRealTimeAnalytics() {
  return repo.getRealTimeAnalytics();
}

export async function getUserBehavior(userId: string) {
  return repo.getUserBehavior(userId);
}

export async function getDashboardAnalytics(startDate?: string, endDate?: string) {
  const [sales, traffic] = await Promise.all([
    repo.getSalesAnalytics(startDate, endDate),
    repo.getTrafficAnalytics(startDate, endDate)
  ]);
  
  return {
    sales,
    traffic,
    summary: {
      totalRevenue: sales.totalRevenue,
      totalOrders: sales.totalOrders,
      totalVisitors: traffic.totalVisitors,
      conversionRate: sales.conversionRate,
      averageOrderValue: sales.averageOrderValue,
      bounceRate: traffic.bounceRate
    }
  };
}
