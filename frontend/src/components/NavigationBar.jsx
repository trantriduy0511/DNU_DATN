import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Search, MessageCircle, TrendingUp, FileText, UserPlus, Calendar, History, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { initializeSocket } from '../utils/socket';
import NotificationBell from './NotificationBell';
import AccountSwitcher from './AccountSwitcher';
import ChatUsers from './ChatUsers';
import ChatAI from './ChatAI';
import { FixedChatActionButtons } from './FixedChatActionButtons';

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
  const searchTimeoutRef = useRef(null);

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
      if (tabParam && ['groups', 'explore', 'events', 'documents'].includes(tabParam)) {
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
    window.addEventListener('messagesRead', handleMessagesRead);
    window.addEventListener('messagesUpdated', handleMessagesUpdated);
    
    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead);
      window.removeEventListener('messagesUpdated', handleMessagesUpdated);
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

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchResults]);

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
    
    setShowSearchResults(false);
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
      alert('✅ Đã gửi lời mời kết bạn');
      setSearchResults(prev => prev.map(r => 
        r._id === userId ? { ...r, friendStatus: 'request_sent' } : r
      ));
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi gửi lời mời kết bạn');
    }
  };

  const handleQuickChat = async (userId, e) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/messages/conversation/${userId}`);
      setShowSearchResults(false);
      setSearchQuery('');
      window.dispatchEvent(new CustomEvent('openChat', { 
        detail: { conversationId: res.data.conversation._id } 
      }));
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Lỗi khi mở chat');
    }
  };

  const handleNavigate = (path) => {
    setShowSearchResults(false);
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
    setShowSearchResults(false);
    if (location.pathname === '/home' || location.pathname === '/') {
      navigate(`/home?tab=${tab}`, { replace: true });
    } else {
      navigate(`/home?tab=${tab}`, { replace: false });
    }
  };

  const handleNavigateToHome = () => {
    setShowSearchResults(false);
    if (location.pathname === '/home' || location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate('/home', { replace: false });
  };

  const handleRefreshHome = () => {
    setShowSearchResults(false);
    window.location.assign('/home');
  };

  useEffect(() => {
    const openSavedPage = () => {
      setShowSearchResults(false);
      navigate('/saved', { replace: false });
    };
    window.addEventListener('openSavedPosts', openSavedPage);
    return () => window.removeEventListener('openSavedPosts', openSavedPage);
  }, [navigate]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[var(--fb-surface)] shadow-sm border-b border-[var(--fb-divider)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0 cursor-pointer min-w-[220px]" onClick={handleNavigateToHome}>
            <div className="w-10 h-10 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src="/dainam-logo.png"
                alt="Logo Dai Nam University"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wide">
                DAI NAM UNIVERSITY
              </span>
              <span className="text-base font-bold text-blue-700">
                DNU Workspace
              </span>
            </div>
          </div>

          {/* Search - Facebook Style */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-2 search-container">
            <div className="relative w-full">
              <Search className="w-5 h-5 text-[var(--fb-icon)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng, bài viết, nhóm..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => {
                  if (searchHistory.length > 0 && searchQuery.trim().length < 2) {
                    setShowSearchResults(true);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-[var(--fb-input)] rounded-full focus:outline-none focus:ring-0 focus:bg-[var(--fb-input-focus)] border border-transparent focus:border-[var(--fb-divider)] transition-all text-sm text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)]"
              />
              
              {/* Search Results Dropdown - Facebook Style */}
              {showSearchResults && (
                <div className="absolute top-full mt-1 w-full bg-[var(--fb-surface)] rounded-lg shadow-xl border border-[var(--fb-divider)] z-50 max-h-[500px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                      <p className="text-sm text-[var(--fb-text-secondary)] mt-2">Đang tìm kiếm...</p>
                    </div>
                  ) : searchQuery.trim().length < 2 && searchHistory.length > 0 ? (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--fb-text-secondary)]">
                          <History className="h-3.5 w-3.5" />
                          Lịch sử tìm kiếm
                        </div>
                        <button
                          type="button"
                          onClick={clearSearchHistory}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Xóa tất cả
                        </button>
                      </div>
                      <ul className="divide-y divide-[var(--fb-divider)]">
                        {searchHistory.map((term) => (
                          <li key={term}>
                            <div className="flex items-center gap-1 group">
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                                onClick={() => applyHistoryQuery(term)}
                              >
                                <Search className="h-4 w-4 shrink-0 text-[var(--fb-icon)] opacity-70" />
                                <span className="truncate">{term}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => removeHistoryItem(term, e)}
                                className="mr-1 rounded-full p-1.5 text-[var(--fb-text-secondary)] opacity-0 transition-opacity hover:bg-[var(--fb-hover)] group-hover:opacity-100"
                                title="Xóa khỏi lịch sử"
                                aria-label={`Xóa ${term}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="px-3 py-2 text-xs text-[var(--fb-text-secondary)]">Gõ ít nhất 2 ký tự để tìm mới.</p>
                    </div>
                  ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                    <div className="p-6 text-center text-[var(--fb-text-secondary)]">
                      <Search className="w-12 h-12 mx-auto mb-2 text-[var(--fb-icon)] opacity-60" />
                      <p className="text-sm font-medium text-[var(--fb-text-primary)]">Không tìm thấy kết quả</p>
                      <p className="text-xs text-[var(--fb-text-secondary)] mt-1">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                  ) : (
                    <>
                      {/* Group results by type */}
                      {searchResults.filter(r => r.type === 'user').length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-[var(--fb-text-secondary)] uppercase">Người dùng</div>
                          <div className="divide-y divide-[var(--fb-divider)]">
                            {searchResults.filter(r => r.type === 'user').map((result, index) => (
                              <div
                                key={`user-${index}`}
                                onClick={(e) => handleSearchResultClick(result, e)}
                                className="p-3 hover:bg-[var(--fb-hover)] cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="relative flex-shrink-0">
                                    <img
                                      src={
                                        result.avatar
                                          ? (String(result.avatar).startsWith('/uploads')
                                              ? `http://localhost:5000${result.avatar}`
                                              : result.avatar)
                                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name)}&background=1877f2&color=fff`
                                      }
                                      alt={result.name}
                                      className="w-12 h-12 rounded-full border-2 border-gray-200"
                                    />
                                    {result.isOnline && (
                                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
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
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Other results */}
                      {searchResults.filter(r => r.type !== 'user').length > 0 && (
                        <div className="p-2 border-t border-[var(--fb-divider)]">
                          <div className="px-3 py-2 text-xs font-semibold text-[var(--fb-text-secondary)] uppercase">Khác</div>
                          <div className="divide-y divide-[var(--fb-divider)]">
                            {searchResults.filter(r => r.type !== 'user').map((result, index) => (
                              <div
                                key={`other-${index}`}
                                onClick={(e) => handleSearchResultClick(result, e)}
                                className="p-3 hover:bg-[var(--fb-hover)] cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center space-x-3">
                                  {result.type === 'post' && (
                                    <>
                                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-blue-600" />
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
                                      <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
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
                                          setShowSearchResults(false);
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

          {/* Right Icons - Facebook Style */}
          <div className="flex items-center space-x-1 flex-shrink-0 ml-auto">
            <button
              onClick={handleRefreshHome}
              className={`p-2 rounded-lg transition-all duration-200 relative ${
                (location.pathname === '/home' || location.pathname === '/') && !location.search.includes('tab=')
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Trang chủ"
            >
              <Home className="w-5 h-5" />
              {(location.pathname === '/home' || location.pathname === '/') && !location.search.includes('tab=') && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full"></div>
              )}
            </button>
            
            <button
              onClick={() => handleNavigateToTab('groups')}
              className={`p-2 rounded-lg transition-all duration-200 relative ${
                activeTab === 'groups' || location.pathname.startsWith('/groups')
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Nhóm"
            >
              <Users className="w-5 h-5" />
              {(activeTab === 'groups' || location.pathname.startsWith('/groups')) && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full transition-all duration-200"></div>
              )}
            </button>
            
            <button
              onClick={() => handleNavigate('/events')}
              className={`p-2 rounded-lg transition-all duration-200 relative ${
                activeTab === 'events' || location.pathname.startsWith('/events')
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Sự kiện"
            >
              <Calendar className="w-5 h-5" />
              {(activeTab === 'events' || location.pathname.startsWith('/events')) && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-blue-600 rounded-t-full transition-all duration-200"></div>
              )}
            </button>
            
            <NotificationBell />
            
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openChatWindow'))}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors relative"
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

      {/* Global overlays (available on all pages with navbar) */}
      <FixedChatActionButtons unreadMessagesCount={unreadMessagesCount} />
      <ChatUsers />
      <ChatAI />
    </>
  );
};

export default NavigationBar;

