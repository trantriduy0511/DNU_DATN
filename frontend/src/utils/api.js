import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const { token } = JSON.parse(authData).state;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Không set Content-Type nếu là FormData (browser sẽ tự set với boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const method = String(error.config?.method || '').toLowerCase();
    const reqUrl = String(error.config?.url || '');
    /** Sai mật khẩu khi POST /auth/login cũng là 401 — không được xóa phiên / nhảy login (vd. modal Thêm tài khoản). */
    const isFailedCredentialsLogin =
      status === 401 &&
      method === 'post' &&
      (reqUrl === '/auth/login' || reqUrl.endsWith('/auth/login'));

    if (status === 401 && !isFailedCredentialsLogin) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;




