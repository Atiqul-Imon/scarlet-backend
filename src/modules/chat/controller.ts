import type { Request, Response } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler.js';
import { ok, created, fail } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export const startConversation = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, customerInfo } = req.body;
  
  if (!customerId) {
    return fail(res, { message: 'Customer ID is required', code: 'MISSING_CUSTOMER_ID' }, 400);
  }
  
  const conversation = await presenter.startConversation(customerId, customerInfo);
  created(res, conversation);
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, senderId, senderType, content, messageType } = req.body;
  
  if (!conversationId || !senderId || !senderType || !content) {
    return fail(res, { message: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const message = await presenter.sendMessage(conversationId, senderId, senderType, content, messageType);
  created(res, message);
});

export const getConversationMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  
  const messages = await presenter.getConversationMessages(conversationId, Number(limit), Number(skip));
  ok(res, messages);
});

export const getActiveConversations = asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 Admin requesting active conversations');
  const conversations = await presenter.getActiveConversations();
  console.log('📤 Returning', conversations.length, 'conversations to admin');
  ok(res, conversations);
});

export const getUserConversations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  const userType = req.user?.role === 'admin' ? 'admin' : 'customer';
  
  if (!userId) {
    return fail(res, { message: 'User ID is required', code: 'MISSING_USER_ID' }, 400);
  }
  
  console.log('🔍 User requesting conversations:', { userId, userType });
  const conversations = await presenter.getUserConversations(userId, userType);
  console.log('📤 Returning', conversations.length, 'conversations to user');
  ok(res, conversations);
});

export const getConversationByCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;
  
  if (!customerId) {
    return fail(res, { message: 'Customer ID is required', code: 'MISSING_CUSTOMER_ID' }, 400);
  }
  
  const conversation = await presenter.getConversationByCustomer(customerId);
  ok(res, conversation);
});

export const assignConversationToAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { adminId } = req.body;
  
  if (!adminId) {
    return fail(res, { message: 'Admin ID is required', code: 'MISSING_ADMIN_ID' }, 400);
  }
  
  const conversation = await presenter.assignConversationToAdmin(conversationId, adminId);
  ok(res, conversation);
});

export const closeConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { adminId } = req.body;
  
  if (!adminId) {
    return fail(res, { message: 'Admin ID is required', code: 'MISSING_ADMIN_ID' }, 400);
  }
  
  const conversation = await presenter.closeConversation(conversationId, adminId);
  ok(res, conversation);
});

export const markMessagesAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return fail(res, { message: 'User ID is required', code: 'MISSING_USER_ID' }, 400);
  }
  
  await presenter.markMessagesAsRead(conversationId, userId);
  ok(res, { success: true });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { userId, userType } = req.params;
  
  if (!userId || !userType) {
    return fail(res, { message: 'User ID and user type are required', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const count = await presenter.getUnreadCount(userId, userType as 'customer' | 'admin');
  ok(res, { count });
});

export const updateUserOnlineStatus = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isOnline } = req.body;
  
  if (typeof isOnline !== 'boolean') {
    return fail(res, { message: 'isOnline must be a boolean', code: 'INVALID_ONLINE_STATUS' }, 400);
  }
  
  await presenter.updateUserOnlineStatus(userId, isOnline);
  ok(res, { success: true });
});

export const getOnlineUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await presenter.getOnlineUsers();
  ok(res, users);
});

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { userId, userType } = req.params;
  
  if (!userId || !userType) {
    return fail(res, { message: 'User ID and user type are required', code: 'MISSING_REQUIRED_FIELDS' }, 400);
  }
  
  const notifications = await presenter.getNotifications(userId, userType as 'customer' | 'admin');
  ok(res, notifications);
});

export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  
  await presenter.markNotificationAsRead(notificationId);
  ok(res, { success: true });
});
