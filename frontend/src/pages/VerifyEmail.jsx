import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../utils/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError('Token không hợp lệ');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const res = await api.get('/auth/verify-email', {
        params: { token }
      });
      
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(res.data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 text-center">
            <Loader className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đang xác thực email...</h2>
            <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-blue-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
              {success ? (
                <CheckCircle className="w-10 h-10 text-green-500" />
              ) : (
                <Mail className="w-10 h-10 text-orange-500" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">ĐẠI NAM</h1>
            <p className="text-sm text-white opacity-90">DNU Social Network</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {success ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Email đã được xác thực!</h2>
              <p className="text-gray-600 mb-6">
                Tài khoản của bạn đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...
              </p>
              <Link 
                to="/login" 
                className="inline-block bg-gradient-to-r from-orange-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all"
              >
                Đăng nhập ngay
              </Link>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thất bại</h2>
              <p className="text-gray-600 mb-6">
                {error || 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.'}
              </p>
              <div className="space-y-3">
                <Link 
                  to="/login" 
                  className="block bg-gradient-to-r from-orange-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all"
                >
                  Đăng nhập
                </Link>
                <Link 
                  to="/register" 
                  className="block text-gray-600 hover:text-orange-600 transition-colors"
                >
                  Đăng ký tài khoản mới
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;










