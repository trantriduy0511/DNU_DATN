import express from 'express';
import { chatWithGemini } from '../controllers/ai.controller.js';
import { 
  analyzeDataWithAI, 
  predictTrends, 
  getRecommendations 
} from '../controllers/aiAnalytics.controller.js';
import { 
  analyzeDocument, 
  analyzeDocumentUpload,
  getDocumentAnalysisStatus,
  getDocumentAnalysisJobs,
  retryDocumentAnalysisJob
} from '../controllers/aiDocument.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadFiles } from '../middleware/upload.middleware.js';

const router = express.Router();

// Chat with AI (Gemini)
router.post('/chat', protect, chatWithGemini);

// AI Analytics & Predictions
router.get('/analytics', protect, analyzeDataWithAI);
router.get('/predict', protect, predictTrends);
router.get('/recommendations', protect, getRecommendations);

// AI Document Analyzer
router.post('/analyze-document', protect, analyzeDocument);
router.post('/analyze-document-upload', protect, uploadFiles, analyzeDocumentUpload);
router.get('/analyze-document-status/:jobId', protect, getDocumentAnalysisStatus);
router.get('/analyze-document-jobs', protect, getDocumentAnalysisJobs);
router.post('/analyze-document-retry/:jobId', protect, retryDocumentAnalysisJob);

export default router;

