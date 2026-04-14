import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['comment', 'like', 'follow', 'event', 'event_cohost_invite', 'group', 'group_invite', 'message', 'friend_request', 'admin', 'question', 'answer', 'announcement', 'file'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupQuestion'
  },
  answer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupAnswer'
  },
  announcement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupAnnouncement'
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupFile'
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;





