import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import AIAnalysisJob from '../models/AIAnalysisJob.model.js';
import { enqueueDocumentAnalysisJob } from '../queues/documentAnalysis.queue.js';
import {
  normalizeUploadedFileName,
  pickDocumentUploadFileName,
} from '../utils/uploadFileName.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JOB_RETENTION_MS = 60 * 60 * 1000; // 1 hour

const cleanupStaleJobs = async () => {
  await AIAnalysisJob.deleteMany({ expiresAt: { $lte: new Date() } });
};

/**
 * Đọc nội dung từ file PDF
 */
const readPDF = async (filePath) => {
  try {
    // Dynamic import for pdf-parse (ES module compatibility)
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw new Error('Không thể đọc file PDF. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Đọc nội dung từ buffer PDF
 */
const readPDFBuffer = async (buffer) => {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error reading PDF buffer:', error);
    throw new Error('Không thể đọc file PDF. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Đọc nội dung từ file DOCX
 */
const readDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error reading DOCX:', error);
    throw new Error('Không thể đọc file DOCX. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Đọc nội dung từ buffer DOCX
 */
const readDOCXBuffer = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error reading DOCX buffer:', error);
    throw new Error('Không thể đọc file DOCX. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Đọc nội dung từ file TXT
 */
const readTXT = async (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading TXT:', error);
    throw new Error('Không thể đọc file TXT. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Đọc nội dung từ buffer TXT
 */
const readTXTBuffer = async (buffer) => {
  try {
    return Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer || '');
  } catch (error) {
    console.error('Error reading TXT buffer:', error);
    throw new Error('Không thể đọc file TXT. Vui lòng kiểm tra file có hợp lệ không.');
  }
};

/**
 * Xác định loại file và đọc nội dung
 */
const extractTextFromUploadedFile = async (file) => {
  const originalName = String(file?.originalname || '').trim();
  const ext = path.extname(originalName).toLowerCase();

  // Multer memoryStorage -> use buffer (default for this project)
  if (file?.buffer && Buffer.isBuffer(file.buffer)) {
    if (ext === '.pdf') return await readPDFBuffer(file.buffer);
    if (ext === '.docx') return await readDOCXBuffer(file.buffer);
    if (ext === '.txt') return await readTXTBuffer(file.buffer);
    if (ext === '.doc') {
      // mammoth không hỗ trợ .doc (binary Word). Yêu cầu user dùng .docx
      throw new Error('File .DOC không được hỗ trợ. Vui lòng chuyển sang .DOCX hoặc .PDF/.TXT.');
    }
    throw new Error(`Định dạng file không được hỗ trợ: ${ext}. Chỉ hỗ trợ PDF, DOCX, TXT.`);
  }

  // Fallback: disk storage (nếu sau này đổi storage)
  if (file?.path && typeof file.path === 'string') {
    const filePath = file.path;
    const diskExt = path.extname(filePath).toLowerCase();
    if (diskExt === '.pdf') return await readPDF(filePath);
    if (diskExt === '.docx' || diskExt === '.doc') return await readDOCX(filePath);
    if (diskExt === '.txt') return await readTXT(filePath);
    throw new Error(`Định dạng file không được hỗ trợ: ${diskExt}. Chỉ hỗ trợ PDF, DOCX, TXT.`);
  }

  throw new Error('Không thể đọc file upload. Thiếu dữ liệu buffer/path.');
};

/**
 * Phân tích tài liệu bằng AI
 */
export const analyzeDocument = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Endpoint này đã tắt để tránh xung đột nhiều người dùng. Vui lòng dùng analyze-document-upload.'
  });
};

/**
 * Helper function để extract section từ AI response
 */
const extractSection = (text, startMarker, endMarker) => {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return null;

  const start = startIndex + startMarker.length;
  const end = endMarker ? text.indexOf(endMarker, start) : text.length;
  
  if (end === -1 && endMarker) return null;
  
  return text.substring(start, end).trim();
};

/**
 * Phân tích tài liệu từ file upload (multipart/form-data)
 */
export const analyzeDocumentUpload = async (req, res) => {
  try {
    await cleanupStaleJobs();

    // uploadFiles middleware trả về req.uploadedFiles (array)
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng upload file (PDF, DOCX, hoặc TXT)'
      });
    }

    // Lấy file đầu tiên
    const file = req.uploadedFiles[0];
    const fileName = pickDocumentUploadFileName(file, req);
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để sử dụng tính năng này.'
      });
    }
    const jobId = crypto.randomUUID();
    // Đọc nội dung tài liệu trước khi enqueue, tránh phụ thuộc file tạm khi worker xử lý async
    let documentText = await extractTextFromUploadedFile(file);
    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File không có nội dung hoặc không thể đọc được'
      });
    }
    const maxLength = 50000;
    if (documentText.length > maxLength) {
      documentText = documentText.substring(0, maxLength) + '\n\n[... Nội dung đã được cắt ngắn do file quá dài ...]';
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + JOB_RETENTION_MS);
    await AIAnalysisJob.create({
      jobId,
      userId,
      status: 'pending',
      progress: 5,
      message: 'Đã nhận yêu cầu phân tích',
      metadata: {
        fileName,
        fileType: path.extname(fileName).toLowerCase(),
        textLength: documentText.length,
      },
      sourceText: documentText,
      result: null,
      error: null,
      expiresAt,
    });

    // Trả về ngay để frontend poll trạng thái
    res.status(202).json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        message: 'Yêu cầu đã vào hàng đợi xử lý AI'
      }
    });

    await enqueueDocumentAnalysisJob(jobId);

  } catch (error) {
    console.error('Error in analyzeDocumentUpload:', error);
    
    // Xóa file tạm nếu có lỗi
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      req.uploadedFiles.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.message?.includes('API_KEY') || error.message?.includes('403')) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi cấu hình API. Vui lòng liên hệ admin.'
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return res.status(429).json({
        success: false,
        message: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi phân tích tài liệu. Vui lòng thử lại sau.',
      error: error.message
    });
  }
};

export const getDocumentAnalysisStatus = async (req, res) => {
  try {
    await cleanupStaleJobs();

    const { jobId } = req.params;
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để xem trạng thái job.'
      });
    }
    const job = await AIAnalysisJob.findOne({ jobId }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy job phân tích hoặc job đã hết hạn.'
      });
    }

    if (job.userId?.toString() !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập job này.'
      });
    }

    return res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        message: job.message,
        metadata: {
          ...job.metadata,
          fileName: normalizeUploadedFileName(job.metadata?.fileName || 'unknown')
        },
        result: job.result,
        error: job.error
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy trạng thái phân tích tài liệu.',
      error: error.message
    });
  }
};

export const getDocumentAnalysisJobs = async (req, res) => {
  try {
    await cleanupStaleJobs();
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để xem lịch sử job.'
      });
    }

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const jobs = await AIAnalysisJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('jobId status progress message metadata error createdAt updatedAt')
      .lean();

    const normalizedJobs = jobs.map((job) => ({
      ...job,
      metadata: {
        ...job.metadata,
        fileName: normalizeUploadedFileName(job.metadata?.fileName || 'unknown')
      }
    }));

    return res.json({
      success: true,
      data: normalizedJobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy lịch sử job phân tích tài liệu.',
      error: error.message
    });
  }
};

export const retryDocumentAnalysisJob = async (req, res) => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thử lại job.'
      });
    }

    const sourceJobId = req.params.jobId;
    const sourceJob = await AIAnalysisJob.findOne({ jobId: sourceJobId }).lean();
    if (!sourceJob) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy job nguồn.'
      });
    }
    if (sourceJob.userId?.toString() !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thử lại job này.'
      });
    }
    if (!sourceJob.sourceText) {
      return res.status(400).json({
        success: false,
        message: 'Job này không còn dữ liệu nguồn để thử lại. Vui lòng upload lại file.'
      });
    }

    const newJobId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + JOB_RETENTION_MS);
    await AIAnalysisJob.create({
      jobId: newJobId,
      userId,
      status: 'pending',
      progress: 5,
      message: 'Đã nhận yêu cầu thử lại',
      metadata: {
        fileName: normalizeUploadedFileName(sourceJob.metadata?.fileName || 'unknown'),
        fileType: sourceJob.metadata?.fileType || '.txt'
      },
      sourceText: sourceJob.sourceText,
      expiresAt,
    });

    res.status(202).json({
      success: true,
      data: {
        jobId: newJobId,
        status: 'pending',
        message: 'Yêu cầu retry đã vào hàng đợi xử lý AI'
      }
    });

    await enqueueDocumentAnalysisJob(newJobId);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể retry job phân tích tài liệu.',
      error: error.message
    });
  }
};

