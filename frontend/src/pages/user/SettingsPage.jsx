import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Sun, Bell, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';

const THEME_KEY = 'dnu_theme';
const NOTI_KEY = 'dnu_notification_settings';

const SettingsPage = () => {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = window.localStorage?.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  }); // 'light' | 'dark' | 'system'
  const [notificationSettings, setNotificationSettings] = useState({
    inApp: true,
    email: true
  });

  // Change password (moved from "Edit profile" modal)
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const themeOptions = useMemo(
    () => ([
      { value: 'light', label: 'Sáng', icon: <Sun className="w-4 h-4" /> },
      { value: 'dark', label: 'Tối', icon: <Moon className="w-4 h-4" /> },
      { value: 'system', label: 'Theo hệ thống', icon: <Sun className="w-4 h-4" /> }
    ]),
    []
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const hasSaved = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system';
    const userThemeOk = user?.settings?.theme && ['light', 'dark', 'system'].includes(user.settings.theme);

    // Only fallback to user.settings.theme when there is no local selection yet
    if (!hasSaved && userThemeOk) {
      localStorage.setItem(THEME_KEY, user.settings.theme);
      setTheme(user.settings.theme);
    }

    const savedNoti = localStorage.getItem(NOTI_KEY);
    if (savedNoti) {
      try {
        const parsed = JSON.parse(savedNoti);
        setNotificationSettings(prev => ({ ...prev, ...parsed }));
      } catch {
        // ignore parse error
      }
    }
  }, [user?.settings?.theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    const apply = (value) => {
      if (value === 'dark') root.classList.add('dark');
      else if (value === 'light') root.classList.remove('dark');
      else if (mq) {
        if (mq.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };

    const onSystemChange = (e) => {
      if (theme !== 'system') return;
      if (e?.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    apply(theme);

    if (theme === 'system' && mq?.addEventListener) {
      mq.addEventListener('change', onSystemChange);
      return () => mq.removeEventListener('change', onSystemChange);
    }
    if (theme === 'system' && mq?.addListener) {
      mq.addListener(onSystemChange);
      return () => mq.removeListener(onSystemChange);
    }
    return undefined;
  }, [theme]);

  const handleThemeChange = (value) => {
    localStorage.setItem(THEME_KEY, value);
    setTheme(value);
  };

  const handleNotiChange = (field) => {
    setNotificationSettings(prev => {
      const next = { ...prev, [field]: !prev[field] };
      localStorage.setItem(NOTI_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
    setPwError('');
  };

  const handleSubmitPassword = async () => {
    setPwError('');
    const currentPassword = pwForm.currentPassword;
    const newPassword = pwForm.newPassword;
    const confirmPassword = pwForm.confirmPassword;

    if (!currentPassword) {
      setPwError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPwError('Mật khẩu mới phải bao gồm: chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&#)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setPwSaving(true);
      await api.put('/users/profile', { currentPassword, newPassword });
      alert('✅ Đổi mật khẩu thành công!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPwError(error.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--fb-text-primary)] mb-4">
          Cài đặt
        </h1>

        <div className="bg-[var(--fb-surface)] rounded-xl shadow-sm border border-[var(--fb-divider)] p-4 mb-6 flex items-center gap-3">
          <img
            src={
              user?.avatar
                ? (String(user.avatar).startsWith('/uploads')
                    ? `http://localhost:5000${user.avatar}`
                    : user.avatar)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || 'User'
                  )}&background=1877f2&color=fff`
            }
            alt={user?.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-[var(--fb-text-primary)]">{user?.name}</p>
            <p className="text-sm text-[var(--fb-text-secondary)]">{user?.email}</p>
          </div>
        </div>

        <div className="bg-[var(--fb-surface)] rounded-xl shadow-sm border border-[var(--fb-divider)] p-4 mb-6">
          <h2 className="text-lg font-semibold text-[var(--fb-text-primary)] flex items-center gap-2 mb-3">
            <Moon className="w-5 h-5 text-indigo-500" />
            Giao diện
          </h2>
          <p className="text-sm text-[var(--fb-text-secondary)] mb-3">
            Chọn chế độ hiển thị cho DNU Social.
          </p>
          <div className="flex gap-3">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleThemeChange(opt.value)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  theme === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600 dark:text-[var(--fb-text-primary)]'
                    : 'border-[var(--fb-divider)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--fb-surface)] rounded-xl shadow-sm border border-[var(--fb-divider)] p-4">
          <h2 className="text-lg font-semibold text-[var(--fb-text-primary)] flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-indigo-500" />
            Thông báo
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-[var(--fb-text-primary)]">
                    Thông báo trong ứng dụng
                  </p>
                  <p className="text-sm text-[var(--fb-text-secondary)]">
                    Hiển thị thông báo ở biểu tượng chuông.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={notificationSettings.inApp}
                onChange={() => handleNotiChange('inApp')}
              />
              <div
                className={`w-10 h-5 flex items-center rounded-full p-1 transition ${
                  notificationSettings.inApp ? 'bg-blue-500' : 'bg-[var(--fb-divider)]'
                }`}
              >
                <div
                  className={`bg-[var(--fb-surface)] w-4 h-4 rounded-full shadow transform transition ${
                    notificationSettings.inApp ? 'translate-x-4' : ''
                  }`}
                />
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-[var(--fb-text-primary)]">
                    Thông báo qua email
                  </p>
                  <p className="text-sm text-[var(--fb-text-secondary)]">
                    Gửi email khi có hoạt động quan trọng.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={notificationSettings.email}
                onChange={() => handleNotiChange('email')}
              />
              <div
                className={`w-10 h-5 flex items-center rounded-full p-1 transition ${
                  notificationSettings.email ? 'bg-green-500' : 'bg-[var(--fb-divider)]'
                }`}
              >
                <div
                  className={`bg-[var(--fb-surface)] w-4 h-4 rounded-full shadow transform transition ${
                    notificationSettings.email ? 'translate-x-4' : ''
                  }`}
                />
              </div>
            </label>
          </div>
        </div>

        <div className="bg-[var(--fb-surface)] rounded-xl shadow-sm border border-[var(--fb-divider)] p-4 mt-6">
          <h2 className="text-lg font-semibold text-[var(--fb-text-primary)] flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-indigo-500" />
            Đổi mật khẩu
          </h2>
          <p className="text-sm text-[var(--fb-text-secondary)] mb-4">
            Cập nhật mật khẩu để bảo mật tài khoản.
          </p>

          {pwError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2 mb-4">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{pwError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                name="currentPassword"
                value={pwForm.currentPassword}
                onChange={handlePwChange}
                className="w-full px-4 py-3 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                name="newPassword"
                value={pwForm.newPassword}
                onChange={handlePwChange}
                className="w-full px-4 py-3 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              {pwForm.newPassword && (
                <p className="text-xs text-[var(--fb-text-secondary)] mt-2">
                  Yêu cầu: 6+ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={pwForm.confirmPassword}
                onChange={handlePwChange}
                className="w-full px-4 py-3 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSubmitPassword}
              disabled={pwSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
            >
              {pwSaving ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

