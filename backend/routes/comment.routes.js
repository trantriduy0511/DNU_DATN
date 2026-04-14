import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { uploadImages } from '../middleware/upload.middleware.js';
import {
  createComment,
  getCommentsByPost,
  deleteComment
} from '../controllers/comment.controller.js';

const router = express.Router();

router.post('/:postId', protect, uploadImages, createComment);
router.get('/:postId', protect, getCommentsByPost);
router.delete('/:id', protect, deleteComment);

export default router;












