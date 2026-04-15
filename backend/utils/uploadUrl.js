export function getUploadedImageUrl(file) {
  if (!file) return null;
  if (file.cloudinaryUrl) return file.cloudinaryUrl;
  if (file.path && typeof file.path === 'string' && file.path.startsWith('http')) return file.path;
  return null;
}

export function getUploadedFileUrl(file) {
  if (!file) return null;
  if (file.cloudinaryUrl) return file.cloudinaryUrl;
  if (file.path && typeof file.path === 'string' && file.path.startsWith('http')) return file.path;
  return null;
}
