import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, User, AlertCircle, Check, X, XCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';
import AuthPageShell from '../components/auth/AuthPageShell';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentRole: 'Sinh viên',
    majors: [], // Changed to array for multiple selection
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  const inputDark =
    'w-full pl-10 pr-4 py-3 rounded-xl bg-black/25 border border-white/25 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#4A69BD]/80 focus:border-[#4A69BD]/50 transition-all text-sm';
  const inputLight =
    'w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85A24]/45 focus:border-[#E85A24] transition-all text-sm shadow-inner';
  const labelClass = 'block text-slate-700 font-semibold text-sm mb-2';

  return (
    <AuthPageShell wide showLogo={false}>
      <div className="font-['Montserrat',sans-serif] text-slate-800">
        <h2 className="text-xl font-bold text-slate-800 mb-1 text-center">Đăng ký</h2>
        <p className="text-center text-sm text-slate-600 mb-6">Tạo tài khoản DNU Learning Hub</p>

        {error && (
          <div className="bg-red-500/15 border border-red-300/50 text-red-50 px-4 py-3 rounded-xl mb-5 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-red-200" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputDark}
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <Mail className="absolute z-10 pointer-events-none left-3 top-3 w-5 h-5 text-slate-300" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputDark}
                    placeholder="your.email@dnu.edu.vn"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Vai trò</label>
                <select
                  name="studentRole"
                  value={formData.studentRole}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/25 text-white focus:outline-none focus:ring-2 focus:ring-[#4A69BD]/80 focus:border-[#4A69BD]/50 transition-all text-sm"
                >
                  <option value="Sinh viên" className="text-slate-900">
                    Sinh viên
                  </option>
                  <option value="Giảng viên" className="text-slate-900">
                    Giảng viên
                  </option>
                </select>
              </div>

              <div className="relative majors-dropdown-container">
                <label className={labelClass}>
                  Chuyên ngành <span className="text-[#E85A24]">*</span>
                  <span className="text-xs text-slate-500 ml-2 font-normal">(Có thể chọn nhiều ngành)</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowMajorsDropdown(!showMajorsDropdown)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all text-left flex items-center justify-between bg-white/95 border-slate-200/90 text-slate-800 ${
                    showMajorsDropdown ? 'ring-2 ring-[#E85A24]/60 border-[#E85A24]/50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {formData.majors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {formData.majors.slice(0, 2).map((major) => (
                          <span
                            key={major}
                            className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-orange-100 to-blue-100/90 text-[#c2410c] rounded text-xs font-medium border border-orange-200/80"
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
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-blue-100/90 text-[#c2410c] rounded-lg text-sm font-medium border border-orange-200/80"
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
                        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-blue-50/90 px-4 py-2 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-slate-700">{category.category}</h4>
                        </div>
                        <div className="p-2 space-y-1">
                          {category.majors.map((major) => {
                            const isSelected = formData.majors.includes(major);
                            return (
                              <label
                                key={major}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:bg-slate-50 ${
                                  isSelected ? 'bg-gradient-to-r from-orange-50 to-blue-50/90 border border-orange-200/80' : ''
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleMajorToggle(major)}
                                  className="w-4 h-4 text-[#E85A24] border-gray-300 rounded focus:ring-[#E85A24] focus:ring-2"
                                />
                                <span className={`text-sm ${isSelected ? 'text-[#c2410c] font-medium' : 'text-slate-700'}`}>
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
              <label className={labelClass}>Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute z-10 pointer-events-none left-3 top-3 w-5 h-5 text-white/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputDark} pr-11`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {formData.password && (
                <div className="mt-3 p-3 bg-white/90 rounded-xl border border-orange-200/60 shadow-sm">
                  <p className="text-xs font-medium text-slate-700 mb-2">Yêu cầu mật khẩu:</p>
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
              <label className={labelClass}>Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute z-10 pointer-events-none left-3 top-3 w-5 h-5 text-white/70" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${inputDark} pr-11`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-white uppercase tracking-wider text-sm shadow-lg bg-gradient-to-r from-[#E85A24] to-[#4A69BD] hover:from-[#d64e1c] hover:to-[#3d5aa8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}
            </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#E85A24] underline underline-offset-2 hover:text-[#4A69BD] transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </AuthPageShell>
  );
};

export default Register;


