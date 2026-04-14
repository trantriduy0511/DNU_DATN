import mongoose from 'mongoose';

const groupInviteSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

groupInviteSchema.index({ group: 1, invitee: 1, status: 1 });
groupInviteSchema.index({ invitee: 1, status: 1 });

const GroupInvite = mongoose.model('GroupInvite', groupInviteSchema);

export default GroupInvite;
