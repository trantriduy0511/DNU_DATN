import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { uploadImagesAndFiles } from '../middleware/upload.middleware.js';
import {
  createGroup,
  getAllGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  sendGroupInvite,
  acceptGroupInvite,
  declineGroupInvite,
  removeMember,
  updateMemberRole,
  getGroupMembers,
  getGroupPosts,
  createGroupPost,
  updateGroupSettings,
  discoverGroups,
  updateGroupHomeFeedFollow
} from '../controllers/group.controller.js';
import {
  createAnnouncement,
  getGroupAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead
} from '../controllers/announcement.controller.js';
import {
  uploadGroupFile,
  getGroupFiles,
  downloadGroupFile,
  deleteGroupFile,
  updateGroupFile
} from '../controllers/groupFile.controller.js';
import {
  createQuestion,
  getGroupQuestions,
  getQuestionById,
  voteQuestion,
  createAnswer,
  voteAnswer,
  markBestAnswer,
  deleteQuestion
} from '../controllers/groupQuestion.controller.js';

const router = express.Router();

router.post('/', protect, uploadImagesAndFiles, createGroup);
router.get('/', protect, getAllGroups);
router.get('/discover', protect, discoverGroups);
router.patch('/:id/home-feed', protect, updateGroupHomeFeedFollow);
router.get('/:id', protect, getGroupById);
router.post('/:id/join', protect, joinGroup);
router.post('/:id/leave', protect, leaveGroup);
router.put('/:id', protect, updateGroup);
router.put('/:id/settings', protect, uploadImagesAndFiles, updateGroupSettings);
router.delete('/:id', protect, deleteGroup);

// Member management routes
router.get('/:id/members', protect, getGroupMembers);
router.post('/:id/invites', protect, sendGroupInvite);
router.post('/:id/invites/:inviteId/accept', protect, acceptGroupInvite);
router.post('/:id/invites/:inviteId/decline', protect, declineGroupInvite);
router.delete('/:id/members/:memberId', protect, removeMember);
router.put('/:id/members/:memberId', protect, updateMemberRole);

// Group posts routes
router.get('/:id/posts', protect, getGroupPosts);
router.post('/:id/posts', protect, uploadImagesAndFiles, createGroupPost);

// Group announcements routes
router.get('/:groupId/announcements', protect, getGroupAnnouncements);
router.post('/:groupId/announcements', protect, createAnnouncement);
router.get('/:groupId/announcements/:id', protect, getAnnouncementById);
router.put('/:groupId/announcements/:id', protect, updateAnnouncement);
router.delete('/:groupId/announcements/:id', protect, deleteAnnouncement);
router.post('/:groupId/announcements/:id/read', protect, markAsRead);

// Group files routes
router.get('/:groupId/files', protect, getGroupFiles);
router.post('/:groupId/files', protect, uploadImagesAndFiles, uploadGroupFile);
router.get('/:groupId/files/:id/download', protect, downloadGroupFile);
router.put('/:groupId/files/:id', protect, updateGroupFile);
router.delete('/:groupId/files/:id', protect, deleteGroupFile);

// Group questions (Q&A) routes
router.get('/:groupId/questions', protect, getGroupQuestions);
router.post('/:groupId/questions', protect, createQuestion);
router.get('/:groupId/questions/:id', protect, getQuestionById);
router.post('/:groupId/questions/:id/vote', protect, voteQuestion);
router.delete('/:groupId/questions/:id', protect, deleteQuestion);

// Group answers routes
router.post('/:groupId/questions/:questionId/answers', protect, createAnswer);
router.post('/:groupId/questions/:questionId/answers/:id/vote', protect, voteAnswer);
router.post('/:groupId/questions/:questionId/answers/:id/best', protect, markBestAnswer);

export default router;

