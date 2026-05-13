import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { reconnectSocket } from '../utils/socket';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import AuthPageShell from '../components/auth/AuthPageShell';

const Login = () => {
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleTokenClient, setGoogleTokenClient] = useState(null);

  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);

  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = 'google-identity-services';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initGoogleClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          try {
            if (tokenResponse?.error) {
              setError(tokenResponse.error_description || 'Đăng nhập Google thất bại.');
              return;
            }
            const result = await loginWithGoogle({ accessToken: tokenResponse.access_token });
            if (result.success) {
              reconnectSocket();
              const { user } = useAuthStore.getState();
              if (user.role === 'admin') {
                navigate('/admin');
              } else {
                navigate('/home');
              }
            } else {
              setError(result.message);
            }
          } finally {
            setGoogleLoading(false);
          }
        }
      });
      setGoogleTokenClient(tokenClient);
    };

    if (window.google?.accounts?.oauth2) {
      initGoogleClient();
    } else {
      script.addEventListener('load', initGoogleClient, { once: true });
    }
  }, [googleClientId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      reconnectSocket();
      const { user } = useAuthStore.getState();
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setError('Thiếu cấu hình VITE_GOOGLE_CLIENT_ID cho đăng nhập Google.');
      return;
    }
    if (!googleTokenClient) {
      setError('Google SDK chưa sẵn sàng, vui lòng thử lại sau vài giây.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    googleTokenClient.requestAccessToken({ prompt: 'select_account' });
  };

  return (
    <AuthPageShell>
      <div className="font-['Montserrat',sans-serif] text-slate-800">
        {error && (
          <div
            className={`px-4 py-3 rounded-xl mb-5 flex items-start ${
              error.includes('khóa') || error.includes('banned')
                ? 'bg-red-500/20 border border-red-400/80 text-red-50'
                : 'bg-red-500/15 border border-red-300/50 text-red-50'
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                error.includes('khóa') || error.includes('banned') ? 'text-red-200' : 'text-red-200'
              }`}
            />
            <div>
              <span className="font-medium text-sm leading-snug">{error}</span>
              {(error.includes('khóa') || error.includes('banned')) && (
                <p className="text-xs mt-1 text-red-100/90">
                  Vui lòng liên hệ với quản trị viên để được hỗ trợ.
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-full bg-[#3c4043] text-white py-3 px-4 text-sm font-semibold shadow-lg mb-6 border border-white/10 hover:bg-[#2f3336] transition-colors disabled:opacity-65 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google'}
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute z-10 pointer-events-none left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/30 border border-white/20 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#4A69BD]/80 focus:border-[#4A69BD]/60 transition-all text-sm"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="sr-only">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute z-10 pointer-events-none left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-black/30 border border-white/20 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#E85A24]/50 focus:border-[#E85A24] transition-all text-sm"
                placeholder="Mật khẩu"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-slate-600 hover:text-[#E85A24] underline-offset-2 hover:underline transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-full font-bold text-white uppercase tracking-wider text-sm shadow-lg bg-gradient-to-r from-[#E85A24] to-[#4A69BD] hover:from-[#d64e1c] hover:to-[#3d5aa8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-semibold text-[#E85A24] underline underline-offset-2 hover:text-[#4A69BD] transition-colors"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
};

export default Login;
