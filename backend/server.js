import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { createServer } from 'http';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import postRoutes from './routes/post.routes.js';
import commentRoutes from './routes/comment.routes.js';
import groupRoutes from './routes/group.routes.js';
import eventRoutes from './routes/event.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import messageRoutes from './routes/message.routes.js';
import friendRoutes from './routes/friend.routes.js';
import fileRoutes from './routes/file.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { initializeSocket, setSocketIO } from './socket/socketServer.js';
import { verifyEmailConfig } from './utils/emailService.js';
import { startDocumentAnalysisWorker } from './queues/documentAnalysis.queue.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly with full path
const envPath = path.join(__dirname, '.env');

// Check if .env file exists
if (!existsSync(envPath)) {
  console.error('\n❌ ERROR: File .env không tồn tại!');
  console.error(`   Expected location: ${envPath}`);
  console.error('\n📝 Vui lòng tạo file backend/.env và cấu hình các biến bắt buộc (EMAIL_USER, EMAIL_PASSWORD, JWT_SECRET, ...).');
  console.error('');
} else {
  console.log(`\n✅ File .env found at: ${envPath}`);
}

// Load .env
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('\n❌ ERROR loading .env file:', result.error.message);
  console.error('   Please check the file format and encoding (must be UTF-8)');
} else if (result.parsed) {
  console.log(`✅ Loaded ${Object.keys(result.parsed).length} environment variables from .env`);
}

// Log environment variables for debugging
console.log('\n🔍 Checking .env file configuration:');
console.log(`   File location: ${envPath}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ SET (****)' : '❌ NOT SET'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ SET (****)' : '❌ NOT SET'}`);

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.log('\n⚠️  WARNING: Email configuration is missing!');
  console.log('   Please set EMAIL_USER and EMAIL_PASSWORD in backend/.env');
  console.log('');
}

const geminiKey = process.env.GEMINI_API_KEY?.trim();
if (!geminiKey || geminiKey.length < 20) {
  console.log('\n⚠️  WARNING: Gemini API key is missing or invalid!');
  console.log('   AI features (Chat & Analytics) will not work.');
  if (process.env.GEMINI_API_KEY) {
    console.log(`   Current value: ${process.env.GEMINI_API_KEY.substring(0, 10)}... (${process.env.GEMINI_API_KEY.length} chars)`);
    console.log('   ⚠️  API key có vẻ không hợp lệ (quá ngắn hoặc là placeholder)');
  }
  console.log('   To fix: Run "npm run set-gemini-key" or add valid GEMINI_API_KEY to backend/.env');
  console.log('   Get API key from: https://aistudio.google.com/api-keys');
  console.log('');
} else {
  console.log(`   GEMINI_API_KEY: ✅ SET (${geminiKey.length} chars)`);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const resolveTrustProxy = () => {
  const raw = String(process.env.TRUST_PROXY ?? '').trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  if (normalized === 'true' || normalized === '1') return 1;
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') return false;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  // Allow Express trust proxy presets/IPs: loopback, linklocal, uniquelocal, etc.
  return raw;
};

const parseOriginsFromEnv = () => {
  const fromList = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const fallback = process.env.FRONTEND_URL ? [String(process.env.FRONTEND_URL).trim()] : [];
  const defaults = ['http://localhost:5173'];
  return [...new Set([...fromList, ...fallback, ...defaults])];
};

const allowedOrigins = parseOriginsFromEnv();
app.set('trust proxy', resolveTrustProxy());
const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients and same-origin requests without Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

const createLimiter = ({ windowMs, max, message, skipSuccessfulRequests = false, skip }) =>
  rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message
    }
  });

const apiLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '', 10) || 300,
  message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
  // Auth và AI đã có logic riêng; skip tại limiter tổng để tránh double-throttling.
  skip: (req) =>
    req.originalUrl?.startsWith('/api/auth/') ||
    req.originalUrl?.startsWith('/api/ai/')
});

const authLimiter = createLimiter({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '', 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '', 10) || 25,
  message: 'Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.',
  skipSuccessfulRequests: true
});

const aiLimiter = createLimiter({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '', 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX || '', 10) || 200,
  message: 'Bạn đã vượt quá giới hạn yêu cầu AI. Vui lòng thử lại sau.',
  // Bỏ giới hạn cho chat AI theo yêu cầu.
  skip: (req) =>
    req.originalUrl?.startsWith('/api/ai/chat') ||
    req.originalUrl?.startsWith('/api/ai/chat/history')
});

// Connect to MongoDB (non-blocking - server will start even if MongoDB fails)
connectDB().then(connected => {
  if (!connected) {
    console.log(`⚠️  Server will start but database operations will fail until MongoDB is connected`);
  }
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Verify email configuration
verifyEmailConfig().then(configured => {
  if (configured) {
    console.log('✅ Email service ready');
  } else {
    console.log('⚠️  Email service not configured - email features will be disabled');
  }
});

// Start BullMQ worker for AI document analysis
try {
  startDocumentAnalysisWorker();
} catch (error) {
  console.error('⚠️  AI queue worker failed to start:', error.message);
}

// Initialize Socket.io (with error handling)
let io;
try {
  io = initializeSocket(httpServer);
setSocketIO(io);
  console.log('✅ Socket.io initialized');
} catch (error) {
  console.error('⚠️  Socket.io initialization failed:', error.message);
  console.log('⚠️  Server will continue without Socket.io');
}

// Middleware
app.use(
  helmet({
    // Frontend and backend run on different origins in dev (:5173 vs :5000).
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(cors(corsOptions));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/ai', aiLimiter);

// Routes (with error handling)
try {
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
  console.log('✅ All routes loaded');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DNU Social API is running' });
});

// Simple file logger
const logErrorToFile = (error, req) => {
  try {
    const logsDir = path.join(__dirname, 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir);
    }
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${error.stack || error.message || error}\n`;
    appendFileSync(path.join(logsDir, 'error.log'), logLine);
  } catch {
    // Fallback: ignore logging errors
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  logErrorToFile(err, req);
  
  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Quá nhiều file. Tối đa 10 ảnh'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Lỗi upload file'
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.io is ready for real-time communication`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  
  // Check MongoDB connection status after a delay
  setTimeout(() => {
    if (mongoose.connection.readyState === 1) {
      console.log(`✅ MongoDB: Connected`);
    } else if (mongoose.connection.readyState === 0) {
      console.log(`⚠️  MongoDB: Not connected - Database operations will fail`);
      console.log(`💡 Make sure MongoDB is running: net start MongoDB (as Administrator)`);
    } else {
      console.log(`🔄 MongoDB: Connection in progress...`);
    }
  }, 2000);
});


