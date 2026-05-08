const trimTrailingSlash = (value = '') => String(value || '').trim().replace(/\/+$/, '');

const getRawApiBase = () => String(import.meta.env.VITE_API_BASE_URL || '').trim();

export const getApiBaseUrl = () => {
  const raw = trimTrailingSlash(getRawApiBase());
  if (!raw) return '/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

export const getBackendOrigin = () => {
  const raw = trimTrailingSlash(getRawApiBase());
  if (!raw) return 'http://localhost:5000';
  return raw.endsWith('/api') ? raw.slice(0, -4) : raw;
};

