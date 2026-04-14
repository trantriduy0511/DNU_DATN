import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsImagesDir = path.join(__dirname, '../uploads/images');
const uploadsFilesDir = path.join(__dirname, '../uploads/files');
if (!fs.existsSync(uploadsImagesDir)) {
  fs.mkdirSync(uploadsImagesDir, { recursive: true });
}
if (!fs.existsSync(uploadsFilesDir)) {
  fs.mkdirSync(uploadsFilesDir, { recursive: true });
}

// Cấu hình storage cho images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsImagesDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// Cấu hình storage cho documents/files
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsFilesDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

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
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB cho ảnh (avatar, ảnh bìa)
  },
  fileFilter: imageFilter
});

// Cấu hình multer cho documents
const documentUploader = multer({
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB cho documents
  },
  fileFilter: documentFilter
});

// Wrapper để xử lý multer errors
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
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
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // Xác định destination dựa vào fieldname
        if (file.fieldname === 'images') {
          cb(null, uploadsImagesDir);
        } else if (file.fieldname === 'files') {
          cb(null, uploadsFilesDir);
        } else {
          cb(new Error('Invalid field name'));
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        if (file.fieldname === 'images') {
          cb(null, `image-${uniqueSuffix}${ext}`);
        } else {
          cb(null, `file-${uniqueSuffix}${ext}`);
        }
      }
    }),
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
  
  uploadMiddleware(req, res, (err) => {
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
    
    // Debug log (có thể bỏ sau khi test)
    console.log('Upload middleware - Images:', req.uploadedImages.length, 'Files:', req.uploadedFiles.length);
    
    next();
  });
};

