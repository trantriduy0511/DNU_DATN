export const resolveMediaUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/uploads')) return `http://localhost:5000${raw}`;
  if (raw.startsWith('uploads/')) return `http://localhost:5000/${raw}`;
  if (raw.startsWith('/')) return `http://localhost:5000${raw}`;
  return `http://localhost:5000/${raw}`;
};

export const resolveAvatarUrlWithFallback = (avatar, name, background = '3b82f6') => {
  const url = resolveMediaUrl(avatar);
  if (url) return url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff&size=256`;
};
