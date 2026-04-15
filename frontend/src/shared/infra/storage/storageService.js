import { STORAGE_KEYS } from './storageKeys';

export function getAuthTokenFromStorage() {
  const authData = localStorage.getItem(STORAGE_KEYS.authStore);
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      const token = parsed?.state?.token;
      if (token) return token;
    } catch {
      // Ignore malformed auth storage
    }
  }
  return (
    localStorage.getItem(STORAGE_KEYS.tokenLegacy) ||
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))?.split('=')[1] ||
    null
  );
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.authStore);
  localStorage.removeItem(STORAGE_KEYS.tokenLegacy);
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
