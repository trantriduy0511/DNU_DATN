import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, GraduationCap, AlertCircle, Check, X, XCircle, ChevronDown } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentRole: 'Sinh viên',
    majors: [], // Changed to array for multiple selection
    studentId: ''
  });
  const [showMajorsDropdown, setShowMajorsDropdown] = useState(false);

  // Danh sách các ngành học của Đại Nam University
  const majorsList = [
    // Khối ngành Sức khỏe
    { category: 'Sức khỏe', majors: ['Y khoa', 'Dược học', 'Điều dưỡng'] },
    // Khối ngành Kỹ thuật - Công nghệ
    { category: 'Kỹ thuật - Công nghệ', majors: [
      'Công nghệ thông tin', 'Khoa học máy tính', 'Hệ thống thông tin',
      'Công nghệ kỹ thuật ô tô', 'Công nghệ kỹ thuật điện - điện tử',
      'Công nghệ kỹ thuật cơ điện tử', 'Công nghệ sinh học',
      'Kỹ thuật xây dựng', 'Kinh tế xây dựng', 'Công nghệ bán dẫn', 'Kiến trúc'
    ]},
    // Khối ngành Kinh tế - Kinh doanh
    { category: 'Kinh tế - Kinh doanh', majors: [
      'Quản trị kinh doanh', 'Quản trị nhân lực', 'Marketing',
      'Kinh doanh quốc tế', 'Thương mại điện tử', 'Kinh tế',
      'Kinh tế số', 'Tài chính – Ngân hàng', 'Công nghệ tài chính (Fintech)',
      'Logistics và quản lý chuỗi cung ứng', 'Kế toán'
    ]},
    // Khối ngành Khoa học Xã hội và Nhân văn
    { category: 'Khoa học Xã hội và Nhân văn', majors: [
      'Thiết kế đồ họa', 'Tâm lý học', 'Luật', 'Luật kinh tế',
      'Quản trị dịch vụ du lịch và lữ hành', 'Truyền thông đa phương tiện',
      'Quan hệ công chúng', 'Ngôn ngữ Anh', 'Ngôn ngữ Trung Quốc',
      'Ngôn ngữ Hàn Quốc', 'Ngôn ngữ Nhật'
    ]}
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const navigate = useNavigate();
  const register = useAuthStore(state => state.register);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    
    // Validate password on change
    if (name === 'password') {
      setPasswordValidation({
        minLength: value.length >= 6,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[@$!%*?&#]/.test(value)
      });
    }
  };

  const handleMajorToggle = (major) => {
    setFormData(prev => {
      const currentMajors = prev.majors || [];
      if (currentMajors.includes(major)) {
        return {
          ...prev,
          majors: currentMajors.filter(m => m !== major)
        };
      } else {
        return {
          ...prev,
          majors: [...currentMajors, major]
        };
      }
    });
    setError('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMajorsDropdown && !event.target.closest('.majors-dropdown-container')) {
        setShowMajorsDropdown(false);
      }
    };

    if (showMajorsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMajorsDropdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password requirements
    if (!passwordValidation.minLength) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }
    
    if (!passwordValidation.hasUpperCase) {
      setError('Mật khẩu phải có ít nhất một chữ cái viết hoa');
      setLoading(false);
      return;
    }
    
    if (!passwordValidation.hasLowerCase) {
      setError('Mật khẩu phải có ít nhất một chữ cái viết thường');
      setLoading(false);
      return;
    }
    
    if (!passwordValidation.hasNumber) {
      setError('Mật khẩu phải có ít nhất một số');
      setLoading(false);
      return;
    }
    
    if (!passwordValidation.hasSpecialChar) {
      setError('Mật khẩu phải có ít nhất một ký tự đặc biệt (@$!%*?&#)');
      setLoading(false);
      return;
    }

    // Validate
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    // Validate majors
    if (formData.majors.length === 0) {
      setError('Vui lòng chọn ít nhất một chuyên ngành');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    // Convert majors array to string for backend (or keep as array if backend supports it)
    const submitData = {
      ...registerData,
      major: formData.majors.join(', ') // Join multiple majors with comma
    };
    const result = await register(submitData);

    if (result.success) {
      navigate('/home');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
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
            <p className="text-sm text-white opacity-90 mt-3">Tạo tài khoản mới</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Đăng ký</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
              </div>

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Vai trò</label>
                <select
                  name="studentRole"
                  value={formData.studentRole}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                >
                  <option value="Sinh viên">Sinh viên</option>
                  <option value="Giảng viên">Giảng viên</option>
                </select>
              </div>

              <div className="relative majors-dropdown-container">
                <label className="block text-gray-700 font-medium mb-2">
                  Chuyên ngành <span className="text-orange-600">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Có thể chọn nhiều ngành)</span>
                </label>
                
                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setShowMajorsDropdown(!showMajorsDropdown)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-left flex items-center justify-between bg-white ${
                    showMajorsDropdown ? 'ring-2 ring-orange-500 border-orange-500' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {formData.majors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {formData.majors.slice(0, 2).map((major) => (
                          <span
                            key={major}
                            className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-orange-100 to-blue-100 text-orange-700 rounded text-xs font-medium border border-orange-200"
                          >
                            {major}
                          </span>
                        ))}
                        {formData.majors.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                            +{formData.majors.length - 2} ngành khác
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Chọn chuyên ngành...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showMajorsDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Selected Majors Display (below dropdown) */}
                {formData.majors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.majors.map((major) => (
                      <span
                        key={major}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-blue-100 text-orange-700 rounded-lg text-sm font-medium border border-orange-200"
                      >
                        <span>{major}</span>
                        <button
                          type="button"
                          onClick={() => handleMajorToggle(major)}
                          className="ml-1 hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown Menu */}
                {showMajorsDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {majorsList.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="border-b border-gray-200 last:border-b-0">
                        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-blue-50 px-4 py-2 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700">{category.category}</h4>
                        </div>
                        <div className="p-2 space-y-1">
                          {category.majors.map((major) => {
                            const isSelected = formData.majors.includes(major);
                            return (
                              <label
                                key={major}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                                  isSelected ? 'bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200' : ''
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleMajorToggle(major)}
                                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                />
                                <span className={`text-sm ${isSelected ? 'text-orange-700 font-medium' : 'text-gray-700'}`}>
                                  {major}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formData.majors.length === 0 && !showMajorsDropdown && (
                  <p className="mt-1 text-xs text-gray-500">Vui lòng chọn ít nhất một chuyên ngành</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Mã sinh viên (tùy chọn)</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="K17..."
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Mật khẩu</label>
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
              
              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-3 p-3 bg-gradient-to-br from-orange-50 to-blue-50 rounded-lg border border-orange-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.minLength ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <X className="w-4 h-4 mr-2 text-gray-400" />}
                      Tối thiểu 6 ký tự
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasUpperCase ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <X className="w-4 h-4 mr-2 text-gray-400" />}
                      Chữ cái viết hoa (A-Z)
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasLowerCase ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <X className="w-4 h-4 mr-2 text-gray-400" />}
                      Chữ cái viết thường (a-z)
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasNumber ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <X className="w-4 h-4 mr-2 text-gray-400" />}
                      Số (0-9)
                    </div>
                    <div className={`flex items-center text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasSpecialChar ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <X className="w-4 h-4 mr-2 text-gray-400" />}
                      Ký tự đặc biệt (@$!%*?&#)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-orange-600 font-semibold hover:text-blue-600 hover:underline transition-colors">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;


