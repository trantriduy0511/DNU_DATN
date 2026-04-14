import mongoose from 'mongoose';

const groupAnswerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupQuestion',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Nội dung câu trả lời không được để trống'],
    trim: true
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isBestAnswer: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
groupAnswerSchema.index({ question: 1, createdAt: -1 });
groupAnswerSchema.index({ author: 1 });

const GroupAnswer = mongoose.model('GroupAnswer', groupAnswerSchema);

export default GroupAnswer;










