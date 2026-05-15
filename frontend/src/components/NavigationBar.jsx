import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Search, MessageCircle, TrendingUp, FileText, UserPlus, Calendar, History, X, Grid3x3, Bookmark, Settings, BookOpen, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { initializeSocket } from '../utils/socket';
import NotificationBell from './NotificationBell';
import AccountSwitcher from './AccountSwitcher';
import MobileSearchOverlay from './MobileSearchOverlay';
import ChatUsers from './ChatUsers';
import ChatAI from './ChatAI';
import { FixedChatActionButtons } from './FixedChatActionButtons';
import { emitAppEvent, onAppEvent } from '../shared/events/appEventBus';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { notify } from '../lib/notify';

const SEARCH_HISTORY_KEY = 'dnu_nav_search_history_v1';
const SEARCH_HISTORY_MAX = 12;

function readSearchHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string' && x.trim().length >= 2).map((x) => x.trim());
  } catch {
    return [];
  }
}

function writeSearchHistoryToStorage(items) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Ô tìm kiếm trên thanh nav — kiểu Facebook: pill cố định cao, nền tách khỏi header, icon kính lúp gọn. */
const NAV_SEARCH_INPUT_CLASS =
  'h-10 w-full rounded-full border border-transparent bg-[var(--fb-input)] pl-10 pr-3 text-[15px] leading-5 text-[var(--fb-text-primary)] shadow-none transition-[background-color,border-color] duration-150 placeholder:font-normal placeholder:text-[var(--fb-text-secondary)] placeholder:opacity-80 focus:border-[var(--fb-divider)] focus:bg-[var(--fb-input-focus)] focus:outline-none focus:ring-0 dark:border-white/[0.08] dark:focus:border-white/20';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => readSearchHistoryFromStorage());
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [searchHistoryEditMode, setSearchHistoryEditMode] = useState(false);
  const searchTimeoutRef = useRef(null);
  const appsMenuRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const desktopSearchInputRef = useRef(null);

  const appendSearchHistory = (rawQuery) => {
    const q = String(rawQuery || '').trim();
    if (q.length < 2) return;
    setSearchHistory((prev) => {
      const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, SEARCH_HISTORY_MAX);
      writeSearchHistoryToStorage(next);
      return next;
    });
  };

  const removeHistoryItem = (item, e) => {
    e?.stopPropagation?.();
    setSearchHistory((prev) => {
      const next = prev.filter((x) => x !== item);
      writeSearchHistoryToStorage(next);
      return next;
    });
  };

  const clearSearchHistory = (e) => {
    e?.stopPropagation?.();
    setSearchHistory([]);
    setSearchHistoryEditMode(false);
    setShowSearchResults(false);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (searchHistory.length === 0 && searchQuery.trim().length < 2) {
      setShowSearchResults(false);
    }
  }, [searchHistory.length, searchQuery]);

  // Determine active tab based on current route (memoized)
  const activeTab = React.useMemo(() => {
    const path = location.pathname;
    const search = location.search;
    
    if (path === '/home' || path === '/') {
      // Check if there's a tab query param
      const tabParam = new URLSearchParams(search).get('tab');
      if (tabParam && ['groups', 'explore', 'events', 'documents', 'friends'].includes(tabParam)) {
        return tabParam;
      }
      return 'home';
    }
    if (path.startsWith('/groups')) {
      return 'groups';
    }
    if (path.startsWith('/events')) {
      return 'events';
    }
    if (path.startsWith('/profile')) return null; // Profile pages don't have a nav item
    return null;
  }, [location.pathname, location.search]);

  // Fetch unread messages count once (no auto polling).
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread/count');
        setUnreadMessagesCount(res.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
      }
    };

    fetchUnreadCount();
    
    // Listen for messages read event
    const handleMessagesRead = () => {
      fetchUnreadCount();
    };
    const handleMessagesUpdated = () => {
      fetchUnreadCount();
    };
    const offMessagesRead = onAppEvent('messagesRead', handleMessagesRead);
    const offMessagesUpdated = onAppEvent('messagesUpdated', handleMessagesUpdated);
    
    return () => {
      offMessagesRead();
      offMessagesUpdated();
    };
  }, []);

  // Listen socket events directly for instant badge update (depends on token so reconnect after login / persist rehydrate).
  useEffect(() => {
    if (!user?.id || !token) return;

    const socket = initializeSocket();
    if (!socket) return;

    const refreshUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread/count');
        setUnreadMessagesCount(res.data.count || 0);
      } catch (error) {
        console.error('Error refreshing unread count from socket event:', error);
      }
    };

    const myId = String(user.id || user._id || '');

    const handleMessageNew = (data) => {
      const senderRaw = data?.message?.sender?._id ?? data?.message?.sender?.id;
      if (senderRaw != null && String(senderRaw) === myId) return;
      setUnreadMessagesCount((prev) => prev + 1);
      refreshUnreadCount();
    };

    const handleNotificationNew = (data) => {
      if (data?.notification?.type === 'message') {
        setUnreadMessagesCount((prev) => prev + 1);
        refreshUnreadCount();
      }
    };

    socket.on('message:new', handleMessageNew);
    socket.on('notification:new', handleNotificationNew);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('notification:new', handleNotificationNew);
    };
  }, [user?.id, token]);

  // Fallback: tab đang mở mà socket trễ / rớt, vẫn đồng bộ số chưa đọc (không reload trang).
  useEffect(() => {
    if (!user?.id || !token) return;

    const refreshUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread/count');
        setUnreadMessagesCount(res.data.count || 0);
      } catch {
        /* ignore */
      }
    };

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnreadCount();
    }, 4000);

    return () => clearInterval(id);
  }, [user?.id, token]);

  // Close desktop search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (showSearchResults || desktopSearchOpen) &&
        !event.target.closest('.search-container') &&
        !event.target.closest('.mobile-search-overlay')
      ) {
        closeDesktopSearch();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults, desktopSearchOpen]);

  useEffect(() => {
    if (!desktopSearchOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeDesktopSearch();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [desktopSearchOpen]);

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setShowSearchResults(false);
  };

  const openMobileSearch = () => {
    setMobileSearchOpen(true);
    setShowSearchResults(true);
  };

  const closeDesktopSearch = () => {
    setDesktopSearchOpen(false);
    setShowSearchResults(false);
    setSearchHistoryEditMode(false);
    desktopSearchInputRef.current?.blur();
  };

  const openDesktopSearch = () => {
    setDesktopSearchOpen(true);
    setShowSearchResults(true);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setShowSearchResults(searchHistory.length > 0);
      return;
    }

    setShowSearchResults(true);
    setSearchLoading(true);

    // Debounce search - wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      let allResults = [];
      const qTrim = query.trim();

      try {
        // Search posts
        try {
          const postsRes = await api.get('/posts', { params: { search: qTrim, limit: 5, status: 'approved' } });
          if (postsRes.data?.posts && Array.isArray(postsRes.data.posts)) {
            allResults.push(...postsRes.data.posts.map(p => ({ ...p, type: 'post' })));
          }
        } catch (error) {
          console.error('Error searching posts:', error);
        }

        // Search users
        try {
          const usersRes = await api.get('/users/search', { params: { q: qTrim, limit: 5 } });
          if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
            allResults.push(...usersRes.data.users.map(u => ({ ...u, type: 'user' })));
          }
        } catch (error) {
          console.error('Error searching users:', error);
        }

        // Search groups
        try {
          const groupsRes = await api.get('/groups', { params: { search: qTrim, limit: 5 } });
          if (groupsRes.data?.groups && Array.isArray(groupsRes.data.groups)) {
            allResults.push(...groupsRes.data.groups.map(g => ({ ...g, type: 'group' })));
          }
        } catch (error) {
          console.error('Error searching groups:', error);
        }

        setSearchResults(allResults);
        appendSearchHistory(qTrim);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce
  };

  const applyHistoryQuery = (term) => {
    const q = String(term || '').trim();
    setSearchQuery(q);
    if (q.length < 2) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setShowSearchResults(true);
    setSearchLoading(true);
    (async () => {
      let allResults = [];
      try {
        try {
          const postsRes = await api.get('/posts', { params: { search: q, limit: 5, status: 'approved' } });
          if (postsRes.data?.posts && Array.isArray(postsRes.data.posts)) {
            allResults.push(...postsRes.data.posts.map((p) => ({ ...p, type: 'post' })));
          }
        } catch (error) {
          console.error('Error searching posts:', error);
        }
        try {
          const usersRes = await api.get('/users/search', { params: { q, limit: 5 } });
          if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
            allResults.push(...usersRes.data.users.map((u) => ({ ...u, type: 'user' })));
          }
        } catch (error) {
          console.error('Error searching users:', error);
        }
        try {
          const groupsRes = await api.get('/groups', { params: { search: q, limit: 5 } });
          if (groupsRes.data?.groups && Array.isArray(groupsRes.data.groups)) {
            allResults.push(...groupsRes.data.groups.map((g) => ({ ...g, type: 'group' })));
          }
        } catch (error) {
          console.error('Error searching groups:', error);
        }
        setSearchResults(allResults);
        appendSearchHistory(q);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    })();
  };

  const handleSearchResultClick = (result, e) => {
    // Prevent navigation if clicking on action buttons
    if (e?.target?.closest('.search-action-button')) {
      return;
    }
    
    closeMobileSearch();
    closeDesktopSearch();
    setSearchQuery('');
    
    if (result.type === 'user') {
      navigate(`/profile/${result._id || result.id}`);
    } else if (result.type === 'group') {
      if (result._id || result.id) {
        navigate(`/groups/${result._id || result.id}`);
      } else {
        navigate('/home?tab=groups');
      }
    } else if (result.type === 'post') {
      navigate('/home?tab=home');
    }
  };

  const handleQuickAddFriend = async (userId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/friends/request/${userId}`);
      notify('✅ Đã gửi lời mời kết bạn');
      setSearchResults(prev => prev.map(r => 
        r._id === userId ? { ...r, friendStatus: 'request_sent' } : r
      ));
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi khi gửi lời mời kết bạn');
    }
  };

  const handleQuickChat = async (userId, e) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      closeMobileSearch();
      setSearchQuery('');
      emitAppEvent('openChat', { conversationId: res.data.conversation._id });
    } catch (error) {
      console.error('Error starting chat:', error);
      notify('Lỗi khi mở chat');
    }
  };

  const handleNavigate = (path) => {
    closeDesktopSearch();
    closeMobileSearch();
    if (path === '/home') {
      const p = location.pathname;
      if (p === '/home' || p === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      navigate('/home', { replace: false });
      return;
    }
    navigate(path, { replace: false });
  };

  const handleNavigateToTab = (tab) => {
    closeDesktopSearch();
    closeMobileSearch();
    if (location.pathname === '/home' || location.pathname === '/') {
      navigate(`/home?tab=${tab}`, { replace: true });
    } else {
      navigate(`/home?tab=${tab}`, { replace: false });
    }
  };

  const handleNavigateToHome = () => {
    closeDesktopSearch();
    closeMobileSearch();
    if (location.pathname === '/home' || location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/home', { replace: false });
  };

  const handleRefreshHome = () => {
    setShowSearchResults(false);
    closeMobileSearch();
    window.location.assign('/home');
  };

  useEffect(() => {
    const openSavedPage = () => {
      setShowSearchResults(false);
      navigate('/saved', { replace: false });
    };
    const offOpenSavedPosts = onAppEvent('openSavedPosts', openSavedPage);
    return () => offOpenSavedPosts();
  }, [navigate]);

  // Đóng menu apps khi click ra ngoài
  useEffect(() => {
    if (!showAppsMenu) return undefined;
    const onDocClick = (event) => {
      if (appsMenuRef.current && !appsMenuRef.current.contains(event.target)) {
        setShowAppsMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showAppsMenu]);

  const appsMenuItems = [
    {
      id: 'lecturer-docs',
      label: 'Phân tích tài liệu',
      icon: BookOpen,
      iconWrapClassName: 'rounded-lg bg-sky-100 dark:bg-sky-900/40',
      iconClassName: 'h-4 w-4 text-blue-600 dark:text-sky-300',
      onClick: () => handleNavigateToTab('documents'),
    },
    {
      id: 'friends',
      label: 'Bạn bè',
      icon: Users,
      onClick: () => handleNavigateToTab('friends'),
    },
    {
      id: 'saved',
      label: 'Bài viết đã lưu',
      icon: Bookmark,
      onClick: () => navigate('/saved'),
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[var(--fb-surface)] shadow-sm border-b border-[var(--fb-divider)]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          {/* Mobile: logo + menu (trái) | cụm tìm/tin/chuông/tài khoản căn phải, khoảng cách đều */}
          <div className="grid h-12 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-1 md:hidden">
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleNavigateToHome}
                className="flex shrink-0 cursor-pointer items-center"
                aria-label="Về trang chủ"
              >
                <div className="nav-logo-wrap flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
                  <img src="/dainam-logo.png" alt="" className="h-7 w-7 object-contain" />
                </div>
              </button>
              <div className="relative shrink-0" ref={appsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAppsMenu((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    showAppsMenu
                      ? 'bg-[var(--fb-input)] text-blue-600'
                      : 'bg-[var(--fb-input)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                  }`}
                  title="Menu"
                  aria-label="Menu"
                  aria-expanded={showAppsMenu}
                >
                  <Grid3x3 className="h-5 w-5" />
                </button>
                {showAppsMenu && (
                  <div className="absolute left-0 top-full z-[80] mt-1 w-60 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl">
                    {appsMenuItems.map((item) => {
                      const Icon = item.icon;
                      const iconCls = item.iconClassName || 'h-4 w-4 text-[var(--fb-text-primary)]';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setShowAppsMenu(false);
                            item.onClick?.();
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                        >
                          <span
                            className={
                              item.iconWrapClassName
                                ? `relative inline-flex h-8 w-8 shrink-0 items-center justify-center ${item.iconWrapClassName}`
                                : 'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--fb-input)]'
                            }
                          >
                            <Icon className={iconCls} />
                            {typeof item.badge === 'number' && item.badge > 0 && (
                              <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            )}
                          </span>
                          <span className="truncate font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex min-w-0 w-full items-center justify-end gap-0 pr-0.5">
              <button
                type="button"
                onClick={openMobileSearch}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                title="Tìm kiếm"
                aria-label="Tìm kiếm"
                aria-expanded={mobileSearchOpen}
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => emitAppEvent('openChatWindow')}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                title="Tin nhắn"
                aria-label="Tin nhắn"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>
              <NotificationBell />
              <AccountSwitcher />
            </div>
          </div>

          {/* Mobile: thanh tab tràn ngang — gạch chân tab đang chọn (giống Facebook app) */}
          <nav
            className="flex h-[52px] min-h-[52px] items-stretch border-b border-[var(--fb-divider)] md:hidden"
            aria-label="Điều hướng chính"
          >
            <button
              type="button"
              onClick={handleRefreshHome}
              className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-1 pt-2 text-[var(--fb-icon)] transition-colors ${
                activeTab === 'home'
                  ? 'border-b-[3px] border-[#1877F2] text-[#1877F2]'
                  : 'border-b-[3px] border-transparent hover:text-[var(--fb-text-primary)]'
              }`}
              title="Trang chủ"
              aria-current={activeTab === 'home' ? 'page' : undefined}
            >
              <Home className="h-6 w-6 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigateToTab('groups')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-1 pt-2 transition-colors ${
                activeTab === 'groups' || location.pathname.startsWith('/groups')
                  ? 'border-b-[3px] border-[#1877F2] text-[#1877F2]'
                  : 'border-b-[3px] border-transparent text-[var(--fb-icon)] hover:text-[var(--fb-text-primary)]'
              }`}
              title="Nhóm"
              aria-current={activeTab === 'groups' || location.pathname.startsWith('/groups') ? 'page' : undefined}
            >
              <Users className="h-6 w-6 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/events')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-1 pt-2 transition-colors ${
                activeTab === 'events' || location.pathname.startsWith('/events')
                  ? 'border-b-[3px] border-[#1877F2] text-[#1877F2]'
                  : 'border-b-[3px] border-transparent text-[var(--fb-icon)] hover:text-[var(--fb-text-primary)]'
              }`}
              title="Sự kiện"
              aria-current={activeTab === 'events' || location.pathname.startsWith('/events') ? 'page' : undefined}
            >
              <Calendar className="h-6 w-6 shrink-0" />
            </button>
          </nav>

          <div className="hidden md:grid md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3">
          <div className="relative flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          {/* Logo — có thể bị thanh tìm kiếm che khi mở rộng về trái */}
          <button
            type="button"
            onClick={handleNavigateToHome}
            className={`flex shrink-0 cursor-pointer items-center transition-opacity ${
              desktopSearchOpen ? 'pointer-events-none opacity-0' : ''
            }`}
            aria-label="Về trang chủ"
            tabIndex={desktopSearchOpen ? -1 : 0}
          >
            <div className="nav-logo-wrap flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
              <img
                src="/dainam-logo.png"
                alt="Logo Dai Nam University"
                className="w-8 h-8 object-contain"
              />
            </div>
          </button>

          {/* Search — desktop: mở rộng về trái (neo mép phải, che logo) */}
          <div
            className={`search-container hidden items-center gap-2 md:flex ${
              desktopSearchOpen
                ? 'absolute right-0 top-1/2 z-30 w-[min(680px,100%)] -translate-y-1/2'
                : 'relative min-w-0 flex-1 md:mx-2'
            }`}
          >
            {desktopSearchOpen ? (
              <button
                type="button"
                onClick={closeDesktopSearch}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--fb-input)] text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                aria-label="Đóng tìm kiếm"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}
            <div
              className={`relative w-full transition-[max-width] duration-200 ease-out ${
                desktopSearchOpen ? 'max-w-none' : 'max-w-[240px]'
              }`}
            >
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)] opacity-65 dark:opacity-80"
              />
              <input
                type="search"
                enterKeyHint="search"
                ref={desktopSearchInputRef}
                placeholder="Tìm kiếm trên DNU"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={openDesktopSearch}
                className={NAV_SEARCH_INPUT_CLASS}
                aria-label="Tìm kiếm trên DNU"
                aria-expanded={showSearchResults}
                aria-controls="desktop-search-dropdown"
              />
              
              {/* Search Results Dropdown - Facebook Style */}
              {showSearchResults && (
                <div
                  id="desktop-search-dropdown"
                  className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,520px)] w-full min-w-[320px] overflow-y-auto rounded-xl bg-[var(--fb-surface)] py-2 shadow-[0_12px_28px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.08)] ring-1 ring-[var(--fb-divider)]"
                >
                  {searchLoading ? (
                    <div className="px-4 py-8 text-center">
                      <div className="mx-auto inline-block h-7 w-7 animate-spin rounded-full border-2 border-[var(--fb-divider)] border-t-[#1877F2]" />
                      <p className="mt-3 text-sm text-[var(--fb-text-secondary)]">Đang tìm kiếm...</p>
                    </div>
                  ) : searchQuery.trim().length < 2 && searchHistory.length > 0 ? (
                    <div className="px-1 pb-1">
                      <div className="flex items-center justify-between px-3 py-2">
                        <h3 className="text-[15px] font-bold text-[var(--fb-text-primary)]">Mới đây</h3>
                        {searchHistoryEditMode ? (
                          <button
                            type="button"
                            onClick={() => setSearchHistoryEditMode(false)}
                            className="text-[15px] font-semibold text-[#1877F2] hover:underline"
                          >
                            Xong
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSearchHistoryEditMode(true)}
                            className="text-[15px] font-semibold text-[#1877F2] hover:underline"
                          >
                            Chỉnh sửa
                          </button>
                        )}
                      </div>
                      <ul>
                        {searchHistory.map((term) => (
                          <li key={term}>
                            <div className="flex items-center rounded-lg px-1 hover:bg-[var(--fb-hover)]">
                              <button
                                type="button"
                                disabled={searchHistoryEditMode}
                                className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-2 text-left disabled:cursor-default"
                                onClick={() => !searchHistoryEditMode && applyHistoryQuery(term)}
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--fb-input)]">
                                  <History className="h-[18px] w-[18px] text-[var(--fb-icon)]" />
                                </span>
                                <span className="truncate text-[15px] font-semibold text-[var(--fb-text-primary)]">
                                  {term}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => removeHistoryItem(term, e)}
                                className={`mr-1 shrink-0 rounded-full p-2 text-[var(--fb-icon)] transition-opacity hover:bg-[var(--fb-hover)] ${
                                  searchHistoryEditMode ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                                }`}
                                title="Xóa khỏi lịch sử"
                                aria-label={`Xóa ${term}`}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {searchHistoryEditMode ? (
                        <div className="border-t border-[var(--fb-divider)] px-3 pt-2">
                          <button
                            type="button"
                            onClick={clearSearchHistory}
                            className="w-full rounded-lg py-2 text-center text-[15px] font-semibold text-[#1877F2] hover:bg-[var(--fb-hover)]"
                          >
                            Xóa tất cả
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : searchQuery.trim().length < 2 ? (
                    <div className="px-4 py-8 text-center text-[var(--fb-text-secondary)]">
                      <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
                      <p className="text-[15px] font-semibold text-[var(--fb-text-primary)]">Tìm kiếm trên DNU</p>
                      <p className="mt-1 text-sm">Gõ ít nhất 2 ký tự để tìm người dùng, nhóm hoặc bài viết.</p>
                    </div>
                  ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[var(--fb-text-secondary)]">
                      <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
                      <p className="text-[15px] font-semibold text-[var(--fb-text-primary)]">Không tìm thấy kết quả</p>
                      <p className="mt-1 text-sm">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                  ) : (
                    <>
                      {/* Group results by type */}
                      {searchResults.filter(r => r.type === 'user').length > 0 && (
                        <div className="p-2">
                          <h3 className="px-3 py-2 text-[15px] font-bold text-[var(--fb-text-primary)]">Người dùng</h3>
                          <div className="flex flex-col">
                            {searchResults.filter(r => r.type === 'user').map((result, index, arr) => (
                              <div key={`user-${index}`} className="flex flex-col">
                              <div
                                onClick={(e) => handleSearchResultClick(result, e)}
                                className="cursor-pointer p-3 transition-colors group hover:bg-[var(--fb-hover)]"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className="relative flex-shrink-0">
                                    <img
                                      src={
                                        result.avatar
                                          ? resolveMediaUrl(result.avatar)
                                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name)}&background=1877f2&color=fff`
                                      }
                                      alt={result.name}
                                      className="h-9 w-9 rounded-full border border-[var(--fb-divider)] object-cover"
                                    />
                                    {result.isOnline && (
                                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--fb-surface)] bg-green-500"></span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <p className="font-semibold text-[var(--fb-text-primary)] text-sm truncate">{result.name}</p>
                                      {result.isOnline && (
                                        <span className="text-xs text-green-600 font-medium flex-shrink-0">• Online</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[var(--fb-text-secondary)] truncate">{result.studentRole} • {result.major}</p>
                                    {result.email && (
                                      <p className="text-xs text-[var(--fb-text-secondary)] opacity-80 truncate">{result.email}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1 flex-shrink-0 search-action-button">
                                    <button
                                      onClick={(e) => handleQuickChat(result._id || result.id, e)}
                                      className="p-2 hover:bg-blue-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                      title="Nhắn tin"
                                    >
                                      <MessageCircle className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={(e) => handleQuickAddFriend(result._id || result.id, e)}
                                      className="p-2 hover:bg-green-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                      title="Kết bạn"
                                    >
                                      <UserPlus className="w-4 h-4 text-green-600" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {index < arr.length - 1 ? (
                                <div
                                  aria-hidden
                                  className="-mr-2 ml-[58px] h-px bg-[var(--fb-divider)]"
                                />
                              ) : null}
                            </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.filter(r => r.type !== 'user').length > 0 && (
                        <div className="p-2 border-t border-[var(--fb-divider)]">
                          <h3 className="px-3 py-2 text-[15px] font-bold text-[var(--fb-text-primary)]">Khác</h3>
                          <div className="divide-y divide-[var(--fb-divider)]">
                            {searchResults.filter(r => r.type !== 'user').map((result, index) => (
                              <div
                                key={`other-${index}`}
                                onClick={(e) => handleSearchResultClick(result, e)}
                                className="p-3 hover:bg-[var(--fb-hover)] cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center space-x-2.5">
                                  {result.type === 'post' && (
                                    <>
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[var(--fb-text-primary)] text-sm truncate">{result.content?.substring(0, 80)}...</p>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <span className="text-xs text-[var(--fb-text-secondary)]">Bài viết</span>
                                          <span className="text-xs text-[var(--fb-text-secondary)] opacity-70">•</span>
                                          <span className="text-xs text-blue-600">{result.category}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {result.type === 'group' && (
                                    <>
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-base">
                                        {result.avatar || '📚'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[var(--fb-text-primary)] text-sm truncate">{result.name}</p>
                                        <p className="text-xs text-[var(--fb-text-secondary)] mt-1">{result.membersCount || result.members?.length || 0} thành viên</p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (result._id || result.id) {
                                            navigate(`/groups/${result._id || result.id}`);
                                          } else {
                                            navigate('/home?tab=groups');
                                          }
                                          closeDesktopSearch();
                                        }}
                                        className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex-shrink-0"
                                      >
                                        Xem
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>

          <nav
            className="hidden shrink-0 gap-8 sm:gap-12 md:flex md:items-center md:justify-center md:gap-16"
            aria-label="Điều hướng chính"
          >
            <button
              type="button"
              onClick={handleRefreshHome}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 relative ${
                (location.pathname === '/home' || location.pathname === '/') && !location.search.includes('tab=')
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]'
              }`}
              title="Trang chủ"
            >
              <Home className="w-5 h-5" />
              {(location.pathname === '/home' || location.pathname === '/') && !location.search.includes('tab=') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full"></div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavigateToTab('groups')}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 relative ${
                activeTab === 'groups' || location.pathname.startsWith('/groups')
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]'
              }`}
              title="Nhóm"
            >
              <Users className="w-5 h-5" />
              {(activeTab === 'groups' || location.pathname.startsWith('/groups')) && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full transition-all duration-200"></div>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/events')}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 relative ${
                activeTab === 'events' || location.pathname.startsWith('/events')
                  ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]'
              }`}
              title="Sự kiện"
            >
              <Calendar className="w-5 h-5" />
              {(activeTab === 'events' || location.pathname.startsWith('/events')) && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full transition-all duration-200"></div>
              )}
            </button>
          </nav>

          {/* Phải: thông báo, chat, tài khoản (desktop) */}
          <div className="hidden min-w-0 items-center justify-end gap-2.5 pl-2 sm:gap-3 sm:pl-3 md:flex">
            <NotificationBell />

            <button
              type="button"
              onClick={() => emitAppEvent('openChatWindow')}
              className="inline-flex rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)] relative"
              title="Tin nhắn"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px]">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
            
            <AccountSwitcher />
          </div>
          </div>

        </div>
      </header>

      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={closeMobileSearch}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        searchInputRef={mobileSearchInputRef}
        searchLoading={searchLoading}
        searchHistory={searchHistory}
        searchResults={searchResults}
        onClearHistory={clearSearchHistory}
        onRemoveHistoryItem={removeHistoryItem}
        onApplyHistoryQuery={applyHistoryQuery}
        onResultClick={handleSearchResultClick}
      />

      {/* Global overlays (available on all pages with navbar) */}
      <FixedChatActionButtons unreadMessagesCount={unreadMessagesCount} />
      <ChatUsers />
      <ChatAI />
    </>
  );
};

export default NavigationBar;

