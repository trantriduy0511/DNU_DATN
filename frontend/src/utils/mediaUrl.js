import { getBackendOrigin } from '../shared/config/runtimeConfig';

export const resolveMediaUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const backendOrigin = getBackendOrigin();
  if (raw.startsWith('/uploads')) return `${backendOrigin}${raw}`;
  if (raw.startsWith('uploads/')) return `${backendOrigin}/${raw}`;
  if (raw.startsWith('/')) return `${backendOrigin}${raw}`;
  return `${backendOrigin}/${raw}`;
};

export const resolveAvatarUrlWithFallback = (avatar, name, background = '3b82f6') => {
  const url = resolveMediaUrl(avatar);
  if (url) return url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff&size=256`;
};
