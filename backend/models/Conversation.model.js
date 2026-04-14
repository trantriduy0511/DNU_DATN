import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  name: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validation: Direct conversations must have exactly 2 participants
conversationSchema.path('participants').validate(function(value) {
  if (this.type === 'direct') {
    return value.length === 2;
  }
  // Group conversations must have at least 2 participants
  return value.length >= 2;
}, 'Direct conversation phải có đúng 2 người, Group conversation phải có ít nhất 2 người');

// Index for faster queries
conversationSchema.index({ lastMessageTime: -1 });
conversationSchema.index({ type: 1, participants: 1 });

// Ensure unique direct conversation between two users
conversationSchema.index({ 
  type: 1, 
  participants: 1 
}, { 
  unique: true,
  partialFilterExpression: { type: 'direct' }
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

