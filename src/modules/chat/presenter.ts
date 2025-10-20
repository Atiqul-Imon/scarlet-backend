import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logging/logger.js';
import * as repo from './repository.js';
import type { ChatMessage, ChatConversation, ChatUser, ChatNotification } from './model.js';

export async function startConversation(customerId: string, customerInfo: any): Promise<ChatConversation> {
  try {
    // Check if customer already has an active conversation
    const existingConversation = await repo.getConversationByCustomer(customerId);
    
    if (existingConversation) {
      return existingConversation;
    }
    
    // Create new conversation
    const conversation = await repo.createConversation({
      customerId,
      customerInfo: {
        name: customerInfo.name || 'Anonymous',
        email: customerInfo.email,
        phone: customerInfo.phone,
        currentPage: customerInfo.currentPage,
        userAgent: customerInfo.userAgent
      },
      status: 'waiting',
      priority: 'medium',
      tags: [],
      unreadCount: 0
    });
    
    return conversation;
  } catch (error) {
    logger.error({ error, customerId, customerInfo }, 'Failed to start conversation');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to start conversation', { code: 'CONVERSATION_START_ERROR' });
  }
}

export async function sendMessage(conversationId: string, senderId: string, senderType: 'customer' | 'admin', content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<ChatMessage> {
  try {
    // Create message
    const message = await repo.createMessage({
      conversationId,
      senderId,
      senderType,
      content,
      messageType,
      timestamp: new Date(),
      read: false
    });
    
    // Update conversation
    await repo.updateConversation(conversationId, {
      lastMessage: message,
      updatedAt: new Date()
    });
    
    // Create notification for the other party
    const conversation = await repo.getConversation(conversationId);
    if (conversation) {
      const targetUserId = senderType === 'customer' ? conversation.adminId : conversation.customerId;
      if (targetUserId) {
        await repo.createNotification({
          userId: targetUserId,
          userType: senderType === 'customer' ? 'admin' : 'customer',
          conversationId,
          messageId: message._id!,
          type: 'new_message',
          title: 'New Message',
          content: content.length > 100 ? content.substring(0, 100) + '...' : content,
          read: false,
          timestamp: new Date()
        });
      }
    }
    
    return message;
  } catch (error) {
    logger.error({ error, conversationId, senderId, content }, 'Failed to send message');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to send message', { code: 'MESSAGE_SEND_ERROR' });
  }
}

export async function getConversationMessages(conversationId: string, limit: number = 50, skip: number = 0): Promise<ChatMessage[]> {
  try {
    const messages = await repo.getMessages(conversationId, limit, skip);
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to get conversation messages');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get conversation messages', { code: 'MESSAGES_GET_ERROR' });
  }
}

export async function getActiveConversations(): Promise<ChatConversation[]> {
  try {
    return await repo.getActiveConversations();
  } catch (error) {
    logger.error({ error }, 'Failed to get active conversations');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get active conversations', { code: 'CONVERSATIONS_GET_ERROR' });
  }
}

export async function getUserConversations(userId: string, userType: 'customer' | 'admin'): Promise<ChatConversation[]> {
  try {
    if (userType === 'admin') {
      // Admins can see all conversations
      return await repo.getActiveConversations();
    } else {
      // Customers can only see their own conversations
      const conversation = await repo.getConversationByCustomer(userId);
      return conversation ? [conversation] : [];
    }
  } catch (error) {
    logger.error({ error, userId, userType }, 'Failed to get user conversations');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get user conversations', { code: 'USER_CONVERSATIONS_GET_ERROR' });
  }
}

export async function getConversationByCustomer(customerId: string): Promise<ChatConversation | null> {
  try {
    return await repo.getConversationByCustomer(customerId);
  } catch (error) {
    logger.error({ error, customerId }, 'Failed to get conversation by customer');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get conversation by customer', { code: 'CONVERSATION_GET_ERROR' });
  }
}

export async function assignConversationToAdmin(conversationId: string, adminId: string): Promise<ChatConversation | null> {
  try {
    const conversation = await repo.updateConversation(conversationId, {
      adminId,
      status: 'active'
    });
    
    if (conversation) {
      // Create notification for customer
      await repo.createNotification({
        userId: conversation.customerId,
        userType: 'customer',
        conversationId,
        messageId: '',
        type: 'conversation_started',
        title: 'Admin Joined',
        content: 'An admin has joined your conversation',
        read: false,
        timestamp: new Date()
      });
    }
    
    return conversation;
  } catch (error) {
    logger.error({ error, conversationId, adminId }, 'Failed to assign conversation to admin');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to assign conversation to admin', { code: 'CONVERSATION_ASSIGN_ERROR' });
  }
}

export async function closeConversation(conversationId: string, adminId: string): Promise<ChatConversation | null> {
  try {
    const conversation = await repo.updateConversation(conversationId, {
      status: 'closed'
    });
    
    if (conversation) {
      // Create notification for customer
      await repo.createNotification({
        userId: conversation.customerId,
        userType: 'customer',
        conversationId,
        messageId: '',
        type: 'conversation_closed',
        title: 'Conversation Closed',
        content: 'Your conversation has been closed',
        read: false,
        timestamp: new Date()
      });
    }
    
    return conversation;
  } catch (error) {
    logger.error({ error, conversationId, adminId }, 'Failed to close conversation');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to close conversation', { code: 'CONVERSATION_CLOSE_ERROR' });
  }
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  try {
    await repo.markMessagesAsRead(conversationId, userId);
  } catch (error) {
    logger.error({ error, conversationId, userId }, 'Failed to mark messages as read');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to mark messages as read', { code: 'MESSAGES_READ_ERROR' });
  }
}

export async function getUnreadCount(userId: string, userType: 'customer' | 'admin'): Promise<number> {
  try {
    return await repo.getUnreadCount(userId, userType);
  } catch (error) {
    logger.error({ error, userId, userType }, 'Failed to get unread count');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get unread count', { code: 'UNREAD_COUNT_ERROR' });
  }
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  try {
    await repo.updateUserOnlineStatus(userId, isOnline);
  } catch (error) {
    logger.error({ error, userId, isOnline }, 'Failed to update user online status');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update user online status', { code: 'USER_STATUS_ERROR' });
  }
}

export async function getOnlineUsers(): Promise<ChatUser[]> {
  try {
    return await repo.getOnlineUsers();
  } catch (error) {
    logger.error({ error }, 'Failed to get online users');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get online users', { code: 'ONLINE_USERS_ERROR' });
  }
}

export async function getNotifications(userId: string, userType: 'customer' | 'admin'): Promise<ChatNotification[]> {
  try {
    return await repo.getNotifications(userId, userType);
  } catch (error) {
    logger.error({ error, userId, userType }, 'Failed to get notifications');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get notifications', { code: 'NOTIFICATIONS_ERROR' });
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await repo.markNotificationAsRead(notificationId);
  } catch (error) {
    logger.error({ error, notificationId }, 'Failed to mark notification as read');
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to mark notification as read', { code: 'NOTIFICATION_READ_ERROR' });
  }
}
