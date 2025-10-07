import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../core/middleware/auth.js';
import * as controller from './controller.js';

export const router = Router();

// Public routes (for customers)
router.post('/conversations', controller.startConversation);
router.post('/messages', controller.sendMessage);
router.get('/conversations/:conversationId/messages', controller.getConversationMessages);
router.post('/conversations/:conversationId/read', controller.markMessagesAsRead);
router.get('/users/:userId/unread-count/:userType', controller.getUnreadCount);
router.put('/users/:userId/online-status', controller.updateUserOnlineStatus);
router.get('/users/:userId/notifications/:userType', controller.getNotifications);
router.put('/notifications/:notificationId/read', controller.markNotificationAsRead);

// Admin routes
router.get('/admin/conversations', requireAdmin, controller.getActiveConversations);
router.put('/admin/conversations/:conversationId/assign', requireAdmin, controller.assignConversationToAdmin);
router.put('/admin/conversations/:conversationId/close', requireAdmin, controller.closeConversation);
router.get('/admin/users/online', requireAdmin, controller.getOnlineUsers);
