import { io } from 'socket.io-client';
import { useAuthStore } from '../../../store/authStore';
import { getAuthTokenFromStorage } from '../storage/storageService';
import { getBackendOrigin } from '../../config/runtimeConfig';

let socket = null;
let socketAuthToken = null;

const getAuthToken = () => useAuthStore.getState().token || getAuthTokenFromStorage();

export const initializeSocket = () => {
  const token = getAuthToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket && socketAuthToken === token) return socket;

  if (socket) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = null;
    socketAuthToken = null;
  }

  socketAuthToken = token;
  socket = io(getBackendOrigin(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = null;
  }
  socketAuthToken = null;
};

export const getSocket = () => {
  if (!socket || !socket.connected) return initializeSocket();
  return socket;
};

export const reconnectSocket = () => {
  disconnectSocket();
  return initializeSocket();
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  reconnectSocket
};
