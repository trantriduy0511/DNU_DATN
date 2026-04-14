import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { protect } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// @desc    Download file
// @route   GET /api/files/download/:filename
// @access  Private
router.get('/download/:filename', protect, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: prevent directory traversal và validate filename
    if (!filename || 
        filename.includes('..') || 
        filename.includes('/') || 
        filename.includes('\\') ||
        filename.length > 255 ||
        /[<>:"|?*]/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Tên file không hợp lệ'
      });
    }
    
    // Normalize filename để tránh path manipulation
    const normalizedFilename = path.basename(filename);
    
    // Xác định thư mục dựa vào prefix của filename
    const uploadsImagesDir = path.join(__dirname, '../uploads/images');
    const uploadsFilesDir = path.join(__dirname, '../uploads/files');
    
    let filePath;
    let uploadsDir;
    
    // Kiểm tra file trong uploads/images trước (nếu filename bắt đầu bằng "image-")
    if (normalizedFilename.startsWith('image-')) {
      filePath = path.join(uploadsImagesDir, normalizedFilename);
      uploadsDir = uploadsImagesDir;
    } else if (normalizedFilename.startsWith('file-')) {
      // Kiểm tra file trong uploads/files (nếu filename bắt đầu bằng "file-")
      filePath = path.join(uploadsFilesDir, normalizedFilename);
      uploadsDir = uploadsFilesDir;
    } else {
      // Nếu không có prefix, tìm trong cả hai thư mục
      const imagePath = path.join(uploadsImagesDir, normalizedFilename);
      const filePath2 = path.join(uploadsFilesDir, normalizedFilename);
      
      if (fs.existsSync(imagePath)) {
        filePath = imagePath;
        uploadsDir = uploadsImagesDir;
      } else if (fs.existsSync(filePath2)) {
        filePath = filePath2;
        uploadsDir = uploadsFilesDir;
      } else {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }
    }
    
    // Security: Đảm bảo file path nằm trong uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Truy cập file không được phép'
      });
    }
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }
    
    // Kiểm tra là file, không phải directory
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        success: false,
        message: 'Đường dẫn không phải là file'
      });
    }
    
    // Lấy extension để xác định Content-Type
    const ext = path.extname(normalizedFilename).toLowerCase();
    const contentTypeMap = {
      // Images - dùng image/* để hiển thị, nhưng vẫn force download với Content-Disposition
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed'
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Lấy tên file gốc từ query parameter nếu có, nếu không dùng normalizedFilename
    const originalName = req.query.name || normalizedFilename;
    
    // Set headers để force download
    res.setHeader('Content-Type', contentType);
    // Sử dụng filename* với UTF-8 encoding để hỗ trợ tên file tiếng Việt
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"; filename*=UTF-8''${encodeURIComponent(originalName)}`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    
    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Lỗi đọc file'
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải file',
      error: error.message
    });
  }
});

export default router;

