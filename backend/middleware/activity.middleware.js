import User from '../models/User.model.js';

// Middleware to update user's last activity
export const updateActivity = async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      await User.findByIdAndUpdate(req.user.id, {
        lastActive: Date.now(),
        isOnline: true
      });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }
  next();
};

// Function to check and update offline users (users inactive for >5 minutes)
export const updateOfflineUsers = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await User.updateMany(
      {
        lastActive: { $lt: fiveMinutesAgo },
        isOnline: true
      },
      {
        isOnline: false
      }
    );
  } catch (error) {
    console.error('Error updating offline users:', error);
  }
};

// Run offline check every minute
setInterval(updateOfflineUsers, 60 * 1000);





















