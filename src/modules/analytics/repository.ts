import { ObjectId } from 'mongodb';
import { getDb } from '../../core/db/mongoClient.js';
import type { AnalyticsEvent, UserBehavior, SalesAnalytics, TrafficAnalytics, RealTimeAnalytics, AnalyticsFilters } from './model.js';

export async function createAnalyticsEvent(event: Omit<AnalyticsEvent, '_id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsEvent> {
  const db = await getDb();
  const result = await db.collection<AnalyticsEvent>('analytics_events').insertOne({
    ...event,
  });
  
  return { ...event, _id: result.insertedId.toString() };
}

export async function getAnalyticsEvents(filters: AnalyticsFilters = {}, page: number = 1, limit: number = 100): Promise<{ events: AnalyticsEvent[]; total: number }> {
  const db = await getDb();
  const skip = (page - 1) * limit;
  
  // Build filter query
  const query: any = {};
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }
  
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.userId) query.userId = filters.userId;
  if (filters.productId) query['eventData.productId'] = filters.productId;
  if (filters.categoryId) query['eventData.categoryId'] = filters.categoryId;
  
  const [events, total] = await Promise.all([
    db.collection<AnalyticsEvent>('analytics_events')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments(query)
  ]);
  
  return { events, total };
}

export async function getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalytics> {
  const db = await getDb();
  
  // Build date filter
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = startDate;
    if (endDate) dateFilter.createdAt.$lte = endDate;
  }
  
  // Get orders data
  const orders = await db.collection('orders').find(dateFilter).toArray();
  
  // Calculate basic metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Get conversion rate from analytics events
  const [visitors, purchases] = await Promise.all([
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'page_view',
      ...dateFilter
    }),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'purchase',
      ...dateFilter
    })
  ]);
  
  const conversionRate = visitors > 0 ? (purchases / visitors) * 100 : 0;
  
  // Get top products
  const productSales = new Map();
  orders.forEach(order => {
    order.items?.forEach((item: any) => {
      const key = item.productId;
      if (!productSales.has(key)) {
        productSales.set(key, {
          productId: key,
          name: item.title || item.name || 'Unknown Product',
          revenue: 0,
          quantity: 0,
          orders: 0
        });
      }
      const product = productSales.get(key);
      product.revenue += (item.price || 0) * (item.quantity || 0);
      product.quantity += item.quantity || 0;
      product.orders += 1;
    });
  });
  
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Get top categories (simplified - would need category mapping)
  const categorySales = new Map();
  orders.forEach(order => {
    order.items?.forEach((item: any) => {
      const categoryId = item.categoryId || 'uncategorized';
      if (!categorySales.has(categoryId)) {
        categorySales.set(categoryId, {
          categoryId,
          name: item.categoryName || 'Uncategorized',
          revenue: 0,
          quantity: 0
        });
      }
      const category = categorySales.get(categoryId);
      category.revenue += (item.price || 0) * (item.quantity || 0);
      category.quantity += item.quantity || 0;
    });
  });
  
  const topCategories = Array.from(categorySales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  // Get revenue by day
  const revenueByDay = await db.collection('orders').aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();
  
  // Get revenue by month
  const revenueByMonth = await db.collection('orders').aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: { $dateFromString: { dateString: '$createdAt' } } }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray();
  
  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    conversionRate,
    topProducts,
    topCategories,
    revenueByDay: revenueByDay.map(item => ({
      date: item._id,
      revenue: item.revenue,
      orders: item.orders
    })),
    revenueByMonth: revenueByMonth.map(item => ({
      month: item._id,
      revenue: item.revenue,
      orders: item.orders
    }))
  };
}

export async function getTrafficAnalytics(startDate?: string, endDate?: string): Promise<TrafficAnalytics> {
  const db = await getDb();
  
  // Build date filter
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.timestamp = {};
    if (startDate) dateFilter.timestamp.$gte = startDate;
    if (endDate) dateFilter.timestamp.$lte = endDate;
  }
  
  // Get basic metrics
  const [totalVisitors, uniqueVisitors, pageViews] = await Promise.all([
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'page_view',
      ...dateFilter
    }),
    db.collection<AnalyticsEvent>('analytics_events').distinct('userId', {
      eventType: 'page_view',
      ...dateFilter
    }),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'page_view',
      ...dateFilter
    })
  ]);
  
  // Calculate average session duration
  const sessions = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { $match: { eventType: 'page_view', ...dateFilter } },
    {
      $group: {
        _id: '$sessionId',
        firstView: { $min: '$timestamp' },
        lastView: { $max: '$timestamp' },
        pageViews: { $sum: 1 }
      }
    },
    {
      $project: {
        duration: {
          $subtract: [
            { $dateFromString: { dateString: '$lastView' } },
            { $dateFromString: { dateString: '$firstView' } }
          ]
        },
        pageViews: 1
      }
    }
  ]).toArray();
  
  const averageSessionDuration = sessions.length > 0 
    ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length / 1000 / 60 // Convert to minutes
    : 0;
  
  // Calculate bounce rate (sessions with only 1 page view)
  const bouncedSessions = sessions.filter(session => session.pageViews === 1).length;
  const bounceRate = sessions.length > 0 ? (bouncedSessions / sessions.length) * 100 : 0;
  
  // Get top pages
  const topPages = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { $match: { eventType: 'page_view', ...dateFilter } },
    {
      $group: {
        _id: '$eventData.page',
        views: { $sum: 1 },
        uniqueViews: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        page: '$_id',
        views: 1,
        uniqueViews: { $size: '$uniqueViews' },
        averageTime: 0 // Would need more complex calculation
      }
    },
    { $sort: { views: -1 } },
    { $limit: 10 }
  ]).toArray();
  
  // Get traffic sources (simplified)
  const trafficSources = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { $match: { eventType: 'page_view', ...dateFilter } },
    {
      $group: {
        _id: '$referrer',
        visitors: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        source: { $ifNull: ['$_id', 'Direct'] },
        visitors: { $size: '$visitors' },
        conversions: 0 // Would need conversion tracking
      }
    },
    { $sort: { visitors: -1 } }
  ]).toArray();
  
  // Get device breakdown
  const deviceBreakdown = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { $match: { eventType: 'page_view', ...dateFilter } },
    {
      $group: {
        _id: '$eventData.deviceType',
        visitors: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        device: '$_id',
        visitors: { $size: '$visitors' },
        percentage: 0 // Will calculate below
      }
    }
  ]).toArray();
  
  // Calculate percentages for device breakdown
  const totalDeviceVisitors = deviceBreakdown.reduce((sum, device) => sum + device.visitors, 0);
  deviceBreakdown.forEach(device => {
    device.percentage = totalDeviceVisitors > 0 ? (device.visitors / totalDeviceVisitors) * 100 : 0;
  });
  
  return {
    totalVisitors,
    uniqueVisitors: uniqueVisitors.length,
    pageViews,
    averageSessionDuration,
    bounceRate,
    topPages: topPages.map(page => ({
      page: page.page || 'Unknown',
      views: page.views,
      uniqueViews: page.uniqueViews,
      averageTime: page.averageTime
    })),
    trafficSources: trafficSources.map(source => ({
      source: source.source,
      visitors: source.visitors,
      conversions: source.conversions
    })),
    deviceBreakdown: deviceBreakdown.map(device => ({
      device: device.device || 'Unknown',
      percentage: device.percentage,
      visitors: device.visitors
    })),
    geographicData: [] // TODO: Implement geographic data
  };
}

export async function getRealTimeAnalytics(): Promise<RealTimeAnalytics> {
  const db = await getDb();
  
  // Get last 5 minutes of data
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const recentEvents = await db.collection<AnalyticsEvent>('analytics_events')
    .find({ timestamp: { $gte: fiveMinutesAgo.toISOString() } })
    .sort({ timestamp: -1 })
    .limit(100)
    .toArray();
  
  // Get active users (unique users in last 5 minutes)
  const activeUsers = await db.collection<AnalyticsEvent>('analytics_events')
    .distinct('userId', { 
      timestamp: { $gte: fiveMinutesAgo.toISOString() },
      userId: { $exists: true }
    });
  
  // Get current page views
  const currentPageViews = await db.collection<AnalyticsEvent>('analytics_events')
    .countDocuments({ 
      eventType: 'page_view',
      timestamp: { $gte: fiveMinutesAgo.toISOString() }
    });
  
  // Get top pages in last 5 minutes
  const topPages = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { 
      $match: { 
        eventType: 'page_view',
        timestamp: { $gte: fiveMinutesAgo.toISOString() }
      }
    },
    {
      $group: {
        _id: '$eventData.page',
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 5 }
  ]).toArray();
  
  // Get top products in last 5 minutes
  const topProducts = await db.collection<AnalyticsEvent>('analytics_events').aggregate([
    { 
      $match: { 
        eventType: 'product_view',
        timestamp: { $gte: fiveMinutesAgo.toISOString() }
      }
    },
    {
      $group: {
        _id: '$eventData.productId',
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 5 }
  ]).toArray();
  
  // Get conversion funnel data
  const [visitors, addToCart, checkoutStart, checkoutComplete] = await Promise.all([
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'page_view',
      timestamp: { $gte: fiveMinutesAgo.toISOString() }
    }),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'add_to_cart',
      timestamp: { $gte: fiveMinutesAgo.toISOString() }
    }),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'checkout_start',
      timestamp: { $gte: fiveMinutesAgo.toISOString() }
    }),
    db.collection<AnalyticsEvent>('analytics_events').countDocuments({
      eventType: 'checkout_complete',
      timestamp: { $gte: fiveMinutesAgo.toISOString() }
    })
  ]);
  
  return {
    activeUsers: activeUsers.length,
    currentPageViews,
    recentEvents,
    topPages: topPages.map(page => ({
      page: page._id || 'Unknown',
      views: page.views
    })),
    topProducts: topProducts.map(product => ({
      productId: product._id || 'Unknown',
      views: product.views
    })),
    conversionFunnel: {
      visitors,
      addToCart,
      checkoutStart,
      checkoutComplete
    }
  };
}

export async function getUserBehavior(userId: string): Promise<UserBehavior | null> {
  const db = await getDb();
  
  // Get user's events
  const events = await db.collection<AnalyticsEvent>('analytics_events')
    .find({ userId })
    .sort({ timestamp: -1 })
    .toArray();
  
  if (events.length === 0) return null;
  
  // Calculate metrics
  const pageViews = events.filter(e => e.eventType === 'page_view').length;
  const sessions = new Set(events.map(e => e.sessionId));
  
  // Calculate time on site (simplified)
  const firstEvent = events[events.length - 1];
  const lastEvent = events[0];
  const timeOnSite = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();
  
  // Calculate bounce rate
  const sessionPageViews = new Map();
  events.forEach(event => {
    if (event.eventType === 'page_view') {
      const count = sessionPageViews.get(event.sessionId) || 0;
      sessionPageViews.set(event.sessionId, count + 1);
    }
  });
  
  const bouncedSessions = Array.from(sessionPageViews.values()).filter(count => count === 1).length;
  const bounceRate = sessions.size > 0 ? (bouncedSessions / sessions.size) * 100 : 0;
  
  // Calculate conversion rate
  const conversions = events.filter(e => e.eventType === 'purchase').length;
  const conversionRate = pageViews > 0 ? (conversions / pageViews) * 100 : 0;
  
  // Get device info from last event
  const lastEventData = lastEvent.eventData;
  const deviceType = lastEventData.deviceType || 'desktop';
  const browser = lastEventData.browser || 'Unknown';
  const os = lastEventData.os || 'Unknown';
  
  return {
    userId,
    sessionId: lastEvent.sessionId,
    pageViews,
    timeOnSite: timeOnSite / 1000 / 60, // Convert to minutes
    bounceRate,
    conversionRate,
    lastActivity: lastEvent.timestamp,
    deviceType,
    browser,
    os
  };
}
