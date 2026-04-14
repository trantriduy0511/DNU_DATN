import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: '',
    trim: true
  },
  images: [{
    type: String
  }],
  /** Trả lời một bình luận khác trong cùng bài viết */
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  /** Trích dẫn bài viết / bình luận đang phản hồi (hiển thị giống Facebook) */
  quotePreview: {
    kind: { type: String, enum: ['post', 'comment'], default: 'post' },
    text: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    authorName: { type: String, default: '' }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;


