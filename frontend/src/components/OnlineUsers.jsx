import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Circle, MessageCircle, Search, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatTime';
import { initializeSocket } from '../utils/socket';
import { useAuthStore } from '../store/authStore';

const OnlineUsers = ({ variant = 'widget' }) => {
  const isContacts = variant === 'contacts';
  const resolveAvatarUrl = (avatar, name, background = '10b981') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const withAvatarFallback = (name, background = '10b981') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContactsSearch, setShowContactsSearch] = useState(false);
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');
  const [friendIds, setFriendIds] = useState([]);
  const friendIdsRef = useRef(new Set());
  const contactsSearchInputRef = useRef(null);
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const currentUserId = useMemo(() => (user?.id != null ? String(user.id) : user?._id != null ? String(user._id) : ''), [user]);

  useEffect(() => {
    friendIdsRef.current = new Set(friendIds.map(String));
  }, [friendIds]);

  useEffect(() => {
    fetchOnlineUsers();
    if (!isContacts) {
      fetchOnlineCount();
    }
  }, [isContacts]);

  useEffect(() => {
    if (showContactsSearch) {
      contactsSearchInputRef.current?.focus();
    } else {
      setContactsSearchQuery('');
    }
  }, [showContactsSearch]);

  // Real-time online/offline status via socket
  useEffect(() => {
    if (!user) return;

    const socket = initializeSocket();
    if (!socket) return;

    const onUserOnline = (data) => {
      const uid = String(data.userId);
      if (currentUserId && uid === currentUserId) return;
      if (isContacts && !friendIdsRef.current.has(uid)) return;

      setOnlineUsers((prev) => {
        if (prev.some((u) => String(u._id) === uid)) return prev;
        const row = data.user
          ? { ...data.user, _id: data.user._id ?? data.userId }
          : { _id: data.userId, name: '', avatar: '' };
        return [...prev, row];
      });
      if (!isContacts) {
        setOnlineCount((prev) => prev + 1);
      }
    };

    const onUserOffline = (data) => {
      const uid = String(data.userId);
      setOnlineUsers((prev) => prev.filter((u) => String(u._id) !== uid));
      if (!isContacts) {
        setOnlineCount((prev) => Math.max(0, prev - 1));
      }
    };

    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);

    return () => {
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
    };
  }, [user, isContacts, currentUserId]);

  const fetchOnlineUsers = async () => {
    try {
      if (isContacts) {
        const res = await api.get('/friends/online?limit=20');
        setOnlineUsers(res.data.users || []);
        setFriendIds(res.data.friendIds || []);
      } else {
        const res = await api.get('/users/online?limit=20');
        setOnlineUsers(res.data.users || []);
        setFriendIds([]);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineCount = async () => {
    try {
      const res = await api.get('/users/online/count');
      setOnlineCount(res.data.count || 0);
    } catch (error) {
      console.error('Error fetching online count:', error);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleChatClick = (userId, e) => {
    e.stopPropagation();
    // Get or create conversation and open chat
    api.get(`/messages/conversation/${userId}`)
      .then(res => {
        const conversationId = res.data.conversation._id;
        // Dispatch event to open chat with this conversation
        window.dispatchEvent(new CustomEvent('openChat', {
          detail: { conversationId }
        }));
      })
      .catch(error => {
        console.error('Error creating conversation:', error);
      });
  };

  const filteredOnlineUsers = useMemo(() => {
    if (!isContacts) return onlineUsers;
    const q = contactsSearchQuery.trim().toLowerCase();
    if (!q) return onlineUsers;
    return onlineUsers.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const role = (u.studentRole || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [isContacts, onlineUsers, contactsSearchQuery]);

  const renderList = () => {
    if (loading) {
      return (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      );
    }

    if (filteredOnlineUsers.length === 0) {
      return (
        <div className="p-4 text-center text-[var(--fb-text-secondary)]">
          <Users className="w-8 h-8 mx-auto mb-2 text-[var(--fb-icon)] opacity-60" />
          <p className="text-sm">
            {isContacts && contactsSearchQuery.trim()
              ? 'Không tìm thấy người liên hệ phù hợp'
              : isContacts
                ? 'Không có bạn bè nào đang online'
                : 'Không có người dùng nào online'}
          </p>
        </div>
      );
    }

    return (
      <div className="max-h-96 overflow-y-auto">
        {filteredOnlineUsers.map((u) => (
          <div
            key={u._id}
            onClick={() => handleUserClick(u._id)}
            className="p-3 border-b border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3">
              <div className="relative flex-shrink-0">
                <img
                  src={resolveAvatarUrl(u.avatar, u.name, '10b981')}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={withAvatarFallback(u.name, '10b981')}
                />
                <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute bottom-0 right-0 border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--fb-text-primary)] truncate">{u.name}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-[var(--fb-text-secondary)] truncate">
                    {u.studentRole === 'Giảng viên' ? '👨‍🏫' : '👨‍🎓'} {u.studentRole}
                  </p>
                  {u.lastActive && (
                    <p className="text-xs text-[var(--fb-text-secondary)] opacity-80">
                      • {formatTimeAgo(u.lastActive)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => handleChatClick(u._id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-green-100 rounded-lg transition-all"
                title="Nhắn tin"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-md border border-[var(--fb-divider)] overflow-hidden">
      {variant === 'contacts' ? (
        <>
          <div className="p-3 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--fb-text-primary)] text-[15px]">Người liên hệ</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowContactsSearch((v) => !v)}
                className={`rounded-full p-2 transition-colors ${
                  showContactsSearch
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
                    : 'hover:bg-[var(--fb-hover)]'
                }`}
                title="Tìm kiếm người liên hệ"
                aria-label="Tìm kiếm người liên hệ"
                aria-pressed={showContactsSearch}
              >
                <Search className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
              <button type="button" className="p-2 hover:bg-[var(--fb-hover)] rounded-full transition-colors" title="Tuỳ chọn">
                <MoreHorizontal className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
            </div>
          </div>
          {showContactsSearch ? (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                <input
                  ref={contactsSearchInputRef}
                  type="text"
                  value={contactsSearchQuery}
                  onChange={(e) => setContactsSearchQuery(e.target.value)}
                  placeholder="Tìm người liên hệ..."
                  className="w-full rounded-full border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>
            </div>
          ) : null}
          {renderList()}
        </>
      ) : (
        <>
          {/* Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--fb-hover)] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Users className="w-5 h-5 text-green-600" />
                <Circle className="w-2 h-2 text-green-500 fill-green-500 absolute -top-0.5 -right-0.5 animate-pulse" />
              </div>
              <h3 className="font-semibold text-[var(--fb-text-primary)]">Đang hoạt động</h3>
            </div>
            <span className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {onlineCount}
              </span>
              <svg
                className={`w-4 h-4 text-[var(--fb-icon)] opacity-70 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {isExpanded && <div className="border-t border-[var(--fb-divider)]">{renderList()}</div>}
        </>
      )}
    </div>
  );
};

export default OnlineUsers;





