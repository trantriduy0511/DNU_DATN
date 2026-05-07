import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import mongoose from 'mongoose';
import { getUploadedImageUrl } from '../utils/uploadUrl.js';

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const currentUserId = req.user?.id;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        users: []
      });
    }

    // Escape special regex characters
    const escapeRegex = (text) => {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    };

    const searchQuery = escapeRegex(q.trim());

    const users = await User.find({
      ...(currentUserId ? { _id: { $ne: currentUserId } } : {}),
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { studentRole: { $regex: searchQuery, $options: 'i' } },
        { major: { $regex: searchQuery, $options: 'i' } }
      ],
      status: { $ne: 'banned' } // Exclude banned users
    })
      .select('name email avatar studentRole major isOnline lastActive')
      .limit(parseInt(limit))
      .sort({ isOnline: -1, lastActive: -1 }); // Online users first

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm người dùng',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;

    let query = {};

    if (search) {
      // Escape special regex characters
      const escapeRegex = (text) => {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      };
      
      const searchQuery = escapeRegex(search.trim());
      
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    if (role) {
      query.studentRole = role;
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim();
    const normalizedId =
      !requestedId ||
      requestedId === 'undefined' ||
      requestedId === 'null' ||
      requestedId === 'me'
        ? String(req.user?.id || '')
        : requestedId;

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return res.status(400).json({
        success: false,
        message: 'ID người dùng không hợp lệ'
      });
    }

    const user = await User.findById(normalizedId)
      .select('-password')
      .populate('groups', 'name avatar members')
      .populate({ path: 'followers', select: 'name avatar email studentRole major' })
      .populate({ path: 'following', select: 'name avatar email studentRole major' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin người dùng',
      error: error.message
    });
  }
};

// @desc    Add friend
// @route   POST /api/users/friend/:id
// @access  Private
export const addFriend = async (req, res) => {
  try {
    // Password has select:false in schema; include it so currentPassword check works.
    const user = await User.findById(req.user.id).select('+password');
    const friend = await User.findById(req.params.id);

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.friends.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Đã là bạn bè'
      });
    }

    user.friends.push(req.params.id);
    friend.friends.push(req.user.id);

    await user.save();
    await friend.save();

    res.status(200).json({
      success: true,
      message: 'Đã thêm bạn bè'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi thêm bạn bè',
      error: error.message
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/users/friend/:id
// @access  Private
export const removeFriend = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).select('+password');
    const friend = await User.findById(req.params.id);

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.friends = user.friends.filter(id => id.toString() !== req.params.id);
    friend.friends = friend.friends.filter(id => id.toString() !== req.user.id);

    await user.save();
    await friend.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa bạn bè'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa bạn bè',
      error: error.message
    });
  }
};

// @desc    Get user posts
// @route   GET /api/users/:id/posts
// @access  Private
export const getUserPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const posts = await Post.find({ author: req.params.id, status: 'approved' })
      .populate('author', 'name avatar studentRole major')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Post.countDocuments({ author: req.params.id, status: 'approved' });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bài viết',
      error: error.message
    });
  }
};

// @desc    Get saved posts
// @route   GET /api/users/saved/posts
// @access  Private
export const getSavedPosts = async (req, res) => {
  try {
    // Implementation for saved posts (would require a SavedPost model or field)
    res.status(200).json({
      success: true,
      posts: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bài viết đã lưu',
      error: error.message
    });
  }
};

// @desc    Save post
// @route   POST /api/users/save/:postId
// @access  Private
export const savePost = async (req, res) => {
  try {
    // Implementation for saving posts
    res.status(200).json({
      success: true,
      message: 'Đã lưu bài viết'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lưu bài viết',
      error: error.message
    });
  }
};

// @desc    Unsave post
// @route   DELETE /api/users/save/:postId
// @access  Private
export const unsavePost = async (req, res) => {
  try {
    // Implementation for unsaving posts
    res.status(200).json({
      success: true,
      message: 'Đã bỏ lưu bài viết'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi bỏ lưu bài viết',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, major, bio, location, studentId, phone, website, facebook, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Update basic info
    if (name) user.name = name;
    if (major) user.major = major;
    if (typeof bio === 'string') user.bio = bio;
    if (typeof location === 'string') user.location = location;
    if (typeof studentId === 'string') user.studentId = studentId;
    if (typeof phone === 'string') user.phone = phone;
    if (typeof website === 'string') user.website = website;
    if (typeof facebook === 'string') user.facebook = facebook;
    
    // Update password if provided
    if (newPassword) {
      // Validate current password only when account already has one.
      // For accounts created without password, allow user to set first password directly.
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập mật khẩu hiện tại'
          });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Mật khẩu hiện tại không đúng'
          });
        }
      }
      
      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,}$/;
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }
      
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#)'
        });
      }
      
      user.password = newPassword;
    }
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'Đã cập nhật thông tin thành công',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        studentRole: updatedUser.studentRole,
        major: updatedUser.major,
        avatar: updatedUser.avatar,
        coverPhoto: updatedUser.coverPhoto,
        bio: updatedUser.bio,
        location: updatedUser.location,
        studentId: updatedUser.studentId,
        phone: updatedUser.phone,
        website: updatedUser.website,
        facebook: updatedUser.facebook,
        postsCount: updatedUser.postsCount,
        friendsCount: updatedUser.friends.length
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông tin',
      error: error.message
    });
  }
};

// @desc    Follow a user
// @route   POST /api/users/follow/:userId
// @access  Private
export const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({ success: false, message: 'Không thể theo dõi chính mình' });
    }

    const me = await User.findById(currentUserId);
    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const already = (me.following || []).some((id) => String(id) === String(userId));
    if (already) {
      return res.status(200).json({ success: true, status: 'following' });
    }

    me.following = Array.isArray(me.following) ? me.following : [];
    target.followers = Array.isArray(target.followers) ? target.followers : [];

    me.following.push(userId);
    target.followers.push(currentUserId);

    await me.save();
    await target.save();

    return res.status(200).json({
      success: true,
      status: 'following'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi theo dõi người dùng', error: error.message });
  }
};

// @desc    Unfollow a user
// @route   DELETE /api/users/follow/:userId
// @access  Private
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (String(userId) === String(currentUserId)) {
      return res.status(400).json({ success: false, message: 'Không thể thao tác với chính mình' });
    }

    const me = await User.findById(currentUserId);
    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    me.following = (me.following || []).filter((id) => String(id) !== String(userId));
    target.followers = (target.followers || []).filter((id) => String(id) !== String(currentUserId));

    await me.save();
    await target.save();

    return res.status(200).json({
      success: true,
      status: 'not_following'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi bỏ theo dõi người dùng', error: error.message });
  }
};

// @desc    Get follow status with a user
// @route   GET /api/users/follow/status/:userId
// @access  Private
export const getFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (String(userId) === String(currentUserId)) {
      return res.status(200).json({ success: true, status: 'self' });
    }

    const me = await User.findById(currentUserId).select('following');
    const isFollowing = (me.following || []).some((id) => String(id) === String(userId));

    return res.status(200).json({
      success: true,
      status: isFollowing ? 'following' : 'not_following'
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy trạng thái theo dõi', error: error.message });
  }
};

// @desc    Get online users
// @route   GET /api/users/online
// @access  Private
export const getOnlineUsers = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Get users who are online (isOnline = true OR lastActive within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await User.find({
      $or: [
        { isOnline: true },
        { lastActive: { $gte: fiveMinutesAgo } }
      ],
      status: 'active' // Only active users
    })
      .select('name avatar studentRole major isOnline lastActive')
      .limit(parseInt(limit))
      .sort({ lastActive: -1 });

    const count = onlineUsers.length;

    res.status(200).json({
      success: true,
      count,
      users: onlineUsers
    });
  } catch (error) {
    console.error('Error getting online users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng online',
      error: error.message
    });
  }
};

// @desc    Get online count
// @route   GET /api/users/online/count
// @access  Public
export const getOnlineCount = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const count = await User.countDocuments({
      $or: [
        { isOnline: true },
        { lastActive: { $gte: fiveMinutesAgo } }
      ],
      status: 'active'
    });

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting online count:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy số lượng người dùng online',
      error: error.message
    });
  }
};

// @desc    Block a user
// @route   POST /api/users/block/:userId
// @access  Private
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể chặn chính mình'
      });
    }

    const user = await User.findById(currentUserId);
    const userToBlock = await User.findById(userId);

    if (!userToBlock) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Check if already blocked
    if (user.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng này đã bị chặn'
      });
    }

    // Add to blocked list
    user.blockedUsers.push(userId);
    await user.save();

    // Remove from friends if they are friends
    if (user.friends.includes(userId)) {
      user.friends = user.friends.filter(id => id.toString() !== userId);
      userToBlock.friends = userToBlock.friends.filter(id => id.toString() !== currentUserId);
      await user.save();
      await userToBlock.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã chặn người dùng'
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi chặn người dùng',
      error: error.message
    });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/users/block/:userId
// @access  Private
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId);

    if (!user.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Người dùng này chưa bị chặn'
      });
    }

    // Remove from blocked list
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đã bỏ chặn người dùng'
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi bỏ chặn người dùng',
      error: error.message
    });
  }
};

// @desc    Get blocked users list
// @route   GET /api/users/blocked
// @access  Private
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('blockedUsers', 'name avatar email studentRole');

    res.status(200).json({
      success: true,
      blockedUsers: user.blockedUsers || []
    });
  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người dùng bị chặn',
      error: error.message
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh đại diện'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.avatar = getUploadedImageUrl(req.file);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh đại diện',
      error: error.message
    });
  }
};

// @desc    Upload cover photo
// @route   POST /api/users/upload-cover
// @access  Private
export const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ảnh bìa'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.coverPhoto = getUploadedImageUrl(req.file);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh bìa thành công',
      coverPhoto: user.coverPhoto
    });
  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi upload ảnh bìa',
      error: error.message
    });
  }
};

