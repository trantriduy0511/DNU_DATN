import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import {
  getStatistics,
  createUserAdmin,
  getAllUsersAdmin,
  updateUserStatus,
  updateUserRole,
  updateUserStudentRole,
  deleteUser,
  getAllPostsAdmin,
  approvePost,
  rejectPost,
  deletePostAdmin,
  getRecentActivities,
  getAllCommentsAdmin,
  deleteCommentAdmin,
  getAllEventsAdmin,
  createEventAdmin,
  updateEventAdmin,
  deleteEventAdmin,
  getAllNotificationsAdmin,
  sendNotificationAdmin,
  deleteNotificationAdmin,
  getNotificationStatistics,
  approveGroup,
  rejectGroup,
  getPendingGroups,
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings
} from '../controllers/admin.controller.js';

const router = express.Router();

// All routes require admin role
router.use(protect, requireAdmin);

router.get('/statistics', getStatistics);
router.post('/users', createUserAdmin);
router.get('/users', getAllUsersAdmin);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/student-role', updateUserStudentRole);
router.delete('/users/:id', deleteUser);
router.get('/posts', getAllPostsAdmin);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);
router.delete('/posts/:id', deletePostAdmin);
router.get('/comments', getAllCommentsAdmin);
router.delete('/comments/:id', deleteCommentAdmin);
router.get('/events', getAllEventsAdmin);
router.post('/events', createEventAdmin);
router.put('/events/:id', updateEventAdmin);
router.delete('/events/:id', deleteEventAdmin);
router.get('/activities', getRecentActivities);

// Notification routes
router.get('/notifications', getAllNotificationsAdmin);
router.get('/notifications/statistics', getNotificationStatistics);
router.post('/notifications', sendNotificationAdmin);
router.delete('/notifications/:id', deleteNotificationAdmin);

// Group approval routes
router.get('/groups/pending', getPendingGroups);
router.put('/groups/:id/approve', approveGroup);
router.put('/groups/:id/reject', rejectGroup);

// System settings routes
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);
router.post('/settings/reset', resetSystemSettings);

export default router;

