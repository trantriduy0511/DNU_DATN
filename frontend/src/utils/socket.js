import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket = null;
/** JWT used for the current socket; must reconnect when token changes (login / switch account). */
let socketAuthToken = null;

const getAuthToken = () => {
  const state = useAuthStore.getState();
  return (
    state.token ||
    localStorage.getItem('token') ||
    document.cookie.split('; ').find((row) => row.startsWith('token='))?.split('=')[1] ||
    null
  );
};

export const initializeSocket = () => {
  const token = getAuthToken();

  if (!token) {
    console.warn('No token found, socket connection will fail');
    disconnectSocket();
    return null;
  }

  // Same JWT: always reuse the same client, including while the handshake is still in progress.
  // Reusing only when `connected` caused disconnect() during connect → "WebSocket closed before established" loops (Strict Mode, multiple components).
  if (socket && socketAuthToken === token) {
    return socket;
  }

  // Different user / token: tear down old connection only then.
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
    socketAuthToken = null;
  }

  socketAuthToken = token;

  socket = io('http://localhost:5000', {
    auth: {
      token
    },
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
      /* ignore */
    }
    socket = null;
  }
  socketAuthToken = null;
};

export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

// Reconnect socket when user logs in
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

