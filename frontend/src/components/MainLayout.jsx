import React, { useState } from 'react';
import { Menu, X, BookOpen, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const MainLayout = ({ children, sidebarContent, headerActions, activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo */}
          <div className="flex items-center justify-between h-20 px-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">DNU Admin</span>
            </div>
            <button className="lg:hidden p-1 hover:bg-white/10 rounded-full transition-colors" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
            {sidebarContent}
          </nav>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 mr-4 text-gray-500 rounded-xl lg:hidden hover:bg-gray-100 hover:text-orange-600 transition-all active:scale-95"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl font-bold text-gray-800 capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-xs text-gray-400 font-medium">Hệ thống quản trị DNU Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Custom Header Actions (Search, Notifications, etc.) */}
            <div id="header-actions" className="flex items-center space-x-2 sm:space-x-4">
               {headerActions}
            </div>
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center p-1.5 pr-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all active:scale-95 group"
              >
                <div className="relative">
                  <img
                    src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=ea580c&color=fff`}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-orange-200 transition-colors"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="ml-3 hidden sm:block text-left">
                  <p className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[120px]">{user?.name}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Admin</p>
                </div>
                <div className={`ml-2 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tài khoản</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{user?.email}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        const profileId = user?._id || user?.id;
                        if (!profileId) return;
                        navigate(`/profile/${profileId}`);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-colors"
                    >
                      <div className="bg-orange-50 p-1.5 rounded-lg">
                        <BookOpen className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="font-medium">Hồ sơ cá nhân</span>
                    </button>

                    <div className="h-px bg-gray-50 my-1 mx-2" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="bg-red-50 p-1.5 rounded-lg">
                        <LogOut className="w-4 h-4 text-red-600" />
                      </div>
                      <span className="font-semibold">Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 relative custom-scrollbar">
          <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-4">
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </div>
        </main>
      </div>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
