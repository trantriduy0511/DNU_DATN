import express from 'express';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import {
  createReport,
  getAllReports,
  updateReportStatus,
  deleteReport
} from '../controllers/report.controller.js';

const router = express.Router();

// User routes
router.post('/', protect, createReport);

// Admin routes
router.get('/', protect, requireAdmin, getAllReports);
router.put('/:id', protect, requireAdmin, updateReportStatus);
router.delete('/:id', protect, requireAdmin, deleteReport);

export default router;





















