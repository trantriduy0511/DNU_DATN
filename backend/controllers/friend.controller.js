import User from '../models/User.model.js';
import { createNotification } from './notification.controller.js';

const hasId = (arr = [], id = '') => arr.some((x) => String(x) === String(id));

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể gửi lời mời kết bạn cho chính mình'
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if already friends
    if (hasId(targetUser.friends, currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Đã là bạn bè'
      });
    }

    // Check if request already exists
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUserId && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Đã gửi lời mời kết bạn trước đó'
      });
    }

    // Add friend request
    targetUser.friendRequests.push({
      from: currentUserId,
      status: 'pending'
    });

    await targetUser.save();

    // Create notification
    await createNotification({
      recipient: userId,
      sender: currentUserId,
      type: 'friend_request',
      message: 'đã gửi lời mời kết bạn',
      link: `/profile/${currentUserId}`
    });

    res.status(200).json({
      success: true,
      message: 'Đã gửi lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi lời mời kết bạn',
      error: error.message
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:userId
// @access  Private
export const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const requester = await User.findById(userId);

    if (!requester) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Find the friend request
    const requestIndex = currentUser.friendRequests.findIndex(
      req => req.from.toString() === userId && req.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời kết bạn'
      });
    }

    // Update request status
    currentUser.friendRequests[requestIndex].status = 'accepted';

    // Add to friends list
    if (!hasId(currentUser.friends, userId)) {
      currentUser.friends.push(userId);
    }
    if (!hasId(requester.friends, currentUserId)) {
      requester.friends.push(currentUserId);
    }

    await currentUser.save();
    await requester.save();

    // Create notification
    await createNotification({
      recipient: userId,
      sender: currentUserId,
      type: 'friend_accept',
      message: 'đã chấp nhận lời mời kết bạn',
      link: `/profile/${currentUserId}`
    });

    res.status(200).json({
      success: true,
      message: 'Đã chấp nhận lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chấp nhận lời mời kết bạn',
      error: error.message
    });
  }
};

// @desc    Reject friend request
// @route   PUT /api/friends/reject/:userId
// @access  Private
export const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);

    // Find and remove the friend request
    const requestIndex = currentUser.friendRequests.findIndex(
      req => req.from.toString() === userId && req.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời kết bạn'
      });
    }

    currentUser.friendRequests.splice(requestIndex, 1);
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'Đã từ chối lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối lời mời kết bạn',
      error: error.message
    });
  }
};

// @desc    Cancel friend request
// @route   DELETE /api/friends/request/:userId
// @access  Private
export const cancelFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Find and remove the friend request
    const requestIndex = targetUser.friendRequests.findIndex(
      req => req.from.toString() === currentUserId && req.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời kết bạn'
      });
    }

    targetUser.friendRequests.splice(requestIndex, 1);
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'Đã hủy lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error canceling friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy lời mời kết bạn',
      error: error.message
    });
  }
};

// @desc    Unfriend
// @route   DELETE /api/friends/:userId
// @access  Private
export const unfriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Remove from friends list
    currentUser.friends = currentUser.friends.filter(
      friendId => friendId.toString() !== userId
    );
    targetUser.friends = targetUser.friends.filter(
      friendId => friendId.toString() !== currentUserId
    );

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: 'Đã hủy kết bạn'
    });
  } catch (error) {
    console.error('Error unfriending:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy kết bạn',
      error: error.message
    });
  }
};

// @desc    Get friend status with a user
// @route   GET /api/friends/status/:userId
// @access  Private
export const getFriendStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(200).json({
        success: true,
        status: 'self'
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if friends
    const isFriends = hasId(currentUser.friends, userId) || hasId(targetUser.friends, currentUserId);
    if (isFriends) {
      return res.status(200).json({
        success: true,
        status: 'friends'
      });
    }

    // Check if current user sent request (pending)
    const sentRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUserId && req.status === 'pending'
    );

    if (sentRequest) {
      return res.status(200).json({
        success: true,
        status: 'request_sent'
      });
    }

    // Check if current user received request (pending)
    const receivedRequest = currentUser.friendRequests.find(
      req => req.from.toString() === userId && req.status === 'pending'
    );

    if (receivedRequest) {
      return res.status(200).json({
        success: true,
        status: 'request_received'
      });
    }

    res.status(200).json({
      success: true,
      status: 'none'
    });
  } catch (error) {
    console.error('Error getting friend status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy trạng thái kết bạn',
      error: error.message
    });
  }
};

// @desc    Get friend requests
// @route   GET /api/friends/requests
// @access  Private
export const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'friendRequests.from',
        select: 'name avatar email studentRole major'
      });

    const pendingRequests = (user.friendRequests || []).filter((reqItem) => reqItem.status === 'pending');
    const validPendingRequests = pendingRequests.filter((reqItem) => reqItem.from);

    // Cleanup orphan requests caused by deleted users.
    if (validPendingRequests.length !== pendingRequests.length) {
      user.friendRequests = (user.friendRequests || []).filter(
        (reqItem) => reqItem.status !== 'pending' || reqItem.from
      );
      await user.save();
    }

    res.status(200).json({
      success: true,
      requests: validPendingRequests
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lời mời kết bạn',
      error: error.message
    });
  }
};

// @desc    Get friends who are online (for contacts sidebar)
// @route   GET /api/friends/online
// @access  Private
export const getOnlineFriends = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const currentUserId = req.user.id;

    const me = await User.findById(currentUserId).select('friends');
    if (!me) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const friendIds = me.friends || [];
    const friendIdStrings = friendIds.map((id) => id.toString());

    if (friendIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        users: [],
        friendIds: []
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const onlineFriends = await User.find({
      _id: { $in: friendIds },
      $or: [{ isOnline: true }, { lastActive: { $gte: fiveMinutesAgo } }],
      status: 'active'
    })
      .select('name avatar studentRole major isOnline lastActive')
      .limit(parseInt(limit, 10))
      .sort({ lastActive: -1 });

    res.status(200).json({
      success: true,
      count: onlineFriends.length,
      users: onlineFriends,
      friendIds: friendIdStrings
    });
  } catch (error) {
    console.error('Error getting online friends:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách bạn bè đang online',
      error: error.message
    });
  }
};

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'name avatar email studentRole major');

    res.status(200).json({
      success: true,
      friends: user.friends
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bạn bè',
      error: error.message
    });
  }
};

// @desc    Get friends list for a user
// @route   GET /api/friends/user/:userId
// @access  Private
export const getFriendsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('friends', 'name avatar email studentRole major');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      friends: user.friends || []
    });
  } catch (error) {
    console.error('Error getting friends by userId:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bạn bè',
      error: error.message
    });
  }
};





















