import multer from 'multer';
import path from 'path';
import { isCloudinaryConfigured, uploadBufferToCloudinary } from '../utils/cloudinary.js';

const memoryStorage = multer.memoryStorage();

// Filter chỉ cho phép file ảnh
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

/** Ảnh + video trong field `images` (bài viết trang chủ / gallery). */
const galleryMediaFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const imageExtOk = /\.(jpe?g|png|gif|webp)$/i.test(ext);
  const videoExtOk = /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(ext);
  const mime = (file.mimetype || '').toLowerCase();
  if (imageExtOk && mime.startsWith('image/')) return cb(null, true);
  if (videoExtOk && mime.startsWith('video/')) return cb(null, true);
  if (videoExtOk && (mime === '' || mime === 'application/octet-stream')) return cb(null, true);
  cb(
    new Error(
      'Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WEBP) hoặc video (MP4, WEBM, MOV, MKV, AVI, M4V, OGV, MPEG)'
    )
  );
};

// Filter cho documents/files
const documentFilter = (req, file, cb) => {
  const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|7z|mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i;
  const extname = allowedExtensions.test(file.originalname);
  
  // Debug log
  console.log('Document filter - File:', file.originalname, 'Extension match:', extname, 'MIME:', file.mimetype);
  
  // Nếu extension hợp lệ, cho phép upload (không kiểm tra MIME type quá chặt)
  // Vì một số trình duyệt có thể gửi MIME type không chính xác
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Chỉ cho phép upload tài liệu hoặc video (PDF, Office, nén, MP4, WEBM, MOV, M4V…). File của bạn: ${file.originalname}`));
  }
};

// Cấu hình multer cho images
const imageUploader = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB cho ảnh (avatar, ảnh bìa)
  },
  fileFilter: imageFilter
});

// Cấu hình multer cho documents
const documentUploader = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB cho documents
  },
  fileFilter: documentFilter
});

const sanitizeCloudinaryName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);

const inferCloudinaryResourceType = (mimetype = '') => {
  const mime = String(mimetype).toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'raw';
};

const uploadSingleFileToCloudinary = async (file, folder) => {
  if (!file?.buffer) return file;
  const originalName = String(file.originalname || '').trim();
  const parsedName = path.parse(originalName || 'upload');
  const safeBaseName = sanitizeCloudinaryName(parsedName.name) || 'upload';
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const publicId = `${safeBaseName}-${uniqueSuffix}`;
  const finalDisplayName = originalName || `${safeBaseName}${parsedName.ext || ''}`;
  const uploaded = await uploadBufferToCloudinary(file.buffer, {
    folder,
    resource_type: inferCloudinaryResourceType(file.mimetype),
    public_id: publicId,
    use_filename: false,
    unique_filename: false,
    filename_override: finalDisplayName,
    display_name: finalDisplayName
  });
  return {
    ...file,
    cloudinaryUrl: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
    cloudinaryResourceType: uploaded.resource_type
  };
};

const uploadManyToCloudinary = async (files, folder) =>
  Promise.all((files || []).map((file) => uploadSingleFileToCloudinary(file, folder)));

// Wrapper để xử lý multer errors
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        // Multer errors
        if (err.name === 'MulterError') {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: 'File quá lớn. Kích thước tối đa là 10MB'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              message: 'Quá nhiều file. Tối đa 10 ảnh'
            });
          }
          return res.status(400).json({
            success: false,
            message: 'Lỗi upload file: ' + err.message
          });
        }
        // File filter errors
        return res.status(400).json({
          success: false,
          message: err.message || 'Lỗi upload file'
        });
      }

      // Chuẩn hoá dữ liệu files để các controller có thể dùng req.uploadedFiles
      // Hỗ trợ cả .single(), .array() và .fields()
      if (req.files && !req.uploadedFiles) {
        if (Array.isArray(req.files)) {
          // Trường hợp .array()
          req.uploadedFiles = req.files;
        } else if (typeof req.files === 'object') {
          // Trường hợp .fields() với nhiều field
          const allFiles = [];
          Object.values(req.files).forEach((value) => {
            if (Array.isArray(value)) {
              allFiles.push(...value);
            } else if (value) {
              allFiles.push(value);
            }
          });
          req.uploadedFiles = allFiles;
        }
      }

      if (!isCloudinaryConfigured()) {
        return res.status(500).json({
          success: false,
          message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra CLOUDINARY_* trong backend/.env'
        });
      }

      try {
        if (req.file) {
          req.file = await uploadSingleFileToCloudinary(req.file, 'dnu-social/images');
        }
        if (Array.isArray(req.uploadedFiles) && req.uploadedFiles.length > 0) {
          req.uploadedFiles = await uploadManyToCloudinary(req.uploadedFiles, 'dnu-social/files');
        }
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          message: 'Upload Cloudinary thất bại',
          error: uploadErr.message
        });
      }

      next();
    });
  };
};

// Middleware upload nhiều ảnh
export const uploadImages = handleUploadError(imageUploader.array('images', 10)); // Tối đa 10 ảnh

// Middleware upload 1 ảnh
export const uploadSingleImage = handleUploadError(imageUploader.single('image'));

// Middleware upload nhiều documents
export const uploadFiles = handleUploadError(documentUploader.array('files', 10)); // Tối đa 10 files

// Middleware upload cả images và files
export const uploadImagesAndFiles = (req, res, next) => {
  // Kiểm tra xem có field nào trong request không
  const hasImages = req.body && Object.keys(req.body).some(key => key === 'images') || 
                    (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data'));
  const hasFiles = req.body && Object.keys(req.body).some(key => key === 'files') || 
                  (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data'));
  
  // Khởi tạo mảng rỗng
  req.uploadedImages = [];
  req.uploadedFiles = [];
  
  // Sử dụng multer.fields để xử lý cả images và files cùng lúc
  const uploadMiddleware = multer({
    storage: memoryStorage,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB (ảnh + video gallery; tài liệu kèm theo)
    },
    fileFilter: (req, file, cb) => {
      console.log('File filter - Fieldname:', file.fieldname, 'Originalname:', file.originalname);
      if (file.fieldname === 'images') {
        return galleryMediaFilter(req, file, cb);
      } else if (file.fieldname === 'files') {
        return documentFilter(req, file, cb);
      } else {
        cb(new Error(`Invalid field name: ${file.fieldname}. Chỉ chấp nhận "images" và "files"`));
      }
    }
  }).fields([
    { name: 'images', maxCount: 10 },
    { name: 'files', maxCount: 10 }
  ]);
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      // Xử lý lỗi
      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File quá lớn. Kích thước tối đa là 50MB (ảnh/video và tài liệu đính kèm)'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Quá nhiều file. Tối đa 10 ảnh và 10 files'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Field không hợp lệ. Chỉ chấp nhận "images" và "files"'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Lỗi upload: ' + err.message
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Lỗi upload file'
      });
    }
    
    // Phân loại files theo fieldname
    // Khởi tạo mảng rỗng nếu chưa có
    req.uploadedImages = [];
    req.uploadedFiles = [];
    
    if (req.files) {
      // req.files là object với keys là fieldnames khi dùng .fields()
      if (req.files.images) {
        req.uploadedImages = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      }
      if (req.files.files) {
        req.uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      }
      // Gộp lại vào req.files để tương thích với code cũ (nếu cần)
      req.files = [...req.uploadedImages, ...req.uploadedFiles];
    }
    
    // Xóa req.body.files nếu có để tránh conflict
    if (req.body && req.body.files) {
      delete req.body.files;
    }
    
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra CLOUDINARY_* trong backend/.env'
      });
    }

    try {
      req.uploadedImages = await uploadManyToCloudinary(req.uploadedImages, 'dnu-social/images');
      req.uploadedFiles = await uploadManyToCloudinary(req.uploadedFiles, 'dnu-social/files');
      req.files = [...req.uploadedImages, ...req.uploadedFiles];
    } catch (uploadErr) {
      return res.status(500).json({
        success: false,
        message: 'Upload Cloudinary thất bại',
        error: uploadErr.message
      });
    }

    console.log('Upload middleware - Cloudinary images:', req.uploadedImages.length, 'files:', req.uploadedFiles.length);
    
    next();
  });
};

