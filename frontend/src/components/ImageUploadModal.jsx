import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Upload, Check } from 'lucide-react';
import api from '../utils/api';

const ImageUploadModal = ({ isOpen, onClose, onSuccess, type = 'avatar', currentImage }) => {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    height: 90,
    aspect: type === 'avatar' ? 1 : 3,
    x: 5,
    y: 5
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset state khi modal mở lần đầu (chỉ khi chưa có ảnh)
  useEffect(() => {
    if (isOpen && !image) {
      // Chỉ reset khi modal mở và chưa có ảnh
      setPreview(null);
      setCompletedCrop(null);
      setError('');
      setCrop({
        unit: '%',
        width: 90,
        height: 90,
        aspect: type === 'avatar' ? 1 : 3,
        x: 5,
        y: 5
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, type]); // Không include image trong deps để tránh reset khi đã có ảnh

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 5MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError('');
    setPreview(null);
    setCompletedCrop(null);
    
    const reader = new FileReader();
    reader.onerror = () => {
      setError('Lỗi khi đọc file. Vui lòng thử lại.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onload = () => {
      if (reader.result) {
        setImage(reader.result);
        setCrop(
          type === 'avatar'
            ? { unit: '%', width: 90, height: 90, aspect: 1, x: 5, y: 5 }
            : { unit: '%', width: 90, height: 90, aspect: 3, x: 5, y: 5 }
        );
      } else {
        setError('Không thể đọc file. Vui lòng thử lại.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const onImageLoaded = (image) => {
    imgRef.current = image;
    setCompletedCrop(null);
    setPreview(null);
    // Đảm bảo crop được set lại sau khi ảnh load
    setTimeout(() => {
      setCrop(
        type === 'avatar'
          ? { unit: '%', width: 90, height: 90, aspect: 1, x: 5, y: 5 }
          : { unit: '%', width: 90, height: 90, aspect: 3, x: 5, y: 5 }
      );
    }, 50);
  };

  const onCropComplete = (crop) => {
    // ReactCrop sẽ chuyển đổi crop từ % sang pixel trong onComplete
    if (crop && crop.width && crop.height) {
      setCompletedCrop(crop);
      // Chỉ tạo preview nếu crop đã được chuyển đổi sang pixel
      if (crop.unit !== '%') {
        makeClientCrop(crop);
      }
    }
  };

  const makeClientCrop = async (crop) => {
    if (imgRef.current && crop.width && crop.height) {
      const croppedImageUrl = await getCroppedImg(imgRef.current, crop);
      setPreview(croppedImageUrl);
    }
  };

  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleUpload = async () => {
    // Nếu chưa có dữ liệu ảnh thì không thể upload
    if (!image) {
      setError('Vui lòng chọn ảnh trước khi upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let imageBlob;
      
      // Ưu tiên dùng preview nếu có (đã crop và có preview)
      if (preview) {
        const response = await fetch(preview);
        imageBlob = await response.blob();
      } else if (imgRef.current && completedCrop && completedCrop.width && completedCrop.height && completedCrop.unit !== '%') {
        // Nếu có completedCrop (đã được ReactCrop chuyển đổi sang pixel) và imgRef hiện diện, dùng nó
        const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
        const response = await fetch(croppedImageUrl);
        imageBlob = await response.blob();
      } else {
        // Nếu chưa có crop hoàn chỉnh hoặc imgRef chưa sẵn sàng, fallback dùng toàn bộ ảnh gốc
        const response = await fetch(image);
        imageBlob = await response.blob();
      }

      const file = new File([imageBlob], `${type}-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const endpoint = type === 'avatar' ? '/users/upload-avatar' : '/users/upload-cover';
      const res = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        onSuccess(res.data[type === 'avatar' ? 'avatar' : 'coverPhoto']);
        handleClose();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Lỗi khi upload ảnh. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImage(null);
    setPreview(null);
    setCrop(
      type === 'avatar'
        ? { unit: '%', width: 90, height: 90, aspect: 1, x: 5, y: 5 }
        : { unit: '%', width: 90, height: 90, aspect: 3, x: 5, y: 5 }
    );
    setCompletedCrop(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {type === 'avatar' ? 'Cập nhật ảnh đại diện' : 'Cập nhật ảnh bìa'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!image ? (
            <div className="text-center py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Chọn ảnh
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Định dạng: JPG, PNG, GIF, WEBP (tối đa 5MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Crop Area */}
              <div className="flex justify-center">
                {image && (
                  <ReactCrop
                    key={image} // Force re-render khi image thay đổi
                    src={image}
                    crop={crop}
                    onImageLoaded={onImageLoaded}
                    onChange={(c) => {
                      // Đảm bảo luôn có width/height/x/y dạng số, tránh "undefined%"
                      if (!c) return;
                      setCrop(prev => ({
                        ...prev,
                        ...c,
                        width: c.width ?? prev.width ?? 90,
                        height: c.height ?? prev.height ?? 90,
                        x: c.x ?? prev.x ?? 5,
                        y: c.y ?? prev.y ?? 5
                      }));
                    }}
                    onComplete={onCropComplete}
                    className="max-w-full"
                  >
                    <img
                      src={image}
                      alt="Crop"
                      style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }}
                    />
                  </ReactCrop>
                )}
              </div>

              {/* Preview */}
              {preview && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Xem trước:</p>
                  <div className="flex justify-center">
                    {type === 'avatar' ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-32 h-32 rounded-full border-4 border-gray-200"
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Chọn ảnh khác
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    disabled={uploading}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!image || uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang upload...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Lưu
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageUploadModal;




