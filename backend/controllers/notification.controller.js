import Notification from '../models/Notification.model.js';
import { emitToUser } from '../socket/socketServer.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';

const cleanupOrphanNotificationsForRecipient = async (recipientId) => {
  const rows = await Notification.find({ recipient: recipientId }).select('_id sender');
  if (!rows.length) return;
  const senderIdsRaw = [...new Set(rows.map((n) => String(n.sender || '')).filter(Boolean))];
  if (!senderIdsRaw.length) return;

  const senderIds = senderIdsRaw.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const invalidSenderRows = rows
    .filter((n) => !mongoose.Types.ObjectId.isValid(String(n.sender || '')))
    .map((n) => n._id);

  let existingSet = new Set();
  if (senderIds.length > 0) {
    const existingUsers = await User.find({ _id: { $in: senderIds } }).select('_id');
    existingSet = new Set(existingUsers.map((u) => String(u._id)));
  }

  const orphanIds = rows
    .filter((n) => !existingSet.has(String(n.sender || '')))
    .map((n) => n._id);

  const toDelete = [...new Set([...orphanIds, ...invalidSenderRows].map((id) => String(id)))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  if (toDelete.length > 0) {
    await Notification.deleteMany({ _id: { $in: toDelete } });
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    await cleanupOrphanNotificationsForRecipient(req.user.id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === true;

    const filter = { recipient: req.user.id };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'name avatar studentRole')
      .populate('post', 'title content')
      .populate('event', 'title date')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông báo',
      error: error.message
    });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    await cleanupOrphanNotificationsForRecipient(req.user.id);

    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy số thông báo chưa đọc',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập thông báo này'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu đã đọc',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông báo',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo đã đọc'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông báo',
      error: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa thông báo này'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa thông báo',
      error: error.message
    });
  }
};

// @desc    Create notification (utility function)
// @access  Private
export const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    
    // Populate notification for socket emit
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name avatar studentRole')
      .populate('post', 'title content')
      .populate('event', 'title date')
      .populate('group', 'name');
    
    // Emit real-time notification to recipient
    emitToUser(data.recipient.toString(), 'notification:new', {
      notification: populatedNotification
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};





