import mongoose from 'mongoose';

const groupQuestionSchema = new mongoose.Schema({
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
    required: [true, 'Tiêu đề câu hỏi không được để trống'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Nội dung câu hỏi không được để trống'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['Học tập', 'Kỹ thuật', 'Tổ chức', 'Khác'],
    default: 'Học tập'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  bestAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupAnswer',
    default: null
  },
  answersCount: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
groupQuestionSchema.index({ group: 1, createdAt: -1 });
groupQuestionSchema.index({ group: 1, isPinned: -1, createdAt: -1 });
groupQuestionSchema.index({ group: 1, isSolved: -1 });
groupQuestionSchema.index({ author: 1 });

const GroupQuestion = mongoose.model('GroupQuestion', groupQuestionSchema);

export default GroupQuestion;










