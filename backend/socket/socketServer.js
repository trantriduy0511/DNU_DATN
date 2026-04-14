import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Store online users
// userId -> Set<socketId> to support multi-tab/multi-device sessions
const onlineUsers = new Map();

const parseSocketCorsOrigins = () => {
  const fromList = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const fallback = process.env.FRONTEND_URL ? [String(process.env.FRONTEND_URL).trim()] : [];
  const defaults = ['http://localhost:5173'];
  return [...new Set([...fromList, ...fallback, ...defaults])];
};

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: parseSocketCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if MongoDB is connected
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState !== 1) {
        return next(new Error('Database not connected'));
      }
      
      // Get user from database
      const user = await User.findById(decoded.id).select('_id name avatar email role status');
      
      if (!user || user.status === 'banned') {
        return next(new Error('Authentication error: User not found or banned'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.userId})`);
    
    // Add socket to user's active socket set
    const currentSockets = onlineUsers.get(socket.userId) || new Set();
    const wasOffline = currentSockets.size === 0;
    currentSockets.add(socket.id);
    onlineUsers.set(socket.userId, currentSockets);

    // Only mark online + emit online when transitioning offline -> online
    if (wasOffline) {
      User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastActive: new Date()
      }).catch(err => console.error('Error updating user status:', err));

      io.emit('user:online', {
        userId: socket.userId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      });
    }

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle join conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leave conversation room
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle join group room
    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.userId} joined group ${groupId}`);
    });

    // Handle leave group room
    socket.on('group:leave', (groupId) => {
      if (groupId && groupId !== 'undefined' && groupId !== 'null') {
        socket.leave(`group:${groupId}`);
        console.log(`User ${socket.userId} left group ${groupId}`);
      }
    });

    // Handle typing start
    socket.on('typing:start', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    // Handle typing stop
    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: socket.userId
      });
    });

    // Handle new message (from client, will be handled by controller)
    socket.on('message:send', async (data) => {
      // This will be handled by the message controller
      // The controller will emit 'message:new' event
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.name} (${socket.userId})`);
      
      // Remove current socket from user's active socket set
      const currentSockets = onlineUsers.get(socket.userId);
      if (currentSockets) {
        currentSockets.delete(socket.id);
        if (currentSockets.size === 0) {
          onlineUsers.delete(socket.userId);

          // Update user offline status only when last session disconnects
          User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastActive: new Date()
          }).catch(err => console.error('Error updating user status:', err));

          // Emit offline status only when user has no active sessions
          io.emit('user:offline', {
            userId: socket.userId
          });
        } else {
          onlineUsers.set(socket.userId, currentSockets);
        }
      }
    });
  });

  return io;
};

// Helper function to get socket instance
let socketIO = null;

export const setSocketIO = (io) => {
  socketIO = io;
};

export const getSocketIO = () => {
  return socketIO;
};

// Helper function to emit events
export const emitToUser = (userId, event, data) => {
  if (socketIO) {
    socketIO.to(`user:${userId}`).emit(event, data);
  }
};

export const emitToConversation = (conversationId, event, data) => {
  if (socketIO) {
    socketIO.to(`conversation:${conversationId}`).emit(event, data);
  }
};

export const emitToGroup = (groupId, event, data) => {
  if (socketIO) {
    socketIO.to(`group:${groupId}`).emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  if (socketIO) {
    socketIO.emit(event, data);
  }
};

export const isUserOnline = (userId) => {
  return (onlineUsers.get(userId)?.size || 0) > 0;
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};








