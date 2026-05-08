import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Trash2, MessageCircle, Heart, Users, Calendar, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatTime';
import { initializeSocket } from '../utils/socket';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';

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

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all'); // all | unread
  const [showAllItems, setShowAllItems] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const dropdownPanelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: showAllItems ? 60 : 25 };
      if (notificationFilter === 'unread') {
        params.unreadOnly = 'true';
      }
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount ?? 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [notificationFilter, showAllItems]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const { user } = useAuthStore();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = initializeSocket();
    if (!socket) return;

    const handleNotificationNew = (data) => {
      const incoming = data.notification;
      if (showDropdown) {
        setNotifications((prev) => {
          if (prev.some((n) => sameId(n._id, incoming._id))) return prev;
          if (notificationFilter === 'unread' && incoming.isRead) return prev;
          return [incoming, ...prev];
        });
      }
      setUnreadCount((prev) => prev + 1);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(incoming.message, {
          icon: incoming.sender?.avatar,
          badge: '/favicon.ico'
        });
      }
      window.dispatchEvent(new CustomEvent('messagesUpdated'));
    };
    socket.on('notification:new', handleNotificationNew);

    return () => {
      socket.off('notification:new', handleNotificationNew);
    };
  }, [user, showDropdown, notificationFilter]);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const t = event.target;
      if (dropdownRef.current?.contains(t) || dropdownPanelRef.current?.contains(t)) {
        return;
      }
      setShowDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => !sameId(n._id, notificationId)));
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleAcceptGroupInviteNotification = async (e, notification) => {
    e.stopPropagation();
    const inviteId = parseGroupInviteIdFromLink(notification.link);
    const groupId = parseGroupIdFromGroupLink(notification.link);
    if (!inviteId || !groupId) return;
    try {
      const res = await api.post(`/groups/${groupId}/invites/${inviteId}/accept`);
      alert(res.data?.message || 'Đã tham gia nhóm!');
      await handleDelete(notification._id);
      window.dispatchEvent(new CustomEvent('userGroupsChanged'));
      setShowDropdown(false);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleDeclineGroupInviteNotification = async (e, notification) => {
    e.stopPropagation();
    const inviteId = parseGroupInviteIdFromLink(notification.link);
    const groupId = parseGroupIdFromGroupLink(notification.link);
    if (!inviteId || !groupId) return;
    try {
      await api.post(`/groups/${groupId}/invites/${inviteId}/decline`);
      await handleDelete(notification._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể từ chối lời mời');
    }
  };

  const handleAcceptCoHostInviteNotification = async (e, notification) => {
    e.stopPropagation();
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!eventId) return;
    try {
      const res = await api.post(`/events/${eventId}/cohost-invite/accept`);
      alert(res.data?.message || 'Đã chấp nhận làm đồng tổ chức');
      await handleDelete(notification._id);
      setShowDropdown(false);
      navigate(`/events/${eventId}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleDeclineCoHostInviteNotification = async (e, notification) => {
    e.stopPropagation();
    const eventId =
      parseEventIdFromCohostLink(notification.link) ||
      notification.event?._id ||
      notification.event;
    if (!eventId) return;
    try {
      const res = await api.post(`/events/${eventId}/cohost-invite/decline`);
      alert(res.data?.message || 'Đã từ chối');
      await handleDelete(notification._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể từ chối lời mời');
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
    setShowDropdown(false);
    navigate(`/events/${eventId}`);
  };

  const openMessageFromNotification = async (notification) => {
    const conversationId = parseConversationIdFromMessageLink(notification.link);
    if (!conversationId) return;
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    setShowDropdown(false);
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
    setShowDropdown(false);
    navigate(destination);
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

  const toggleDropdown = () => {
    setShowDropdown((prev) => {
      const next = !prev;
      if (next) {
        setNotificationFilter('all');
        setShowAllItems(false);
      }
      return next;
    });
  };

  const displayList = notifications;
  const nowMs = Date.now();
  const recentNotifications = displayList.filter((n) => nowMs - new Date(n.createdAt).getTime() <= 24 * 60 * 60 * 1000);
  const olderNotifications = displayList.filter((n) => nowMs - new Date(n.createdAt).getTime() > 24 * 60 * 60 * 1000);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="p-2 hover:bg-[var(--fb-hover)] rounded-full relative transition-colors"
      >
        <Bell className="w-6 h-6 text-[var(--fb-icon)]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownPanelRef}
            className="fixed top-16 right-4 w-96 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-xl border border-[var(--fb-divider)] z-[2000] max-h-[600px] flex flex-col"
          >
            <div className="p-4 pb-2 flex items-center justify-between sticky top-0 bg-[var(--fb-surface)] rounded-t-lg">
              <h3 className="text-lg font-bold text-[var(--fb-text-primary)]">Thông báo</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAllAsRead();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="p-1 hover:bg-[var(--fb-hover)] rounded transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--fb-icon)]" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-0 pb-2 bg-[var(--fb-surface)]">
              <div className="flex items-center justify-between mb-0">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationFilter('all');
                      setShowAllItems(false);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                      notificationFilter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationFilter('unread');
                      setShowAllItems(true);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                      notificationFilter === 'unread'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    Chưa đọc
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (user?.role === 'admin') {
                      setShowDropdown(false);
                      navigate('/admin/notifications');
                      return;
                    }
                    setNotificationFilter('all');
                    setShowAllItems(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Xem tất cả
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="w-16 h-16 text-[var(--fb-icon)] opacity-40 mb-3" />
                  <p className="text-[var(--fb-text-secondary)] font-medium">
                    {notificationFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                  </p>
                  {notificationFilter === 'unread' && (
                    <p className="text-xs text-[var(--fb-text-secondary)] opacity-80 mt-1 text-center">
                      Chuyển sang tab &quot;Tất cả&quot; để xem lịch sử thông báo
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {recentNotifications.length > 0 && (
                    <div className="px-4 pt-3 pb-1 text-base font-bold text-[var(--fb-text-primary)]">Mới</div>
                  )}
                  <div className="divide-y divide-[var(--fb-divider)]">
                    {recentNotifications.map((notification) => (
                      <div
                        key={String(notification._id)}
                        className={`p-4 hover:bg-[var(--fb-hover)] transition-colors cursor-pointer ${
                          !notification.isRead ? 'bg-[var(--fb-input)]' : ''
                        }`}
                        onClick={() => {
                          handleNotificationOpen(notification);
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {notification.sender?.avatar ? (
                              <img
                                src={resolveMediaUrl(notification.sender.avatar)}
                                alt={getSenderName(notification)}
                                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const senderId = notification.sender?._id || notification.sender?.id;
                                  if (!senderId) return;
                                  setShowDropdown(false);
                                  navigate(`/profile/${senderId}`);
                                }}
                                title="Xem trang cá nhân"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const senderId = notification.sender?._id || notification.sender?.id;
                                  if (!senderId) return;
                                  setShowDropdown(false);
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
                                      setShowDropdown(false);
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
                                      onClick={(e) => handleDeclineGroupInviteNotification(e, notification)}
                                      className="px-3 py-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-xs font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] transition-colors"
                                    >
                                      Từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleAcceptGroupInviteNotification(e, notification)}
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
                                      onClick={(e) => handleDeclineCoHostInviteNotification(e, notification)}
                                      className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-1.5 text-xs font-medium text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                                    >
                                      Từ chối
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleAcceptCoHostInviteNotification(e, notification)}
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
                    ))}
                  </div>
                  {olderNotifications.length > 0 && (
                    <div className="px-4 pt-3 pb-1 text-base font-bold text-[var(--fb-text-primary)]">Trước đó</div>
                  )}
                  <div className="divide-y divide-[var(--fb-divider)]">
                    {olderNotifications.map((notification) => (
                    <div
                      key={String(notification._id)}
                      className={`p-4 hover:bg-[var(--fb-hover)] transition-colors cursor-pointer ${
                        !notification.isRead ? 'bg-[var(--fb-input)]' : ''
                      }`}
                      onClick={() => {
                        handleNotificationOpen(notification);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {notification.sender?.avatar ? (
                            <img
                              src={resolveMediaUrl(notification.sender.avatar)}
                              alt={getSenderName(notification)}
                              className="w-10 h-10 rounded-full object-cover cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const senderId = notification.sender?._id || notification.sender?.id;
                                if (!senderId) return;
                                setShowDropdown(false);
                                navigate(`/profile/${senderId}`);
                              }}
                              title="Xem trang cá nhân"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const senderId = notification.sender?._id || notification.sender?.id;
                                if (!senderId) return;
                                setShowDropdown(false);
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
                                    setShowDropdown(false);
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
                                    onClick={(e) => handleDeclineGroupInviteNotification(e, notification)}
                                    className="px-3 py-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-xs font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] transition-colors"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleAcceptGroupInviteNotification(e, notification)}
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
                                    onClick={(e) => handleDeclineCoHostInviteNotification(e, notification)}
                                    className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-1.5 text-xs font-medium text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                                  >
                                    Từ chối
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleAcceptCoHostInviteNotification(e, notification)}
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
                  ))}
                </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default NotificationBell;
