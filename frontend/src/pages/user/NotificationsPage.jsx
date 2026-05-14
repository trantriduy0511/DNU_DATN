import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Trash2,
  MessageCircle,
  Heart,
  Users,
  Calendar,
  Check,
  ArrowLeft
} from 'lucide-react';
import { notify } from '../../lib/notify';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { initializeSocket } from '../../utils/socket';
import { useAuthStore } from '../../store/authStore';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const sameId = (a, b) => String(a) === String(b);

const parseGroupInviteIdFromLink = (link) => {
  if (!link || typeof link !== 'string') return null;
  try {
    const u = new URL(link, window.location.origin);
    return u.searchParams.get('invite');
  } catch {
    const m = link.match(/[?&]invite=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
};

const parseGroupIdFromGroupLink = (link) => {
  if (!link || typeof link !== 'string') return null;
  const m = link.match(/\/groups\/([^/?#]+)/);
  return m ? m[1] : null;
};

const parseEventIdFromCohostLink = (link) => {
  if (!link || typeof link !== 'string') return null;
  try {
    const u = new URL(link, window.location.origin);
    const fromQuery = u.searchParams.get('cohostEvent');
    if (fromQuery) return fromQuery;
    const pathMatch = u.pathname.match(/\/events\/([^/]+)/);
    return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  } catch {
    const m = link.match(/[?&]cohostEvent=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    const pm = link.match(/\/events\/([^/?#]+)/);
    return pm ? decodeURIComponent(pm[1]) : null;
  }
};

const parseConversationIdFromMessageLink = (link) => {
  if (!link || typeof link !== 'string') return null;
  try {
    const u = new URL(link, window.location.origin);
    return u.searchParams.get('conversation');
  } catch {
    const m = link.match(/[?&]conversation=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
};

const resolveNotificationDestination = (notification) => {
  if (!notification) return null;
  const rawLink = String(notification.link || '').trim();
  if (rawLink) return rawLink;

  const senderId = notification.sender?._id || notification.sender?.id;
  const eventId = notification.event?._id || notification.event;
  const groupId = notification.group?._id || notification.group;
  const postId = notification.post?._id || notification.post;

  switch (notification.type) {
    case 'event':
    case 'event_cohost_invite':
      return eventId ? `/events/${eventId}` : '/events';
    case 'group':
    case 'group_invite':
      return groupId ? `/groups/${groupId}` : '/home?tab=groups';
    case 'comment':
    case 'like':
    case 'post':
      return postId ? '/home' : null;
    case 'follow':
    case 'friend_request':
      return senderId ? `/profile/${senderId}` : null;
    default:
      return null;
  }
};

const extractSenderNameFromMessage = (message) => {
  const raw = String(message || '').trim();
  if (!raw) return '';
  const separators = [' đã ', ' vừa ', ' đã gửi ', 'đã ', 'vừa '];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) return raw.slice(0, idx).trim();
  }
  return '';
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'follow':
      return <Users className="w-5 h-5 text-green-500" />;
    case 'event':
      return <Calendar className="w-5 h-5 text-orange-500" />;
    case 'event_cohost_invite':
      return <Calendar className="w-5 h-5 text-amber-600" />;
    case 'group':
      return <Users className="w-5 h-5 text-purple-500" />;
    case 'group_invite':
      return <Users className="w-5 h-5 text-indigo-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all | unread
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(
    async (targetPage, mode = 'replace') => {
      const isFirstPage = targetPage === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const params = { page: targetPage, limit: PAGE_SIZE };
        if (filter === 'unread') params.unreadOnly = 'true';
        const res = await api.get('/notifications', { params });
        const incoming = res.data.notifications || [];
        const totalPages = res.data.pagination?.totalPages ?? 1;
        setUnreadCount(res.data.unreadCount ?? 0);
        setNotifications((prev) => {
          if (mode === 'replace') return incoming;
          const merged = [...prev];
          incoming.forEach((n) => {
            if (!merged.some((m) => sameId(m._id, n._id))) merged.push(n);
          });
          return merged;
        });
        setHasMore(targetPage < totalPages && incoming.length > 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1, 'replace');
  }, [filter, fetchPage]);

  useEffect(() => {
    if (!user) return undefined;
    const socket = initializeSocket();
    if (!socket) return undefined;

    const handleNotificationNew = (data) => {
      const incoming = data.notification;
      setNotifications((prev) => {
        if (prev.some((n) => sameId(n._id, incoming._id))) return prev;
        if (filter === 'unread' && incoming.isRead) return prev;
        return [incoming, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };
    socket.on('notification:new', handleNotificationNew);
    return () => {
      socket.off('notification:new', handleNotificationNew);
    };
  }, [user, filter]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return undefined;
    const target = sentinelRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setPage((prev) => {
            const next = prev + 1;
            fetchPage(next, 'append');
            return next;
          });
        }
      },
      { rootMargin: '120px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchPage]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (sameId(n._id, notificationId) ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => !sameId(n._id, notificationId)));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const openEventFromNotification = async (e, notification) => {
    e.stopPropagation();
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!eventId) return;
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    navigate(`/events/${eventId}`);
  };

  const openMessageFromNotification = async (notification) => {
    const conversationId = parseConversationIdFromMessageLink(notification.link);
    if (!conversationId) return;
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId } }));
  };

  const handleNotificationOpen = async (notification) => {
    if (!notification) return;
    if (notification.type === 'group_invite' || notification.type === 'event_cohost_invite') return;

    if (notification.type === 'message') {
      await openMessageFromNotification(notification);
      return;
    }

    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    const destination = resolveNotificationDestination(notification);
    if (!destination) return;
    navigate(destination);
  };

  const handleAcceptGroupInvite = async (e, notification) => {
    e.stopPropagation();
    const inviteId = parseGroupInviteIdFromLink(notification.link);
    const groupId = parseGroupIdFromGroupLink(notification.link);
    if (!inviteId || !groupId) return;
    try {
      const res = await api.post(`/groups/${groupId}/invites/${inviteId}/accept`);
      notify(res.data?.message || 'Đã tham gia nhóm!');
      await handleDelete(notification._id);
      window.dispatchEvent(new CustomEvent('userGroupsChanged'));
      navigate(`/groups/${groupId}`);
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleDeclineGroupInvite = async (e, notification) => {
    e.stopPropagation();
    const inviteId = parseGroupInviteIdFromLink(notification.link);
    const groupId = parseGroupIdFromGroupLink(notification.link);
    if (!inviteId || !groupId) return;
    try {
      await api.post(`/groups/${groupId}/invites/${inviteId}/decline`);
      await handleDelete(notification._id);
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể từ chối lời mời');
    }
  };

  const handleAcceptCoHostInvite = async (e, notification) => {
    e.stopPropagation();
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!eventId) return;
    try {
      const res = await api.post(`/events/${eventId}/cohost-invite/accept`);
      notify(res.data?.message || 'Đã chấp nhận làm đồng tổ chức');
      await handleDelete(notification._id);
      navigate(`/events/${eventId}`);
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleDeclineCoHostInvite = async (e, notification) => {
    e.stopPropagation();
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!eventId) return;
    try {
      const res = await api.post(`/events/${eventId}/cohost-invite/decline`);
      notify(res.data?.message || 'Đã từ chối');
      await handleDelete(notification._id);
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể từ chối lời mời');
    }
  };

  const getSenderName = (notification) => {
    const direct = String(notification?.sender?.name || '').trim();
    if (direct) return direct;
    const inferred = extractSenderNameFromMessage(notification?.message);
    return inferred || 'Người dùng';
  };

  const getSenderInitial = (notification) => {
    const senderName = getSenderName(notification);
    return senderName.charAt(0).toUpperCase() || '?';
  };

  const renderMessageWithEventTitleLink = (notification) => {
    const msg = notification.message || '';
    const title = typeof notification.event?.title === 'string' ? notification.event.title.trim() : '';
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!title || !eventId) {
      return <span className="text-[var(--fb-text-primary)]">{msg}</span>;
    }
    const quoted = `"${title}"`;
    let start = msg.indexOf(quoted);
    let sliceLen = quoted.length;
    if (start === -1) {
      start = msg.indexOf(title);
      sliceLen = title.length;
    }
    const linkClass =
      'inline border-0 bg-transparent p-0 align-baseline text-sm font-medium text-blue-600 hover:underline cursor-pointer';
    if (start === -1) {
      return (
        <>
          <span className="text-[var(--fb-text-primary)]">{msg}</span>
          {msg.length > 0 ? ' ' : null}
          <button
            type="button"
            className={linkClass}
            onClick={(e) => openEventFromNotification(e, notification)}
            title="Xem sự kiện"
          >
            {title}
          </button>
        </>
      );
    }
    return (
      <>
        <span className="text-[var(--fb-text-primary)]">{msg.slice(0, start)}</span>
        <button
          type="button"
          className={linkClass}
          onClick={(e) => openEventFromNotification(e, notification)}
          title="Xem sự kiện"
        >
          {msg.slice(start, start + sliceLen)}
        </button>
        <span className="text-[var(--fb-text-primary)]">{msg.slice(start + sliceLen)}</span>
      </>
    );
  };

  const { recentNotifications, olderNotifications } = useMemo(() => {
    const nowMs = Date.now();
    const recent = [];
    const older = [];
    notifications.forEach((n) => {
      const created = new Date(n.createdAt).getTime();
      if (nowMs - created <= 24 * 60 * 60 * 1000) recent.push(n);
      else older.push(n);
    });
    return { recentNotifications: recent, olderNotifications: older };
  }, [notifications]);

  const renderNotificationItem = (notification) => (
    <div
      key={String(notification._id)}
      className={`p-4 hover:bg-[var(--fb-hover)] transition-colors cursor-pointer ${
        !notification.isRead ? 'bg-[var(--fb-input)]' : ''
      }`}
      onClick={() => handleNotificationOpen(notification)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {notification.sender?.avatar ? (
            <img
              src={resolveMediaUrl(notification.sender.avatar)}
              alt={getSenderName(notification)}
              className="w-12 h-12 rounded-full object-cover cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const senderId = notification.sender?._id || notification.sender?.id;
                if (!senderId) return;
                navigate(`/profile/${senderId}`);
              }}
              title="Xem trang cá nhân"
            />
          ) : (
            <div
              className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const senderId = notification.sender?._id || notification.sender?.id;
                if (!senderId) return;
                navigate(`/profile/${senderId}`);
              }}
              title="Xem trang cá nhân"
            >
              {getSenderInitial(notification)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-[var(--fb-text-primary)]">
                <span
                  className="font-semibold hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const senderId = notification.sender?._id || notification.sender?.id;
                    if (!senderId) return;
                    navigate(`/profile/${senderId}`);
                  }}
                  title="Xem trang cá nhân"
                >
                  {getSenderName(notification)}
                </span>{' '}
                {notification.event &&
                (notification.type === 'event_cohost_invite' || notification.type === 'event')
                  ? renderMessageWithEventTitleLink(notification)
                  : (
                      <span className="text-[var(--fb-text-primary)]">{notification.message}</span>
                    )}
              </p>

              {notification.post && (
                <div className="mt-2 p-2 bg-[var(--fb-input)] rounded text-xs text-[var(--fb-text-secondary)] line-clamp-2">
                  {notification.post.content || notification.post.title}
                </div>
              )}

              <div className="flex items-center space-x-3 mt-2">
                <span className="text-xs text-[var(--fb-text-secondary)]">
                  {formatTimeAgo(notification.createdAt)}
                </span>
                {!notification.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>

              {notification.type === 'group_invite' && (
                <div
                  className="flex flex-wrap gap-2 mt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => handleDeclineGroupInvite(e, notification)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-xs font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAcceptGroupInvite(e, notification)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Chấp nhận
                  </button>
                </div>
              )}

              {notification.type === 'event_cohost_invite' && (
                <div
                  className="mt-3 flex flex-wrap gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => handleDeclineCoHostInvite(e, notification)}
                    className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-1.5 text-xs font-medium text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAcceptCoHostInvite(e, notification)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Chấp nhận
                  </button>
                </div>
              )}
            </div>

            <div className="ml-2 flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(notification._id);
          }}
          className="flex-shrink-0 p-1 hover:bg-red-50 rounded transition-colors"
          title="Xóa thông báo"
        >
          <Trash2 className="w-4 h-4 text-[var(--fb-icon)] opacity-70 hover:text-red-500" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--fb-app)]">
      <main className="max-w-3xl mx-auto px-0 sm:px-4 max-lg:pt-0 pb-4 lg:py-4">
        <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden max-lg:rounded-none max-lg:border-x-0 max-lg:shadow-none">
          <div className="p-4 sm:p-5 border-b border-[var(--fb-divider)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
                title="Quay lại"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--fb-icon)]" />
              </button>
              <h1 className="text-2xl font-bold text-[var(--fb-text-primary)] truncate">
                Thông báo
              </h1>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-[var(--fb-divider)]">
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Chưa đọc
                {unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <Bell className="w-16 h-16 text-[var(--fb-icon)] opacity-40 mb-3" />
                <p className="text-[var(--fb-text-secondary)] font-medium">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </p>
                {filter === 'unread' && (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2"
                  >
                    Xem tất cả thông báo
                  </button>
                )}
              </div>
            ) : (
              <div>
                {recentNotifications.length > 0 && (
                  <div className="px-4 sm:px-5 pt-3 pb-1 text-base font-bold text-[var(--fb-text-primary)]">
                    Mới
                  </div>
                )}
                <div className="divide-y divide-[var(--fb-divider)]">
                  {recentNotifications.map((notification) => renderNotificationItem(notification))}
                </div>
                {olderNotifications.length > 0 && (
                  <div className="px-4 sm:px-5 pt-3 pb-1 text-base font-bold text-[var(--fb-text-primary)]">
                    Trước đó
                  </div>
                )}
                <div className="divide-y divide-[var(--fb-divider)]">
                  {olderNotifications.map((notification) => renderNotificationItem(notification))}
                </div>

                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                )}
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center py-4 text-xs text-[var(--fb-text-secondary)]">
                    Đã hiển thị tất cả thông báo
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
