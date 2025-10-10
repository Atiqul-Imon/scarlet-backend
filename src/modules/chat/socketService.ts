import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../../core/logging/logger.js';
import * as presenter from './presenter.js';

interface AuthenticatedSocket {
  userId: string;
  userType: 'customer' | 'admin';
  conversationId?: string;
}

export class ChatSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { userId: string; userType: 'customer' | 'admin' }) => {
        try {
          this.connectedUsers.set(socket.id, {
            userId: data.userId,
            userType: data.userType
          });

          // Update user online status
          await presenter.updateUserOnlineStatus(data.userId, true);

          // Join user to their room
          socket.join(`user_${data.userId}`);

          // If admin, join admin room
          if (data.userType === 'admin') {
            socket.join('admin_room');
          }

          socket.emit('authenticated', { success: true });
          logger.info(`User authenticated: ${data.userId} (${data.userType})`);
        } catch (error) {
          logger.error({ error, data }, 'Authentication failed');
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle joining conversation
      socket.on('join_conversation', async (data: { conversationId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            logger.warn({ socketId: socket.id, conversationId: data.conversationId }, 'User not authenticated when trying to join conversation');
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          // Join the conversation room
          socket.join(`conversation_${data.conversationId}`);
          user.conversationId = data.conversationId;

          // Mark messages as read for this user
          await presenter.markMessagesAsRead(data.conversationId, user.userId);

          // Confirm join to the user
          socket.emit('joined_conversation', { conversationId: data.conversationId });
          
          // Notify other participants in the conversation that this user joined
          socket.to(`conversation_${data.conversationId}`).emit('user_joined_conversation', {
            userId: user.userId,
            userType: user.userType,
            conversationId: data.conversationId
          });

          logger.info({ 
            userId: user.userId, 
            userType: user.userType, 
            conversationId: data.conversationId,
            socketId: socket.id 
          }, `User joined conversation`);
        } catch (error) {
          logger.error({ error, data, socketId: socket.id }, 'Failed to join conversation');
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data: { 
        conversationId: string; 
        content: string; 
        messageType?: 'text' | 'image' | 'file' 
      }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            logger.warn({ socketId: socket.id, conversationId: data.conversationId }, 'User not authenticated when trying to send message');
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          logger.info({ 
            userId: user.userId, 
            userType: user.userType, 
            conversationId: data.conversationId,
            contentLength: data.content.length,
            messageType: data.messageType || 'text'
          }, 'Sending message');

          const message = await presenter.sendMessage(
            data.conversationId,
            user.userId,
            user.userType,
            data.content,
            data.messageType || 'text'
          );

          // Broadcast message to ALL participants in the conversation room
          this.io.to(`conversation_${data.conversationId}`).emit('new_message', message);
          
          logger.info({ 
            messageId: message._id,
            conversationId: data.conversationId,
            senderId: user.userId,
            senderType: user.userType,
            room: `conversation_${data.conversationId}`
          }, 'Message broadcasted to conversation room');

          // Notify admin room if customer sent message (for notification purposes)
          if (user.userType === 'customer') {
            this.io.to('admin_room').emit('customer_message', {
              conversationId: data.conversationId,
              message,
              customerId: user.userId
            });
            logger.info({ conversationId: data.conversationId }, 'Notified admin room of customer message');
          }
        } catch (error) {
          logger.error({ error, data, socketId: socket.id }, 'Failed to send message');
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { conversationId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
          userId: user.userId,
          userType: user.userType,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
          userId: user.userId,
          userType: user.userType,
          isTyping: false
        });
      });

      // Handle conversation assignment
      socket.on('assign_conversation', async (data: { conversationId: string; adminId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user || user.userType !== 'admin') {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          const conversation = await presenter.assignConversationToAdmin(data.conversationId, data.adminId);
          
          // Notify customer
          this.io.to(`user_${conversation?.customerId}`).emit('admin_joined', {
            conversationId: data.conversationId,
            adminId: data.adminId
          });

          // Notify admin
          this.io.to(`user_${data.adminId}`).emit('conversation_assigned', conversation);

          logger.info(`Conversation ${data.conversationId} assigned to admin ${data.adminId}`);
        } catch (error) {
          logger.error({ error, data }, 'Failed to assign conversation');
          socket.emit('error', { message: 'Failed to assign conversation' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (user) {
            // Update user offline status
            await presenter.updateUserOnlineStatus(user.userId, false);
            
            // Notify conversation participants
            if (user.conversationId) {
              socket.to(`conversation_${user.conversationId}`).emit('user_offline', {
                userId: user.userId,
                userType: user.userType
              });
            }

            this.connectedUsers.delete(socket.id);
            logger.info(`User disconnected: ${user.userId}`);
          }
        } catch (error) {
          logger.error({ error, socketId: socket.id }, 'Error handling disconnect');
        }
      });
    });
  }

  // Method to broadcast to all admins
  public broadcastToAdmins(event: string, data: any) {
    this.io.to('admin_room').emit(event, data);
  }

  // Method to broadcast to specific user
  public broadcastToUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Method to broadcast to conversation
  public broadcastToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation_${conversationId}`).emit(event, data);
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get online admins count
  public getOnlineAdminsCount(): number {
    return Array.from(this.connectedUsers.values()).filter(user => user.userType === 'admin').length;
  }
}

export default ChatSocketService;
