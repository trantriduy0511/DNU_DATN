import axios from 'axios';
import { getAuthTokenFromStorage, clearAuthSession } from '../storage/storageService';
import { getApiBaseUrl } from '../../config/runtimeConfig';

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthTokenFromStorage();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const method = String(error.config?.method || '').toLowerCase();
    const reqUrl = String(error.config?.url || '');
    const isFailedCredentialsLogin =
      status === 401 &&
      method === 'post' &&
      (reqUrl === '/auth/login' || reqUrl.endsWith('/auth/login'));

    if (status === 401 && !isFailedCredentialsLogin) {
      clearAuthSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
