import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Protect routes - require authentication
export const protect = async (req, res, next) => {
  try {
    let token;

    // Ưu tiên Bearer (client đa tài khoản lưu JWT trong localStorage). Cookie httpOnly có thể còn JWT của lần đăng nhập trước → gây lệch khi chuyển tài khoản lần 2+.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Người dùng không tồn tại'
        });
      }

      // Check if user is banned
      if (req.user.status === 'banned') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
        });
      }

      // Update last active
      req.user.lastActive = Date.now();
      await req.user.save({ validateBeforeSave: false });

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error.message
    });
  }
};

// Require admin role
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Chỉ admin mới có quyền truy cập'
    });
  }
};

// Check if user is active (not banned or inactive)
export const checkUserStatus = (req, res, next) => {
  if (req.user && req.user.status !== 'banned') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
    });
  }
};


