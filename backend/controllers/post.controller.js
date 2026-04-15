import mongoose from 'mongoose';
import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import Event from '../models/Event.model.js';
import { createNotification } from './notification.controller.js';
import { getUploadedFileUrl, getUploadedImageUrl } from '../utils/uploadUrl.js';

export function sanitizeTextBackground(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (value.length > 180) return '';
  const allowedPattern = /^[a-zA-Z0-9(),.%#\-\s]+$/;
  if (!allowedPattern.test(value)) return '';
  if (value.startsWith('linear-gradient(') || value.startsWith('radial-gradient(')) return value;
  if (value.startsWith('#') || value.startsWith('rgb(') || value.startsWith('rgba(') || value.startsWith('hsl(') || value.startsWith('hsla(')) return value;
  return '';
}

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { title, content, category, textBackground } = req.body;

    // Validate category (nếu có)
    const validCategories = ['Học tập', 'Sự kiện', 'Thảo luận', 'Tài liệu', 'Nhóm', 'Khác'];
    const postCategory = category && validCategories.includes(category) ? category : 'Khác';
    const canPostLecturerDocument = req.user.role === 'admin' || req.user.studentRole === 'Giảng viên';
    if (postCategory === 'Tài liệu' && !canPostLecturerDocument) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Giảng viên hoặc Admin mới được đăng bài trong mục Tài liệu giảng viên'
      });
    }

    // Parse tags từ FormData (có thể là JSON string hoặc array)
    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        // Validate tags là array và filter empty
        if (Array.isArray(tags)) {
          tags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
        } else {
          tags = [];
        }
      } catch (e) {
        tags = [];
      }
    }

    // Xử lý ảnh từ file upload
    let images = [];
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      images = req.uploadedImages.map((file) => getUploadedImageUrl(file)).filter(Boolean);
    } else if (req.body.images && Array.isArray(req.body.images)) {
      // Fallback: nếu gửi qua body (base64 hoặc URL)
      images = req.body.images.filter(img => img && typeof img === 'string' && img.trim().length > 0);
    }

    // Xử lý files từ file upload
    let files = [];
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      // Tạo metadata cho files đã upload
      files = req.uploadedFiles.map(file => ({
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: getUploadedFileUrl(file)
      }));
    } else if (req.body.files) {
      // Fallback: nếu gửi qua body (metadata only)
      try {
        files = typeof req.body.files === 'string' ? JSON.parse(req.body.files) : req.body.files;
        // Validate files là array
        if (!Array.isArray(files)) {
          files = [];
        }
      } catch (e) {
        files = [];
      }
    }

    const text = typeof content === 'string' ? content.trim() : '';
    const hasMedia = images.length > 0 || files.length > 0;
    if (!text && !hasMedia) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung hoặc đính kèm ít nhất một ảnh / tệp / video'
      });
    }

    const postBodyContent = text || '';

    // Debug log
    console.log('Create post - Images:', images.length, 'Files:', files.length);
    console.log('Uploaded files:', req.uploadedFiles?.length || 0);
    const normalizedTextBackground = images.length === 0 && files.length === 0
      ? sanitizeTextBackground(textBackground)
      : '';

    const post = await Post.create({
      author: req.user.id,
      title: title ? title.trim() : undefined,
      content: postBodyContent,
      textBackground: normalizedTextBackground,
      category: postCategory,
      tags,
      images,
      files,
      status: 'approved'
    });

    // Update user post count
    await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'name avatar studentRole major role');

    res.status(201).json({
      success: true,
      message: 'Đăng bài viết thành công',
      post: populatedPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo bài viết',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const eventNotSetClause = () => ({
  $or: [{ event: { $exists: false } }, { event: null }]
});

/** Chuẩn hóa thành ObjectId (friends/following có thể là ObjectId, string, hoặc object populate có _id). */
function normalizeRefToObjectId(ref) {
  if (ref == null) return null;
  let v = ref;
  if (typeof v === 'object' && v !== null) {
    if (v._id != null) v = v._id;
    else if (typeof v.toHexString === 'function') {
      try {
        return new mongoose.Types.ObjectId(v.toHexString());
      } catch {
        return null;
      }
    }
  }
  const s = String(v);
  if (!mongoose.Types.ObjectId.isValid(s)) return null;
  return new mongoose.Types.ObjectId(s);
}

/** Gộp id tác giả: mình + bạn bè + đang theo dõi (theo dõi ≠ kết bạn nhưng vẫn thấy bài ở feed) */
function uniqueAuthorIds(meId, friends = [], following = []) {
  const map = new Map();
  const push = (ref) => {
    const oid = normalizeRefToObjectId(ref);
    if (!oid) return;
    map.set(String(oid), oid);
  };
  push(meId);
  (friends || []).forEach(push);
  (following || []).forEach(push);
  return Array.from(map.values());
}

/** ID sự kiện mà user đã Tham gia (participants) — bài trong các sự kiện này mới vào feed trang chủ. Quan tâm chỉ nhận thông báo (xử lý khi đăng bài sự kiện). */
async function getHomeFeedEventIdsForUser(userId) {
  const oid = normalizeRefToObjectId(userId);
  if (!oid) return [];
  const rows = await Event.find({ participants: oid }).select('_id').lean();
  return rows.map((r) => r._id);
}

/**
 * Feed trang chủ: bài cá nhân (không nhóm) + bài nhóm mà user là thành viên và chưa bỏ theo dõi nhóm đó
 * + bài trong sự kiện mà user đã Tham gia (không gồm chỉ Quan tâm).
 * @param {boolean} networkPersonal - true: chỉ bài từ chính mình / bạn bè / người đang theo dõi (trang chủ "bảng tin")
 * @param {mongoose.Types.ObjectId[]} feedEventIds - bài có event trong danh sách này được gộp (không lọc author theo network)
 * @param {string|null} categoryPersonalOnly - khi set cùng networkPersonal: chỉ áp `category` cho nhánh bài cá nhân; bài nhóm + sự kiện vẫn hiện đủ (mới nhất)
 */
function buildHomeFeedScope(
  followHomeGroupIds,
  networkAuthorIds,
  networkPersonal,
  feedEventIds = [],
  categoryPersonalOnly = null
) {
  const ev = eventNotSetClause();
  const noGroup = { $or: [{ group: { $exists: false } }, { group: null }] };
  const personalAuthorClause = networkPersonal
    ? { author: { $in: networkAuthorIds } }
    : {};
  const firstBranchParts = [noGroup, ev, personalAuthorClause].filter((x) => Object.keys(x).length > 0);
  if (categoryPersonalOnly && networkPersonal) {
    firstBranchParts.push({ category: categoryPersonalOnly });
  }
  const branches = [{ $and: firstBranchParts }];
  if (followHomeGroupIds.length > 0) {
    branches.push({
      $and: [{ group: { $in: followHomeGroupIds } }, ev]
    });
  }
  if (feedEventIds.length > 0) {
    branches.push({ event: { $in: feedEventIds } });
  }
  return { $or: branches };
}

// @desc    Get all posts (trang chủ: bài cá nhân từ mạng lưới + bài nhóm đã tham gia + bài sự kiện đã Tham gia). personalScope=network + category: category chỉ lọc bài cá nhân; nhóm/sự kiện vẫn đủ.
// @route   GET /api/posts
// @access  Private
export const getAllPosts = async (req, res) => {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 10,
      status = 'approved',
      author,
      groupFeedOnly,
      personalScope
    } = req.query;

    const rawLimit = parseInt(String(limit), 10);
    const limitNum = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 60) : 10;
    const rawPage = parseInt(String(page), 10);
    const pageNum = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    const notGroupOrEvent = [
      {
        $or: [{ group: { $exists: false } }, { group: null }]
      },
      {
        $or: [{ event: { $exists: false } }, { event: null }]
      }
    ];

    let query;

    if (author) {
      // Hồ sơ / lọc theo tác giả: giữ hành vi cũ (không gộp bài nhóm vào danh sách theo author)
      query = {
        status,
        $and: notGroupOrEvent,
        author
      };

      if (category && category !== 'Tất cả') {
        query.category = category;
      }

      if (search) {
        query = {
          $and: [
            ...notGroupOrEvent,
            { status },
            { author },
            {
              $or: [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
              ]
            }
          ]
        };
        if (category && category !== 'Tất cả') {
          query.$and.push({ category });
        }
      }
    } else {
      /** Dùng req.user từ middleware protect (đã load đủ từ DB): tránh lệch với findById riêng và đảm bảo friends/following đúng phiên. */
      const me = req.user;
      const memberGroupIds = me?.groups || [];
      const hidden = new Set((me?.groupsHiddenFromHomeFeed || []).map((g) => String(g)));
      const followHomeGroupIds = memberGroupIds.filter((gid) => !hidden.has(String(gid)));
      const groupOnly = groupFeedOnly === 'true' || groupFeedOnly === '1';
      const networkPersonal =
        personalScope === 'network' || personalScope === '1' || personalScope === 'true';
      const networkAuthorIds = uniqueAuthorIds(me._id || me.id, me.friends || [], me.following || []);
      const feedEventIds = groupOnly ? [] : await getHomeFeedEventIdsForUser(me._id || me.id);
      /** Bảng tin: lọc danh mục chỉ trên bài cá nhân; bài nhóm + sự kiện luôn gộp (mới của nhóm / sự kiện đã tham gia). */
      const categoryPersonalOnly =
        !groupOnly && networkPersonal && category && category !== 'Tất cả' ? category : null;
      const homeFeedScope = groupOnly
        ? { $and: [{ group: { $in: followHomeGroupIds } }, eventNotSetClause()] }
        : buildHomeFeedScope(
            followHomeGroupIds,
            networkAuthorIds,
            networkPersonal,
            feedEventIds,
            categoryPersonalOnly
          );

      if (search) {
        query = {
          $and: [
            homeFeedScope,
            { status },
            {
              $or: [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
              ]
            }
          ]
        };
        if (category && category !== 'Tất cả' && !categoryPersonalOnly) {
          query.$and.push({ category });
        }
      } else {
        query = {
          $and: [homeFeedScope, { status }]
        };
        if (category && category !== 'Tất cả' && !categoryPersonalOnly) {
          query.$and.push({ category });
        }
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'name avatar studentRole major role')
      .populate('group', 'name avatar')
      .populate('event', 'title date status image')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name avatar' }
      })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .sort({ createdAt: -1 });

    const count = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
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

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Private
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name avatar studentRole major role')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name avatar' }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bài viết',
      error: error.message
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check if user is post owner
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa bài viết này'
      });
    }

    // Prepare update data
    const updateData = {};

    // Update content
    if (req.body.content !== undefined) {
      updateData.content = req.body.content.trim();
    }

    if (req.body.textBackground !== undefined) {
      const hasAnyMedia = (post.images?.length || 0) > 0 || (post.files?.length || 0) > 0;
      updateData.textBackground = hasAnyMedia ? '' : sanitizeTextBackground(req.body.textBackground);
    }

    // Update category
    if (req.body.category !== undefined) {
      const validCategories = ['Học tập', 'Sự kiện', 'Thảo luận', 'Tài liệu', 'Nhóm', 'Khác'];
      const nextCategory = validCategories.includes(req.body.category) ? req.body.category : 'Khác';
      const canPostLecturerDocument = req.user.role === 'admin' || req.user.studentRole === 'Giảng viên';
      if (nextCategory === 'Tài liệu' && post.category !== 'Tài liệu' && !canPostLecturerDocument) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Giảng viên hoặc Admin mới được đăng bài trong mục Tài liệu giảng viên'
        });
      }
      updateData.category = nextCategory;
    }

    // Update tags
    if (req.body.tags !== undefined) {
      try {
        let tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        if (Array.isArray(tags)) {
          tags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
          updateData.tags = tags;
        }
      } catch (e) {
        // Keep existing tags if parsing fails
      }
    }

    // Handle images
    let images = [];
    
    // Keep existing images if provided
    if (req.body.existingImages) {
      try {
        const existingImages = typeof req.body.existingImages === 'string' 
          ? JSON.parse(req.body.existingImages) 
          : req.body.existingImages;
        if (Array.isArray(existingImages)) {
          images = existingImages.filter(img => img && typeof img === 'string');
        }
      } catch (e) {
        // If parsing fails, keep current images
        images = post.images || [];
      }
    } else {
      // If no existingImages provided, keep all current images
      images = post.images || [];
    }

    // Add new uploaded images
    if (req.uploadedImages && req.uploadedImages.length > 0) {
      const newImagePaths = req.uploadedImages.map((file) => getUploadedImageUrl(file)).filter(Boolean);
      images = [...images, ...newImagePaths];
    }

    updateData.images = images;
    if (images.length > 0) {
      updateData.textBackground = '';
    }

    // Handle files
    let files = [];
    
    // Keep existing files if provided
    if (req.body.existingFiles) {
      try {
        const existingFiles = typeof req.body.existingFiles === 'string'
          ? JSON.parse(req.body.existingFiles)
          : req.body.existingFiles;
        if (Array.isArray(existingFiles)) {
          files = existingFiles.filter(file => file && typeof file === 'object');
        }
      } catch (e) {
        // If parsing fails, keep current files
        files = post.files || [];
      }
    } else {
      // If no existingFiles provided, keep all current files
      files = post.files || [];
    }

    // Add new uploaded files
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      const newFiles = req.uploadedFiles.map(file => ({
        name: file.originalname,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: getUploadedFileUrl(file)
      }));
      files = [...files, ...newFiles];
    }
    if (files.length > 0) {
      updateData.textBackground = '';
    }

    updateData.files = files;

    // Update post
    post = await Post.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('author', 'name avatar studentRole major role');

    res.status(200).json({
      success: true,
      message: 'Cập nhật bài viết thành công',
      post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật bài viết',
      error: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    // Check if user is post owner or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bài viết này'
      });
    }

    await post.deleteOne();

    // Update user post count
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });

    res.status(200).json({
      success: true,
      message: 'Đã xóa bài viết'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa bài viết',
      error: error.message
    });
  }
};

// @desc    Like post
// @route   POST /api/posts/:id/like
// @access  Private
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Đã thích bài viết này'
      });
    }

    post.likes.push(req.user.id);
    await post.save();

    // Create notification for post author (if not liking own post)
    if (post.author.toString() !== req.user.id) {
      await createNotification({
        recipient: post.author,
        sender: req.user.id,
        type: 'like',
        post: post._id,
        message: `đã thích bài viết của bạn`,
        link: `/posts/${post._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã thích bài viết',
      likesCount: post.likes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi thích bài viết',
      error: error.message
    });
  }
};

// @desc    Unlike post
// @route   DELETE /api/posts/:id/like
// @access  Private
export const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Đã bỏ thích bài viết',
      likesCount: post.likes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi bỏ thích bài viết',
      error: error.message
    });
  }
};

// @desc    Share post
// @route   POST /api/posts/:id/share
// @access  Private
export const sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    post.shares += 1;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Đã chia sẻ bài viết',
      sharesCount: post.shares
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi chia sẻ bài viết',
      error: error.message
    });
  }
};

// @desc    Save post
// @route   POST /api/posts/:id/save
// @access  Private
export const savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const user = await User.findById(req.user.id);

    if (user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Đã lưu bài viết này'
      });
    }

    user.savedPosts.push(req.params.id);
    await user.save();

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
// @route   DELETE /api/posts/:id/save
// @access  Private
export const unsavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.savedPosts = user.savedPosts.filter(id => id.toString() !== req.params.id);
    await user.save();

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

// @desc    Get saved posts
// @route   GET /api/posts/saved
// @access  Private
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedPosts',
      populate: {
        path: 'author',
        select: 'name avatar studentRole major'
      },
      options: { sort: { createdAt: -1 } }
    });

    res.status(200).json({
      success: true,
      count: user.savedPosts.length,
      posts: user.savedPosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bài viết đã lưu',
      error: error.message
    });
  }
};


