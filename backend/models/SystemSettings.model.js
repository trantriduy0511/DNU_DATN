import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
  // General Settings
  siteName: {
    type: String,
    default: 'DNU Social'
  },
  siteDescription: {
    type: String,
    default: 'Mạng xã hội cho sinh viên DNU'
  },
  siteLogo: {
    type: String,
    default: ''
  },
  
  // Registration Settings
  allowRegistration: {
    type: Boolean,
    default: true
  },
  requireEmailVerification: {
    type: Boolean,
    default: false
  },
  requireAdminApproval: {
    type: Boolean,
    default: false
  },
  
  // Post Settings
  autoApprovePosts: {
    type: Boolean,
    default: true
  },
  requirePostApproval: {
    type: Boolean,
    default: false
  },
  maxPostLength: {
    type: Number,
    default: 5000
  },
  maxFileSize: {
    type: Number,
    default: 10485760 // 10MB in bytes
  },
  allowedFileTypes: {
    type: [String],
    default: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  
  // Group Settings
  autoApproveGroups: {
    type: Boolean,
    default: false
  },
  requireGroupApproval: {
    type: Boolean,
    default: true
  },
  maxGroupsPerUser: {
    type: Number,
    default: 10
  },
  
  // Comment Settings
  allowComments: {
    type: Boolean,
    default: true
  },
  requireLoginToComment: {
    type: Boolean,
    default: true
  },
  maxCommentLength: {
    type: Number,
    default: 1000
  },
  
  // Notification Settings
  enableEmailNotifications: {
    type: Boolean,
    default: false
  },
  enablePushNotifications: {
    type: Boolean,
    default: true
  },
  
  // Security Settings
  maxLoginAttempts: {
    type: Number,
    default: 5
  },
  lockoutDuration: {
    type: Number,
    default: 30 // minutes
  },
  requireStrongPassword: {
    type: Boolean,
    default: false
  },
  minPasswordLength: {
    type: Number,
    default: 6
  },
  
  // Maintenance Settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'Hệ thống đang bảo trì. Vui lòng quay lại sau.'
  },
  
  // Other Settings
  maxUsersPerPage: {
    type: Number,
    default: 20
  },
  maxPostsPerPage: {
    type: Number,
    default: 20
  },
  enableAnalytics: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);

export default SystemSettings;


















