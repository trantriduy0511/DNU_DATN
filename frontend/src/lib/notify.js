import { useUiFeedbackStore } from '../store/uiFeedbackStore';

function inferType(message) {
  const s = String(message ?? '').trim();
  if (
    /^❌/.test(s) ||
    /^Lỗi\b/i.test(s) ||
    /^Không thể\b/i.test(s) ||
    /^Không tải\b/i.test(s) ||
    /^Không cập nhật\b/i.test(s) ||
    /^Không gửi\b/i.test(s) ||
    /^Không xóa\b/i.test(s) ||
    /^Không mở\b/i.test(s) ||
    /^Không tìm\b/i.test(s) ||
    /^Xóa .*thất bại/i.test(s)
  ) {
    return 'error';
  }
  if (
    /^✅/.test(s) ||
    /^📥/.test(s) ||
    /\bthành công\b/i.test(s) ||
    /^Đã (gửi|xóa|cập nhật|tham gia|rời|chấp nhận|từ chối|hủy|đăng|sao chép|bỏ chặn)\b/i.test(s)
  ) {
    return 'success';
  }
  if (/^Vui lòng\b|^Chỉ \b|^Tối đa \b|^Ảnh không\b|^Kích thước\b|^Bạn cần\b|^Tên nhóm không\b/i.test(s)) {
    return 'warning';
  }
  return 'info';
}

/** Thay thế alert(): hiển thị toast, không dùng hộp thoại trình duyệt. */
export function notify(message, type = 'auto') {
  const t = type === 'auto' ? inferType(message) : type;
  useUiFeedbackStore.getState().pushToast(String(message ?? ''), t);
}

export function notifySuccess(message) {
  useUiFeedbackStore.getState().pushToast(String(message ?? ''), 'success');
}

export function notifyError(message) {
  useUiFeedbackStore.getState().pushToast(String(message ?? ''), 'error');
}

export function notifyWarning(message) {
  useUiFeedbackStore.getState().pushToast(String(message ?? ''), 'warning');
}

export function notifyInfo(message) {
  useUiFeedbackStore.getState().pushToast(String(message ?? ''), 'info');
}

/** Thay thế window.confirm — trả về Promise<boolean>. Handler cần async. */
export function confirmAsync(message) {
  return useUiFeedbackStore.getState().requestConfirm(message);
}

/** Thay thế window.prompt — trả về Promise<string|null> (null nếu hủy). */
export function promptAsync(message, defaultValue = '') {
  return useUiFeedbackStore.getState().requestPrompt(message, defaultValue);
}
