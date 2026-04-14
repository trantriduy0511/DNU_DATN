import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriend,
  getFriendStatus,
  getFriendRequests,
  getOnlineFriends,
  getFriends,
  getFriendsByUserId
} from '../controllers/friend.controller.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/online', getOnlineFriends);

// Get friends list
router.get('/', getFriends);

// Get friends list by userId
router.get('/user/:userId', getFriendsByUserId);

// Get friend requests
router.get('/requests', getFriendRequests);

// Get friend status with a user
router.get('/status/:userId', getFriendStatus);

// Send friend request
router.post('/request/:userId', sendFriendRequest);

// Accept friend request
router.put('/accept/:userId', acceptFriendRequest);

// Reject friend request
router.put('/reject/:userId', rejectFriendRequest);

// Cancel sent friend request
router.delete('/request/:userId', cancelFriendRequest);

// Unfriend
router.delete('/:userId', unfriend);

export default router;





















