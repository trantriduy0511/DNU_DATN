import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tiêu đề sự kiện không được để trống'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Ngày diễn ra sự kiện không được để trống']
  },
  location: {
    type: String,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  /** Quan tâm (RSVP kiểu Facebook — không tính vào chỗ tham gia trực tiếp) */
  interestedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  /** Không tham gia / ẩn khỏi phần đang quan tâm */
  declinedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxParticipants: {
    type: Number
  },
  image: {
    type: String
  },
  category: {
    type: String,
    enum: ['Học thuật', 'Thi đấu', 'Workshop', 'Hackathon', 'Seminar', 'Khác'],
    default: 'Khác'
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  /** Ai được xem sự kiện trong danh sách */
  visibility: {
    type: String,
    enum: ['public', 'private', 'group'],
    default: 'public'
  },
  /** Khi visibility === 'group' */
  visibleToGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  showGuestList: {
    type: Boolean,
    default: true
  },
  /** Chỉ người tổ chức (và đồng tổ chức sau này) được đăng nội dung trong sự kiện */
  onlyOrganizersPost: {
    type: Boolean,
    default: true
  },
  /** Lời mời đồng tổ chức (bạn bè); chấp nhận/từ chối xử lý sau */
  coHostInvites: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
      }
    }
  ]
}, {
  timestamps: true
});

const Event = mongoose.model('Event', eventSchema);

export default Event;


