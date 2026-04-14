import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên nhóm không được để trống'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: '📚'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['Học tập', 'Sự kiện', 'Dự án', 'Khác'],
    default: 'Học tập'
  },
  coverPhoto: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  rules: {
    type: String,
    trim: true,
    default: ''
  },
  settings: {
    // Quyền truy cập nhóm
    accessType: {
      type: String,
      enum: ['public', 'private', 'approval', 'invite-only'],
      default: 'public'
    },
    // Quyền đăng bài
    postPermission: {
      type: String,
      enum: ['all-members', 'admin-moderator', 'approval-required'],
      default: 'all-members'
    },
    // Quyền bình luận
    commentPermission: {
      type: String,
      enum: ['all-members', 'members-only', 'disabled'],
      default: 'all-members'
    },
    // Các cài đặt khác
    allowFileUpload: {
      type: Boolean,
      default: true
    },
    allowMemberInvite: {
      type: Boolean,
      default: true
    }
  },
  // Trạng thái duyệt nhóm
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  // Lý do từ chối (nếu bị reject)
  rejectionReason: {
    type: String,
    default: null
  },
  // Admin đã duyệt/từ chối
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Thời gian duyệt
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const Group = mongoose.model('Group', groupSchema);

export default Group;


