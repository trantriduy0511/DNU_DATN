import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorNameSnapshot: {
    type: String,
    trim: true,
    default: ''
  },
  title: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator(value) {
        const hasText = typeof value === 'string' && value.trim().length > 0;
        const hasImages = Array.isArray(this.images) && this.images.length > 0;
        const hasFiles = Array.isArray(this.files) && this.files.length > 0;
        return hasText || hasImages || hasFiles;
      },
      message: 'Nội dung bài viết không được để trống'
    }
  },
  textBackground: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Học tập', 'Sự kiện', 'Thảo luận', 'Tài liệu', 'Nhóm', 'Khác'],
    default: 'Khác'
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    type: String
  }],
  files: [{
    name: String,
    size: String,
    // NOTE: don't use "type: String" here because in Mongoose "type" is a special key
    // and may cause this sub-schema to be interpreted as an array of strings.
    mimeType: String,
    url: String
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  shares: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  /** Bài viết trong tab Thảo luận của sự kiện (feed trang chủ: chỉ khi user Đã tham gia — xử lý ở post.controller) */
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  }
}, {
  timestamps: true
});

// Index for better search performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ status: 1 });
postSchema.index({ event: 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;


