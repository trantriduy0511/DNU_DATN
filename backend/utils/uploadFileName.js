import path from 'path';

/** Có ký tự ngoài Latin-1 → chuỗi đã là Unicode đầy đủ (UTF-8 decode đúng), không áp dụng latin1→utf8. */
const hasCharAboveLatin1 = (s) => /[^\u0000-\u00FF]/.test(s);

/** Chữ Việt NFC thường nằm ở khối này; chuỗi mojibake Latin-1 hầu như không có ký tự ở đây. */
const HAS_VIETNAMESE_BLOCK = /[\u1EA0-\u1EF9]/u;

/**
 * Sửa mojibake kiểu UTF-8 bị đọc thành byte Latin-1 (chỉ khi toàn bộ code point ≤ 255).
 * Tránh áp dụng lên tên đã đúng tiếng Việt (Ụ, Ụ, … > U+00FF) — trước đây làm hỏng tên và sinh U+FFFD.
 */
export const normalizeUploadedFileName = (name) => {
  const raw = String(name ?? '').trim();
  if (!raw) return 'unknown';

  if (hasCharAboveLatin1(raw)) {
    return raw.normalize('NFC');
  }

  try {
    const recovered = Buffer.from(raw, 'latin1').toString('utf8');
    if (!recovered || recovered.includes('\uFFFD')) return raw;
    if (recovered === raw) return raw;
    if (
      HAS_VIETNAMESE_BLOCK.test(recovered) &&
      !HAS_VIETNAMESE_BLOCK.test(raw)
    ) {
      return recovered.normalize('NFC');
    }
    return raw;
  } catch {
    return raw;
  }
};

/**
 * Ưu tiên tên file do client gửi kèm (UTF-8 trong field multipart), khớp phần mở rộng với multer.
 */
export const pickDocumentUploadFileName = (file, req) => {
  const fromMulter = String(file?.originalname || '').trim();
  const extMulter = path.extname(fromMulter).toLowerCase();

  const fromBodyRaw = String(
    req?.body?.originalFileName ?? req?.body?.originalFilename ?? ''
  ).trim();
  const fromBody = path.basename(fromBodyRaw);
  const extBody = path.extname(fromBody).toLowerCase();

  const bodyOk =
    fromBody.length > 0 &&
    fromBody.length <= 255 &&
    !fromBody.includes('\uFFFD') &&
    !fromBody.includes('\u0000') &&
    extMulter &&
    extBody === extMulter;

  if (bodyOk) {
    return normalizeUploadedFileName(fromBody);
  }
  return normalizeUploadedFileName(fromMulter || 'unknown');
};
