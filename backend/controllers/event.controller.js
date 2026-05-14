import Event from '../models/Event.model.js';
import Group from '../models/Group.model.js';
import User from '../models/User.model.js';
import Notification from '../models/Notification.model.js';
import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import { createNotification } from './notification.controller.js';
import { sanitizeTextBackground } from './post.controller.js';
import { getUploadedFileUrl, getUploadedImageUrl } from '../utils/uploadUrl.js';

const parseBool = (v, defaultVal = false) => {
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return defaultVal;
};

/** Quyền xem sự kiện (trùng logic getEventById). */
async function evaluateEventAccess(event, uid) {
  const orgId = (event.organizer?._id || event.organizer).toString();
  const isParticipant = (event.participants || []).some(
    (p) => (p._id || p).toString() === uid
  );
  const isAcceptedCoHost = (event.coHostInvites || []).some(
    (c) => (c.user?._id || c.user)?.toString() === uid && c.status === 'accepted'
  );
  const vis = event.visibility || 'public';
  if (vis === 'private' && orgId !== uid && !isParticipant && !isAcceptedCoHost) {
    return {
      allowed: false,
      status: 403,
      message: 'Sự kiện riêng tư — chỉ người được mời mới xem được'
    };
  }
  if (vis === 'group' && event.visibleToGroup) {
    const gid = event.visibleToGroup._id || event.visibleToGroup;
    const member = await Group.exists({
      _id: gid,
      status: 'approved',
      'members.user': uid
    });
    if (!member && orgId !== uid && !isAcceptedCoHost) {
      return {
        allowed: false,
        status: 403,
        message: 'Bạn không thuộc nhóm được chia sẻ sự kiện này'
      };
    }
  }
  return { allowed: true };
}

function stripUserFromAllRsvp(event, userId) {
  const idStr = userId.toString();
  event.participants = (event.participants || []).filter((id) => id.toString() !== idStr);
  event.interestedUsers = (event.interestedUsers || []).filter((id) => id.toString() !== idStr);
  event.declinedUsers = (event.declinedUsers || []).filter((id) => id.toString() !== idStr);
}

/** Quyền phản hồi RSVP (trùng logic join cũ). */
async function assertUserCanRespondToEvent(event, uid) {
  const orgId = (event.organizer?._id || event.organizer).toString();
  const vis = event.visibility || 'public';
  if (vis === 'private' && orgId !== uid && !(event.participants || []).some((id) => id.toString() === uid)) {
    return {
      ok: false,
      status: 403,
      message: 'Chỉ người được mời mới có thể phản hồi sự kiện riêng tư này'
    };
  }
  if (vis === 'group' && event.visibleToGroup) {
    const member = await Group.exists({
      _id: event.visibleToGroup,
      status: 'approved',
      'members.user': uid
    });
    if (!member && orgId !== uid) {
      return {
        ok: false,
        status: 403,
        message: 'Chỉ thành viên nhóm mới có thể phản hồi sự kiện này'
      };
    }
  }
  return { ok: true };
}

async function fetchEventAfterRsvp(id) {
  return Event.findById(id)
    .populate('organizer', 'name avatar studentRole major')
    .populate('participants', 'name avatar studentRole')
    .populate('interestedUsers', 'name avatar studentRole')
    .populate('declinedUsers', 'name avatar studentRole')
    .populate('visibleToGroup', 'name')
    .populate('coHostInvites.user', 'name avatar');
}

async function applyEventRsvpAndRespond(req, res, status) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const uid = req.user.id;
    const gate = await assertUserCanRespondToEvent(event, uid);
    if (!gate.ok) {
      return res.status(gate.status).json({
        success: false,
        message: gate.message
      });
    }

    stripUserFromAllRsvp(event, uid);

    if (status === 'going') {
      if (event.maxParticipants && event.participants.length >= event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Sự kiện đã đầy'
        });
      }
      event.participants.push(uid);
    } else if (status === 'interested') {
      if (!event.interestedUsers) event.interestedUsers = [];
      event.interestedUsers.push(uid);
    } else if (status === 'declined') {
      if (!event.declinedUsers) event.declinedUsers = [];
      event.declinedUsers.push(uid);
    }

    await event.save();
    const populated = await fetchEventAfterRsvp(event._id);
    const messages = {
      going: 'Đã chọn Tham gia',
      interested: 'Đã chọn Quan tâm',
      declined: 'Đã chọn Không tham gia',
      none: 'Đã bỏ phản hồi'
    };

    return res.status(200).json({
      success: true,
      message: messages[status] || 'Đã cập nhật',
      event: populated
    });
  } catch (error) {
    console.error('applyEventRsvpAndRespond:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật phản hồi sự kiện',
      error: error.message
    });
  }
}

// @desc    Create new event
// @route   POST /api/events
// @access  Private
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      category,
      maxParticipants,
      visibility,
      visibleToGroup,
      showGuestList,
      onlyOrganizersPost
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề sự kiện không được để trống'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Ngày diễn ra sự kiện không được để trống'
      });
    }

    const vis = ['public', 'private', 'group'].includes(visibility) ? visibility : 'public';
    let groupId = null;
    if (vis === 'group') {
      if (!visibleToGroup) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn nhóm khi hiển thị sự kiện theo nhóm'
        });
      }
      const g = await Group.findOne({
        _id: visibleToGroup,
        status: 'approved',
        'members.user': req.user.id
      });
      if (!g) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thuộc nhóm đã chọn hoặc nhóm chưa được duyệt'
        });
      }
      groupId = g._id;
    }

    let coHostInvites = [];
    if (req.body.coHostIds != null && req.body.coHostIds !== '') {
      let rawIds = [];
      try {
        rawIds =
          typeof req.body.coHostIds === 'string'
            ? JSON.parse(req.body.coHostIds)
            : req.body.coHostIds;
      } catch {
        rawIds = [];
      }
      if (!Array.isArray(rawIds)) rawIds = [];
      const organizerDoc = await User.findById(req.user.id).select('friends');
      const friendSet = new Set((organizerDoc?.friends || []).map((id) => id.toString()));
      const seen = new Set();
      const selfId = String(req.user.id);
      for (const raw of rawIds) {
        const sid = String(raw);
        if (!sid || sid === selfId || !friendSet.has(sid) || seen.has(sid)) continue;
        seen.add(sid);
        coHostInvites.push({ user: sid, status: 'pending' });
      }
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = getUploadedImageUrl(req.file);
    } else if (req.body.image && typeof req.body.image === 'string') {
      // Fallback: nếu gửi qua body (URL hoặc base64)
      imagePath = req.body.image;
    }

    const event = await Event.create({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      date,
      location: location ? location.trim() : undefined,
      category: category || 'Khác',
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      image: imagePath,
      organizer: req.user.id,
      visibility: vis,
      visibleToGroup: vis === 'group' ? groupId : null,
      showGuestList: parseBool(showGuestList, true),
      onlyOrganizersPost: parseBool(onlyOrganizersPost, true),
      coHostInvites
    });

    for (const inv of event.coHostInvites) {
      await createNotification({
        recipient: inv.user,
        sender: req.user.id,
        type: 'event_cohost_invite',
        event: event._id,
        message: `mời bạn làm đồng tổ chức sự kiện "${event.title.trim()}"`,
        link: `/events?cohostEvent=${event._id}`
      });
    }

    const populatedEvent = await Event.findById(event._id)
      .populate('organizer', 'name avatar email studentRole major')
      .populate('visibleToGroup', 'name avatar')
      .populate('coHostInvites.user', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo sự kiện',
      error: error.message
    });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Private
export const getAllEvents = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const userGroupIds = await Group.find({
      'members.user': userId,
      status: 'approved'
    })
      .select('_id')
      .lean()
      .then((rows) => rows.map((r) => r._id));

    let query = {};

    // Quyền xem: công khai / của bạn / nhóm bạn tham gia / riêng tư nếu đã tham gia
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } },
        { visibility: null },
        { organizer: userId },
        { participants: userId },
        { interestedUsers: userId },
        { declinedUsers: userId },
        {
          coHostInvites: { $elemMatch: { user: userId, status: 'accepted' } }
        },
        {
          visibility: 'private',
          $or: [{ organizer: userId }, { participants: userId }]
        },
        {
          visibility: 'group',
          $or: [{ organizer: userId }, { visibleToGroup: { $in: userGroupIds } }]
        }
      ]
    });

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Search by title or description
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const events = await Event.find(query)
      .populate('organizer', 'name avatar email studentRole major')
      .populate('visibleToGroup', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: 1 }); // Sort by upcoming dates first

    const count = await Event.countDocuments(query);

    const eventsWithCount = events.map((event) => ({
      ...event.toObject(),
      participantsCount: (event.participants || []).length,
      interestedCount: (event.interestedUsers || []).length,
      declinedCount: (event.declinedUsers || []).length
    }));

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      events: eventsWithCount
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách sự kiện',
      error: error.message
    });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name avatar studentRole major')
      .populate('participants', 'name avatar studentRole')
      .populate('interestedUsers', 'name avatar studentRole')
      .populate('declinedUsers', 'name avatar studentRole')
      .populate('visibleToGroup', 'name')
      .populate('coHostInvites.user', 'name avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const access = await evaluateEventAccess(event, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin sự kiện',
      error: error.message
    });
  }
};

// @desc    Danh sách bài viết thảo luận trong sự kiện
// @route   GET /api/events/:id/posts
// @access  Private
export const getEventPosts = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name avatar studentRole major')
      .populate('participants', 'name avatar studentRole')
      .populate('visibleToGroup', 'name')
      .populate('coHostInvites.user', 'name avatar');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const access = await evaluateEventAccess(event, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const posts = await Post.find({ event: event._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar studentRole major')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name avatar' }
      });
    const visiblePosts = posts.filter((post) => post.author);

    res.status(200).json({
      success: true,
      posts: visiblePosts
    });
  } catch (error) {
    console.error('getEventPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bài viết sự kiện',
      error: error.message
    });
  }
};

// @desc    Đăng bài trong tab Thảo luận sự kiện
// @route   POST /api/events/:id/posts
// @access  Private
export const createEventPost = async (req, res) => {
  try {
    const imageCount = req.uploadedImages?.length || 0;
    const fileCount = req.uploadedFiles?.length || 0;
    const hasMedia = imageCount + fileCount > 0;

    let contentBody = req.body.content != null ? String(req.body.content).trim() : '';
    if (!contentBody && hasMedia) {
      contentBody = 'Đính kèm';
    }
    if (!contentBody) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung hoặc đính kèm ít nhất một ảnh / tệp / video'
      });
    }

    const event = await Event.findById(req.params.id)
      .populate('coHostInvites.user', '_id')
      .populate('visibleToGroup', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const access = await evaluateEventAccess(event, req.user.id);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const uid = req.user.id;
    const orgId = (event.organizer?._id || event.organizer).toString();
    const isAcceptedCoHost = (event.coHostInvites || []).some(
      (c) => (c.user?._id || c.user)?.toString() === uid && c.status === 'accepted'
    );
    const onlyOrg = parseBool(event.onlyOrganizersPost, true);
    if (onlyOrg && orgId !== uid && !isAcceptedCoHost) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tổ chức và đồng tổ chức được đăng bài trên sự kiện này'
      });
    }

    let images = [];
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      images = req.uploadedImages.map((file) => getUploadedImageUrl(file)).filter(Boolean);
    }

    let files = [];
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      files = req.uploadedFiles.map((file) => ({
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: getUploadedFileUrl(file)
      }));
    }

    const normalizedTextBackground =
      images.length === 0 && files.length === 0
        ? sanitizeTextBackground(req.body.textBackground)
        : '';

    const allowedCategories = ['Học tập', 'Sự kiện', 'Thảo luận', 'Tài liệu', 'Nhóm', 'Khác'];
    let category = req.body.category != null ? String(req.body.category).trim() : '';
    if (!allowedCategories.includes(category)) {
      category = 'Sự kiện';
    }

    const canPostLecturerDocument =
      req.user.role === 'admin' || String(req.user.studentRole || '').trim() === 'Giảng viên';
    if (category === 'Tài liệu' && !canPostLecturerDocument) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Giảng viên hoặc Admin mới được đăng bài trong mục Tài liệu giảng viên'
      });
    }

    let tags = [];
    if (req.body.tags != null) {
      try {
        const raw = req.body.tags;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          tags = parsed.map((t) => String(t).trim()).filter(Boolean).slice(0, 30);
        }
      } catch {
        tags = [];
      }
    }

    const post = await Post.create({
      author: uid,
      authorNameSnapshot: String(req.user?.name || '').trim(),
      content: contentBody,
      textBackground: normalizedTextBackground,
      category,
      tags,
      images,
      files,
      event: event._id,
      status: 'approved',
      group: null
    });

    await User.findByIdAndUpdate(uid, { $inc: { postsCount: 1 } });

    const populatedPost = await Post.findById(post._id).populate(
      'author',
      'name avatar studentRole major'
    );

    const titleSnippet = (event.title || 'Sự kiện').trim();
    const eventLink = `/events/${event._id}`;
    const authorStr = String(uid);
    const memberId = (m) => {
      if (m == null) return '';
      if (typeof m === 'object' && m._id != null) return String(m._id);
      return String(m);
    };
    const interestedIds = [
      ...new Set((event.interestedUsers || []).map(memberId).filter(Boolean))
    ].filter((id) => id !== authorStr);
    const participantIds = [
      ...new Set((event.participants || []).map(memberId).filter(Boolean))
    ].filter((id) => id !== authorStr);

    const interestedSet = new Set(interestedIds);
    const notifInterested = interestedIds.map((recipient) =>
      createNotification({
        recipient,
        sender: uid,
        type: 'event',
        event: event._id,
        post: post._id,
        message: `Sự kiện «${titleSnippet}» có bài viết mới`,
        link: eventLink
      })
    );
    const notifParticipants = participantIds
      .filter((id) => !interestedSet.has(id))
      .map((recipient) =>
        createNotification({
          recipient,
          sender: uid,
          type: 'event',
          event: event._id,
          post: post._id,
          message: `Sự kiện «${titleSnippet}» có bài viết mới`,
          link: eventLink
        })
      );
    await Promise.all([...notifInterested, ...notifParticipants]);

    res.status(201).json({
      success: true,
      message: 'Đã đăng bài',
      post: populatedPost
    });
  } catch (error) {
    console.error('createEventPost:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng bài',
      error: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    // Check if user is organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa sự kiện này'
      });
    }

    // Handle image upload
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = getUploadedImageUrl(req.file);
    }

    // Clean up data
    if (updateData.title) updateData.title = updateData.title.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.location) updateData.location = updateData.location.trim();
    if (updateData.maxParticipants) {
      updateData.maxParticipants = parseInt(updateData.maxParticipants);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('organizer', 'name avatar email studentRole major');

    res.status(200).json({
      success: true,
      message: 'Cập nhật sự kiện thành công',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật sự kiện',
      error: error.message
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    // Check if user is organizer or admin
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa sự kiện này'
      });
    }

    const eventPostIds = await Post.find({ event: event._id }).distinct('_id');
    if (eventPostIds.length > 0) {
      await Comment.deleteMany({ post: { $in: eventPostIds } });
      await Post.deleteMany({ event: event._id });
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

// @desc    Join event (Tham gia — tương đương RSVP going)
// @route   POST /api/events/:id/join
// @access  Private
export const joinEvent = async (req, res) => applyEventRsvpAndRespond(req, res, 'going');

// @desc    Leave event (bỏ mọi phản hồi RSVP)
// @route   POST /api/events/:id/leave
// @access  Private
export const leaveEvent = async (req, res) => applyEventRsvpAndRespond(req, res, 'none');

// @desc    Đặt RSVP: going | interested | declined | none
// @route   POST /api/events/:id/rsvp
// @access  Private
export const setEventRsvp = async (req, res) => {
  const status = req.body?.status;
  if (!['going', 'interested', 'declined', 'none'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Trạng thái RSVP không hợp lệ (going, interested, declined, none)'
    });
  }
  return applyEventRsvpAndRespond(req, res, status);
};

// @desc    Chấp nhận lời mời đồng tổ chức
// @route   POST /api/events/:id/cohost-invite/accept
// @access  Private
export const acceptCoHostInvite = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const uid = req.user.id;
    const inv = event.coHostInvites.find(
      (c) => c.user.toString() === uid && c.status === 'pending'
    );
    if (!inv) {
      return res.status(400).json({
        success: false,
        message: 'Không có lời mời đồng tổ chức đang chờ cho tài khoản của bạn'
      });
    }

    inv.status = 'accepted';
    await event.save();

    await Notification.deleteMany({
      recipient: uid,
      type: 'event_cohost_invite',
      event: event._id
    });

    res.status(200).json({
      success: true,
      message: 'Bạn đã chấp nhận làm đồng tổ chức'
    });
  } catch (error) {
    console.error('acceptCoHostInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý lời mời',
      error: error.message
    });
  }
};

// @desc    Từ chối lời mời đồng tổ chức
// @route   POST /api/events/:id/cohost-invite/decline
// @access  Private
export const declineCoHostInvite = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const uid = req.user.id;
    const inv = event.coHostInvites.find(
      (c) => c.user.toString() === uid && c.status === 'pending'
    );
    if (!inv) {
      return res.status(400).json({
        success: false,
        message: 'Không có lời mời đồng tổ chức đang chờ cho tài khoản của bạn'
      });
    }

    inv.status = 'declined';
    await event.save();

    await Notification.deleteMany({
      recipient: uid,
      type: 'event_cohost_invite',
      event: event._id
    });

    res.status(200).json({
      success: true,
      message: 'Đã từ chối lời mời đồng tổ chức'
    });
  } catch (error) {
    console.error('declineCoHostInvite:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý lời mời',
      error: error.message
    });
  }
};

/** Gửi thông báo trong app (chuông) tới bạn bè để mời xem sự kiện — chỉ người trong danh sách bạn của người gửi. */
export const notifyEventInviteToFriends = async (req, res) => {
  try {
    const eventId = req.params.id;
    let recipientIds = req.body.recipientIds ?? req.body.userIds;
    if (!Array.isArray(recipientIds)) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu danh sách người nhận (recipientIds).'
      });
    }
    const uidStr = req.user.id.toString();
    recipientIds = [...new Set(recipientIds.map((x) => String(x)))].filter((id) => id && id !== uidStr);

    if (recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một người bạn.'
      });
    }
    if (recipientIds.length > 40) {
      return res.status(400).json({
        success: false,
        message: 'Tối đa 40 người mỗi lần.'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự kiện'
      });
    }

    const access = await evaluateEventAccess(event, uidStr);
    if (!access.allowed) {
      return res.status(access.status).json({
        success: false,
        message: access.message
      });
    }

    const sender = await User.findById(req.user.id).select('name friends');
    if (!sender) {
      return res.status(401).json({
        success: false,
        message: 'Không xác định được người gửi'
      });
    }

    const friendSet = new Set((sender.friends || []).map((f) => f.toString()));
    let sent = 0;
    for (const rid of recipientIds) {
      if (!friendSet.has(rid)) continue;
      await createNotification({
        recipient: rid,
        sender: req.user.id,
        type: 'event',
        event: event._id,
        message: `${sender.name} mời bạn xem sự kiện «${event.title}»`,
        link: `/events/${event._id}`
      });
      sent += 1;
    }

    res.status(200).json({
      success: true,
      message: `Đã gửi ${sent} thông báo mời.`,
      sentCount: sent
    });
  } catch (error) {
    console.error('notifyEventInviteToFriends:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi thông báo mời',
      error: error.message
    });
  }
};

