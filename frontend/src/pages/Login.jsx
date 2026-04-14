import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { reconnectSocket } from '../utils/socket';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-blue-600 p-8 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            {/* Dai Nam logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4 shadow-lg overflow-hidden">
              <img
                src="/dainam-logo.png"
                alt="Dai Nam University Logo"
                className="object-contain"
                style={{ width: '90%', height: '90%' }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">ĐẠI NAM</h1>
            <p className="text-sm text-white opacity-90 mb-1">UNIVERSITY</p>
            <p className="text-xs text-white opacity-80 italic">Giáo Dục là Thắp Sáng!</p>
            <p className="text-sm text-white opacity-90 mt-3">DNU Social Network</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Đăng nhập</h2>

          {error && (
            <div className={`px-4 py-3 rounded-lg mb-4 flex items-start ${
              error.includes('khóa') || error.includes('banned')
                ? 'bg-red-50 border-2 border-red-400 text-red-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <AlertCircle className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                error.includes('khóa') || error.includes('banned') ? 'text-red-600' : ''
              }`} />
              <div>
                <span className="font-medium">{error}</span>
                {(error.includes('khóa') || error.includes('banned')) && (
                  <p className="text-sm mt-1 text-red-600">
                    Vui lòng liên hệ với quản trị viên để được hỗ trợ.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="your.email@dnu.edu.vn"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700 font-medium">Mật khẩu</label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-orange-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-orange-600 font-semibold hover:text-blue-600 hover:underline transition-colors">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


