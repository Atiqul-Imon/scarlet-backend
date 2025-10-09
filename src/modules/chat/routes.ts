import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Customer routes (require authentication - registered users only)
router.post('/conversations', requireAuth, controller.startConversation);
router.post('/messages', requireAuth, controller.sendMessage);
router.get('/conversations/:conversationId/messages', requireAuth, controller.getConversationMessages);
router.post('/conversations/:conversationId/read', requireAuth, controller.markMessagesAsRead);
router.get('/users/:userId/unread-count/:userType', requireAuth, controller.getUnreadCount);
router.put('/users/:userId/online-status', requireAuth, controller.updateUserOnlineStatus);
router.get('/users/:userId/notifications/:userType', requireAuth, controller.getNotifications);
router.put('/notifications/:notificationId/read', requireAuth, controller.markNotificationAsRead);
router.get('/conversations/customer/:customerId', requireAuth, controller.getConversationByCustomer);

// Admin routes (protected)
router.get('/admin/conversations', requireAdmin, controller.getActiveConversations);
router.put('/admin/conversations/:conversationId/assign', requireAdmin, controller.assignConversationToAdmin);
router.put('/admin/conversations/:conversationId/close', requireAdmin, controller.closeConversation);
router.get('/admin/users/online', requireAdmin, controller.getOnlineUsers);
