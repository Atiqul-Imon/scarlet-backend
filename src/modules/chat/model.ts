export interface ChatUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin';
  isOnline: boolean;
  lastSeen: Date;
}

export interface ChatMessage {
  _id?: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  read: boolean;
  readAt?: Date;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    imageUrl?: string;
  };
}

export interface ChatConversation {
  _id?: string;
  customerId: string;
  adminId?: string;
  status: 'active' | 'closed' | 'waiting';
  subject?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage;
  unreadCount: number;
  customerInfo: {
    name: string;
    email?: string;
    phone?: string;
    currentPage?: string;
    userAgent?: string;
  };
}

export interface ChatTyping {
  conversationId: string;
  userId: string;
  userType: 'customer' | 'admin';
  isTyping: boolean;
  timestamp: Date;
}

export interface ChatNotification {
  _id?: string;
  userId: string;
  userType: 'customer' | 'admin';
  conversationId: string;
  messageId: string;
  type: 'new_message' | 'typing' | 'conversation_started' | 'conversation_closed';
  title: string;
  content: string;
  read: boolean;
  timestamp: Date;
}
