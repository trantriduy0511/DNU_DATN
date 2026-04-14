import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { uploadImagesAndFiles } from '../middleware/upload.middleware.js';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  createGroup,
  addParticipants,
  removeParticipant,
  getGroupParticipants,
  updateGroupAvatar,
  deleteMessage,
  deleteConversation,
  recallMessage
} from '../controllers/message.controller.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Get unread count
router.get('/unread/count', getUnreadCount);

// Get all conversations
router.get('/conversations', getConversations);

// Delete a conversation
router.delete('/conversations/:conversationId', deleteConversation);

// Get or create conversation with a user
router.get('/conversation/:userId', getOrCreateConversation);

// Group chat routes (must be before /:conversationId)
router.post('/groups', createGroup);
router.get('/groups/:conversationId/participants', getGroupParticipants);
router.put('/groups/:conversationId/participants', addParticipants);
router.delete('/groups/:conversationId/participants/:userId', removeParticipant);
router.put('/groups/:conversationId/avatar', uploadImagesAndFiles, updateGroupAvatar);

// Delete a message (must be before /:conversationId routes to avoid conflict)
router.delete('/delete/:messageId', deleteMessage);

// Recall a message (must be before /:conversationId routes to avoid conflict)
router.put('/recall/:messageId', recallMessage);

// Get messages in a conversation
router.get('/:conversationId', getMessages);

// Send a message (with file upload support)
router.post('/:conversationId', uploadImagesAndFiles, sendMessage);

// Mark messages as read
router.put('/:conversationId/read', markAsRead);

export default router;





