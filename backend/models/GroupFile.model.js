import mongoose from 'mongoose';

const groupFileSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Tên file không được để trống'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Bài giảng', 'Đề thi', 'Tài liệu tham khảo', 'Bài tập', 'Đồ án', 'Khác'],
    default: 'Khác'
  },
  tags: [{
    type: String,
    trim: true
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  downloadedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    downloadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupFile',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
groupFileSchema.index({ group: 1, category: 1, createdAt: -1 });
groupFileSchema.index({ group: 1, tags: 1 });
groupFileSchema.index({ uploadedBy: 1 });

const GroupFile = mongoose.model('GroupFile', groupFileSchema);

export default GroupFile;










