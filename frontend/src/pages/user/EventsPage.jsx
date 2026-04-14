import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Search,
  X,
  Clock,
  Tag,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  Navigation,
  ChevronDown,
  Lock,
  List,
  Star,
  Mail,
  Share2,
  MoreHorizontal,
  Globe,
  MessageCircle,
  Heart,
  Smile,
  Ban,
  Check,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { buildEventShareMessageContent } from '../../utils/eventShareMessage.js';
import { formatTimeAgo } from '../../utils/formatTime';
// Chat overlays are mounted globally in NavigationBar

let bodyScrollLockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';

function parseTimeHm(value) {
  if (value == null || String(value).trim() === '') return { h: '', m: '' };
  const parts = String(value).trim().split(':');
  if (parts.length < 2) return { h: '', m: '' };
  const hNum = parseInt(parts[0], 10);
  const mNum = parseInt(parts[1], 10);
  if (Number.isNaN(hNum) || parts[0] === '') return { h: '', m: '' };
  const h = String(Math.min(23, Math.max(0, hNum))).padStart(2, '0');
  const m = Number.isNaN(mNum)
    ? '00'
    : String(Math.min(59, Math.max(0, mNum))).padStart(2, '0');
  return { h, m };
}

/** Giờ–phút 24h: gõ số hoặc dùng mũi tên (ô number). */
function TimeSelect24h({ value, onTimeChange }) {
  const { h, m } = parseTimeHm(value);
  const inputCls =
    'min-w-0 w-16 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-2 py-2 text-center text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={23}
        step={1}
        aria-label="Giờ (0–23)"
        placeholder="00"
        value={h === '' ? '' : parseInt(h, 10)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onTimeChange('');
            return;
          }
          const n = Math.min(23, Math.max(0, parseInt(raw, 10) || 0));
          onTimeChange(`${String(n).padStart(2, '0')}:${m || '00'}`);
        }}
        className={inputCls}
      />
      <span className="shrink-0 text-sm font-semibold text-[var(--fb-text-secondary)]">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={1}
        aria-label="Phút (0–59)"
        placeholder="00"
        value={m === '' ? '' : parseInt(m, 10)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            if (h) onTimeChange(`${h}:00`);
            else onTimeChange('');
            return;
          }
          const n = Math.min(59, Math.max(0, parseInt(raw, 10) || 0));
          onTimeChange(`${h || '00'}:${String(n).padStart(2, '0')}`);
        }}
        className={inputCls}
      />
    </div>
  );
}

/** Ngày giờ ngắn trên thẻ sự kiện (kiểu Facebook). */
function formatEventCardDateShort(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('vi-VN', { weekday: 'short' });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const wcap = wd ? wd.charAt(0).toUpperCase() + wd.slice(1) : '';
  return `${wcap}, ${day} tháng ${month}, ${year} lúc ${t}`;
}

/** Một dòng ngày giờ kiểu Facebook (đỏ phía trên tiêu đề). */
function formatFbEventDateLine(iso) {
  const d = new Date(iso);
  const w = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  const rest = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  return `${cap(w)}, ${rest} vào ${t}`;
}

function eventParticipantId(p) {
  return String(typeof p === 'object' && p != null ? p._id : p);
}

/** RSVP hiện tại của user trên sự kiện (going / interested / declined / null). */
function getUserEventRsvp(event, userId) {
  if (!event || !userId) return null;
  const uid = String(userId);
  if ((event.participants || []).some((p) => eventParticipantId(p) === uid)) return 'going';
  if ((event.interestedUsers || []).some((p) => eventParticipantId(p) === uid)) return 'interested';
  if ((event.declinedUsers || []).some((p) => eventParticipantId(p) === uid)) return 'declined';
  return null;
}

function eventRsvpMainLabel(rsvp) {
  if (rsvp === 'going') return 'Tham gia';
  if (rsvp === 'interested') return 'Quan tâm';
  if (rsvp === 'declined') return 'Không tham gia';
  return 'Quan tâm';
}

function eventRsvpMainButtonClass(rsvp) {
  if (rsvp === 'going') {
    return 'bg-[#E7F3FF] text-[#1877F2] hover:bg-[#D8ECFC] dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/55';
  }
  if (rsvp === 'interested') {
    return 'bg-[#FFF7E6] text-[#B4690E] hover:bg-[#FFEDCC] dark:bg-amber-900/35 dark:text-amber-300 dark:hover:bg-amber-900/50';
  }
  if (rsvp === 'declined') {
    return 'bg-[#E4E6EB] text-[#65676B] hover:bg-[#D8DADF] dark:bg-[var(--fb-input)] dark:text-[var(--fb-text-secondary)] dark:hover:bg-[var(--fb-hover)]';
  }
  return 'bg-[#F0F2F5] text-[#050505] hover:bg-[#E4E6EB] dark:bg-[var(--fb-input)] dark:text-[var(--fb-text-primary)] dark:hover:bg-[var(--fb-hover)]';
}

/** Dòng bạn bè đã phản hồi (participants + quan tâm, không trùng người). */
function getEventFriendSocialLine(event, friendsList, currentUserId) {
  if (!friendsList?.length) return null;
  const friendIds = new Set(friendsList.map((f) => String(f._id)));
  const seen = new Set();
  const names = [];
  for (const list of [event.participants, event.interestedUsers]) {
    for (const p of list || []) {
      const id = eventParticipantId(p);
      if (!friendIds.has(id) || seen.has(id)) continue;
      if (currentUserId && id === String(currentUserId)) continue;
      seen.add(id);
      const name =
        typeof p === 'object' && p?.name
          ? p.name
          : friendsList.find((f) => String(f._id) === id)?.name;
      if (name) names.push(name);
    }
  }
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} đã phản hồi`;
  if (names.length === 2) return `${names[0]}, ${names[1]} đã phản hồi`;
  return `${names[0]}, ${names[1]} và ${names.length - 2} người bạn khác đã phản hồi`;
}

function getCoHostInviteStatusMessage(status) {
  switch (status) {
    case 'pre_submit':
      return 'Lời mời sẽ được gửi sau khi bạn đăng sự kiện. Người được mời có thể chấp nhận hoặc từ chối làm đồng tổ chức.';
    case 'pending':
      return 'Đang chờ người được mời xác nhận có chấp nhận làm đồng tổ chức hay không.';
    case 'accepted':
      return 'Người này đã chấp nhận làm đồng tổ chức.';
    case 'declined':
      return 'Người này đã từ chối lời mời đồng tổ chức.';
    default:
      return 'Trạng thái lời mời đồng tổ chức.';
  }
}

function EventToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--fb-divider)] py-3 last:border-b-0">
      <span className="text-sm leading-snug text-[var(--fb-text-primary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-[var(--fb-divider)]'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

const acquireBodyScrollLock = () => {
  if (bodyScrollLockCount === 0) {
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  bodyScrollLockCount += 1;
  return () => {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount === 0) {
      document.documentElement.style.overflow = savedHtmlOverflow;
      document.body.style.overflow = savedBodyOverflow;
    }
  };
};

const EventsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Học thuật',
    maxParticipants: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEndDateTime, setShowEndDateTime] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventFormat, setEventFormat] = useState('in-person');
  const [expandAdditional, setExpandAdditional] = useState(false);
  const [eventVisibility, setEventVisibility] = useState('public');
  const [visibleToGroupId, setVisibleToGroupId] = useState('');
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [showGuestList, setShowGuestList] = useState(true);
  const [onlyOrganizersPost, setOnlyOrganizersPost] = useState(true);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [showCoHostPicker, setShowCoHostPicker] = useState(false);
  const [showFriendListForCoHost, setShowFriendListForCoHost] = useState(false);
  const [coHostFieldFocused, setCoHostFieldFocused] = useState(false);
  const [coHostSearch, setCoHostSearch] = useState('');
  const [selectedCoHostIds, setSelectedCoHostIds] = useState([]);
  const [coHostStatusOpen, setCoHostStatusOpen] = useState(false);
  const [coHostStatusContext, setCoHostStatusContext] = useState(null);
  const [shareModalEvent, setShareModalEvent] = useState(null);
  /** invite = thông báo chuông; share = tin nhắn */
  const [shareModalIntent, setShareModalIntent] = useState('share');
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareFriendQuery, setShareFriendQuery] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [rsvpMenuEventId, setRsvpMenuEventId] = useState(null);
  const [eventCardMoreMenuId, setEventCardMoreMenuId] = useState(null);
  const coverFileInputRef = useRef(null);

  const resolveAvatarUrl = (avatar, name, background = '1877f2') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const withAvatarFallback = (name, background = '1877f2') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  const categories = ['Học thuật', 'Thi đấu', 'Workshop', 'Hackathon', 'Seminar', 'Khác'];
  const statuses = [
    { value: 'all', label: 'Tất cả' },
    { value: 'upcoming', label: 'Sắp diễn ra' },
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã kết thúc' }
  ];

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, categoryFilter, searchQuery]);

  const legacyEventIdFromQuery =
    searchParams.get('cohostEvent') || searchParams.get('openEvent');

  useEffect(() => {
    if (!legacyEventIdFromQuery) return;
    navigate(`/events/${legacyEventIdFromQuery}`, { replace: true });
  }, [legacyEventIdFromQuery, navigate]);

  useEffect(() => {
    if (!showCreateModal) return undefined;
    return acquireBodyScrollLock();
  }, [showCreateModal]);

  useEffect(() => {
    if (!eventCardMoreMenuId) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-event-card-more-root]')) return;
      setEventCardMoreMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [eventCardMoreMenuId]);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/friends');
        if (!cancelled) setFriendsList(res.data.friends || []);
      } catch (e) {
        console.error('Error loading friends:', e);
        if (!cancelled) setFriendsList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!showCreateModal) return;
    let cancelled = false;
    (async () => {
      setFriendsLoading(true);
      try {
        const [groupsRes, friendsRes] = await Promise.all([
          api.get('/groups', { params: { joined: 'true', limit: 200 } }),
          api.get('/friends'),
        ]);
        if (!cancelled) {
          setJoinedGroups(groupsRes.data.groups || []);
          setFriendsList(friendsRes.data.friends || []);
        }
      } catch (e) {
        console.error('Error loading groups/friends:', e);
        if (!cancelled) {
          setJoinedGroups([]);
          setFriendsList([]);
        }
      } finally {
        if (!cancelled) setFriendsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCreateModal]);

  useEffect(() => {
    if (showCoHostPicker) setShowFriendListForCoHost(true);
  }, [showCoHostPicker]);

  useEffect(() => {
    if (!coHostStatusOpen) return undefined;
    return acquireBodyScrollLock();
  }, [coHostStatusOpen]);

  useEffect(() => {
    if (!rsvpMenuEventId) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-rsvp-menu-root]')) return;
      setRsvpMenuEventId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [rsvpMenuEventId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Always fetch full list; filters are applied reliably on frontend.
      const res = await api.get('/events');
      setEvents(res.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEventDetail = (event) => {
    if (!event?._id) return;
    navigate(`/events/${event._id}`);
  };

  const handleCreateEvent = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      category: 'Học thuật',
      maxParticipants: '',
      image: null
    });
    setImagePreview(null);
    setShowEndDateTime(false);
    setEndDate('');
    setEndTime('');
    setEventFormat('in-person');
    setExpandAdditional(false);
    setEventVisibility('public');
    setVisibleToGroupId('');
    setShowGuestList(true);
    setOnlyOrganizersPost(true);
    setShowCoHostPicker(false);
    setShowFriendListForCoHost(false);
    setCoHostFieldFocused(false);
    setCoHostSearch('');
    setSelectedCoHostIds([]);
    setCoHostStatusOpen(false);
    setCoHostStatusContext(null);
    setShowCreateModal(true);
  };

  const openCoHostStatus = useCallback((ctx) => {
    setCoHostStatusContext(ctx);
    setCoHostStatusOpen(true);
  }, []);

  const closeCoHostStatus = useCallback(() => {
    setCoHostStatusOpen(false);
    setCoHostStatusContext(null);
  }, []);

  const toggleCoHostId = useCallback((friendId) => {
    const id = String(friendId);
    setSelectedCoHostIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const removeCoHostId = useCallback((id) => {
    setSelectedCoHostIds((prev) => prev.filter((x) => x !== String(id)));
  }, []);

  const filteredFriendsForCoHost = useMemo(() => {
    const q = coHostSearch.trim().toLowerCase();
    if (!q) return friendsList;
    return friendsList.filter((f) => (f.name || '').toLowerCase().includes(q));
  }, [friendsList, coHostSearch]);

  const canCreateEvent = Boolean(
    eventForm.title?.trim() &&
      eventForm.date &&
      (eventVisibility !== 'group' || visibleToGroupId)
  );

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Kích thước ảnh không được vượt quá 10MB');
        return;
      }
      setEventForm({ ...eventForm, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', eventForm.title.trim());

      let description = (eventForm.description || '').trim();
      if (showEndDateTime && endDate) {
        const endLine =
          endTime != null && String(endTime).length
            ? new Date(`${endDate}T${endTime}`).toLocaleString('vi-VN')
            : new Date(endDate).toLocaleDateString('vi-VN');
        description = description ? `${description}\n\nKết thúc dự kiến: ${endLine}` : `Kết thúc dự kiến: ${endLine}`;
      }
      formData.append('description', description);

      // Combine date and time
      if (eventForm.date && eventForm.time) {
        const dateTime = new Date(`${eventForm.date}T${eventForm.time}`);
        formData.append('date', dateTime.toISOString());
      } else if (eventForm.date) {
        formData.append('date', new Date(eventForm.date).toISOString());
      }

      let location = (eventForm.location || '').trim();
      if (eventFormat === 'online' && !location) location = 'Trực tuyến';
      formData.append('location', location);
      formData.append('category', eventForm.category);
      if (eventForm.maxParticipants) {
        formData.append('maxParticipants', eventForm.maxParticipants);
      }
      if (eventForm.image) {
        formData.append('image', eventForm.image);
      }

      formData.append('visibility', eventVisibility);
      if (eventVisibility === 'group' && visibleToGroupId) {
        formData.append('visibleToGroup', visibleToGroupId);
      }
      formData.append('showGuestList', showGuestList ? 'true' : 'false');
      formData.append('onlyOrganizersPost', onlyOrganizersPost ? 'true' : 'false');
      if (selectedCoHostIds.length > 0) {
        formData.append('coHostIds', JSON.stringify(selectedCoHostIds));
      }

      await api.post('/events', formData);

      setShowCreateModal(false);
      fetchEvents();
      setEventForm({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        category: 'Học thuật',
        maxParticipants: '',
        image: null
      });
      setImagePreview(null);
      setShowEndDateTime(false);
      setEndDate('');
      setEndTime('');
      setEventFormat('in-person');
      setExpandAdditional(false);
      setEventVisibility('public');
      setVisibleToGroupId('');
      setShowGuestList(true);
      setOnlyOrganizersPost(true);
      setShowCoHostPicker(false);
      setShowFriendListForCoHost(false);
      setCoHostFieldFocused(false);
      setCoHostSearch('');
      setSelectedCoHostIds([]);
      closeCoHostStatus();
    } catch (error) {
      console.error('Error creating event:', error);
      alert(error.response?.data?.message || 'Lỗi tạo sự kiện');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetEventRsvp = async (eventId, status, e) => {
    e?.stopPropagation?.();
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      setRsvpMenuEventId(null);
      await fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || 'Không cập nhật được phản hồi');
    }
  };

  const getEventStatus = (eventDate) => {
    const now = new Date();
    const date = new Date(eventDate);
    if (date < now) return 'completed';
    const diffTime = date - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) return 'ongoing';
    return 'upcoming';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-300';
      case 'ongoing':
        return 'bg-green-100 text-green-700 dark:bg-green-900/45 dark:text-green-300';
      case 'completed':
        return 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)]';
      default:
        return 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)]';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming': return 'Sắp diễn ra';
      case 'ongoing': return 'Đang diễn ra';
      case 'completed': return 'Đã kết thúc';
      default: return status;
    }
  };

  const filteredShareFriends = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return friendsList;
    return friendsList.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [friendsList, shareFriendQuery]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleEvents = useMemo(() => {
    return (events || []).filter((event) => {
      const eventStatus = getEventStatus(event?.date);
      if (statusFilter !== 'all' && eventStatus !== statusFilter) return false;

      if (categoryFilter !== 'all' && String(event?.category || '') !== categoryFilter) return false;

      if (normalizedSearch) {
        const title = String(event?.title || '').toLowerCase();
        const location = String(event?.location || '').toLowerCase();
        const description = String(event?.description || '').toLowerCase();
        if (!title.includes(normalizedSearch) && !location.includes(normalizedSearch) && !description.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [events, statusFilter, categoryFilter, normalizedSearch]);

  const toggleShareFriendSelect = (friendId) => {
    const id = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeShareFriendSelection = (friendId) => {
    const id = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const eventInviteParticipantId = (p) =>
    String(typeof p === 'object' && p != null ? p._id ?? p.id : p);

  const eventInviteFriendsEligible = useMemo(() => {
    const ev = shareModalEvent;
    if (!ev || shareModalIntent !== 'invite') return [];
    const going = new Set((ev.participants || []).map(eventInviteParticipantId));
    const interested = new Set((ev.interestedUsers || []).map(eventInviteParticipantId));
    const uid = String(user?.id || user?._id || '');
    return friendsList.filter((f) => {
      const id = String(f._id);
      if (!id || id === uid) return false;
      if (going.has(id) || interested.has(id)) return false;
      return true;
    });
  }, [friendsList, shareModalEvent, shareModalIntent, user?.id, user?._id]);

  const eventInviteFriendsFiltered = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return eventInviteFriendsEligible;
    return eventInviteFriendsEligible.filter((f) => {
      const name = (f.name || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [eventInviteFriendsEligible, shareFriendQuery]);

  const selectedFriendsForEventInvitePanel = useMemo(
    () =>
      [...shareSelectedFriendIds]
        .map((sid) => friendsList.find((f) => String(f._id) === sid))
        .filter(Boolean),
    [shareSelectedFriendIds, friendsList]
  );

  const openShareEventModal = (e, event, intent = 'share') => {
    e.stopPropagation();
    setShareModalIntent(intent === 'invite' ? 'invite' : 'share');
    setShareModalEvent(event);
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
  };

  const handleConfirmShareEventToFriends = async () => {
    if (!shareModalEvent?._id) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) {
      alert('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const ev = shareModalEvent;

    setShareSending(true);
    try {
      if (shareModalIntent === 'invite') {
        const res = await api.post(`/events/${ev._id}/invite-notify`, {
          recipientIds: ids,
        });
        const sent = res.data?.sentCount ?? ids.length;
        setShareModalEvent(null);
        setShareSelectedFriendIds(new Set());
        setShareModalIntent('share');
        alert(res.data?.message || `Đã gửi ${sent} lời mời.`);
        return;
      }

      const shareContent = buildEventShareMessageContent(ev);

      for (const friendId of ids) {
        const convRes = await api.get(`/messages/conversation/${friendId}`);
        const cid = convRes.data?.conversation?._id;
        if (!cid) continue;
        const fd = new FormData();
        fd.append('content', shareContent);
        await api.post(`/messages/${cid}`, fd);
      }
      setShareModalEvent(null);
      setShareSelectedFriendIds(new Set());
      setShareModalIntent('share');
      alert(`Đã gửi sự kiện tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Share/invite event failed:', error);
      alert(error.response?.data?.message || 'Không thể hoàn tất. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--fb-text-primary)] flex items-center gap-2">
                <Calendar className="w-8 h-8 text-blue-600" />
                Sự kiện
              </h1>
              <p className="text-[var(--fb-text-secondary)] mt-1">Khám phá và tham gia các sự kiện thú vị</p>
            </div>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Tạo sự kiện
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--fb-icon)] w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-[var(--fb-text-secondary)]">Đang tải sự kiện...</p>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-12 text-center">
            <Calendar className="w-20 h-20 text-[var(--fb-icon)] opacity-70 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--fb-text-primary)] mb-2">Chưa có sự kiện nào</h3>
            <p className="text-[var(--fb-text-secondary)] mb-6">Hãy tạo sự kiện đầu tiên của bạn!</p>
            <button
              onClick={handleCreateEvent}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Tạo sự kiện
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleEvents.map((event) => {
              const status = getEventStatus(event.date);
              const rsvp = getUserEventRsvp(event, user?.id);
              const coverSrc = event.image
                ? `http://localhost:5000/${String(event.image).replace(/^\//, '')}`
                : null;
              const socialLine = getEventFriendSocialLine(event, friendsList, user?.id);
              const goingCount = event.participantsCount ?? event.participants?.length ?? 0;
              const interestedCount = event.interestedCount ?? event.interestedUsers?.length ?? 0;

              return (
                <div
                  key={event._id}
                  className={`group relative flex aspect-square w-full cursor-pointer flex-col rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-md transition-shadow hover:shadow-lg hover:ring-2 hover:ring-blue-500/20 ${
                    eventCardMoreMenuId != null && String(eventCardMoreMenuId) === String(event._id)
                      ? 'z-[25] overflow-visible'
                      : 'overflow-hidden'
                  }`}
                  onClick={() => handleOpenEventDetail(event)}
                >
                  {/* 4/10 — ảnh bìa (overflow chỉ trên lớp ảnh để menu ⋯ không bị cắt) */}
                  <div className="relative h-[40%] min-h-0 shrink-0 bg-[var(--fb-input)]">
                    <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                      {coverSrc ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${coverSrc})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                          <Calendar className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                    </div>
                    <div
                      className="absolute right-2 top-2 z-20"
                      data-event-card-more-root
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/65"
                        aria-label="Thêm tùy chọn"
                        aria-expanded={eventCardMoreMenuId != null && String(eventCardMoreMenuId) === String(event._id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventCardMoreMenuId((id) =>
                            id != null && String(id) === String(event._id) ? null : event._id
                          );
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {eventCardMoreMenuId != null && String(eventCardMoreMenuId) === String(event._id) ? (
                        <div className="absolute right-0 top-full mt-1 w-[min(100vw-2rem,220px)] overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                            onClick={(e) => {
                              setEventCardMoreMenuId(null);
                              openShareEventModal(e, event, 'invite');
                            }}
                          >
                            <Mail className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                            <span>
                              Mời
                              <span className="mt-0.5 block text-[11px] font-normal text-[var(--fb-text-secondary)]">
                                Gửi thông báo trên chuông
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                            onClick={(e) => {
                              setEventCardMoreMenuId(null);
                              openShareEventModal(e, event, 'share');
                            }}
                          >
                            <Share2 className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                            <span>
                              Chia sẻ
                              <span className="mt-0.5 block text-[11px] font-normal text-[var(--fb-text-secondary)]">
                                Gửi qua tin nhắn
                              </span>
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* 6/10 — thông tin (theo theme sáng/tối) */}
                  <div className="flex h-[60%] min-h-0 flex-col border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-2.5 py-2 text-[var(--fb-text-primary)]">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                      <span
                        className={`max-w-[55%] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${getStatusColor(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                      {event.category ? (
                        <span className="flex max-w-[45%] items-center gap-1 truncate rounded-full bg-[var(--fb-input)] px-2 py-0.5 text-[11px] font-medium leading-tight text-[var(--fb-text-secondary)]">
                          <Tag className="h-3 w-3 shrink-0 text-[var(--fb-icon)]" />
                          {event.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs font-semibold leading-snug text-orange-700 line-clamp-1 dark:text-amber-400/95 sm:text-[13px]">
                      {formatEventCardDateShort(event.date)}
                    </p>
                    <button
                      type="button"
                      className="mt-1 w-full text-left text-sm font-bold leading-snug text-[var(--fb-text-primary)] line-clamp-2 hover:underline sm:text-[15px] sm:leading-tight"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEventDetail(event);
                      }}
                    >
                      {event.title}
                    </button>
                    {event.location ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--fb-text-secondary)] sm:line-clamp-1">
                        {event.location}
                      </p>
                    ) : null}
                    {socialLine ? (
                      <div className="mt-1.5 flex min-h-0 items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {(() => {
                            const friendIds = new Set((friendsList || []).map((f) => String(f._id)));
                            const seen = new Set();
                            const rows = [];
                            for (const list of [event.participants, event.interestedUsers]) {
                              for (const p of list || []) {
                                const id = eventParticipantId(p);
                                if (!friendIds.has(id) || seen.has(id)) continue;
                                seen.add(id);
                                const friend = friendsList.find((f) => String(f._id) === id);
                                if (!friend) continue;
                                rows.push({ id, name: friend.name, avatar: friend.avatar });
                                if (rows.length >= 2) break;
                              }
                              if (rows.length >= 2) break;
                            }
                            return rows.map((row) => (
                              <img
                                key={row.id}
                                src={resolveAvatarUrl(row.avatar, row.name)}
                                alt=""
                                className="h-6 w-6 rounded-full border border-[var(--fb-divider)] object-cover shadow-sm"
                                onError={withAvatarFallback(row.name)}
                              />
                            ));
                          })()}
                        </div>
                        <p className="min-w-0 flex-1 text-[11px] leading-snug text-[var(--fb-text-secondary)] line-clamp-2 sm:line-clamp-1">
                          {socialLine}
                        </p>
                      </div>
                    ) : goingCount > 0 || interestedCount > 0 ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-[var(--fb-text-secondary)] line-clamp-2 sm:line-clamp-1">
                        {goingCount > 0 ? `${goingCount} tham gia` : null}
                        {goingCount > 0 && interestedCount > 0 ? ' · ' : null}
                        {interestedCount > 0 ? `${interestedCount} quan tâm` : null}
                        {event.maxParticipants ? ` · max ${event.maxParticipants}` : ''}
                      </p>
                    ) : null}
                    <div className="mt-auto flex gap-1.5 pt-1.5">
                      <div
                        className="relative min-h-[36px] min-w-0 flex-1"
                        data-rsvp-menu-root
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRsvpMenuEventId((id) => (String(id) === String(event._id) ? null : event._id));
                          }}
                          className={`flex h-full min-h-[36px] w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition sm:text-[13px] ${eventRsvpMainButtonClass(rsvp)}`}
                        >
                          {rsvp === 'going' ? (
                            <CheckCircle className="h-4 w-4 shrink-0" />
                          ) : rsvp === 'declined' ? (
                            <Ban className="h-4 w-4 shrink-0" />
                          ) : (
                            <Star
                              className={`h-4 w-4 shrink-0 ${rsvp === 'interested' ? 'fill-amber-400 text-amber-500 dark:fill-amber-400/90' : ''}`}
                            />
                          )}
                          <span className="truncate">{eventRsvpMainLabel(rsvp)}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                        </button>
                        {rsvpMenuEventId != null && String(rsvpMenuEventId) === String(event._id) ? (
                          <div className="absolute bottom-full left-0 right-0 z-[60] mb-1 max-h-[min(70vh,320px)] overflow-y-auto overflow-x-hidden rounded-md border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                              onClick={(e) => handleSetEventRsvp(event._id, 'interested', e)}
                            >
                              {rsvp === 'interested' ? (
                                <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              <Star className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                              Quan tâm
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                              onClick={(e) => handleSetEventRsvp(event._id, 'going', e)}
                            >
                              {rsvp === 'going' ? (
                                <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              <CheckCircle className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                              Tham gia
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                              onClick={(e) => handleSetEventRsvp(event._id, 'declined', e)}
                            >
                              {rsvp === 'declined' ? (
                                <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}
                              <Ban className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                              Không tham gia
                            </button>
                            {rsvp ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 border-t border-[var(--fb-divider)] px-3 py-2 text-left text-sm text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                                onClick={(e) => handleSetEventRsvp(event._id, 'none', e)}
                              >
                                <span className="w-4 shrink-0" />
                                Bỏ phản hồi
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {shareModalEvent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!shareSending) {
              setShareModalEvent(null);
              setShareModalIntent('share');
            }
          }}
          role="presentation"
        >
          <div
            className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl ${
              shareModalIntent === 'invite' ? 'max-w-3xl' : 'max-w-md'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-event-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] p-4">
              <h3 id="share-event-title" className="pr-2 text-lg font-bold text-[var(--fb-text-primary)]">
                {shareModalIntent === 'invite'
                  ? 'Mời bạn bè đến sự kiện này'
                  : 'Chia sẻ tới bạn bè'}
              </h3>
              <button
                type="button"
                disabled={shareSending}
                onClick={() => {
                  setShareModalEvent(null);
                  setShareModalIntent('share');
                }}
                className="shrink-0 rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)]">
                {shareModalEvent.title}
              </p>
              <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">
                {formatEventCardDateShort(shareModalEvent.date)}
                {shareModalEvent.location ? ` · ${shareModalEvent.location}` : ''}
              </p>
            </div>

            {shareModalIntent === 'invite' ? (
              eventInviteFriendsEligible.length === 0 ? (
                <p className="px-4 py-16 text-center text-[var(--fb-text-secondary)]">
                  {friendsList.length === 0
                    ? 'Bạn chưa có bạn bè để mời.'
                    : 'Tất cả bạn bè đã phản hồi sự kiện hoặc không thể mời.'}
                </p>
              ) : (
                <>
                  <div className="flex min-h-0 flex-1 flex-col md:min-h-[320px] md:flex-row">
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-[var(--fb-divider)] md:border-b-0 md:border-r">
                      <div className="shrink-0 p-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-text-secondary)]" />
                          <input
                            type="search"
                            value={shareFriendQuery}
                            onChange={(e) => setShareFriendQuery(e.target.value)}
                            placeholder="Tìm bạn bè…"
                            className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2.5 pl-10 pr-3 text-sm text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        </div>
                      </div>
                      <ul className="max-h-[min(42vh,360px)] min-h-[200px] flex-1 space-y-1 overflow-y-auto p-2 md:max-h-none">
                        {eventInviteFriendsFiltered.length === 0 ? (
                          <li className="px-2 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                            Không có bạn bè khớp tìm kiếm.
                          </li>
                        ) : (
                          eventInviteFriendsFiltered.map((friend) => {
                            const fid = String(friend._id);
                            const selected = shareSelectedFriendIds.has(fid);
                            return (
                              <li key={friend._id}>
                                <button
                                  type="button"
                                  onClick={() => toggleShareFriendSelect(friend._id)}
                                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    selected
                                      ? 'border-blue-500 bg-blue-500/10'
                                      : 'border-[var(--fb-divider)] bg-[var(--fb-input)] hover:bg-[var(--fb-hover)]'
                                  }`}
                                >
                                  <img
                                    src={resolveAvatarUrl(friend.avatar, friend.name, '3b82f6')}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                                    onError={withAvatarFallback(friend.name, '3b82f6')}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-[var(--fb-text-primary)]">{friend.name}</p>
                                    {friend.email ? (
                                      <p className="truncate text-xs text-[var(--fb-text-secondary)]">{friend.email}</p>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                      selected
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-[var(--fb-divider)] bg-[var(--fb-surface)]'
                                    }`}
                                    aria-hidden
                                  >
                                    {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                                  </span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                    <div className="flex min-h-[160px] w-full shrink-0 flex-col bg-[var(--fb-input)]/40 md:w-[280px] md:min-h-0">
                      <p className="border-b border-[var(--fb-divider)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--fb-text-secondary)]">
                        Đã chọn {shareSelectedFriendIds.size} người bạn
                      </p>
                      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
                        {selectedFriendsForEventInvitePanel.length === 0 ? (
                          <li className="px-2 py-6 text-center text-xs text-[var(--fb-text-secondary)]">
                            Chọn bạn bè ở cột bên trái.
                          </li>
                        ) : (
                          selectedFriendsForEventInvitePanel.map((friend) => (
                            <li
                              key={friend._id}
                              className="flex items-center gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-2"
                            >
                              <img
                                src={resolveAvatarUrl(friend.avatar, friend.name, '3b82f6')}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                                onError={withAvatarFallback(friend.name, '3b82f6')}
                              />
                              <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--fb-text-primary)]">
                                {friend.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeShareFriendSelection(friend._id)}
                                className="shrink-0 rounded-lg p-1.5 text-[var(--fb-text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-600"
                                aria-label={`Bỏ chọn ${friend.name}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3">
                    <button
                      type="button"
                      disabled={shareSending}
                      onClick={() => {
                        setShareModalEvent(null);
                        setShareModalIntent('share');
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)] disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={shareSending || shareSelectedFriendIds.size === 0}
                      onClick={handleConfirmShareEventToFriends}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {shareSending ? 'Đang gửi…' : 'Gửi lời mời'}
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                <div className="shrink-0 px-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                    <input
                      type="search"
                      value={shareFriendQuery}
                      onChange={(e) => setShareFriendQuery(e.target.value)}
                      placeholder="Tìm bạn bè theo tên hoặc email…"
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)]"
                    />
                  </div>
                </div>
                <div className="max-h-[320px] min-h-[200px] flex-1 overflow-y-auto px-2">
                  {filteredShareFriends.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                      {friendsList.length === 0
                        ? 'Bạn chưa có bạn bè để chia sẻ.'
                        : 'Không tìm thấy bạn bè phù hợp.'}
                    </p>
                  ) : (
                    <ul className="py-1">
                      {filteredShareFriends.map((f) => {
                        const fid = String(f._id);
                        const checked = shareSelectedFriendIds.has(fid);
                        return (
                          <li key={fid}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--fb-hover)]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleShareFriendSelect(fid)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <img
                                src={resolveAvatarUrl(f.avatar, f.name)}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                onError={withAvatarFallback(f.name)}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--fb-text-primary)]">{f.name}</p>
                                <p className="truncate text-xs text-[var(--fb-text-secondary)]">
                                  {f.studentRole || ''}
                                  {f.email ? ` · ${f.email}` : ''}
                                </p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-4 py-3">
                  <span className="text-xs text-[var(--fb-text-secondary)]">
                    Đã chọn: {shareSelectedFriendIds.size} người
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={shareSending}
                      onClick={() => {
                        setShareModalEvent(null);
                        setShareModalIntent('share');
                      }}
                      className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={shareSending || shareSelectedFriendIds.size === 0}
                      onClick={handleConfirmShareEventToFriends}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {shareSending ? 'Đang gửi…' : 'Gửi tin nhắn'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Tạo sự kiện — bố cục tham khảo: ảnh bìa + Thêm, người tổ chức, vùng cuộn, nút cố định */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overscroll-none bg-black/40 p-4"
          onClick={() => {
            closeCoHostStatus();
            setShowCreateModal(false);
          }}
          role="presentation"
        >
          <div
            className="flex max-h-[min(92vh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-[var(--fb-divider)]">
              <h2 id="create-event-title" className="text-lg font-bold">
                Tạo sự kiện
              </h2>
              <button
                type="button"
                onClick={() => {
                  closeCoHostStatus();
                  setShowCreateModal(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                aria-label="Đóng"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                <div className="relative h-44 w-full shrink-0 bg-[var(--fb-input)] md:h-52">
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <>
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="absolute inset-0 z-0 block h-full w-full cursor-pointer border-0 p-0"
                        aria-label="Đổi ảnh đại diện / ảnh bìa sự kiện"
                      >
                        <img src={imagePreview} alt="" className="pointer-events-none h-full w-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                          setEventForm({ ...eventForm, image: null });
                          if (coverFileInputRef.current) coverFileInputRef.current.value = '';
                        }}
                        className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        aria-label="Xóa ảnh bìa"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/45 px-2 py-1 text-left text-xs font-medium text-white backdrop-blur-sm">
                        Ảnh đại diện · Bấm để đổi
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          coverFileInputRef.current?.click();
                        }}
                        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm font-semibold shadow-md hover:bg-[var(--fb-hover)]"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Đổi ảnh
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-2 bg-[var(--fb-input)] text-[var(--fb-text-secondary)] transition hover:bg-[var(--fb-hover)] hover:text-[var(--fb-text-primary)]"
                    >
                      <ImageIcon className="h-10 w-10 opacity-70" />
                      <span className="px-4 text-center text-sm font-semibold">
                        Chọn ảnh đại diện / ảnh bìa
                      </span>
                      <span className="text-xs opacity-80">JPG, PNG, GIF, WebP — tối đa 10MB (tùy chọn)</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4 px-4 pb-4 pt-2">
                  <div className="flex cursor-default items-center gap-3 border-b border-[var(--fb-divider)] pb-3 pt-1">
                    <img
                      src={resolveAvatarUrl(user?.avatar, user?.name)}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                      onError={withAvatarFallback(user?.name)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{user?.name || 'Bạn'}</div>
                      <div className="text-xs text-[var(--fb-text-secondary)]">
                        Người tổ chức · Trang cá nhân của bạn
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 shrink-0 text-[var(--fb-text-secondary)] opacity-60" aria-hidden />
                  </div>

                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full border-0 border-b border-[var(--fb-divider)] bg-transparent py-2.5 text-lg font-semibold placeholder:text-[var(--fb-text-secondary)] focus:border-blue-500 focus:outline-none focus:ring-0"
                    placeholder="Tên sự kiện"
                    maxLength={200}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--fb-text-secondary)]">
                        <Calendar className="h-3.5 w-3.5" />
                        Ngày bắt đầu
                      </label>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--fb-text-secondary)]">
                        <Clock className="h-3.5 w-3.5" />
                        Thời gian bắt đầu (24h)
                      </label>
                      <TimeSelect24h
                        value={eventForm.time}
                        onTimeChange={(t) => setEventForm({ ...eventForm, time: t })}
                      />
                    </div>
                  </div>

                  {!showEndDateTime ? (
                    <button
                      type="button"
                      onClick={() => setShowEndDateTime(true)}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      + Ngày và giờ kết thúc
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--fb-text-secondary)]">
                          Ngày kết thúc
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--fb-text-secondary)]">
                          Giờ kết thúc (24h)
                        </label>
                        <TimeSelect24h value={endTime} onTimeChange={setEndTime} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEndDateTime(false);
                          setEndDate('');
                          setEndTime('');
                        }}
                        className="text-left text-xs font-semibold text-[var(--fb-text-secondary)] hover:text-red-600 sm:col-span-2"
                      >
                        Ẩn ngày kết thúc
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs text-[var(--fb-text-secondary)]">Hình thức</label>
                    <select
                      value={eventFormat}
                      onChange={(e) => setEventFormat(e.target.value)}
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="in-person">Sự kiện trực tiếp (có địa điểm)</option>
                      <option value="online">Sự kiện trực tuyến</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs text-[var(--fb-text-secondary)]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Ai có thể nhìn thấy sự kiện này?
                    </label>
                    <select
                      value={eventVisibility}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEventVisibility(v);
                        if (v !== 'group') setVisibleToGroupId('');
                      }}
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="public">Công khai — bất kỳ ai đều có thể nhìn thấy</option>
                      <option value="private">Riêng tư — chỉ những người được mời mới nhìn thấy</option>
                      <option value="group">Nhóm — chỉ thành viên nhóm được chọn</option>
                    </select>
                    {eventVisibility === 'group' ? (
                      <div>
                        <label className="mb-1 block text-xs text-[var(--fb-text-secondary)]">Chọn nhóm</label>
                        <select
                          value={visibleToGroupId}
                          onChange={(e) => setVisibleToGroupId(e.target.value)}
                          className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— Chọn nhóm —</option>
                          {joinedGroups.map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        {joinedGroups.length === 0 ? (
                          <p className="mt-1 text-xs text-amber-700">
                            Bạn chưa tham gia nhóm nào đã duyệt. Hãy tham gia nhóm trước hoặc chọn Công khai / Riêng tư.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2.5 text-sm placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hãy mô tả chi tiết về sự kiện"
                  />

                  <div>
                    <label className="mb-1 block text-xs text-[var(--fb-text-secondary)]">
                      {eventFormat === 'online' ? 'Liên kết / nền tảng (tùy chọn)' : 'Địa điểm (tùy chọn)'}
                    </label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        eventFormat === 'online'
                          ? 'Ví dụ: Zoom, Google Meet…'
                          : 'Địa chỉ hoặc tên địa điểm'
                      }
                    />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)]">
                    <button
                      type="button"
                      onClick={() => setShowCoHostPicker((v) => !v)}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-[var(--fb-hover)]"
                    >
                      <Plus className="h-5 w-5 shrink-0 text-[var(--fb-icon)]" />
                      <span className="flex-1 text-sm font-bold text-[var(--fb-text-primary)]">
                        Thêm người đồng tổ chức
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--fb-text-secondary)] transition-transform ${
                          showCoHostPicker ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {showCoHostPicker ? (
                      <div className="border-t border-[var(--fb-divider)] bg-[var(--fb-app)] px-3 pb-4 pt-2">
                        <div
                          className={`rounded-xl border-2 bg-[var(--fb-surface)] px-3 py-2.5 transition-colors ${
                            coHostFieldFocused || showFriendListForCoHost
                              ? 'border-blue-600'
                              : 'border-[var(--fb-divider)]'
                          }`}
                        >
                          <input
                            type="text"
                            readOnly
                            placeholder="Thêm người đồng tổ chức"
                            value=""
                            onFocus={() => {
                              setCoHostFieldFocused(true);
                              setShowFriendListForCoHost(true);
                            }}
                            onBlur={() => setCoHostFieldFocused(false)}
                            onClick={() => setShowFriendListForCoHost(true)}
                            className="w-full cursor-pointer border-0 bg-transparent p-0 text-base text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-0"
                          />
                        </div>

                        <p className="mt-2 text-xs leading-relaxed text-[var(--fb-text-secondary)]">
                          Người đồng tổ chức có thể chấp nhận hoặc từ chối sau khi bạn đăng sự kiện.
                        </p>

                        {showFriendListForCoHost ? (
                          <div
                            className="mt-2 overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)]"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div className="relative border-b border-[var(--fb-divider)] p-2">
                              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)] opacity-70" />
                              <input
                                type="search"
                                value={coHostSearch}
                                onChange={(e) => setCoHostSearch(e.target.value)}
                                placeholder="Tìm trong danh sách bạn bè…"
                                className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="max-h-52 overflow-y-auto overscroll-y-contain">
                              {friendsLoading ? (
                                <div className="py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                                  Đang tải danh sách bạn bè…
                                </div>
                              ) : filteredFriendsForCoHost.length === 0 ? (
                                <div className="py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                                  {friendsList.length === 0
                                    ? 'Bạn chưa có bạn bè để mời đồng tổ chức.'
                                    : 'Không tìm thấy bạn bè phù hợp.'}
                                </div>
                              ) : (
                                <ul className="divide-y divide-[var(--fb-divider)]">
                                  {filteredFriendsForCoHost.map((f) => {
                                    const fid = String(f._id);
                                    const checked = selectedCoHostIds.includes(fid);
                                    return (
                                      <li key={fid}>
                                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--fb-hover)]">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleCoHostId(fid)}
                                            className="h-4 w-4 shrink-0 rounded border-[var(--fb-divider)] text-blue-600 focus:ring-blue-500"
                                          />
                                          <img
                                            src={resolveAvatarUrl(f.avatar, f.name)}
                                            alt=""
                                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                                            onError={withAvatarFallback(f.name)}
                                          />
                                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--fb-text-primary)]">
                                            {f.name}
                                          </span>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {selectedCoHostIds.length > 0 ? (
                          <div className="mt-3">
                            <p className="mb-2 text-sm font-bold text-[var(--fb-text-primary)]">Đang chờ</p>
                            <ul className="overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] divide-y divide-[var(--fb-divider)]">
                              {selectedCoHostIds.map((id) => {
                                const f = friendsList.find((x) => String(x._id) === id);
                                if (!f) return null;
                                return (
                                  <li key={id} className="flex items-center gap-3 px-3 py-2.5">
                                    <img
                                      src={resolveAvatarUrl(f.avatar, f.name)}
                                      alt=""
                                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                                      onError={withAvatarFallback(f.name)}
                                    />
                                    <button
                                      type="button"
                                      className="min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--fb-text-primary)] hover:underline"
                                      onClick={() =>
                                        openCoHostStatus({
                                          userId: id,
                                          name: f.name,
                                          avatar: f.avatar,
                                          status: 'pre_submit',
                                        })
                                      }
                                    >
                                      {f.name}
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Bỏ ${f.name}`}
                                      onClick={() => removeCoHostId(id)}
                                      className="rounded-full p-1.5 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] hover:text-red-600"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[var(--fb-divider)]">
                    <button
                      type="button"
                      onClick={() => setExpandAdditional((v) => !v)}
                      className="flex w-full items-center gap-2 bg-[var(--fb-input)] px-3 py-3 text-left hover:bg-[var(--fb-hover)]"
                      aria-expanded={expandAdditional}
                    >
                      <List className="h-5 w-5 shrink-0 text-[var(--fb-icon)]" />
                      <span className="flex-1 text-sm font-bold text-[var(--fb-text-primary)]">
                        Cài đặt bổ sung
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--fb-text-secondary)] transition-transform ${
                          expandAdditional ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandAdditional ? (
                      <div className="border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3">
                        <EventToggleRow
                          label="Hiển thị danh sách khách mời"
                          checked={showGuestList}
                          onChange={setShowGuestList}
                        />
                        <EventToggleRow
                          label="Chỉ người tổ chức mới có thể đăng trong sự kiện"
                          checked={onlyOrganizersPost}
                          onChange={setOnlyOrganizersPost}
                        />
                        <div className="space-y-3 border-t border-[var(--fb-divider)] py-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--fb-text-secondary)]">
                              Danh mục
                            </label>
                            <select
                              value={eventForm.category}
                              onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                              className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--fb-text-secondary)]">
                              Số người tối đa
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={eventForm.maxParticipants}
                              onChange={(e) =>
                                setEventForm({ ...eventForm, maxParticipants: e.target.value })
                              }
                              className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm"
                              placeholder="Không giới hạn"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3">
                <button
                  type="submit"
                  disabled={submitting || !canCreateEvent}
                  className="w-full rounded-xl py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--fb-input)] disabled:text-[var(--fb-text-secondary)] enabled:bg-blue-600 enabled:hover:bg-blue-700"
                >
                  {submitting ? 'Đang tạo…' : 'Tạo sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {coHostStatusOpen &&
        coHostStatusContext &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center overscroll-none bg-black/50 p-4"
            onClick={closeCoHostStatus}
            role="presentation"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-6 text-[var(--fb-text-primary)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cohost-status-title"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 id="cohost-status-title" className="text-lg font-bold">
                  Trạng thái đồng tổ chức
                </h3>
                <button
                  type="button"
                  onClick={closeCoHostStatus}
                  className="rounded-full p-2 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <img
                  src={resolveAvatarUrl(coHostStatusContext.avatar, coHostStatusContext.name)}
                  alt=""
                  className="mb-3 h-16 w-16 rounded-full object-cover"
                  onError={withAvatarFallback(coHostStatusContext.name)}
                />
                <p className="mb-3 text-base font-bold">{coHostStatusContext.name}</p>
                <p className="text-sm leading-relaxed text-[var(--fb-text-secondary)]">
                  {getCoHostInviteStatusMessage(coHostStatusContext.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCoHostStatus}
                className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Đã hiểu
              </button>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};

export default EventsPage;

