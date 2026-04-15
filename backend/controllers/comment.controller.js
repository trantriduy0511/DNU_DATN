import Comment from '../models/Comment.model.js';
import Post from '../models/Post.model.js';
import { createNotification } from './notification.controller.js';
import { getUploadedImageUrl } from '../utils/uploadUrl.js';

// @desc    Create comment
// @route   POST /api/comments/:postId
// @access  Private
export const createComment = async (req, res) => {
  try {
    const { content, replyTo, quotePreview: rawQuote } = req.body;
    const { postId } = req.params;
    const text = String(content || '').trim();
    const imageFiles = Array.isArray(req.uploadedImages)
      ? req.uploadedImages
      : (Array.isArray(req.files) ? req.files : []);
    const images = imageFiles.map((file) => getUploadedImageUrl(file)).filter(Boolean);

    const post = await Post.findById(postId).populate('author', 'name');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    let replyToId = null;
    let parentAuthorIdForReply = null;
    if (replyTo) {
      const parent = await Comment.findById(replyTo).populate('author', '_id');
      if (!parent || parent.post.toString() !== String(postId)) {
        return res.status(400).json({
          success: false,
          message: 'Bình luận gốc không hợp lệ'
        });
      }
      replyToId = parent._id;
      parentAuthorIdForReply =
        parent.author?._id?.toString() || parent.author?.toString() || null;
    }

    let quotePreview = undefined;
    if (rawQuote && typeof rawQuote === 'object') {
      const kind = rawQuote.kind === 'comment' ? 'comment' : 'post';
      const text = String(rawQuote.text || '').trim().slice(0, 500);
      const imageUrl = String(rawQuote.imageUrl || '').trim().slice(0, 2000);
      const authorName = String(rawQuote.authorName || '').trim().slice(0, 200);
      if (text || imageUrl || authorName) {
        quotePreview = { kind, text, imageUrl, authorName };
      }
    }

    if (!text && images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung bình luận hoặc ảnh không được để trống'
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user.id,
      content: text,
      images,
      ...(replyToId ? { replyTo: replyToId } : {}),
      ...(quotePreview ? { quotePreview } : {})
    });

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name avatar studentRole');

    if (
      replyToId &&
      parentAuthorIdForReply &&
      parentAuthorIdForReply !== req.user.id
    ) {
      await createNotification({
        recipient: parentAuthorIdForReply,
        sender: req.user.id,
        type: 'comment',
        post: postId,
        comment: comment._id,
        message: `đã trả lời bình luận của bạn`,
        link: `/posts/${postId}`
      });
    } else if (!replyToId && post.author.toString() !== req.user.id) {
      // Create notification for post author (if not commenting on own post)
      await createNotification({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        post: postId,
        comment: comment._id,
        message: `đã bình luận về bài viết của bạn`,
        link: `/posts/${postId}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đã thêm bình luận',
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo bình luận',
      error: error.message
    });
  }
};

// @desc    Get comments by post
// @route   GET /api/comments/:postId
// @access  Private
export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name avatar studentRole')
      .populate('replies.author', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bình luận',
      error: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bình luận'
      });
    }

    // Check if user is comment owner or admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      });
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Đã xóa bình luận'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa bình luận',
      error: error.message
    });
  }
};


