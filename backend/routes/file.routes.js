import express from 'express';
import { Readable } from 'stream';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @desc    Download file from trusted external URL (Cloudinary)
// @route   GET /api/files/download-url
// @access  Private
router.get('/download-url', protect, async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    const rawName = String(req.query.name || 'download').trim();

    if (!rawUrl) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu URL file'
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'URL file không hợp lệ'
      });
    }

    // Prevent SSRF: only allow Cloudinary delivery hosts.
    const host = parsedUrl.hostname.toLowerCase();
    if (!(host === 'res.cloudinary.com' || host.endsWith('.res.cloudinary.com'))) {
      return res.status(403).json({
        success: false,
        message: 'Nguồn file không được phép tải'
      });
    }

    const response = await fetch(parsedUrl.toString());
    if (!response.ok || !response.body) {
      return res.status(404).json({
        success: false,
        message: 'Không lấy được file từ nguồn lưu trữ'
      });
    }

    const safeName = rawName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').slice(0, 180) || 'download';
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );
    res.setHeader('Content-Transfer-Encoding', 'binary');

    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Download external file error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tải file',
      error: error.message
    });
  }
});

export default router;

