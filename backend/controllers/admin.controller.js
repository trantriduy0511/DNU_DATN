import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import Event from '../models/Event.model.js';
import Group from '../models/Group.model.js';
import Notification from '../models/Notification.model.js';
import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import SystemSettings from '../models/SystemSettings.model.js';
import { emitToUser } from '../socket/socketServer.js';

// @desc    Get dashboard statistics
// @route   GET /api/admin/statistics
// @access  Private/Admin
export const getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalEvents = await Event.countDocuments();

    // Get users from last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthUsers = await User.countDocuments({
      createdAt: { $lt: lastMonth }
    });
    const userGrowth = totalUsers - lastMonthUsers;
    const userGrowthPercent = lastMonthUsers > 0 
      ? ((userGrowth / lastMonthUsers) * 100).toFixed(1)
      : 0;

    // Get posts from last month
    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $lt: lastMonth }
    });
    const postGrowth = totalPosts - lastMonthPosts;
    const postGrowthPercent = lastMonthPosts > 0
      ? ((postGrowth / lastMonthPosts) * 100).toFixed(1)
      : 0;

    // Get comments from last month
    const lastMonthComments = await Comment.countDocuments({
      createdAt: { $lt: lastMonth }
    });
    const commentGrowth = totalComments - lastMonthComments;
    const commentGrowthPercent = lastMonthComments > 0
      ? ((commentGrowth / lastMonthComments) * 100).toFixed(1)
      : 0;

    // Posts by category
    const postsByCategory = await Post.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // New users by month (last 6 months)
    const usersByMonth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Posts by day (last 7 days)
    const postsByDay = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Groups growth
    const lastMonthGroups = await Group.countDocuments({
      createdAt: { $lt: lastMonth }
    });
    const groupGrowth = totalGroups - lastMonthGroups;
    const groupGrowthPercent = lastMonthGroups > 0
      ? ((groupGrowth / lastMonthGroups) * 100).toFixed(1)
      : 0;

    // Events growth
    const lastMonthEvents = await Event.countDocuments({
      createdAt: { $lt: lastMonth }
    });
    const eventGrowth = totalEvents - lastMonthEvents;
    const eventGrowthPercent = lastMonthEvents > 0
      ? ((eventGrowth / lastMonthEvents) * 100).toFixed(1)
      : 0;

    // User status counts
    const activeUsers = await User.countDocuments({ status: 'active' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });

    // Post status counts
    const approvedPosts = await Post.countDocuments({ status: 'approved' });
    const pendingPosts = await Post.countDocuments({ status: 'pending' });
    const rejectedPosts = await Post.countDocuments({ status: 'rejected' });

    // Group status counts
    const approvedGroups = await Group.countDocuments({ status: 'approved' });
    const pendingGroups = await Group.countDocuments({ status: 'pending' });
    const rejectedGroups = await Group.countDocuments({ status: 'rejected' });

    // Events by month (last 6 months)
    const eventsByMonth = await Event.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Groups by month (last 6 months)
    const groupsByMonth = await Group.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top users by posts count
    const topUsers = await User.find()
      .select('name email avatar postsCount studentRole')
      .sort({ postsCount: -1 })
      .limit(5);

    // Top posts by likes
    const topPosts = await Post.find()
      .select('title content author likes createdAt')
      .populate('author', 'name avatar')
      .sort({ likes: -1 })
      .limit(5);

    // Recent registrations (last 7 days)
    const recentUsers = await User.find({
      createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
    })
      .select('name email createdAt studentRole')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent posts (last 7 days)
    const recentPosts = await Post.find({
      createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
    })
      .select('title author createdAt likes comments')
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      statistics: {
        totalUsers,
        totalPosts,
        totalComments,
        totalGroups,
        totalEvents,
        userGrowthPercent: parseFloat(userGrowthPercent),
        postGrowthPercent: parseFloat(postGrowthPercent),
        commentGrowthPercent: parseFloat(commentGrowthPercent),
        groupGrowthPercent: parseFloat(groupGrowthPercent),
        eventGrowthPercent: parseFloat(eventGrowthPercent),
        postsByCategory,
        usersByMonth,
        postsByDay,
        eventsByMonth,
        groupsByMonth,
        // Status counts
        activeUsers,
        bannedUsers,
        inactiveUsers,
        approvedPosts,
        pendingPosts,
        rejectedPosts,
        approvedGroups,
        pendingGroups,
        rejectedGroups,
        // Top items
        topUsers: topUsers.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          postsCount: u.postsCount || 0,
          studentRole: u.studentRole
        })),
        topPosts: topPosts.map(p => ({
          _id: p._id,
          title: p.title,
          content: p.content?.substring(0, 100),
          author: p.author,
          likes: p.likes?.length || 0,
          createdAt: p.createdAt
        })),
        recentUsers: recentUsers.map(u => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          studentRole: u.studentRole
        })),
        recentPosts: recentPosts.map(p => ({
          _id: p._id,
          title: p.title,
          author: p.author,
          likes: p.likes?.length || 0,
          comments: p.comments?.length || 0,
          createdAt: p.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê',
      error: error.message
    });
  }
};

// @desc    Create new user (admin only)
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUserAdmin = async (req, res) => {
  try {
    const { name, email, password, studentRole, major, studentId, role, bio } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin: tên, email và mật khẩu'
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Normalize email
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
      studentRole: studentRole || 'Sinh viên',
      major: major || '',
      studentId: studentId || '',
      role: role || 'user',
      bio: bio || '',
      status: 'active'
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Đã tạo người dùng thành công',
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo người dùng',
      error: error.message
    });
  }
};

// @desc    Get all users for admin
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsersAdmin = async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 20 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
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
      currentPage: parseInt(page),
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách người dùng',
      error: error.message
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    // Prevent admin from banning themselves
    if (req.params.id === req.user.id && status === 'banned') {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể khóa tài khoản của chính mình'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent banning other admin accounts
    if (user.role === 'admin' && status === 'banned') {
      return res.status(400).json({
        success: false,
        message: 'Không thể khóa tài khoản quản trị viên'
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Đã ${status === 'banned' ? 'khóa' : status === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản thành công`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái',
      error: error.message
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật vai trò thành công',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật vai trò',
      error: error.message
    });
  }
};

// @desc    Update user student role
// @route   PUT /api/admin/users/:id/student-role
// @access  Private/Admin
export const updateUserStudentRole = async (req, res) => {
  try {
    const { studentRole } = req.body;

    if (!['Sinh viên', 'Giảng viên'].includes(studentRole)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò học tập không hợp lệ'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { studentRole },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật vai trò học tập thành công',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật vai trò học tập',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản admin'
      });
    }

    // Delete user's content
    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });

    // Remove stale references from social graph and groups.
    await User.updateMany(
      {},
      {
        $pull: {
          friends: userId,
          following: userId,
          followers: userId,
          blockedUsers: userId,
          friendRequests: { from: userId }
        }
      }
    );
    await Group.updateMany(
      {},
      {
        $pull: {
          members: { user: userId }
        }
      }
    );

    // Remove events owned by deleted user (organizer is required field).
    await Event.deleteMany({ organizer: userId });

    // Drop/cleanup conversations linked to deleted account.
    const directConversationIds = await Conversation.find({
      type: 'direct',
      participants: userId
    }).distinct('_id');
    if (directConversationIds.length > 0) {
      await Message.deleteMany({ conversation: { $in: directConversationIds } });
      await Conversation.deleteMany({ _id: { $in: directConversationIds } });
    }

    await Conversation.updateMany(
      { type: 'group' },
      {
        $pull: {
          participants: userId,
          admins: userId
        }
      }
    );
    await Conversation.deleteMany({
      type: 'group',
      $or: [
        { participants: { $size: 0 } },
        { participants: { $size: 1 } }
      ]
    });

    await Notification.deleteMany({
      $or: [{ recipient: userId }, { sender: userId }]
    });

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa người dùng'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa người dùng',
      error: error.message
    });
  }
};

// @desc    Get all posts for admin
// @route   GET /api/admin/posts
// @access  Private/Admin
export const getAllPostsAdmin = async (req, res) => {
  try {
    const { search, status, category, page = 1, limit = 20 } = req.query;
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    // Backward-compatible author resolution:
    // some legacy posts store user ref in "user" instead of "author".
    const posts = await Post.aggregate([
      { $match: query },
      {
        $addFields: {
          authorRef: { $ifNull: ['$author', '$user'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorRef',
          foreignField: '_id',
          as: 'authorData'
        }
      },
      {
        $addFields: {
          author: {
            $let: {
              vars: { a: { $arrayElemAt: ['$authorData', 0] } },
              in: {
                _id: '$$a._id',
                name: { $ifNull: ['$$a.name', '$authorNameSnapshot'] },
                email: { $ifNull: ['$$a.email', ''] },
                avatar: { $ifNull: ['$$a.avatar', ''] },
                studentRole: { $ifNull: ['$$a.studentRole', ''] }
              }
            }
          }
        }
      },
      { $project: { authorData: 0, authorRef: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parsedLimit }
    ]);

    const count = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parsedLimit),
      currentPage: parsedPage,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách bài viết',
      error: error.message
    });
  }
};

// @desc    Approve post
// @route   PUT /api/admin/posts/:id/approve
// @access  Private/Admin
export const approvePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).populate('author', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã duyệt bài viết',
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi duyệt bài viết',
      error: error.message
    });
  }
};

// @desc    Reject post
// @route   PUT /api/admin/posts/:id/reject
// @access  Private/Admin
export const rejectPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).populate('author', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã từ chối bài viết',
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi từ chối bài viết',
      error: error.message
    });
  }
};

// @desc    Delete post (admin)
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
export const deletePostAdmin = async (req, res) => {
  try {
    const isPermanentDelete =
      String(req.query?.permanent || '').toLowerCase() === 'true' ||
      String(req.query?.hard || '').toLowerCase() === 'true';
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    if (isPermanentDelete) {
      // Xóa cứng: loại bỏ khỏi admin tab và khỏi luồng user.
      await Comment.deleteMany({ post: post._id });
      await Post.findByIdAndDelete(post._id);
      await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
      await Group.updateMany({ posts: post._id }, { $pull: { posts: post._id } });
      await Event.updateMany({ posts: post._id }, { $pull: { posts: post._id } });

      return res.status(200).json({
        success: true,
        message: 'Đã xóa vĩnh viễn bài viết'
      });
    }

    // Xóa mềm: giữ lại dữ liệu để admin theo dõi lịch sử và trạng thái "Đã xóa".
    if (post.status !== 'rejected') {
      post.status = 'rejected';
      await post.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã chuyển bài viết sang trạng thái Đã xóa'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa bài viết',
      error: error.message
    });
  }
};

// @desc    Get all comments for admin
// @route   GET /api/admin/comments
// @access  Private/Admin
export const getAllCommentsAdmin = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const baseMatch = {};
    if (search) {
      baseMatch.content = { $regex: search, $options: 'i' };
    }

    // Một số dữ liệu cũ có thể lưu user ở field "user" thay vì "author".
    // Chuẩn hóa bằng authorRef để admin luôn thấy đúng người bình luận.
    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          authorRef: { $ifNull: ['$author', '$user'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorRef',
          foreignField: '_id',
          as: 'authorData'
        }
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'postData'
        }
      },
      {
        $addFields: {
          author: {
            $let: {
              vars: { a: { $arrayElemAt: ['$authorData', 0] } },
              in: {
                _id: '$$a._id',
                name: { $ifNull: ['$$a.name', { $ifNull: ['$authorNameSnapshot', 'Người dùng đã xóa'] }] },
                email: { $ifNull: ['$$a.email', ''] },
                avatar: { $ifNull: ['$$a.avatar', ''] },
                studentRole: { $ifNull: ['$$a.studentRole', ''] }
              }
            }
          },
          post: {
            $let: {
              vars: { p: { $arrayElemAt: ['$postData', 0] } },
              in: {
                _id: '$$p._id',
                title: '$$p.title',
                content: '$$p.content'
              }
            }
          }
        }
      },
      { $project: { authorData: 0, postData: 0, authorRef: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parsedLimit }
    ];

    const comments = await Comment.aggregate(pipeline);
    const count = await Comment.countDocuments(baseMatch);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parsedLimit),
      currentPage: parsedPage,
      comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách bình luận',
      error: error.message
    });
  }
};

// @desc    Delete comment (admin)
// @route   DELETE /api/admin/comments/:id
// @access  Private/Admin
export const deleteCommentAdmin = async (req, res) => {
  try {
    const isPermanentDelete =
      String(req.query?.permanent || '').toLowerCase() === 'true' ||
      String(req.query?.hard || '').toLowerCase() === 'true';
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bình luận'
      });
    }

    if (isPermanentDelete) {
      // Hard delete: remove completely from admin list.
      await Post.findByIdAndUpdate(comment.post, {
        $pull: { comments: comment._id }
      });
      await comment.deleteOne();
      return res.status(200).json({
        success: true,
        message: 'Đã xóa vĩnh viễn bình luận'
      });
    }

    // Soft delete: hide from user flow but keep history in admin.
    if (comment.status !== 'rejected') {
      comment.status = 'rejected';
      await comment.save();
    }
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    res.status(200).json({
      success: true,
      message: 'Đã chuyển bình luận sang trạng thái Đã xóa'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa bình luận',
      error: error.message
    });
  }
};

// @desc    Get all events for admin
// @route   GET /api/admin/events
// @access  Private/Admin
export const getAllEventsAdmin = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const now = new Date();
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Keep direct status filtering only for "cancelled".
    // Other lifecycle statuses are computed from event date.
    if (status === 'cancelled') {
      query.status = 'cancelled';
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email avatar')
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit)
      .sort({ date: -1 });

    const withComputed = events.map((event) => {
      const raw = event.toObject();
      const eventDate = new Date(raw.date);
      let computedStatus = 'upcoming';
      if (raw.status === 'cancelled') {
        computedStatus = 'cancelled';
      } else if (!Number.isNaN(eventDate.getTime()) && eventDate < now) {
        computedStatus = 'completed';
      }
      return {
        ...raw,
        computedStatus,
        participantsCount: (raw.participants || []).length
      };
    });

    const eventsWithCount =
      status && ['upcoming', 'completed', 'cancelled'].includes(String(status))
        ? withComputed.filter((event) => event.computedStatus === String(status))
        : withComputed;

    const count = status && ['upcoming', 'completed', 'cancelled'].includes(String(status))
      ? eventsWithCount.length
      : await Event.countDocuments(query);


    res.status(200).json({
      success: true,
      count,
      totalPages: Math.max(1, Math.ceil(count / parsedLimit)),
      currentPage: parsedPage,
      events: eventsWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách sự kiện',
      error: error.message
    });
  }
};

// @desc    Create event (admin)
// @route   POST /api/admin/events
// @access  Private/Admin
export const createEventAdmin = async (req, res) => {
  try {
    const { title, description, date, location, category, maxParticipants, image } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      maxParticipants,
      image,
      organizer: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo sự kiện',
      error: error.message
    });
  }
};

// @desc    Update event (admin)
// @route   PUT /api/admin/events/:id
// @access  Private/Admin
export const updateEventAdmin = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizer', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật sự kiện thành công',
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật sự kiện',
      error: error.message
    });
  }
};

// @desc    Delete event (admin)
// @route   DELETE /api/admin/events/:id
// @access  Private/Admin
export const deleteEventAdmin = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa sự kiện'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa sự kiện',
      error: error.message
    });
  }
};

// @desc    Get recent activities
// @route   GET /api/admin/activities
// @access  Private/Admin
export const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent users
    const recentUsers = await User.find()
      .select('name createdAt')
      .sort({ createdAt: -1 })
      .limit(3);

    // Get recent posts
    const recentPosts = await Post.find()
      .select('title author createdAt')
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(3);

    // Get recent comments
    const recentComments = await Comment.find()
      .select('content author createdAt')
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(3);

    const activities = [];

    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registration',
        message: `Người dùng mới đăng ký`,
        user: user.name,
        time: user.createdAt
      });
    });

    recentPosts.forEach(post => {
      activities.push({
        type: 'new_post',
        message: `Bài viết mới được đăng`,
        user: post.author?.name || 'Người dùng không xác định',
        time: post.createdAt
      });
    });

    recentComments.forEach(comment => {
      activities.push({
        type: 'new_comment',
        message: `Bình luận mới`,
        user: comment.author?.name || 'Người dùng không xác định',
        time: comment.createdAt
      });
    });

    // Sort by time and limit
    activities.sort((a, b) => b.time - a.time);
    const limitedActivities = activities.slice(0, limit);

    res.status(200).json({
      success: true,
      activities: limitedActivities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy hoạt động gần đây',
      error: error.message
    });
  }
};

// @desc    Get all notifications (Admin)
// @route   GET /api/admin/notifications
// @access  Private/Admin
export const getAllNotificationsAdmin = async (req, res) => {
  try {
    const { 
      type, 
      recipient, 
      isRead, 
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 50;
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Build query (admin notification center excludes chat-message notifications)
    const query = { type: { $ne: 'message' } };
    
    if (type) {
      if (type === 'message') {
        return res.status(200).json({
          success: true,
          notifications: [],
          statistics: { total: 0, unread: 0, read: 0, byType: [] },
          pagination: { page: parsedPage, limit: parsedLimit, total: 0, totalPages: 0 }
        });
      }
      query.type = type;
    }
    
    if (recipient && String(recipient).trim()) {
      const recipientKeyword = String(recipient).trim();
      const isObjectIdLike = /^[a-fA-F0-9]{24}$/.test(recipientKeyword);
      if (isObjectIdLike) {
        query.recipient = recipientKeyword;
      } else {
        const matchedUsers = await User.find({
          $or: [
            { email: { $regex: recipientKeyword, $options: 'i' } },
            { name: { $regex: recipientKeyword, $options: 'i' } }
          ]
        }).select('_id');
        const recipientIds = matchedUsers.map((u) => u._id);
        // No matched users => return empty result quickly.
        if (recipientIds.length === 0) {
          return res.status(200).json({
            success: true,
            notifications: [],
            statistics: {
              total: 0,
              unread: 0,
              read: 0,
              byType: []
            },
            pagination: {
              page: parsedPage,
              limit: parsedLimit,
              total: 0,
              totalPages: 0
            }
          });
        }
        query.recipient = { $in: recipientIds };
      }
    }
    
    if (isRead === 'true' || isRead === 'false') {
      query.isRead = isRead === 'true';
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar email studentRole')
      .populate('recipient', 'name avatar email studentRole')
      .populate('post', 'title content')
      .populate('comment', 'content')
      .populate('event', 'title')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);
    
    const total = await Notification.countDocuments(query);
    
    // Get statistics
    const totalNotifications = await Notification.countDocuments({ type: { $ne: 'message' } });
    const unreadCount = await Notification.countDocuments({ type: { $ne: 'message' }, isRead: false });
    const readCount = await Notification.countDocuments({ type: { $ne: 'message' }, isRead: true });
    
    // Count by type
    const notificationsByType = await Notification.aggregate([
      { $match: { type: { $ne: 'message' } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    res.status(200).json({
      success: true,
      notifications,
      statistics: {
        total: totalNotifications,
        unread: unreadCount,
        read: readCount,
        byType: notificationsByType
      },
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thông báo',
      error: error.message
    });
  }
};

// @desc    Send notification to user(s) (Admin)
// @route   POST /api/admin/notifications
// @access  Private/Admin
export const sendNotificationAdmin = async (req, res) => {
  try {
    const { recipientIds, message, type, link } = req.body;
    
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một người nhận'
      });
    }
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung thông báo không được để trống'
      });
    }
    
    // Validate type
    const validTypes = ['comment', 'like', 'follow', 'event', 'group', 'message', 'friend_request', 'admin'];
    const notificationType = type || 'admin';
    
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: 'Loại thông báo không hợp lệ'
      });
    }
    
    // Verify all recipients exist
    const recipients = await User.find({ _id: { $in: recipientIds } });
    if (recipients.length !== recipientIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Một số người dùng không tồn tại'
      });
    }
    
    // Create notifications for all recipients
    const notifications = [];
    for (const recipientId of recipientIds) {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: req.user.id,
        type: notificationType,
        message: message.trim(),
        link: link || null
      });
      
      // Populate and emit
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name avatar studentRole')
        .populate('recipient', 'name avatar email studentRole');
      
      // Emit real-time notification
      emitToUser(recipientId.toString(), 'notification:new', {
        notification: populatedNotification
      });
      
      notifications.push(populatedNotification);
    }
    
    res.status(201).json({
      success: true,
      message: `Đã gửi thông báo đến ${notifications.length} người dùng`,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi thông báo',
      error: error.message
    });
  }
};

// @desc    Delete notification (Admin)
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
export const deleteNotificationAdmin = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
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

// @desc    Mark one notification as read (Admin)
// @route   PUT /api/admin/notifications/:id/read
// @access  Private/Admin
export const markNotificationAsReadAdmin = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái thông báo',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read (Admin)
// @route   PUT /api/admin/notifications/read-all
// @access  Private/Admin
export const markAllNotificationsAsReadAdmin = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      modifiedCount: result.modifiedCount || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đánh dấu tất cả thông báo',
      error: error.message
    });
  }
};

// @desc    Get notification statistics (Admin)
// @route   GET /api/admin/notifications/statistics
// @access  Private/Admin
export const getNotificationStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { type: { $ne: 'message' } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Total notifications
    const total = await Notification.countDocuments(query);
    
    // Read vs Unread
    const unread = await Notification.countDocuments({ ...query, isRead: false });
    const read = await Notification.countDocuments({ ...query, isRead: true });
    
    // By type
    const byType = await Notification.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // By day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const byDay = await Notification.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top recipients
    const topRecipients = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$recipient',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate recipient names
    const populatedRecipients = await Promise.all(
      topRecipients.map(async (item) => {
        const user = await User.findById(item._id).select('name avatar email');
        return {
          user,
          count: item.count
        };
      })
    );
    
    res.status(200).json({
      success: true,
      statistics: {
        total,
        unread,
        read,
        byType,
        byDay,
        topRecipients: populatedRecipients
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê thông báo',
      error: error.message
    });
  }
};

// @desc    Approve group
// @route   PUT /api/admin/groups/:id/approve
// @access  Private/Admin
export const approveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (group.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Nhóm này đã được duyệt rồi'
      });
    }

    group.status = 'approved';
    group.reviewedBy = req.user.id;
    group.reviewedAt = new Date();
    group.rejectionReason = null;
    await group.save();

    // Gửi thông báo cho creator
    await Notification.create({
      user: group.creator,
      type: 'group_approved',
      title: 'Nhóm của bạn đã được duyệt',
      message: `Nhóm "${group.name}" đã được admin duyệt và hiện đã có thể sử dụng.`,
      link: `/groups/${group._id}`
    });

    // Emit notification to creator
    emitToUser(group.creator.toString(), 'notification:new', {
      type: 'group_approved',
      title: 'Nhóm của bạn đã được duyệt',
      message: `Nhóm "${group.name}" đã được admin duyệt.`
    });

    res.status(200).json({
      success: true,
      message: 'Đã duyệt nhóm thành công',
      group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi duyệt nhóm',
      error: error.message
    });
  }
};

// @desc    Reject group
// @route   PUT /api/admin/groups/:id/reject
// @access  Private/Admin
export const rejectGroup = async (req, res) => {
  try {
    const { reason } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (group.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Nhóm này đã bị từ chối rồi'
      });
    }

    group.status = 'rejected';
    group.reviewedBy = req.user.id;
    group.reviewedAt = new Date();
    group.rejectionReason = reason || 'Nhóm không đáp ứng yêu cầu của hệ thống';
    await group.save();

    // Gửi thông báo cho creator
    await Notification.create({
      user: group.creator,
      type: 'group_rejected',
      title: 'Nhóm của bạn đã bị từ chối',
      message: `Nhóm "${group.name}" đã bị admin từ chối. Lý do: ${group.rejectionReason}`,
      link: `/groups/${group._id}`
    });

    // Emit notification to creator
    emitToUser(group.creator.toString(), 'notification:new', {
      type: 'group_rejected',
      title: 'Nhóm của bạn đã bị từ chối',
      message: `Nhóm "${group.name}" đã bị từ chối. Lý do: ${group.rejectionReason}`
    });

    res.status(200).json({
      success: true,
      message: 'Đã từ chối nhóm',
      group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi từ chối nhóm',
      error: error.message
    });
  }
};

// @desc    Get pending groups
// @route   GET /api/admin/groups/pending
// @access  Private/Admin
export const getPendingGroups = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const groups = await Group.find({ status: 'pending' })
      .populate('creator', 'name avatar email studentRole')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Group.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nhóm chờ duyệt',
      error: error.message
    });
  }
};

// @desc    Get all groups for admin
// @route   GET /api/admin/groups
// @access  Private/Admin
export const getAllGroupsAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const groups = await Group.find(query)
      .populate('creator', 'name avatar email studentRole')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Group.countDocuments(query);

    const groupsWithCount = groups.map((group) => ({
      ...group.toObject(),
      membersCount: Array.isArray(group.members) ? group.members.length : 0
    }));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      groups: groupsWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nhóm (admin)',
      error: error.message
    });
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    let touched = false;
    if (settings.autoApprovePosts !== true) {
      settings.autoApprovePosts = true;
      touched = true;
    }
    if (settings.requirePostApproval !== false) {
      settings.requirePostApproval = false;
      touched = true;
    }
    if (settings.autoApproveGroups !== true) {
      settings.autoApproveGroups = true;
      touched = true;
    }
    if (settings.requireGroupApproval !== false) {
      settings.requireGroupApproval = false;
      touched = true;
    }
    if (touched) {
      await settings.save();
    }
    
    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy cài đặt hệ thống',
      error: error.message
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSystemSettings = async (req, res) => {
  try {
    const incoming = {
      ...req.body,
      autoApprovePosts: true,
      requirePostApproval: false,
      autoApproveGroups: true,
      requireGroupApproval: false
    };
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = await SystemSettings.create({
        ...incoming,
        lastUpdatedBy: req.user.id,
        lastUpdatedAt: new Date()
      });
    } else {
      // Update settings
      Object.keys(incoming).forEach(key => {
        if (settings.schema.paths[key]) {
          settings[key] = incoming[key];
        }
      });
      
      settings.lastUpdatedBy = req.user.id;
      settings.lastUpdatedAt = new Date();
      await settings.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Cập nhật cài đặt hệ thống thành công',
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật cài đặt hệ thống',
      error: error.message
    });
  }
};

// @desc    Reset system settings to default
// @route   POST /api/admin/settings/reset
// @access  Private/Admin
export const resetSystemSettings = async (req, res) => {
  try {
    await SystemSettings.deleteMany({});
    const settings = await SystemSettings.create({
      lastUpdatedBy: req.user.id,
      lastUpdatedAt: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Đã reset cài đặt về mặc định',
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi reset cài đặt hệ thống',
      error: error.message
    });
  }
};

