import Message from '../models/Message.model.js';
import Conversation from '../models/Conversation.model.js';
import User from '../models/User.model.js';
import { emitToConversation, emitToUser } from '../socket/socketServer.js';
import Notification from '../models/Notification.model.js';
import { getUploadedFileUrl, getUploadedImageUrl } from '../utils/uploadUrl.js';

const normalizeObjectId = (value) => {
  if (!value) return '';
  return String(value._id || value.id || value);
};

// @desc    Get or create conversation between two users
// @route   GET /api/messages/conversation/:userId
// @access  Private
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tạo cuộc hội thoại với chính mình'
      });
    }

    // Check if user exists
    const otherUser = await User.findById(userId).select('name avatar email studentRole');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] }
    })
      .populate('participants', 'name avatar email studentRole')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' }
      });

    // Create new conversation if not exists
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId]
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar email studentRole');
    }

    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy cuộc hội thoại',
      error: error.message
    });
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('blockedUsers');
    const blockedUserIds = user.blockedUsers || [];

    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'name avatar email studentRole')
      .populate('createdBy', 'name avatar')
      .populate('admins', 'name avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' }
      })
      .sort({ lastMessageTime: -1 });

    // Mark conversations with blocked users (but don't filter them out)
    const conversationsWithBlockedInfo = conversations.map(conv => {
      const convObj = conv.toObject ? conv.toObject() : conv;
      const participants = Array.isArray(convObj.participants)
        ? convObj.participants.filter((p) => normalizeObjectId(p))
        : [];
      convObj.participants = participants;

      if (convObj.type === 'direct') {
        const otherParticipant = participants.find(
          (p) => normalizeObjectId(p) !== req.user.id
        );
        if (!otherParticipant) {
          // Direct conversation orphaned by deleted account.
          return null;
        }

        const otherParticipantId = normalizeObjectId(otherParticipant);
        if (blockedUserIds.some(
          blockedId => blockedId.toString() === otherParticipantId
        )) {
          // Add blocked flag to conversation
          convObj.isBlocked = true;
        }
      }
      return convObj;
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      conversations: conversationsWithBlockedInfo
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách cuộc hội thoại',
      error: error.message
    });
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại'
      });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem cuộc hội thoại này'
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments({ conversation: conversationId });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tin nhắn',
      error: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/messages/:conversationId
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content = '' } = req.body;

    // Check if conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại'
      });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi tin nhắn trong cuộc hội thoại này'
      });
    }

    // Check if user is blocked (for direct conversations)
    if (conversation.type === 'direct') {
      const otherParticipantId = conversation.participants.find(
        p => p.toString() !== req.user.id
      );
      
      if (otherParticipantId) {
        const otherUser = await User.findById(otherParticipantId).select('blockedUsers');
        if (otherUser && otherUser.blockedUsers.includes(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: 'Bạn đã bị chặn bởi người dùng này'
          });
        }
      }
    }

    // Get receiver (only for direct messages)
    let receiver = null;
    if (conversation.type === 'direct') {
      receiver = conversation.participants.find(
        p => p.toString() !== req.user.id
      );
    }

    // Process uploaded images
    let images = [];
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      images = req.uploadedImages.map(file => ({
        url: getUploadedImageUrl(file),
        filename: file.cloudinaryPublicId || file.filename,
        originalName: file.originalname,
        size: file.size
      }));
    }

    // Process uploaded files
    let files = [];
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      files = req.uploadedFiles.map(file => ({
        url: getUploadedFileUrl(file),
        filename: file.cloudinaryPublicId || file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));
    }

    // Determine message type
    let messageType = 'text';
    if (images.length > 0 && files.length > 0) {
      messageType = 'mixed';
    } else if (images.length > 0) {
      messageType = 'image';
    } else if (files.length > 0) {
      messageType = 'file';
    }

    // Validate: Must have content, images, or files
    if (!content.trim() && images.length === 0 && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn phải có nội dung, hình ảnh hoặc file đính kèm'
      });
    }

    // Create message
    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      receiver,
      conversationType: conversation.type,
      content: content.trim(),
      messageType,
      images,
      files
    };

    const message = await Message.create(messageData);

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = message.createdAt;
    await conversation.save();

    // Populate message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    // Emit real-time message to conversation room
    emitToConversation(conversationId, 'message:new', {
      message: populatedMessage,
      conversationId
    });

    // Also emit to each participant's personal room so global UI badges
    // (message icon, notification bell) update even when chat window is closed.
    const participantIds = (conversation.participants || []).map((p) => p.toString());
    participantIds.forEach((participantId) => {
      emitToUser(participantId, 'message:new', {
        message: populatedMessage,
        conversationId
      });
    });

    // Create notifications
    try {
      if (conversation.type === 'direct' && receiver) {
        // Direct message: notify receiver
        const notification = await Notification.create({
          recipient: receiver,
          sender: req.user.id,
          type: 'message',
          message: `${req.user.name} đã gửi cho bạn một tin nhắn`,
          link: `/messages?conversation=${conversationId}`
        });

        emitToUser(receiver.toString(), 'notification:new', {
          notification: await Notification.findById(notification._id)
            .populate('sender', 'name avatar')
        });
      } else if (conversation.type === 'group') {
        // Group message: notify all participants except sender
        const recipients = conversation.participants.filter(
          p => p.toString() !== req.user.id
        );

        for (const recipientId of recipients) {
          const notification = await Notification.create({
            recipient: recipientId,
            sender: req.user.id,
            type: 'message',
            message: `${req.user.name} đã gửi tin nhắn trong nhóm ${conversation.name || 'nhóm'}`,
            link: `/messages?conversation=${conversationId}`
          });

          emitToUser(recipientId.toString(), 'notification:new', {
            notification: await Notification.findById(notification._id)
              .populate('sender', 'name avatar')
          });
        }
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi tin nhắn',
      error: error.message
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/:conversationId/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Check if conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại'
      });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập cuộc hội thoại này'
      });
    }

    // Mark messages as read
    if (conversation.type === 'direct') {
      // Direct: mark messages where user is receiver
      await Message.updateMany(
        {
          conversation: conversationId,
          receiver: req.user.id,
          isRead: false
        },
        {
          isRead: true,
          readAt: Date.now()
        }
      );
    } else if (conversation.type === 'group') {
      // Group: mark all messages in conversation as read for this user
      // Note: For group messages, we track read status differently
      // For simplicity, we'll mark messages where user is not sender
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: req.user.id },
          isRead: false
        },
        {
          isRead: true,
          readAt: Date.now()
        }
      );
    }

    // Emit read receipt to conversation
    emitToConversation(conversationId, 'message:read', {
      conversationId,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tin nhắn là đã đọc'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu tin nhắn',
      error: error.message
    });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread/count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    // Get user's conversations
    const userConversations = await Conversation.find({
      participants: req.user.id
    }).select('_id type');

    const conversationIds = userConversations.map(c => c._id);

    // Count unread messages in direct conversations (where user is receiver)
    const directCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      receiver: req.user.id,
      isRead: false
    });

    // Count unread messages in group conversations (where user is not sender)
    const groupCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      conversationType: 'group',
      sender: { $ne: req.user.id },
      isRead: false
    });

    const count = directCount + groupCount;

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số tin nhắn chưa đọc',
      error: error.message
    });
  }
};

// @desc    Create a group conversation
// @route   POST /api/messages/groups
// @access  Private
export const createGroup = async (req, res) => {
  try {
    const { name, participantIds, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên nhóm không được để trống'
      });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Nhóm phải có ít nhất 1 thành viên khác'
      });
    }

    // Add current user to participants
    const allParticipants = [req.user.id, ...participantIds];

    // Remove duplicates
    const uniqueParticipants = [...new Set(allParticipants.map(id => id.toString()))];

    if (uniqueParticipants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Nhóm phải có ít nhất 2 thành viên'
      });
    }

    // Verify all participants exist
    const users = await User.find({ _id: { $in: uniqueParticipants } });
    if (users.length !== uniqueParticipants.length) {
      return res.status(400).json({
        success: false,
        message: 'Một số người dùng không tồn tại'
      });
    }

    // Create group conversation
    const group = await Conversation.create({
      type: 'group',
      name: name.trim(),
      description: description?.trim() || '',
      participants: uniqueParticipants,
      createdBy: req.user.id,
      admins: [req.user.id]
    });

    const populatedGroup = await Conversation.findById(group._id)
      .populate('participants', 'name avatar email studentRole')
      .populate('createdBy', 'name avatar')
      .populate('admins', 'name avatar');

    // Emit to all participants
    uniqueParticipants.forEach(participantId => {
      emitToUser(participantId, 'conversation:new', {
        conversation: populatedGroup
      });
    });

    res.status(201).json({
      success: true,
      conversation: populatedGroup
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nhóm',
      error: error.message
    });
  }
};

// @desc    Add participants to group
// @route   PUT /api/messages/groups/:conversationId/participants
// @access  Private
export const addParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một người để thêm'
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Đây không phải là nhóm chat'
      });
    }

    // Check if user is admin or creator
    const isAdmin = conversation.admins.includes(req.user.id) || 
                    conversation.createdBy?.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ quản trị viên mới có thể thêm thành viên'
      });
    }

    // Verify users exist
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Một số người dùng không tồn tại'
      });
    }

    // Add new participants (avoid duplicates)
    const existingIds = conversation.participants.map(p => p.toString());
    const newParticipants = participantIds.filter(id => !existingIds.includes(id.toString()));

    if (newParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tất cả người dùng đã là thành viên của nhóm'
      });
    }

    conversation.participants.push(...newParticipants);
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'name avatar email studentRole')
      .populate('createdBy', 'name avatar')
      .populate('admins', 'name avatar');

    // Emit to new participants
    newParticipants.forEach(participantId => {
      emitToUser(participantId, 'conversation:new', {
        conversation: populatedConversation
      });
    });

    // Emit update to all participants
    emitToConversation(conversationId, 'conversation:updated', {
      conversation: populatedConversation
    });

    res.status(200).json({
      success: true,
      conversation: populatedConversation
    });
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm thành viên',
      error: error.message
    });
  }
};

// @desc    Get group participants
// @route   GET /api/messages/groups/:conversationId/participants
// @access  Private
export const getGroupParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name avatar email studentRole major isOnline lastActive')
      .populate('createdBy', 'name avatar email')
      .populate('admins', 'name avatar email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Đây không phải là nhóm chat'
      });
    }

    // Check if user is participant
    if (!conversation.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải là thành viên của nhóm này'
      });
    }

    res.status(200).json({
      success: true,
      participants: conversation.participants,
      createdBy: conversation.createdBy,
      admins: conversation.admins,
      name: conversation.name,
      description: conversation.description
    });
  } catch (error) {
    console.error('Error getting group participants:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thành viên',
      error: error.message
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('conversation');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check if user is participant
    const conversation = message.conversation;
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa tin nhắn này'
      });
    }

    // Check if user is sender - only allow deleting own messages
    const isSender = message.sender.toString() === req.user.id;

    if (!isSender) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể xóa tin nhắn của chính mình'
      });
    }

    const conversationId = conversation._id.toString();

    // Delete message
    await message.deleteOne();

    // Update conversation's lastMessage if this was the last message
    if (conversation.lastMessage?.toString() === messageId) {
      const newLastMessage = await Message.findOne({ conversation: conversationId })
        .sort({ createdAt: -1 });

      conversation.lastMessage = newLastMessage?._id || null;
      conversation.lastMessageTime = newLastMessage?.createdAt || conversation.createdAt;
      await conversation.save();
    }

    // Emit real-time delete event to conversation room
    emitToConversation(conversationId, 'message:deleted', {
      messageId,
      conversationId
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa tin nhắn'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tin nhắn',
      error: error.message
    });
  }
};

// @desc    Remove participant from group
// @route   DELETE /api/messages/groups/:conversationId/participants/:userId
// @access  Private
export const removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Đây không phải là nhóm chat'
      });
    }

    // Check if user is admin or removing themselves
    const isAdmin = conversation.admins.includes(req.user.id) || 
                    conversation.createdBy?.toString() === req.user.id;
    const isRemovingSelf = userId === req.user.id;

    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa thành viên này'
      });
    }

    // Cannot remove creator
    if (conversation.createdBy?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa người tạo nhóm'
      });
    }

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId
    );

    // Remove from admins if they were admin
    conversation.admins = conversation.admins.filter(
      a => a.toString() !== userId
    );

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'name avatar email studentRole')
      .populate('createdBy', 'name avatar')
      .populate('admins', 'name avatar');

    // Emit update to all participants
    emitToConversation(conversationId, 'conversation:updated', {
      conversation: populatedConversation
    });

    // Notify removed user
    emitToUser(userId, 'conversation:removed', {
      conversationId
    });

    res.status(200).json({
      success: true,
      conversation: populatedConversation
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thành viên',
      error: error.message
    });
  }
};

// @desc    Update group avatar
// @route   PUT /api/messages/groups/:conversationId/avatar
// @access  Private
export const updateGroupAvatar = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Đây không phải là nhóm chat'
      });
    }

    // Check if user is admin or creator
    const isAdmin = conversation.admins.includes(req.user.id) ||
      conversation.createdBy?.toString() === req.user.id;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ quản trị viên mới có thể đổi ảnh đại diện nhóm'
      });
    }

    const uploaded = Array.isArray(req.uploadedImages) ? req.uploadedImages : [];
    const file = uploaded[0];
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn một ảnh'
      });
    }

    conversation.avatar = getUploadedImageUrl(file);
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'name avatar email studentRole')
      .populate('createdBy', 'name avatar')
      .populate('admins', 'name avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' }
      });

    // Emit update to all participants
    emitToConversation(conversationId, 'conversation:updated', {
      conversation: populatedConversation
    });

    res.status(200).json({
      success: true,
      conversation: populatedConversation
    });
  } catch (error) {
    console.error('Error updating group avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật ảnh đại diện nhóm',
      error: error.message
    });
  }
};

// @desc    Recall a message (unsend)
// @route   PUT /api/messages/:messageId/recall
// @access  Private
export const recallMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId)
      .populate('conversation');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Check if user is sender
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể thu hồi tin nhắn của chính mình'
      });
    }

    // Check if already recalled
    if (message.isRecalled) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn này đã được thu hồi'
      });
    }

    // Mark message as recalled
    message.isRecalled = true;
    message.recalledAt = Date.now();
    await message.save();

    const conversationId = message.conversation._id.toString();

    // Update conversation's lastMessage if this was the last message
    if (message.conversation.lastMessage?.toString() === messageId) {
      const newLastMessage = await Message.findOne({ 
        conversation: conversationId,
        isRecalled: false 
      })
        .sort({ createdAt: -1 });

      message.conversation.lastMessage = newLastMessage?._id || null;
      message.conversation.lastMessageTime = newLastMessage?.createdAt || message.conversation.createdAt;
      await message.conversation.save();
    }

    // Emit real-time recall event to conversation room
    emitToConversation(conversationId, 'message:recalled', {
      messageId,
      conversationId
    });

    res.status(200).json({
      success: true,
      message: 'Đã thu hồi tin nhắn'
    });
  } catch (error) {
    console.error('Error recalling message:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thu hồi tin nhắn',
      error: error.message
    });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/messages/conversations/:conversationId
// @access  Private
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại'
      });
    }

    // Check if user is participant
    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa cuộc hội thoại này'
      });
    }

    // For group conversations, only admins or creator can delete
    if (conversation.type === 'group') {
      const isAdmin = conversation.admins.includes(currentUserId) || 
                      conversation.createdBy?.toString() === currentUserId;
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ quản trị viên mới có thể xóa nhóm'
        });
      }
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: conversationId });

    // Delete the conversation
    await conversation.deleteOne();

    // Emit to all participants
    conversation.participants.forEach(participantId => {
      emitToUser(participantId.toString(), 'conversation:removed', {
        conversationId
      });
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa cuộc hội thoại'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa cuộc hội thoại',
      error: error.message
    });
  }
};





