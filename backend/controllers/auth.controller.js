import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { sendEmail, emailTemplates } from '../utils/emailService.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentRole: user.studentRole,
      major: user.major,
      avatar: user.avatar,
      bio: user.bio,
      postsCount: user.postsCount,
      friendsCount: user.friends.length
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password, studentRole, major, studentId } = req.body;

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,}$/;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }
    
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#)'
      });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      studentRole,
      major,
      studentId,
      emailVerified: false // Email chưa được xác thực
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Xác thực Email - DNU Social',
        html: emailTemplates.verificationEmail(name, verificationUrl)
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue even if email fails - user can resend later
    }

    // Return response (user needs to verify email before full access)
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentRole: user.studentRole,
        major: user.major,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng ký tài khoản',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log(`Login failed: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log(`Login failed: Wrong password for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check if user is banned
    if (user.status === 'banned') {
      console.log(`Login failed: User banned - email: ${normalizedEmail}`);
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa'
      });
    }

    // Check if email is verified (optional - can be enabled/disabled)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra email của bạn hoặc yêu cầu gửi lại email xác thực.',
        requiresVerification: true
      });
    }

    // Check if user is inactive (optional - you can allow inactive users to login)
    // Uncomment if you want to block inactive users
    // if (user.status === 'inactive') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Tài khoản của bạn chưa được kích hoạt'
    //   });
    // }

    // Update online status
    const sessionId = `${user._id}-${Date.now()}`;
    user.isOnline = true;
    user.lastActive = Date.now();
    user.sessionId = sessionId;
    // Ensure status is active if not banned
    if (user.status !== 'active' && user.status !== 'banned') {
      user.status = 'active';
    }
    await user.save({ validateBeforeSave: false });

    console.log(`Login successful: ${normalizedEmail} (${user._id})`);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập',
      error: error.message
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
  try {
    // Update online status if user is logged in
    if (req.user && req.user.id) {
      await User.findByIdAndUpdate(req.user.id, {
        isOnline: false,
        sessionId: null
      });
    }
    
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng xuất'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('groups', 'name avatar');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentRole: user.studentRole,
        major: user.major,
        studentId: user.studentId,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        postsCount: user.postsCount,
        friendsCount: user.friends.length,
        groups: user.groups,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin người dùng',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, major, studentId } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (major) user.major = major;
    if (studentId) user.studentId = studentId;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        major: user.major,
        studentId: user.studentId,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông tin',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đổi mật khẩu',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token xác thực không hợp lệ'
      });
    }

    // Hash token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this token and not expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email đã được xác thực thành công!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực email',
      error: error.message
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'Nếu email tồn tại, chúng tôi đã gửi email xác thực'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được xác thực rồi'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Xác thực Email - DNU Social',
      html: emailTemplates.verificationEmail(user.name, verificationUrl)
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email. Vui lòng thử lại sau.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi email xác thực',
      error: error.message
    });
  }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'Nếu email tồn tại, chúng tôi đã gửi mã xác thực đến email của bạn'
      });
    }

    // Generate OTP (6 digits)
    const otp = user.generatePasswordResetOTP();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    console.log(`📧 Sending OTP email to ${user.email}...`);
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Mã xác thực đặt lại mật khẩu - DNU Social',
      html: emailTemplates.passwordResetOTPEmail(user.name, otp)
    });

    if (!emailResult.success) {
      // Clear OTP if email fails
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error(`❌ Failed to send OTP email: ${emailResult.error || emailResult.message}`);
      
      return res.status(500).json({
        success: false,
        message: emailResult.error || emailResult.message || 'Không thể gửi email. Vui lòng kiểm tra cấu hình email trong .env file.',
        details: emailResult.details || 'Vui lòng cấu hình EMAIL_USER và EMAIL_PASSWORD trong backend/.env'
      });
    }
    
    console.log(`✅ OTP email sent successfully to ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý yêu cầu',
      error: error.message
    });
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mã OTP'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email không tồn tại'
      });
    }

    // Check OTP
    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không đúng'
      });
    }

    // Check expiration
    if (!user.resetPasswordOTPExpires || user.resetPasswordOTPExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.'
      });
    }

    // Generate reset token for password reset (valid for 15 minutes)
    const resetToken = user.generatePasswordResetToken();
    // Clear OTP after verification
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Mã OTP đã được xác thực thành công',
      resetToken: resetToken // Return token for frontend to use in reset password
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực OTP',
      error: error.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password, email } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu mới'
      });
    }

    // If token is provided, use token method (old method)
    // If email is provided, find user by email and check if OTP was verified
    let user;
    if (token) {
      // Hash token to compare
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      }).select('+password');
    } else if (email) {
      // New method: user already verified OTP, token is stored
      user = await User.findOne({ 
        email: email.toLowerCase().trim(),
        resetPasswordToken: { $exists: true, $ne: null },
        resetPasswordExpires: { $gt: Date.now() }
      }).select('+password');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp token hoặc email'
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,}$/;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }
    
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#)'
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Mật khẩu đã được đặt lại - DNU Social',
        html: emailTemplates.passwordResetSuccess(user.name)
      });
    } catch (emailError) {
      console.error('Error sending password reset confirmation email:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đặt lại mật khẩu',
      error: error.message
    });
  }
};
