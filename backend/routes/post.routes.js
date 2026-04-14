import express from 'express';
import { protect, checkUserStatus } from '../middleware/auth.middleware.js';
import { uploadImagesAndFiles } from '../middleware/upload.middleware.js';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  sharePost,
  savePost,
  unsavePost,
  getSavedPosts
} from '../controllers/post.controller.js';

const router = express.Router();

router.post('/', protect, checkUserStatus, uploadImagesAndFiles, createPost);
router.get('/', protect, getAllPosts);
router.get('/saved', protect, getSavedPosts);
router.get('/:id', protect, getPostById);
router.put('/:id', protect, checkUserStatus, uploadImagesAndFiles, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);
router.post('/:id/share', protect, sharePost);
router.post('/:id/save', protect, savePost);
router.delete('/:id/save', protect, unsavePost);

export default router;


