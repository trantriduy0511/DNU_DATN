import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { uploadSingleImage, uploadImagesAndFiles } from '../middleware/upload.middleware.js';
import {
  createEvent,
  getAllEvents,
  getEventById,
  getEventPosts,
  createEventPost,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
  setEventRsvp,
  acceptCoHostInvite,
  declineCoHostInvite,
  notifyEventInviteToFriends
} from '../controllers/event.controller.js';

const router = express.Router();

router.post('/', protect, uploadSingleImage, createEvent);
router.get('/', protect, getAllEvents);
router.get('/:id/posts', protect, getEventPosts);
router.post('/:id/posts', protect, uploadImagesAndFiles, createEventPost);
router.post('/:id/invite-notify', protect, notifyEventInviteToFriends);
router.get('/:id', protect, getEventById);
router.put('/:id', protect, uploadSingleImage, updateEvent);
router.delete('/:id', protect, deleteEvent);
router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);
router.post('/:id/rsvp', protect, setEventRsvp);
router.post('/:id/cohost-invite/accept', protect, acceptCoHostInvite);
router.post('/:id/cohost-invite/decline', protect, declineCoHostInvite);

export default router;












