import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, ChevronDown, Plus, LogOut, X, Bookmark, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { confirmAsync } from '../lib/notify';

const AccountSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  const { user, accounts, currentAccountId, switchAccount, removeAccount, login, logout } = useAuthStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sameAccountId = (a, b) => String(a ?? '') === String(b ?? '');
  const selfUserId = user?.id || user?._id;

  const handleSwitchAccount = (accountId) => {
    switchAccount(accountId);
    setIsOpen(false);
    window.setTimeout(() => window.location.reload(), 50);
  };

  const handleRemoveAccount = async (accountId, e) => {
    e.stopPropagation();
    if (await confirmAsync('Bạn có chắc muốn xóa tài khoản này khỏi danh sách?')) {
      await removeAccount(accountId);
      const remaining = useAuthStore.getState().accounts?.length ?? 0;
      if (remaining === 0) {
        navigate('/login');
      }
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);

    if (result.success) {
      setShowAddAccountModal(false);
      setEmail('');
      setPassword('');
      window.setTimeout(() => window.location.reload(), 50);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleLogoutAll = async () => {
    if (await confirmAsync('Bạn có chắc muốn đăng xuất tất cả các tài khoản?')) {
      await logout(true); // Logout all
      navigate('/login');
    }
  };

  return (
    <>
      {/* Account Switcher Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-0.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--fb-hover)] md:space-x-2 md:px-3 md:py-2"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {user?.avatar ? (
              <img
                src={
                  resolveMediaUrl(user.avatar)
                }
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{user?.name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-[var(--fb-text-primary)]">{user?.name}</p>
            {accounts.length > 1 && (
              <p className="text-xs text-[var(--fb-text-secondary)]">{accounts.length} tài khoản</p>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--fb-icon)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-xl border border-[var(--fb-divider)] z-50 max-h-[80vh] overflow-y-auto">
            {/* Current Account */}
            <div className="p-3 bg-[var(--fb-input)] border-b border-[var(--fb-divider)]">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!selfUserId) return;
                  setIsOpen(false);
                  navigate(`/profile/${selfUserId}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!selfUserId) return;
                    setIsOpen(false);
                    navigate(`/profile/${selfUserId}`);
                  }
                }}
                className="flex items-center space-x-3 p-2 bg-[var(--fb-surface)] border border-[var(--fb-divider)] rounded-lg cursor-pointer hover:bg-[var(--fb-hover)] transition-colors"
                title="Xem trang cá nhân"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {user?.avatar ? (
                    <img
                      src={
                        resolveMediaUrl(user.avatar)
                      }
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--fb-text-primary)]">{user?.name}</p>
                  <p className="text-xs text-[var(--fb-text-primary)]">{user?.email}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    {user?.role === 'admin' ? '👑 Admin' : user?.studentRole === 'Giảng viên' ? '👨‍🏫 Giảng viên' : '👨‍🎓 Sinh viên'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-2 border-b border-[var(--fb-divider)]">
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (selfUserId) {
                    navigate(`/profile/${selfUserId}`);
                  }
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left"
              >
                <User className="w-5 h-5 text-[var(--fb-icon)]" />
                <span className="text-[var(--fb-text-primary)]">Trang cá nhân</span>
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent('openSavedPosts'));
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left"
              >
                <Bookmark className="w-5 h-5 text-[var(--fb-icon)]" />
                <span className="text-[var(--fb-text-primary)]">Đã lưu</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-[var(--fb-icon)]" />
                <span className="text-[var(--fb-text-primary)]">Cài đặt</span>
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition-colors text-left"
                >
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                  <span className="text-purple-700 dark:text-purple-300 font-medium">Quản trị</span>
                </button>
              )}
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout(false);
                  if (accounts.length === 1) {
                    navigate('/login');
                  }
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 font-medium">Đăng xuất</span>
              </button>
            </div>

            {/* Other Accounts */}
            {accounts.filter((acc) => !sameAccountId(acc.id, currentAccountId)).length > 0 && (
              <div className="p-3 border-b border-[var(--fb-divider)]">
                <p className="text-xs text-[var(--fb-text-secondary)] mb-2">Chuyển đổi tài khoản</p>
                <div className="space-y-2">
                  {accounts
                    .filter((acc) => !sameAccountId(acc.id, currentAccountId))
                    .map((account) => (
                      <div
                        key={String(account.id)}
                        onClick={() => handleSwitchAccount(account.id)}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[var(--fb-hover)] cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                          {account.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--fb-text-primary)]">{account.user?.name}</p>
                          <p className="text-xs text-[var(--fb-text-secondary)]">{account.user?.email}</p>
                          <p className="text-xs text-[var(--fb-text-secondary)] mt-1">
                            {account.user?.role === 'admin' ? '👑 Admin' : account.user?.studentRole === 'Giảng viên' ? '👨‍🏫 Giảng viên' : '👨‍🎓 Sinh viên'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleRemoveAccount(account.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                          title="Xóa tài khoản"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => {
                  setShowAddAccountModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/25 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="font-medium text-blue-600 dark:text-blue-300">Thêm tài khoản</p>
                  <p className="text-xs text-[var(--fb-text-secondary)]">Chuyển đổi nhanh giữa các tài khoản</p>
                </div>
              </button>
              
              {accounts.length > 1 && (
                <button
                  onClick={handleLogoutAll}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/25 transition-colors text-left mt-1"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600 dark:text-red-300" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">Đăng xuất tất cả</p>
                    <p className="text-xs text-[var(--fb-text-secondary)]">{accounts.length} tài khoản</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Account Modal — portal ra body để fixed căn viewport (PageTransition có transform làm lệch containing block) */}
      {showAddAccountModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddAccountModal(false);
                setError('');
                setEmail('');
                setPassword('');
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-gray-800"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-account-modal-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="add-account-modal-title" className="text-xl font-bold">
                  Thêm tài khoản
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAccountModal(false);
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Đăng nhập vào tài khoản khác để chuyển đổi nhanh chóng giữa các tài khoản.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAccountModal(false);
                      setError('');
                      setEmail('');
                      setPassword('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default AccountSwitcher;

