import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { updateActivity } from "../middleware/activity.middleware.js";
import {
  getAllUsers,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend,
  getUserPosts,
  getSavedPosts,
  savePost,
  unsavePost,
  updateProfile,
  getOnlineUsers,
  getOnlineCount,
  blockUser,
  unblockUser,
  getBlockedUsers,
  uploadAvatar,
  uploadCoverPhoto,
  followUser,
  unfollowUser,
  getFollowStatus,
} from "../controllers/user.controller.js";
import { uploadSingleImage } from "../middleware/upload.middleware.js";

const router = express.Router();

// Apply activity middleware to all routes
router.use(protect, updateActivity);

router.get("/search", searchUsers);
router.get("/online/count", getOnlineCount);
router.get("/online", getOnlineUsers);
router.get("/blocked", getBlockedUsers);
router.get("/", getAllUsers);
router.put("/profile", updateProfile);
router.get("/follow/status/:userId", getFollowStatus);
router.post("/follow/:userId", followUser);
router.delete("/follow/:userId", unfollowUser);
router.post("/upload-avatar", uploadSingleImage, uploadAvatar);
router.post("/upload-cover", uploadSingleImage, uploadCoverPhoto);
router.post("/block/:userId", blockUser);
router.delete("/block/:userId", unblockUser);
router.get("/:id", getUserById);
router.post("/friend/:id", addFriend);
router.delete("/friend/:id", removeFriend);
router.get("/:id/posts", getUserPosts);
router.get("/saved/posts", getSavedPosts);
router.post("/save/:postId", savePost);
router.delete("/save/:postId", unsavePost);

export default router;
