import GroupAnnouncement from '../models/GroupAnnouncement.model.js';
import Group from '../models/Group.model.js';
import { getSocketIO, emitToGroup } from '../socket/socketServer.js';
import { createNotification } from './notification.controller.js';

// @desc    Create announcement
// @route   POST /api/groups/:groupId/announcements
// @access  Private (Admin/Mod only)
export const createAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, content, priority, isPinned, expiryDate } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và nội dung không được để trống'
      });
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is admin or moderator
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );

    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';

    if (!isCreator && !isAdmin && !isGroupAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin hoặc moderator mới có quyền tạo thông báo'
      });
    }

    // Create announcement
    const announcement = await GroupAnnouncement.create({
      group: groupId,
      author: req.user.id,
      title,
      content,
      priority: priority || 'normal',
      isPinned: isPinned || false,
      expiryDate: expiryDate || null
    });

    // Populate author
    await announcement.populate('author', 'name avatar');

    // Emit real-time event to group members
    emitToGroup(groupId, 'group:announcement:new', {
      groupId,
      announcement
    });

    // Notify all group members about new announcement (except the author)
    const groupWithMembers = await Group.findById(groupId).populate('members.user', '_id');
    const membersToNotify = groupWithMembers.members
      .filter(member => {
        const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
        return memberId !== req.user.id;
      })
      .map(member => {
        const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
        return memberId;
      });

    // Notify each member
    for (const memberId of membersToNotify) {
      await createNotification({
        recipient: memberId,
        sender: req.user.id,
        type: 'announcement',
        group: groupId,
        announcement: announcement._id,
        message: `đã tạo thông báo mới trong nhóm ${group.name}: ${title}`,
        link: `/groups/${groupId}?tab=announcements`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đã tạo thông báo thành công',
      announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo thông báo',
      error: error.message
    });
  }
};

// @desc    Get all announcements for a group
// @route   GET /api/groups/:groupId/announcements
// @access  Private
export const getGroupAnnouncements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is a member (for private groups)
    const isMember = group.members.some(
      m => m.user.toString() === userId
    );
    const isCreator = group.creator.toString() === userId;
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');

    if (accessType === 'private' && !isMember && !isCreator && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông báo của nhóm này'
      });
    }

    // Get announcements (pinned first, then by date)
    let query = { group: groupId };
    
    // Filter out expired announcements
    query.$or = [
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } }
    ];

    const announcements = await GroupAnnouncement.find(query)
      .populate('author', 'name avatar')
      .sort({ isPinned: -1, createdAt: -1 });

    // Mark as read for current user
    const announcementsWithReadStatus = announcements.map(announcement => {
      const announcementObj = announcement.toObject();
      const hasRead = announcement.readBy.some(
        read => read.user.toString() === userId
      );
      announcementObj.isRead = hasRead;
      return announcementObj;
    });

    res.status(200).json({
      success: true,
      announcements: announcementsWithReadStatus
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thông báo',
      error: error.message
    });
  }
};

// @desc    Get single announcement
// @route   GET /api/groups/:groupId/announcements/:id
// @access  Private
export const getAnnouncementById = async (req, res) => {
  try {
    const { groupId, id } = req.params;
    const userId = req.user.id;

    const announcement = await GroupAnnouncement.findById(id)
      .populate('author', 'name avatar')
      .populate('group', 'name');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (announcement.group._id.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Thông báo không thuộc nhóm này'
      });
    }

    // Mark as read
    const hasRead = announcement.readBy.some(
      read => read.user.toString() === userId
    );

    if (!hasRead) {
      announcement.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await announcement.save();
    }

    const announcementObj = announcement.toObject();
    announcementObj.isRead = true;

    res.status(200).json({
      success: true,
      announcement: announcementObj
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông báo',
      error: error.message
    });
  }
};

// @desc    Update announcement
// @route   PUT /api/groups/:groupId/announcements/:id
// @access  Private (Admin/Mod only)
export const updateAnnouncement = async (req, res) => {
  try {
    const { groupId, id } = req.params;
    const { title, content, priority, isPinned, expiryDate } = req.body;

    const announcement = await GroupAnnouncement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (announcement.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Thông báo không thuộc nhóm này'
      });
    }

    // Check permissions
    const group = await Group.findById(groupId);
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isAuthor = announcement.author.toString() === req.user.id;

    if (!isCreator && !isAdmin && !isGroupAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa thông báo này'
      });
    }

    // Update announcement
    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (priority !== undefined) announcement.priority = priority;
    if (isPinned !== undefined) announcement.isPinned = isPinned;
    if (expiryDate !== undefined) announcement.expiryDate = expiryDate || null;

    await announcement.save();
    await announcement.populate('author', 'name avatar');

    // Emit update event
    emitToGroup(groupId, 'group:announcement:updated', {
      groupId,
      announcement
    });

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông báo',
      announcement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông báo',
      error: error.message
    });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/groups/:groupId/announcements/:id
// @access  Private (Admin/Mod only)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { groupId, id } = req.params;

    const announcement = await GroupAnnouncement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (announcement.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Thông báo không thuộc nhóm này'
      });
    }

    // Check permissions
    const group = await Group.findById(groupId);
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = member?.role === 'admin' || member?.role === 'moderator';
    const isAuthor = announcement.author.toString() === req.user.id;

    if (!isCreator && !isAdmin && !isGroupAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa thông báo này'
      });
    }

    await announcement.deleteOne();

    // Emit delete event
    emitToGroup(groupId, 'group:announcement:deleted', {
      groupId,
      announcementId: id
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa thông báo',
      error: error.message
    });
  }
};

// @desc    Mark announcement as read
// @route   POST /api/groups/:groupId/announcements/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { groupId, id } = req.params;
    const userId = req.user.id;

    const announcement = await GroupAnnouncement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (announcement.group.toString() !== groupId) {
      return res.status(400).json({
        success: false,
        message: 'Thông báo không thuộc nhóm này'
      });
    }

    // Check if already read
    const hasRead = announcement.readBy.some(
      read => read.user.toString() === userId
    );

    if (!hasRead) {
      announcement.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await announcement.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu đã đọc'
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đánh dấu đã đọc',
      error: error.message
    });
  }
};

