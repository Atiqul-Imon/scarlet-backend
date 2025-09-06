import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Track analytics event (public endpoint for frontend)
router.post('/track', controller.trackEvent);

// Get analytics events (admin only)
router.get('/events', requireAuth, controller.getAnalyticsEvents);

// Get sales analytics
router.get('/sales', requireAuth, controller.getSalesAnalytics);

// Get traffic analytics
router.get('/traffic', requireAuth, controller.getTrafficAnalytics);

// Get real-time analytics
router.get('/realtime', requireAuth, controller.getRealTimeAnalytics);

// Get user behavior
router.get('/user/:userId', requireAuth, controller.getUserBehavior);

// Get dashboard analytics (combined)
router.get('/dashboard', requireAuth, controller.getDashboardAnalytics);
