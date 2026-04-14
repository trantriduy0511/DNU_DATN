import path from 'path';
import Group from '../models/Group.model.js';
import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import GroupFile from '../models/GroupFile.model.js';
import GroupInvite from '../models/GroupInvite.model.js';
import { createNotification } from './notification.controller.js';
import { sanitizeTextBackground } from './post.controller.js';

// @desc    Create new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, category, rules, settings } = req.body;

    // Một ảnh nhóm duy nhất → lưu vào coverPhoto; avatar chỉ là emoji (khi không có ảnh)
    let avatarVal = avatar != null && String(avatar).trim() !== '' ? avatar : '📚';
    let coverVal = req.body.coverPhoto || null;

    if (req.uploadedImages && req.uploadedImages.length > 0) {
      coverVal = `/uploads/images/${req.uploadedImages[0].filename}`;
      if (
        typeof avatarVal === 'string' &&
        (avatarVal.startsWith('/uploads') || avatarVal.startsWith('http'))
      ) {
        avatarVal = '📚';
      }
    }

    let tagsArr = [];
    if (req.body.tags != null && req.body.tags !== '') {
      if (Array.isArray(req.body.tags)) {
        tagsArr = req.body.tags;
      } else if (typeof req.body.tags === 'string') {
        try {
          const parsed = JSON.parse(req.body.tags);
          tagsArr = Array.isArray(parsed) ? parsed : [];
        } catch {
          tagsArr = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    let settingsData = {};
    if (settings != null && settings !== '') {
      if (typeof settings === 'string') {
        try {
          settingsData = JSON.parse(settings);
        } catch {
          settingsData = {};
        }
      } else if (typeof settings === 'object') {
        settingsData = settings;
      }
    }

    const group = await Group.create({
      name,
      description,
      avatar: avatarVal,
      category,
      tags: tagsArr,
      rules: rules || '',
      coverPhoto: coverVal || null,
      settings: settingsData || {},
      creator: req.user.id,
      status: 'approved',
      members: [{
        user: req.user.id,
        role: 'admin'
      }]
    });

    // Add group to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo nhóm thành công',
      group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo nhóm',
      error: error.message
    });
  }
};

// @desc    Get all groups
// @route   GET /api/groups
// @access  Private
export const getAllGroups = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12, status, joined } = req.query;

    const joinedOnly = joined === 'true' || joined === '1';
    let query = joinedOnly
      ? { 'members.user': req.user.id }
      : { isPublic: true };

    // Nếu không có status trong query, chỉ hiển thị nhóm đã được duyệt
    // Nếu có status, cho phép filter theo status (dành cho admin)
    if (status) {
      query.status = status;
    } else {
      query.status = 'approved'; // Chỉ hiển thị nhóm đã được duyệt
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (category) {
      query.category = category;
    }

    const groups = await Group.find(query)
      .populate('creator', 'name avatar')
      .populate('reviewedBy', 'name avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Group.countDocuments(query);
    const me = await User.findById(req.user.id).select('groupsHiddenFromHomeFeed');
    const hiddenSet = new Set((me?.groupsHiddenFromHomeFeed || []).map((gid) => String(gid)));

    // Add members count to each group
    const groupsWithCount = groups.map(group => ({
      ...group.toObject(),
      membersCount: group.members.length,
      homeFeedHiddenFromHome: hiddenSet.has(String(group._id))
    }));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      groups: groupsWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nhóm',
      error: error.message
    });
  }
};

// @desc    Discover groups (groups user hasn't joined)
// @route   GET /api/groups/discover
// @access  Private
export const discoverGroups = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12, sortBy = 'popular' } = req.query;
    const userId = req.user.id;

    // Get groups user is already a member of
    const userGroups = await Group.find({
      'members.user': userId
    }).select('_id');

    const userGroupIds = userGroups.map(g => g._id);

    // Build query for groups user hasn't joined
    let query = {
      _id: { $nin: userGroupIds }, // Not in user's groups
      isPublic: true, // Only public groups
      status: 'approved' // Chỉ hiển thị nhóm đã được duyệt
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    // Determine sort order
    let sortOption = {};
    if (sortBy === 'popular') {
      sortOption = { 'members': -1, createdAt: -1 }; // Sort by member count
    } else if (sortBy === 'recent') {
      sortOption = { createdAt: -1 };
    } else if (sortBy === 'name') {
      sortOption = { name: 1 };
    }

    const groups = await Group.find(query)
      .populate('creator', 'name avatar studentRole')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortOption);

    const count = await Group.countDocuments(query);

    // Add members count and posts count to each group
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const postsCount = await Post.countDocuments({ group: group._id });
        return {
          ...group.toObject(),
          membersCount: group.members.length,
          postsCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      groups: groupsWithDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nhóm khám phá',
      error: error.message
    });
  }
};

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
export const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name avatar')
      .populate('members.user', 'name avatar studentRole major')
      .populate('reviewedBy', 'name avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra quyền xem nhóm
    const isCreator = String(group.creator._id) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    
    // Chỉ creator hoặc admin mới có thể xem nhóm chưa được duyệt
    if (group.status !== 'approved' && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Nhóm này đang chờ admin duyệt hoặc đã bị từ chối'
      });
    }

    // Fetch posts separately from Post model to get latest posts
    // This ensures new posts are included even if group.posts array isn't updated
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');
    const isMember = group.members.some(
      member => {
        const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
        return memberId === req.user.id;
      }
    );

    // Only fetch posts if group is public or user is a member
    let posts = [];
    if (isMember || accessType === 'public') {
      posts = await Post.find({ group: req.params.id, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(50) // Limit to recent 50 posts
        .populate('author', 'name avatar studentRole major')
        .populate({
          path: 'comments',
          populate: { path: 'author', select: 'name avatar' }
        });
    }

    // Convert group to object and add posts
    const groupObject = group.toObject();
    groupObject.posts = posts;

    const me = await User.findById(req.user.id).select('groupsHiddenFromHomeFeed');
    const hiddenList = me?.groupsHiddenFromHomeFeed || [];
    const homeFeedHiddenFromHome = hiddenList.some((gid) => String(gid) === String(req.params.id));

    res.status(200).json({
      success: true,
      group: groupObject,
      homeFeedHiddenFromHome
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin nhóm',
      error: error.message
    });
  }
};

// @desc    Join group
// @route   POST /api/groups/:id/join
// @access  Private
export const joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if group is approved
    if (group.status !== 'approved') {
      const isCreator = group.creator.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Nhóm này chưa được duyệt hoặc đã bị từ chối. Bạn không thể tham gia.'
        });
      }
    }

    // Check if already a member
    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã là thành viên của nhóm này'
      });
    }

    // Đánh dấu lời mời (nếu có) để đồng bộ với luồng chấp nhận lời mời
    await GroupInvite.updateMany(
      { group: group._id, invitee: req.user._id, status: 'pending' },
      { $set: { status: 'accepted' } }
    );

    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();

    // Add group to user
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id }
    });

    // Notify group creator/admin about new member
    if (group.creator.toString() !== req.user.id) {
      await createNotification({
        recipient: group.creator,
        sender: req.user.id,
        type: 'group',
        group: group._id,
        message: `đã tham gia nhóm ${group.name}`,
        link: `/groups/${group._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã tham gia nhóm'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tham gia nhóm',
      error: error.message
    });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
export const leaveGroup = async (req, res) => {
  try {
    // Validate group ID
    if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID nhóm không hợp lệ'
      });
    }

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is the creator
    if (group.creator.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Người tạo nhóm không thể rời khỏi nhóm. Vui lòng xóa nhóm hoặc chuyển quyền quản lý.'
      });
    }

    // Check if user is a member
    const isMember = group.members.some(
      member => member.user.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không phải là thành viên của nhóm này'
      });
    }

    group.members = group.members.filter(
      member => member.user.toString() !== req.user.id
    );
    await group.save();

    // Remove group from user + gỡ trạng thái bỏ theo dõi feed trang chủ
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { groups: group._id, groupsHiddenFromHomeFeed: group._id }
    });

    res.status(200).json({
      success: true,
      message: 'Đã rời khỏi nhóm'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi rời nhóm',
      error: error.message
    });
  }
};

// @desc    Theo dõi / bỏ theo dõi nhóm trên feed trang chủ (vẫn là thành viên)
// @route   PATCH /api/groups/:id/home-feed
// @access  Private
export const updateGroupHomeFeedFollow = async (req, res) => {
  try {
    const { id } = req.params;
    const { showOnHomeFeed } = req.body;

    if (typeof showOnHomeFeed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hoặc sai showOnHomeFeed (boolean)'
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    const isMember = group.members.some((m) => String(m.user) === String(req.user.id));
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ thành viên nhóm mới chỉnh được theo dõi feed trang chủ'
      });
    }

    if (showOnHomeFeed) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { groupsHiddenFromHomeFeed: group._id }
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { groupsHiddenFromHomeFeed: group._id }
      });
    }

    return res.status(200).json({
      success: true,
      showOnHomeFeed,
      homeFeedHiddenFromHome: !showOnHomeFeed
    });
  } catch (error) {
    console.error('updateGroupHomeFeedFollow:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật theo dõi feed trang chủ',
      error: error.message
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
export const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is group admin
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );

    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin nhóm mới có quyền chỉnh sửa'
      });
    }

    const creatorId =
      group.creator?._id != null ? String(group.creator._id) : String(group.creator);
    const isGroupCreator = creatorId === String(req.user.id);
    const body = { ...req.body };
    if (!isGroupCreator) {
      delete body.avatar;
      delete body.coverPhoto;
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật nhóm thành công',
      group: updatedGroup
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật nhóm',
      error: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is creator or admin
    if (group.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo nhóm hoặc admin mới có quyền xóa'
      });
    }

    await group.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa nhóm'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa nhóm',
      error: error.message
    });
  }
};

// @desc    Get group members
// @route   GET /api/groups/:id/members
// @access  Private
export const getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name avatar email studentRole major');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    res.status(200).json({
      success: true,
      members: group.members,
      isCreator: group.creator.toString() === req.user.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách thành viên',
      error: error.message
    });
  }
};

// @desc    Gửi lời mời tham gia nhóm (người được mời phải chấp nhận). Hỗ trợ userId hoặc userIds[]
// @route   POST /api/groups/:id/invites
// @access  Private
export const sendGroupInvite = async (req, res) => {
  try {
    const selfId = String(req.user.id);
    const { userId, userIds: rawUserIds } = req.body;

    let userIds = [];
    if (Array.isArray(rawUserIds) && rawUserIds.length > 0) {
      userIds = [...new Set(rawUserIds.map((x) => String(x)).filter(Boolean))];
    } else if (userId) {
      userIds = [String(userId)];
    }

    userIds = userIds.filter((id) => id !== selfId);
    if (!userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Người được mời không hợp lệ'
      });
    }

    const MAX_BATCH = 50;
    if (userIds.length > MAX_BATCH) {
      return res.status(400).json({
        success: false,
        message: `Tối đa ${MAX_BATCH} người mỗi lần gửi`
      });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    const inviterMember = group.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!inviterMember) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần là thành viên nhóm để mời người khác'
      });
    }

    const isCreator = group.creator.toString() === req.user.id;
    const isElevated =
      inviterMember.role === 'admin' || inviterMember.role === 'moderator';
    const allowMemberInvite = group.settings?.allowMemberInvite !== false;

    if (!isCreator && !isElevated && !allowMemberInvite) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền mời thành viên vào nhóm'
      });
    }

    const inviterUser = await User.findById(req.user.id).select('friends');
    const usersToInvite = await User.find({ _id: { $in: userIds } }).select(
      'friends name'
    );
    const userById = new Map(usersToInvite.map((u) => [u._id.toString(), u]));

    const pendingDocs = await GroupInvite.find({
      group: group._id,
      invitee: { $in: userIds },
      status: 'pending'
    }).select('invitee');
    const pendingSet = new Set(pendingDocs.map((d) => d.invitee.toString()));

    const memberIdSet = new Set(group.members.map((m) => m.user.toString()));

    const sent = [];
    const notSent = [];

    for (const uid of userIds) {
      const userToAdd = userById.get(uid);
      if (!userToAdd) {
        notSent.push({ userId: uid, message: 'Không tìm thấy người dùng' });
        continue;
      }

      const mutualFriend =
        inviterUser.friends?.some((id) => id.toString() === uid) &&
        userToAdd.friends?.some((id) => id.toString() === req.user.id);

      if (!isCreator && !isElevated && !mutualFriend) {
        notSent.push({
          userId: uid,
          message: 'Chỉ có thể mời những người đã kết bạn với bạn'
        });
        continue;
      }

      if (memberIdSet.has(uid)) {
        notSent.push({
          userId: uid,
          message: 'Người này đã là thành viên nhóm'
        });
        continue;
      }

      if (pendingSet.has(uid)) {
        notSent.push({
          userId: uid,
          message: 'Đã gửi lời mời tới người này, đang chờ họ phản hồi'
        });
        continue;
      }

      const invite = await GroupInvite.create({
        group: group._id,
        invitee: uid,
        inviter: req.user.id,
        status: 'pending'
      });

      await createNotification({
        recipient: uid,
        sender: req.user.id,
        type: 'group_invite',
        group: group._id,
        message: `mời bạn tham gia nhóm "${group.name}"`,
        link: `/groups/${group._id}?invite=${invite._id}`
      });

      sent.push(uid);
      pendingSet.add(uid);
    }

    if (userIds.length === 1) {
      if (sent.length === 0) {
        return res.status(400).json({
          success: false,
          message: notSent[0]?.message || 'Không thể gửi lời mời'
        });
      }
      const invite = await GroupInvite.findOne({
        group: group._id,
        invitee: sent[0],
        status: 'pending'
      }).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        message: 'Đã gửi lời mời tham gia nhóm',
        invite
      });
    }

    if (sent.length === 0) {
      return res.status(400).json({
        success: false,
        message: notSent[0]?.message || 'Không gửi được lời mời nào',
        notSent
      });
    }

    const message =
      sent.length === userIds.length
        ? `Đã gửi ${sent.length} lời mời tham gia nhóm`
        : `Đã gửi ${sent.length}/${userIds.length} lời mời tham gia nhóm`;

    res.status(200).json({
      success: true,
      message,
      sentCount: sent.length,
      ...(notSent.length ? { notSent } : {})
    });
  } catch (error) {
    console.error('sendGroupInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi lời mời',
      error: error.message
    });
  }
};

// @desc    Chấp nhận lời mời tham gia nhóm
// @route   POST /api/groups/:id/invites/:inviteId/accept
// @access  Private
export const acceptGroupInvite = async (req, res) => {
  try {
    const { id: groupId, inviteId } = req.params;

    const invite = await GroupInvite.findOne({
      _id: inviteId,
      group: groupId,
      invitee: req.user._id,
      status: 'pending'
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời hoặc đã xử lý'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    if (group.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Nhóm không khả dụng để tham gia'
      });
    }

    if (group.members.some((m) => m.user.toString() === req.user.id)) {
      invite.status = 'accepted';
      await invite.save();
      return res.status(200).json({
        success: true,
        message: 'Bạn đã là thành viên nhóm'
      });
    }

    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id }
    });

    invite.status = 'accepted';
    await invite.save();

    if (group.creator.toString() !== req.user.id) {
      await createNotification({
        recipient: group.creator,
        sender: req.user.id,
        type: 'group',
        group: group._id,
        message: `đã tham gia nhóm ${group.name}`,
        link: `/groups/${group._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã tham gia nhóm'
    });
  } catch (error) {
    console.error('acceptGroupInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi chấp nhận lời mời',
      error: error.message
    });
  }
};

// @desc    Từ chối lời mời tham gia nhóm
// @route   POST /api/groups/:id/invites/:inviteId/decline
// @access  Private
export const declineGroupInvite = async (req, res) => {
  try {
    const { id: groupId, inviteId } = req.params;

    const inviteDecline = await GroupInvite.findOne({
      _id: inviteId,
      group: groupId,
      invitee: req.user._id,
      status: 'pending'
    });

    if (!inviteDecline) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời hoặc đã xử lý'
      });
    }

    inviteDecline.status = 'declined';
    await inviteDecline.save();

    res.status(200).json({
      success: true,
      message: 'Đã từ chối lời mời'
    });
  } catch (error) {
    console.error('declineGroupInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi từ chối lời mời',
      error: error.message
    });
  }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:memberId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is creator, admin, or moderator
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );

    if (!member || (member.role !== 'admin' && group.creator.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo nhóm, admin hoặc moderator mới có quyền xóa thành viên'
      });
    }

    // Prevent removing creator
    if (group.creator.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa người tạo nhóm'
      });
    }

    group.members = group.members.filter(
      member => member.user.toString() !== memberId
    );
    await group.save();

    // Remove group from user + gỡ bỏ theo dõi feed trang chủ
    await User.findByIdAndUpdate(memberId, {
      $pull: { groups: group._id, groupsHiddenFromHomeFeed: group._id }
    });

    const updatedGroup = await Group.findById(req.params.id)
      .populate('members.user', 'name avatar email studentRole major');

    res.status(200).json({
      success: true,
      message: 'Đã xóa thành viên khỏi nhóm',
      members: updatedGroup.members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa thành viên',
      error: error.message
    });
  }
};

// @desc    Update member role
// @route   PUT /api/groups/:id/members/:memberId
// @access  Private
export const updateMemberRole = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is creator
    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo nhóm mới có quyền thay đổi vai trò'
      });
    }

    // Prevent changing creator's role
    if (group.creator.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi vai trò của người tạo nhóm'
      });
    }

    // Validate role
    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }

    const member = group.members.find(
      m => m.user.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong nhóm'
      });
    }

    member.role = role;
    await group.save();

    const updatedGroup = await Group.findById(req.params.id)
      .populate('members.user', 'name avatar email studentRole major');

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật vai trò thành viên',
      members: updatedGroup.members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật vai trò',
      error: error.message
    });
  }
};

// @desc    Get all posts in a group
// @route   GET /api/groups/:id/posts
// @access  Private
export const getGroupPosts = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if group is approved (except for creator and admin)
    const isCreator = group.creator.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (group.status !== 'approved' && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Nhóm này chưa được duyệt. Bạn không thể xem bài viết.'
      });
    }

    // Allow viewing posts for public groups or if user is a member
    // For public groups, anyone can view posts without joining
    const isMember = group.members.some(
      member => {
        const memberId = member.user._id ? member.user._id.toString() : member.user.toString();
        return memberId === req.user.id;
      }
    );

    // Check access type - use settings.accessType if available, otherwise fallback to isPublic
    const accessType = group.settings?.accessType || (group.isPublic ? 'public' : 'private');
    
    // Only restrict if group is private AND user is not a member
    if (!isMember && accessType === 'private') {
      return res.status(403).json({
        success: false,
        message: 'Nhóm này là nhóm riêng tư. Bạn cần tham gia để xem bài viết.'
      });
    }

    const posts = await Post.find({ group: req.params.id, status: 'approved' })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar studentRole major role')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name avatar'
        }
      });

    res.status(200).json({
      success: true,
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

// @desc    Create a post in a group
// @route   POST /api/groups/:id/posts
// @access  Private
export const createGroupPost = async (req, res) => {
  try {
    const { content, textBackground } = req.body;

    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if group is approved
    if (group.status !== 'approved') {
      const isCreator = group.creator.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Nhóm này chưa được duyệt. Bạn không thể đăng bài.'
        });
      }
    }

    // Check if user is a member of the group
    // member.user can be ObjectId (not populated) or populated object
    const isMember = group.members.some(
      member => {
        // Handle both ObjectId and populated object
        let memberId;
        if (member.user && typeof member.user === 'object' && member.user._id) {
          // Populated object
          memberId = member.user._id.toString();
        } else {
          // ObjectId (not populated)
          memberId = member.user.toString();
        }
        return memberId === req.user.id;
      }
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Bạn phải là thành viên của nhóm để đăng bài'
      });
    }

    // Check post permission based on group settings
    const postPermission = group.settings?.postPermission || 'all-members';
    const member = group.members.find(
      m => {
        const memberId = m.user && typeof m.user === 'object' && m.user._id 
          ? m.user._id.toString() 
          : m.user.toString();
        return memberId === req.user.id;
      }
    );
    const memberRole = member?.role || 'member';
    const isGroupAdmin = memberRole === 'admin' || memberRole === 'moderator';
    const isGroupCreator = group.creator.toString() === req.user.id;

    if (postPermission === 'admin-moderator' && !isGroupAdmin && !isGroupCreator) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin và moderator mới có quyền đăng bài trong nhóm này'
      });
    }

    const allowFileUpload = group.settings?.allowFileUpload !== false;

    if (!allowFileUpload && req.uploadedFiles && req.uploadedFiles.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Nhóm này không cho phép đính kèm file / video'
      });
    }

    // Xử lý ảnh từ file upload
    let images = [];
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      images = req.uploadedImages.map(file => `/uploads/images/${file.filename}`);
    } else if (req.body.images && Array.isArray(req.body.images)) {
      images = req.body.images;
    }

    let files = [];
    if (allowFileUpload && req.uploadedFiles && req.uploadedFiles.length > 0) {
      files = req.uploadedFiles.map((file) => ({
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: `/uploads/files/${file.filename}`
      }));

      for (const uploadedFile of req.uploadedFiles) {
        await GroupFile.create({
          group: req.params.id,
          uploadedBy: req.user.id,
          name: uploadedFile.originalname,
          description: (content && String(content).trim()) || 'Đăng kèm bài viết trong nhóm',
          filePath: `/uploads/files/${uploadedFile.filename}`,
          fileName: uploadedFile.originalname,
          fileSize: uploadedFile.size,
          fileType: path.extname(uploadedFile.originalname).substring(1).toLowerCase(),
          mimeType: uploadedFile.mimetype || '',
          category: 'Khác',
          tags: []
        });
      }
    }

    const text = content && String(content).trim();
    const hasMedia = images.length > 0 || files.length > 0;
    if (!text && !hasMedia) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung hoặc đính kèm ảnh / file / video'
      });
    }

    const postContent = text || (hasMedia ? 'Bài đăng có đính kèm' : '');

    const normalizedTextBackground =
      images.length === 0 && (!files || files.length === 0)
        ? sanitizeTextBackground(textBackground)
        : '';

    const post = await Post.create({
      author: req.user.id,
      content: postContent,
      textBackground: normalizedTextBackground,
      images,
      files: Array.isArray(files) ? files : [],
      group: req.params.id,
      category: 'Nhóm',
      status: 'approved' // Group posts are auto-approved
    });

    // Add post to group's posts array
    await Group.findByIdAndUpdate(req.params.id, {
      $push: { posts: post._id }
    });

    // Update user post count
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name avatar studentRole major role');

    // Notify all group members about new post (except the author)
    const groupWithMembers = await Group.findById(req.params.id).populate('members.user', '_id');
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
        type: 'group',
        group: req.params.id,
        post: post._id,
        message: `đã đăng bài mới trong nhóm ${group.name}`,
        link: `/groups/${req.params.id}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đã đăng bài trong nhóm',
      post: populatedPost
    });
  } catch (error) {
    console.error('Error creating group post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng bài trong nhóm',
      error: error.message
    });
  }
};

// @desc    Update group settings
// @route   PUT /api/groups/:id/settings
// @access  Private
export const updateGroupSettings = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm'
      });
    }

    // Check if user is group admin or moderator
    const member = group.members.find(
      m => m.user.toString() === req.user.id
    );

    if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin hoặc moderator mới có quyền chỉnh sửa cài đặt'
      });
    }

    const creatorId =
      group.creator?._id != null ? String(group.creator._id) : String(group.creator);
    const isGroupCreator = creatorId === String(req.user.id);

    const hasNewImageUploads =
      Array.isArray(req.uploadedImages) && req.uploadedImages.length > 0;
    const avatarBody = req.body.avatar;
    const avatarTextChanging =
      avatarBody !== undefined && String(avatarBody ?? '') !== String(group.avatar ?? '');
    const emojiBody = req.body.avatarEmoji;
    const avatarEmojiChanging =
      emojiBody !== undefined && String(emojiBody) !== String(group.avatar ?? '');
    const coverBody = req.body.coverPhoto;
    const coverChanging =
      coverBody !== undefined &&
      String(coverBody ?? '') !== String(group.coverPhoto ?? '');

    if (
      (hasNewImageUploads || avatarTextChanging || avatarEmojiChanging || coverChanging) &&
      !isGroupCreator
    ) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo nhóm mới được đổi ảnh nhóm hoặc biểu tượng emoji.'
      });
    }

    // Prepare update data
    const updateData = {};

    // Update basic info
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.rules !== undefined) updateData.rules = req.body.rules;
    
    const pickEmojiFromBody = () => {
      if (req.body.avatarEmoji !== undefined && req.body.avatarEmoji !== '') {
        return req.body.avatarEmoji;
      }
      if (
        req.body.avatar !== undefined &&
        typeof req.body.avatar === 'string' &&
        req.body.avatar !== '' &&
        !req.body.avatar.startsWith('/uploads') &&
        !req.body.avatar.startsWith('http')
      ) {
        return req.body.avatar;
      }
      return '📚';
    };

    if (req.uploadedImages && req.uploadedImages.length > 0) {
      updateData.coverPhoto = `/uploads/images/${req.uploadedImages[0].filename}`;
      updateData.avatar = pickEmojiFromBody();
    } else {
      if (req.body.coverPhoto !== undefined) {
        const c = req.body.coverPhoto;
        updateData.coverPhoto = c === '' || c === null ? null : c;
      }
      if (req.body.avatarEmoji !== undefined) {
        updateData.avatar = req.body.avatarEmoji;
      } else if (req.body.avatar !== undefined) {
        const a = req.body.avatar;
        if (typeof a === 'string' && !a.startsWith('/uploads') && !a.startsWith('http')) {
          updateData.avatar = a;
        }
      }
    }

    // Update tags
    if (req.body.tags !== undefined) {
      if (Array.isArray(req.body.tags)) {
        updateData.tags = req.body.tags.filter(tag => tag && tag.trim()).map(tag => tag.trim());
      } else if (typeof req.body.tags === 'string') {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(req.body.tags);
          if (Array.isArray(parsed)) {
            updateData.tags = parsed.filter(tag => tag && tag.trim()).map(tag => tag.trim());
          } else {
            // Fallback to comma-separated
            updateData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        } catch (e) {
          // Not JSON, treat as comma-separated
          updateData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      }
    }

    // Update settings
    if (req.body.settings !== undefined) {
      let settingsData = req.body.settings;
      // Parse JSON string if needed
      if (typeof settingsData === 'string') {
        try {
          settingsData = JSON.parse(settingsData);
        } catch (e) {
          console.error('Error parsing settings JSON:', e);
        }
      }
      
      if (typeof settingsData === 'object' && settingsData !== null) {
        updateData.settings = {
          ...group.settings,
          ...settingsData
        };
      }
    }

    // Update isPublic based on accessType
    if (updateData.settings && updateData.settings.accessType) {
      updateData.isPublic = updateData.settings.accessType === 'public';
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'name avatar')
     .populate('members.user', 'name avatar studentRole major');

    res.status(200).json({
      success: true,
      message: 'Cập nhật cài đặt nhóm thành công',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật cài đặt nhóm',
      error: error.message
    });
  }
};

