import mongoose from 'mongoose';

const groupAnnouncementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề thông báo không được để trống'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Nội dung thông báo không được để trống'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  expiryDate: {
    type: Date,
    default: null // null = không có hạn
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
groupAnnouncementSchema.index({ group: 1, createdAt: -1 });
groupAnnouncementSchema.index({ group: 1, isPinned: -1, createdAt: -1 });

const GroupAnnouncement = mongoose.model('GroupAnnouncement', groupAnnouncementSchema);

export default GroupAnnouncement;










