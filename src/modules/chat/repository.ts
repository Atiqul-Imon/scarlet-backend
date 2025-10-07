import { getDb } from '../../core/db/mongoClient.js';
import type { ChatMessage, ChatConversation, ChatUser, ChatTyping, ChatNotification } from './model.js';

export async function createConversation(conversationData: Partial<ChatConversation>): Promise<ChatConversation> {
  const db = await getDb();
  const conversation = {
    customerId: conversationData.customerId!,
    adminId: conversationData.adminId,
    subject: conversationData.subject,
    customerInfo: conversationData.customerInfo!,
    createdAt: new Date(),
    updatedAt: new Date(),
    unreadCount: 0,
    status: 'waiting' as const,
    priority: 'medium' as const,
    tags: [],
    lastMessage: conversationData.lastMessage
  };
  
  const result = await db.collection<ChatConversation>('chat_conversations').insertOne(conversation);
  return { ...conversation, _id: result.insertedId.toString() };
}

export async function getConversation(conversationId: string): Promise<ChatConversation | null> {
  const db = await getDb();
  return db.collection<ChatConversation>('chat_conversations').findOne({ _id: conversationId });
}

export async function getConversationByCustomer(customerId: string): Promise<ChatConversation | null> {
  const db = await getDb();
  return db.collection<ChatConversation>('chat_conversations')
    .findOne({ 
      customerId, 
      status: { $in: ['active', 'waiting'] } 
    });
}

export async function getActiveConversations(): Promise<ChatConversation[]> {
  const db = await getDb();
  return db.collection<ChatConversation>('chat_conversations')
    .find({ status: { $in: ['active', 'waiting'] } })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<ChatConversation | null> {
  const db = await getDb();
  
  const result = await db.collection<ChatConversation>('chat_conversations').findOneAndUpdate(
    { _id: conversationId },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date() 
      } 
    },
    { returnDocument: 'after' }
  );
  
  return result;
}

export async function createMessage(messageData: Partial<ChatMessage>): Promise<ChatMessage> {
  const db = await getDb();
  const message = {
    conversationId: messageData.conversationId!,
    senderId: messageData.senderId!,
    senderType: messageData.senderType!,
    content: messageData.content!,
    messageType: messageData.messageType || 'text',
    timestamp: new Date(),
    read: false,
    readAt: messageData.readAt,
    metadata: messageData.metadata
  };
  
  const result = await db.collection<ChatMessage>('chat_messages').insertOne(message);
  return { ...message, _id: result.insertedId.toString() };
}

export async function getMessages(conversationId: string, limit: number = 50, skip: number = 0): Promise<ChatMessage[]> {
  const db = await getDb();
  return db.collection<ChatMessage>('chat_messages')
    .find({ conversationId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .toArray();
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.collection<ChatMessage>('chat_messages').updateMany(
    { 
      conversationId, 
      senderId: { $ne: userId },
      read: false 
    },
    { 
      $set: { 
        read: true, 
        readAt: new Date() 
      } 
    }
  );
}

export async function getUnreadCount(userId: string, userType: 'customer' | 'admin'): Promise<number> {
  const db = await getDb();
  
  if (userType === 'admin') {
    return db.collection<ChatMessage>('chat_messages').countDocuments({
      senderType: 'customer',
      read: false
    });
  } else {
    return db.collection<ChatMessage>('chat_messages').countDocuments({
      senderId: userId,
      senderType: 'customer',
      read: false
    });
  }
}

export async function updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  const db = await getDb();
  await db.collection<ChatUser>('chat_users').updateOne(
    { _id: userId },
    { 
      $set: { 
        isOnline, 
        lastSeen: new Date() 
      } 
    },
    { upsert: true }
  );
}

export async function getOnlineUsers(): Promise<ChatUser[]> {
  const db = await getDb();
  return db.collection<ChatUser>('chat_users')
    .find({ isOnline: true })
    .toArray();
}

export async function createNotification(notificationData: Partial<ChatNotification>): Promise<ChatNotification> {
  const db = await getDb();
  const notification = {
    userId: notificationData.userId!,
    userType: notificationData.userType!,
    conversationId: notificationData.conversationId!,
    messageId: notificationData.messageId!,
    type: notificationData.type!,
    title: notificationData.title!,
    content: notificationData.content!,
    timestamp: new Date(),
    read: false
  };
  
  const result = await db.collection<ChatNotification>('chat_notifications').insertOne(notification);
  return { ...notification, _id: result.insertedId.toString() };
}

export async function getNotifications(userId: string, userType: 'customer' | 'admin'): Promise<ChatNotification[]> {
  const db = await getDb();
  return db.collection<ChatNotification>('chat_notifications')
    .find({ 
      userId, 
      userType,
      read: false 
    })
    .sort({ timestamp: -1 })
    .limit(20)
    .toArray();
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const db = await getDb();
  await db.collection<ChatNotification>('chat_notifications').updateOne(
    { _id: notificationId },
    { $set: { read: true } }
  );
}
