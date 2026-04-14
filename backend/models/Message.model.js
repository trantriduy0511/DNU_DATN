import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      // Only required for direct messages
      return this.conversationType === 'direct';
    }
  },
  // For group messages, we don't need a specific receiver
  conversationType: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  content: {
    type: String,
    default: '',
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String
    },
    size: {
      type: Number
    }
  }],
  files: [{
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String
    }
  }],
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'mixed'],
    default: 'text'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  isRecalled: {
    type: Boolean,
    default: false
  },
  recalledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ isRead: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;





