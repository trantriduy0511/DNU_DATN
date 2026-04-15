import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const hasCloudinaryConfigNow = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

const ensureCloudinaryConfigured = () => {
  if (!hasCloudinaryConfigNow()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return true;
};

export const isCloudinaryConfigured = () => ensureCloudinaryConfigured();

export const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    if (!ensureCloudinaryConfigured()) {
      reject(new Error('Cloudinary chưa được cấu hình đầy đủ'));
      return;
    }
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });

export default cloudinary;
