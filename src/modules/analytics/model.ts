// BaseEntity interface for MongoDB documents
interface BaseEntity {
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsEvent extends BaseEntity {
  userId?: string;
  sessionId: string;
  eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'remove_from_cart' | 'checkout_start' | 'checkout_complete' | 'purchase' | 'search' | 'filter' | 'wishlist_add' | 'wishlist_remove';
  eventData: {
    page?: string;
    productId?: string;
    categoryId?: string;
    searchQuery?: string;
    filters?: Record<string, any>;
    value?: number;
    currency?: string;
    orderId?: string;
    [key: string]: any;
  };
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  timestamp: string;
}

export interface UserBehavior {
  userId: string;
  sessionId: string;
  pageViews: number;
  timeOnSite: number;
  bounceRate: number;
  conversionRate: number;
  lastActivity: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: number;
    quantity: number;
    orders: number;
  }>;
  topCategories: Array<{
    categoryId: string;
    name: string;
    revenue: number;
    quantity: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

export interface TrafficAnalytics {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{
    page: string;
    views: number;
    uniqueViews: number;
    averageTime: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    conversions: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    percentage: number;
    visitors: number;
  }>;
  geographicData: Array<{
    country: string;
    visitors: number;
    revenue: number;
  }>;
}

export interface RealTimeAnalytics {
  activeUsers: number;
  currentPageViews: number;
  recentEvents: AnalyticsEvent[];
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topProducts: Array<{
    productId: string;
    views: number;
  }>;
  conversionFunnel: {
    visitors: number;
    addToCart: number;
    checkoutStart: number;
    checkoutComplete: number;
  };
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  userId?: string;
  productId?: string;
  categoryId?: string;
}

export interface CreateAnalyticsEventRequest {
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
}
