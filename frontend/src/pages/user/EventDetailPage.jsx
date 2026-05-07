import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  MapPin,
  Users,
  X,
  Trash2,
  ChevronDown,
  Mail,
  Share2,
  MoreHorizontal,
  Globe,
  MessageCircle,
  Heart,
  Ban,
  Check,
  CheckCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  BookOpen,
  Search,
  Bookmark,
  AlertTriangle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { buildEventShareMessageContent } from '../../utils/eventShareMessage.js';
import { formatTimeAgo } from '../../utils/formatTime';
import { resolveMediaUrl, resolveAvatarUrlWithFallback } from '../../utils/mediaUrl';
import { PostCommentSection } from '../../components/PostCommentSection';
import PostImageGallery from '../../components/PostImageGallery';

let bodyScrollLockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';

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

function eventParticipantId(p) {
  return String(typeof p === 'object' && p != null ? p._id : p);
}

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

function formatFbEventDateLine(iso) {
  const d = new Date(iso);
  const w = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  const rest = d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  return `${cap(w)}, ${rest} vào ${t}`;
}

const EVENT_POST_PLACEHOLDER_CONTENT = 'Đính kèm';

function eventPostAttachmentUrl(file) {
  return resolveMediaUrl(file?.url);
}

function isEventPostAttachmentVideo(file) {
  const mime = file?.mimeType || '';
  const name = file?.name || '';
  const raw = file?.url || '';
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(raw);
}

function isEventPostGalleryVideoPath(src) {
  if (!src || typeof src !== 'string') return false;
  return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(src);
}

function eventPostVideoPreviewSrc(src) {
  if (!src || typeof src !== 'string') return '';
  return src.includes('#') ? src : `${src}#t=0.1`;
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

const TEXT_POST_BACKGROUNDS = [
  { id: 'none', label: 'Không nền', background: '' },
  { id: 'b1', label: 'Xanh biển', background: 'linear-gradient(135deg, #1877f2, #42a5ff)' },
  { id: 'b2', label: 'Tím hồng', background: 'linear-gradient(135deg, #7b2ff7, #f107a3)' },
  { id: 'b3', label: 'Cam đỏ', background: 'linear-gradient(135deg, #f12711, #f5af19)' },
  { id: 'b4', label: 'Xanh lá', background: 'linear-gradient(135deg, #11998e, #38ef7d)' },
  { id: 'b5', label: 'Đen xám', background: 'linear-gradient(135deg, #232526, #414345)' }
];

function isDarkBackground(background) {
  return /#232526|#414345|#1877f2|#7b2ff7|#f107a3|#f12711/i.test(background || '');
}

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [coHostStatusOpen, setCoHostStatusOpen] = useState(false);
  const [coHostStatusContext, setCoHostStatusContext] = useState(null);
  const [eventDetailTab, setEventDetailTab] = useState('about');
  const [eventDetailMoreOpen, setEventDetailMoreOpen] = useState(false);
  const [eventDiscussionPosts, setEventDiscussionPosts] = useState([]);
  const [eventDiscussionLoading, setEventDiscussionLoading] = useState(false);
  const [discussionDraft, setDiscussionDraft] = useState('');
  const [discussionTextBackground, setDiscussionTextBackground] = useState('');
  const [showEventDiscussionModal, setShowEventDiscussionModal] = useState(false);
  const [discussionCategory, setDiscussionCategory] = useState('Sự kiện');
  const [discussionImages, setDiscussionImages] = useState([]);
  const [discussionFiles, setDiscussionFiles] = useState([]);
  const [discussionSubmitting, setDiscussionSubmitting] = useState(false);
  const [showEventPostComments, setShowEventPostComments] = useState(() => new Set());
  const [savedEventPostIds, setSavedEventPostIds] = useState(() => new Set());
  const [eventPostOptionsId, setEventPostOptionsId] = useState(null);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareFriendsList, setShareFriendsList] = useState([]);
  const [shareFriendsLoading, setShareFriendsLoading] = useState(false);
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareFriendQuery, setShareFriendQuery] = useState('');
  const [shareSending, setShareSending] = useState(false);
  /** null = đóng; invite = thông báo chuông; share = tin nhắn — trang chi tiết sự kiện (khác modal chia sẻ bài thảo luận). */
  const [eventSharePickerIntent, setEventSharePickerIntent] = useState(null);
  const [imageTheater, setImageTheater] = useState(null);
  const [theaterCaptionExpanded, setTheaterCaptionExpanded] = useState(false);
  const [eventPostTheaterZoom, setEventPostTheaterZoom] = useState(1);
  const eventPostTheaterPanRef = useRef(null);
  const eventPostTheaterPanGestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    downTarget: null,
  });
  const [eventDetailRsvpOpen, setEventDetailRsvpOpen] = useState(false);
  const eventDetailMoreRef = useRef(null);
  const discussionMediaInputRef = useRef(null);
  const discussionFileInputRef = useRef(null);
  const discussionTextareaRef = useRef(null);
  const eventCoverFileInputRef = useRef(null);
  const [eventCoverUploading, setEventCoverUploading] = useState(false);

  const resolveAvatarUrl = (avatar, name, background = '1877f2') => {
    return resolveAvatarUrlWithFallback(avatar, name, background);
  };

  const withAvatarFallback = (name, background = '1877f2') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  const openCoHostStatus = useCallback((ctx) => {
    setCoHostStatusContext(ctx);
    setCoHostStatusOpen(true);
  }, []);

  const closeCoHostStatus = useCallback(() => {
    setCoHostStatusOpen(false);
    setCoHostStatusContext(null);
  }, []);

  useEffect(() => {
    if (!coHostStatusOpen) return undefined;
    return acquireBodyScrollLock();
  }, [coHostStatusOpen]);

  useEffect(() => {
    if (!showEventDiscussionModal) return undefined;
    queueMicrotask(() => discussionTextareaRef.current?.focus());
  }, [showEventDiscussionModal]);

  /** Gỡ overflow: hidden còn sót (modal trang Sự kiện / chat) để cuộn trang bình thường. */
  useEffect(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        if (!cancelled) setEvent(res.data.event || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setEvent(null);
          setLoadError(e.response?.data?.message || 'Không tải được sự kiện.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    setEventDetailTab('about');
    setEventDetailMoreOpen(false);
    setEventDetailRsvpOpen(false);
    setEventDiscussionPosts([]);
    setShowEventPostComments(new Set());
    setShareModalPost(null);
    setEventSharePickerIntent(null);
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    setImageTheater(null);
    setTheaterCaptionExpanded(false);
    setDiscussionDraft('');
    setDiscussionTextBackground('');
    setShowEventDiscussionModal(false);
    setDiscussionImages([]);
    setDiscussionFiles([]);
  }, [eventId]);

  useEffect(() => {
    if ((eventDetailTab !== 'discussion' && eventDetailTab !== 'media') || !user?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/posts/saved');
        if (cancelled) return;
        setSavedEventPostIds(new Set((res.data.posts || []).map((p) => String(p._id))));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventDetailTab, user?.id]);

  const filteredShareFriends = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return shareFriendsList;
    return shareFriendsList.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [shareFriendsList, shareFriendQuery]);

  const eventInviteParticipantId = (p) =>
    String(typeof p === 'object' && p != null ? p._id ?? p.id : p);

  const eventInviteFriendsEligible = useMemo(() => {
    const ev = event;
    if (!ev || eventSharePickerIntent !== 'invite') return [];
    const going = new Set((ev.participants || []).map(eventInviteParticipantId));
    const interested = new Set((ev.interestedUsers || []).map(eventInviteParticipantId));
    const uid = String(user?.id || user?._id || '');
    return shareFriendsList.filter((f) => {
      const id = String(f._id);
      if (!id || id === uid) return false;
      if (going.has(id) || interested.has(id)) return false;
      return true;
    });
  }, [shareFriendsList, event, eventSharePickerIntent, user?.id, user?._id]);

  const eventInviteFriendsFiltered = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return eventInviteFriendsEligible;
    return eventInviteFriendsEligible.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [eventInviteFriendsEligible, shareFriendQuery]);

  const selectedFriendsForEventInvitePanel = useMemo(
    () =>
      [...shareSelectedFriendIds]
        .map((sid) => shareFriendsList.find((f) => String(f._id) === sid))
        .filter(Boolean),
    [shareSelectedFriendIds, shareFriendsList]
  );

  const removeShareFriendSelection = (friendId) => {
    const id = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const resolvePostImageSrc = useCallback((src) => {
    return resolveMediaUrl(src);
  }, []);

  useEffect(() => {
    if (!imageTheater) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [imageTheater]);

  useEffect(() => {
    if (!imageTheater) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const g = eventPostTheaterPanGestureRef.current;
        if (g && typeof g.detachWindowPan === 'function') {
          g.detachWindowPan();
          g.detachWindowPan = null;
        }
        g.active = false;
        g.pointerId = null;
        eventPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
        setEventPostTheaterZoom(1);
        eventPostTheaterPanRef.current?.scrollTo(0, 0);
        setImageTheater(null);
        setTheaterCaptionExpanded(false);
        return;
      }
      const imgs = (imageTheater.post?.images || []).filter((x) => typeof x === 'string');
      if (imgs.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setImageTheater((t) => {
          if (!t) return t;
          const list = (t.post?.images || []).filter((x) => typeof x === 'string');
          const n = list.length;
          if (n <= 1) return t;
          return { ...t, imageIndex: (t.imageIndex - 1 + n) % n };
        });
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setImageTheater((t) => {
          if (!t) return t;
          const list = (t.post?.images || []).filter((x) => typeof x === 'string');
          const n = list.length;
          if (n <= 1) return t;
          return { ...t, imageIndex: (t.imageIndex + 1) % n };
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageTheater]);

  useEffect(() => {
    if (!imageTheater) return;
    const g = eventPostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    eventPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setEventPostTheaterZoom(1);
    eventPostTheaterPanRef.current?.scrollTo(0, 0);
  }, [imageTheater?.post?._id, imageTheater?.imageIndex]);

  useEffect(() => {
    if (!eventDetailRsvpOpen) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-rsvp-menu-root]')) return;
      setEventDetailRsvpOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [eventDetailRsvpOpen]);

  useEffect(() => {
    if (!eventDetailMoreOpen) return undefined;
    const close = (e) => {
      if (eventDetailMoreRef.current && !eventDetailMoreRef.current.contains(e.target)) {
        setEventDetailMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [eventDetailMoreOpen]);

  useEffect(() => {
    const close = (e) => {
      if (eventPostOptionsId && !e.target.closest('.event-post-options-container')) {
        setEventPostOptionsId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [eventPostOptionsId]);

  const refreshEventDiscussionPosts = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/events/${id}/posts`);
      setEventDiscussionPosts(res.data.posts || []);
    } catch (e) {
      console.error(e);
      setEventDiscussionPosts([]);
    }
  }, []);

  /** Ảnh/video trong bài thảo luận sự kiện — dùng cho tab File phương tiện & sidebar */
  const eventPostMediaGallery = useMemo(() => {
    const items = [];
    for (const post of eventDiscussionPosts) {
      const images = post.images;
      if (!Array.isArray(images) || images.length === 0) continue;
      images.forEach((img, idx) => {
        if (typeof img !== 'string') return;
        const url = img.startsWith('http') ? img : `http://localhost:5000${img}`;
        items.push({ key: `${post._id}-${idx}`, url, postId: post._id, post, imageIndex: idx });
      });
    }
    return items;
  }, [eventDiscussionPosts]);

  useEffect(() => {
    if (!event?._id) return undefined;
    let cancelled = false;
    setEventDiscussionLoading(true);
    (async () => {
      try {
        const res = await api.get(`/events/${event._id}/posts`);
        if (!cancelled) setEventDiscussionPosts(res.data.posts || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setEventDiscussionPosts([]);
      } finally {
        if (!cancelled) setEventDiscussionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event?._id]);

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
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'ongoing':
        return 'Đang diễn ra';
      case 'completed':
        return 'Đã kết thúc';
      default:
        return status;
    }
  };

  const isOrganizer = (ev) => {
    if (!ev?.organizer || !user?.id) return false;
    const oid = String(typeof ev.organizer === 'object' ? ev.organizer._id : ev.organizer);
    return oid === String(user.id);
  };

  const canEditEventCover = (ev) => isOrganizer(ev) || user?.role === 'admin';

  const handleEventCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !event?._id) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 10MB');
      return;
    }
    setEventCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.put(`/events/${event._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.event) setEvent(res.data.event);
    } catch (err) {
      alert(err.response?.data?.message || 'Không cập nhật được ảnh sự kiện');
    } finally {
      setEventCoverUploading(false);
    }
  };

  const eventVisibilityLabel = (ev) => {
    const v = ev.visibility || 'public';
    if (v === 'private') return 'Riêng tư · Chỉ người được mời mới xem được';
    if (v === 'group' && ev.visibleToGroup?.name) {
      return `Nhóm · ${ev.visibleToGroup.name}`;
    }
    if (v === 'group') return 'Nhóm · Chỉ thành viên nhóm được chia sẻ';
    return 'Công khai · Bất kỳ ai đều có thể xem';
  };

  const handleSetEventRsvp = async (id, status, e) => {
    e?.stopPropagation?.();
    try {
      await api.post(`/events/${id}/rsvp`, { status });
      setEventDetailRsvpOpen(false);
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch (error) {
      alert(error.response?.data?.message || 'Không cập nhật được phản hồi');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) return;
    try {
      await api.delete(`/events/${id}`);
      navigate('/events', { replace: true });
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa sự kiện');
    }
  };

  const reportEvent = async (ev) => {
    const reason = window.prompt('Nhập lý do báo cáo sự kiện:');
    if (!reason || !reason.trim()) return;
    if (!ev?._id) {
      alert('Không thể xác định sự kiện để báo cáo.');
      return;
    }
    try {
      await api.post('/reports', {
        eventId: ev._id,
        category: 'Sự kiện',
        reason: reason.trim()
      });
      alert('Đã gửi báo cáo sự kiện.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không thể báo cáo sự kiện');
    }
  };

  const handleDiscussionGallerySelect = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setShowEventDiscussionModal(true);
    const gallery = picked.filter((f) => {
      if (f.type?.startsWith('image/')) return true;
      if (f.type?.startsWith('video/')) return true;
      return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(f.name || '');
    });
    setDiscussionImages((prev) => [...prev, ...gallery].slice(0, 10));
    e.target.value = '';
  };

  const handleDiscussionDocumentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setShowEventDiscussionModal(true);
    const isGallery = (f) =>
      (f.type && f.type.startsWith('image/')) ||
      (f.type && f.type.startsWith('video/')) ||
      /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(f.name || '');
    const docs = files.filter((f) => !isGallery(f));
    setDiscussionFiles((prev) => [...prev, ...docs].slice(0, 10));
    e.target.value = '';
  };

  const removeDiscussionImage = (index) => {
    setDiscussionImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDiscussionFile = (index) => {
    setDiscussionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitEventDiscussionPost = async () => {
    const id = event?._id;
    const text = discussionDraft.trim();
    const canSubmit =
      Boolean(text) || discussionImages.length > 0 || discussionFiles.length > 0;
    if (!id || !canSubmit || discussionSubmitting) return;
    setDiscussionSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('content', text);
      fd.append('category', discussionCategory);
      fd.append('tags', JSON.stringify([]));
      discussionImages.forEach((file) => {
        fd.append('images', file);
      });
      discussionFiles.forEach((file) => {
        fd.append('files', file);
      });
      const hasMedia = discussionImages.length > 0 || discussionFiles.length > 0;
      if (text && !hasMedia && discussionTextBackground) {
        fd.append('textBackground', discussionTextBackground);
      }
      await api.post(`/events/${id}/posts`, fd);
      setDiscussionDraft('');
      setDiscussionCategory('Sự kiện');
      setDiscussionTextBackground('');
      setShowEventDiscussionModal(false);
      setDiscussionImages([]);
      setDiscussionFiles([]);
      await refreshEventDiscussionPosts(id);
    } catch (e) {
      alert(e.response?.data?.message || 'Không đăng được bài');
    } finally {
      setDiscussionSubmitting(false);
    }
  };

  const toggleEventPostLike = async (postId) => {
    const id = event?._id;
    if (!id || !user?.id) return;
    const uid = String(user.id);
    const snapshot = eventDiscussionPosts;
    const post = snapshot.find((p) => String(p._id) === String(postId));
    const wasLiked = (post?.likes || []).some(
        (l) => String(typeof l === 'object' ? l._id : l) === uid
      );
    setEventDiscussionPosts((prev) =>
      prev.map((p) => {
        if (String(p._id) !== String(postId)) return p;
        return {
          ...p,
          likes: wasLiked
            ? (p.likes || []).filter((l) => String(typeof l === 'object' ? l._id : l) !== uid)
            : [...(p.likes || []), user.id],
        };
      })
    );
    try {
      if (wasLiked) await api.delete(`/posts/${postId}/like`);
      else await api.post(`/posts/${postId}/like`);
    } catch (e) {
      setEventDiscussionPosts(snapshot);
      alert(e.response?.data?.message || 'Lỗi thích bài viết');
    }
  };

  const toggleEventPostComments = useCallback((postId) => {
    const pid = String(postId);
    setShowEventPostComments((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }, []);

  const toggleEventSave = async (postId) => {
    const id = String(postId);
    const next = new Set(savedEventPostIds);
    try {
      if (next.has(id)) {
        await api.delete(`/posts/${postId}/save`);
        next.delete(id);
      } else {
        await api.post(`/posts/${postId}/save`);
        next.add(id);
      }
      setSavedEventPostIds(next);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không cập nhật được trạng thái lưu');
    }
  };

  const reportEventPost = async (postId) => {
    const reason = window.prompt('Nhập lý do báo cáo bài viết:');
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/posts/${postId}/report`, { reason: reason.trim() });
      alert('Đã gửi báo cáo bài viết.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không thể báo cáo bài viết');
    }
  };

  const handleDeleteEventPost = async (post) => {
    const postId = post?._id;
    if (!postId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;

    try {
      await api.delete(`/posts/${postId}`);
      setEventDiscussionPosts((prev) =>
        prev.filter((p) => String(p._id) !== String(postId))
      );
      setShowEventPostComments((prev) => {
        const next = new Set(prev);
        next.delete(String(postId));
        return next;
      });
      setEventPostOptionsId(null);
      setImageTheater((current) => {
        if (!current?.post?._id) return current;
        return String(current.post._id) === String(postId) ? null : current;
      });
      alert('Đã xóa bài viết.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không thể xóa bài viết');
    }
  };

  const toggleShareFriendSelect = (friendId) => {
    const id = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const openShareModalForEventPost = async (post) => {
    if (!post?._id) return;
    setEventSharePickerIntent(null);
    setShareModalPost(post);
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    setShareFriendsLoading(true);
    try {
      const res = await api.get('/friends');
      setShareFriendsList(res.data.friends || []);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không tải được danh sách bạn bè');
      setShareModalPost(null);
    } finally {
      setShareFriendsLoading(false);
    }
  };

  const handleConfirmShareEventDiscussion = async () => {
    if (!shareModalPost?._id || !eventId) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) {
      alert('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const postId = shareModalPost._id;
    const postUrl = `${window.location.origin}/events/${eventId}?post=${postId}`;
    const raw = (shareModalPost.content || '').trim();
    const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    const evTitle = (event?.title || 'Sự kiện').trim();
    const messageText = `${user?.name || 'Một người bạn'} đã chia sẻ bài trong sự kiện “${evTitle}”:\n\n${preview ? `“${preview}”\n\n` : ''}Xem tại: ${postUrl}`;

    setShareSending(true);
    try {
      for (const friendId of ids) {
        const convRes = await api.get(`/messages/conversation/${friendId}`);
        const cid = convRes.data?.conversation?._id;
        if (!cid) continue;
        const fd = new FormData();
        fd.append('content', messageText);
        await api.post(`/messages/${cid}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      const shareRes = await api.post(`/posts/${postId}/share`);
      const sharesCount = shareRes.data?.sharesCount;
      if (typeof sharesCount === 'number') {
        setEventDiscussionPosts((prev) =>
          prev.map((p) => (String(p._id) === String(postId) ? { ...p, shares: sharesCount } : p))
        );
      }
      const n = ids.length;
      setShareModalPost(null);
      setShareSelectedFriendIds(new Set());
      alert(`Đã gửi tới ${n} người bạn qua tin nhắn.`);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không thể chia sẻ. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  const openEventInviteSharePicker = async (intent) => {
    if (!event?._id) return;
    const mode = intent === 'invite' ? 'invite' : 'share';
    setShareModalPost(null);
    setEventSharePickerIntent(mode);
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    setShareFriendsLoading(true);
    try {
      const res = await api.get('/friends');
      setShareFriendsList(res.data.friends || []);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không tải được danh sách bạn bè');
      setEventSharePickerIntent(null);
    } finally {
      setShareFriendsLoading(false);
    }
  };

  const handleConfirmEventInviteOrShare = async () => {
    if (!event?._id || !eventSharePickerIntent) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) {
      alert('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const ev = event;
    setShareSending(true);
    try {
      if (eventSharePickerIntent === 'invite') {
        const res = await api.post(`/events/${ev._id}/invite-notify`, {
          recipientIds: ids,
        });
        const sent = res.data?.sentCount ?? ids.length;
        setEventSharePickerIntent(null);
        setShareSelectedFriendIds(new Set());
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
        await api.post(`/messages/${cid}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setEventSharePickerIntent(null);
      setShareSelectedFriendIds(new Set());
      alert(`Đã gửi sự kiện tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Không thể hoàn tất. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  const openImageTheater = useCallback((post, imageIndex = 0) => {
    const imgs = (post?.images || []).filter((x) => typeof x === 'string');
    if (!post || imgs.length === 0) return;
    const n = imgs.length;
    const idx = Math.min(Math.max(0, imageIndex), n - 1);
    setTheaterCaptionExpanded(false);
    setEventPostTheaterZoom(1);
    const pid = String(post._id);
    setShowEventPostComments((prev) => {
      const next = new Set(prev);
      next.delete(pid);
      return next;
    });
    setImageTheater({ post, imageIndex: idx });
    requestAnimationFrame(() => {
      eventPostTheaterPanRef.current?.scrollTo(0, 0);
    });
  }, []);

  const closeImageTheater = useCallback(() => {
    const g = eventPostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    eventPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setEventPostTheaterZoom(1);
    eventPostTheaterPanRef.current?.scrollTo(0, 0);
    setImageTheater(null);
    setTheaterCaptionExpanded(false);
  }, []);

  const openGoogleMaps = (location, e) => {
    if (e) e.stopPropagation();
    if (!location) return;
    const encodedLocation = encodeURIComponent(location);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
    window.open(mapsUrl, '_blank');
  };

  const renderEventMediaGalleryBody = () => {
    if (eventDiscussionLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
        </div>
      );
    }
    if (eventPostMediaGallery.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-[var(--fb-divider)] bg-[var(--fb-surface)] py-12 text-center shadow-sm">
          <ImageIcon className="mx-auto mb-4 h-16 w-16 text-[var(--fb-text-secondary)] opacity-70" aria-hidden />
          <p className="text-[15px] text-[var(--fb-text-secondary)]">Chưa có ảnh hoặc video nào trong bài thảo luận</p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {eventPostMediaGallery.map((item) => {
            const vid = isEventPostGalleryVideoPath(item.url);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => openImageTheater(item.post, item.imageIndex)}
                className="relative aspect-square overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {vid ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-opacity hover:opacity-90"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover transition-opacity hover:opacity-90"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--fb-app)] text-[var(--fb-text-primary)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-[var(--fb-text-primary)]">
        <p className="text-lg font-semibold">{loadError || 'Không tìm thấy sự kiện.'}</p>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Về danh sách sự kiện
        </button>
      </div>
    );
  }

  const ev = event;
          const evDate = new Date(ev.date);
          const dayNum = evDate.getDate();
          const monthStrip = evDate
            .toLocaleDateString('vi-VN', { month: 'short' })
            .replace(/\./g, '')
            .toUpperCase();
          const coverSrc = ev.image ? resolvePostImageSrc(String(ev.image)) : null;
          const detailRsvp = getUserEventRsvp(ev, user?.id);
          const org = ev.organizer;
          const orgId = org && (org._id || org.id || org);
          const goingCount = ev.participants?.length ?? 0;
          const interestedCount = ev.interestedUsers?.length ?? 0;
          const respondedCount = goingCount + interestedCount;
          const mapSrc = ev.location
            ? `https://www.google.com/maps?q=${encodeURIComponent(ev.location)}&output=embed&hl=vi`
            : null;

  return (
    <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)]">
      {/* Hero — một thẻ lớn (bìa + tiêu đề), giống khối đầu trang Nhóm */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="overflow-visible rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-sm">
          <div className="relative aspect-[21/9] min-h-[200px] w-full max-h-[min(420px,44vh)] overflow-hidden rounded-t-xl bg-[var(--fb-surface)] sm:min-h-[220px] md:min-h-[260px]">
            <input
              ref={eventCoverFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleEventCoverFileChange}
              className="hidden"
              disabled={eventCoverUploading}
            />
            {coverSrc ? (
              <img
                src={coverSrc}
                alt=""
                className="pointer-events-none h-full w-full object-contain object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <Calendar className="h-24 w-24 text-white/50 sm:h-28 sm:w-28" aria-hidden />
              </div>
            )}
            {canEditEventCover(ev) ? (
              <button
                type="button"
                disabled={eventCoverUploading}
                onClick={() => eventCoverFileInputRef.current?.click()}
                className="absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-black/50 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/65 sm:text-sm sm:bottom-4 sm:right-4 sm:px-4 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                {eventCoverUploading ? 'Đang tải…' : 'Đổi ảnh bìa'}
              </button>
            ) : null}
          </div>

          {/* Hàng tiêu đề: trái = lịch + ngày/tên/địa điểm, phải = nút — cùng khối hero */}
          <div className="rounded-b-xl border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-4 py-6 sm:px-6 sm:py-7">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                                <div className="flex min-w-0 flex-1 gap-3">
                                  <div className="flex h-[56px] w-[56px] shrink-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white shadow-sm">
                                    <div className="bg-[#FA383E] py-0.5 text-center text-[10px] font-bold uppercase leading-tight text-white">
                                      {monthStrip}
                                    </div>
                                    <div className="flex flex-1 items-center justify-center text-[22px] font-black leading-none text-[#050505]">
                                      {dayNum}
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold leading-snug text-[#FA383E]">
                                      {formatFbEventDateLine(ev.date)}
                                    </p>
                                    <h1
                                      id="event-detail-title"
                                      className="mt-0.5 text-xl font-bold leading-tight text-[#050505] sm:text-[28px]"
                                    >
                                    {ev.title}
                                  </h1>
                                  {ev.location ? (
                                      <p className="mt-1 text-[15px] text-[#65676B]">{ev.location}</p>
                                  ) : null}
                                  <span
                                    className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                                      getEventStatus(ev.date)
                                    )}`}
                                  >
                                    {getStatusLabel(getEventStatus(ev.date))}
                                  </span>
                                </div>
                              </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end lg:pt-0.5">
                                  {!isOrganizer(ev) ? (
                                    <div className="relative" data-rsvp-menu-root>
                                      <button
                                        type="button"
                                        onClick={() => setEventDetailRsvpOpen((o) => !o)}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#CCD0D5] px-3 py-2 text-sm font-semibold transition ${eventRsvpMainButtonClass(detailRsvp)}`}
                                      >
                                        {detailRsvp === 'going' ? (
                                          <CheckCircle className="h-4 w-4 shrink-0" />
                                        ) : detailRsvp === 'declined' ? (
                                          <Ban className="h-4 w-4 shrink-0" />
                                        ) : (
                                          <Star
                                            className={`h-4 w-4 shrink-0 ${detailRsvp === 'interested' ? 'fill-amber-400 text-amber-500' : ''}`}
                                          />
                                        )}
                                        {eventRsvpMainLabel(detailRsvp)}
                                        <ChevronDown className="h-4 w-4 opacity-60" />
                                      </button>
                                      {eventDetailRsvpOpen ? (
                                        <div className="absolute left-0 top-full z-40 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-[#CCD0D5] bg-white py-1 shadow-xl">
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#050505] hover:bg-[#F0F2F5]"
                                            onClick={() => handleSetEventRsvp(ev._id, 'interested')}
                                          >
                                            {detailRsvp === 'interested' ? (
                                              <Check className="h-4 w-4 shrink-0 text-blue-600" />
                                            ) : (
                                              <span className="w-4 shrink-0" />
                                            )}
                                            <Star className="h-4 w-4 shrink-0" />
                                            Quan tâm
                                          </button>
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#050505] hover:bg-[#F0F2F5]"
                                            onClick={() => handleSetEventRsvp(ev._id, 'going')}
                                          >
                                            {detailRsvp === 'going' ? (
                                              <Check className="h-4 w-4 shrink-0 text-blue-600" />
                                            ) : (
                                              <span className="w-4 shrink-0" />
                                            )}
                                            <CheckCircle className="h-4 w-4 shrink-0" />
                                            Tham gia
                                          </button>
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#050505] hover:bg-[#F0F2F5]"
                                            onClick={() => handleSetEventRsvp(ev._id, 'declined')}
                                          >
                                            {detailRsvp === 'declined' ? (
                                              <Check className="h-4 w-4 shrink-0 text-blue-600" />
                                            ) : (
                                              <span className="w-4 shrink-0" />
                                            )}
                                            <Ban className="h-4 w-4 shrink-0" />
                                            Không tham gia
                                          </button>
                                          {detailRsvp ? (
                                            <button
                                              type="button"
                                              className="flex w-full items-center gap-2 border-t border-[#E4E6EB] px-3 py-2.5 text-left text-sm text-[#65676B] hover:bg-[#F0F2F5]"
                                              onClick={() => handleSetEventRsvp(ev._id, 'none')}
                                            >
                                              <span className="w-4 shrink-0" />
                                              Bỏ phản hồi
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => openEventInviteSharePicker('invite')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#CCD0D5] bg-white px-3 py-2 text-sm font-semibold text-[#050505] hover:bg-[#F0F2F5]"
                                  >
                                    <Mail className="h-4 w-4" />
                                    Mời
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEventInviteSharePicker('share')}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#CCD0D5] bg-white text-[#050505] hover:bg-[#F0F2F5]"
                                    aria-label="Chia sẻ qua tin nhắn"
                                    title="Chia sẻ qua tin nhắn"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </button>
                                  <div className="relative" ref={eventDetailMoreRef}>
                                    <button
                                      type="button"
                                      onClick={() => setEventDetailMoreOpen((o) => !o)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#CCD0D5] bg-white text-[#050505] hover:bg-[#F0F2F5]"
                                      aria-label="Thêm"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                    {eventDetailMoreOpen ? (
                                      <div className="absolute right-0 top-full z-40 mt-1 min-w-[200px] rounded-lg border border-[var(--fb-divider)] bg-white py-1 shadow-lg">
                                        <button
                                          type="button"
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                          onClick={() => {
                                            setEventDetailMoreOpen(false);
                                            reportEvent(ev);
                                          }}
                                        >
                                          <AlertTriangle className="h-4 w-4" />
                                          Báo cáo sự kiện
                                        </button>
                                        {canEditEventCover(ev) ? (
                                          <button
                                            type="button"
                                            disabled={eventCoverUploading}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-50"
                                            onClick={() => {
                                              setEventDetailMoreOpen(false);
                                              eventCoverFileInputRef.current?.click();
                                            }}
                                          >
                                            <ImageIcon className="h-4 w-4" />
                                            Đổi ảnh đại diện / ảnh bìa
                                          </button>
                                        ) : null}
                                        {isOrganizer(ev) ? (
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                              setEventDetailMoreOpen(false);
                                              handleDeleteEvent(ev._id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa sự kiện
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

      {/* Nội dung dưới — cột Giới thiệu + tab (giống Nhóm học tập), phần này thấp hơn khối hero */}
      <div className="mx-auto mt-5 max-w-[min(100%,calc(300px+680px+1rem))] px-4 pb-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,300px)_minmax(0,680px)] lg:gap-4">
          <aside className="min-w-0">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-4 shadow-md">
                <h2 className="mb-2 text-base font-bold text-[var(--fb-text-primary)]">Giới thiệu</h2>
                <p className="text-sm leading-relaxed text-[var(--fb-text-secondary)] whitespace-pre-wrap">
                  {ev.description?.trim()
                    ? ev.description
                    : 'Sự kiện chưa có mô tả. Người tổ chức có thể bổ sung trong phần chỉnh sửa sự kiện.'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-1.5 border-t border-[var(--fb-divider)] pt-3 text-xs text-[var(--fb-text-secondary)]">
                  <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  <span>{eventVisibilityLabel(ev)}</span>
                </div>
                {ev.location ? (
                  <p className="mt-2 text-xs text-[var(--fb-text-secondary)]">
                    <span className="font-semibold text-[var(--fb-text-primary)]">Địa điểm:</span> {ev.location}
                  </p>
                ) : null}
                {ev.category ? (
                  <div className="mt-3">
                    <span className="inline-block rounded-md bg-[var(--fb-input)] px-2 py-1 text-xs font-semibold text-[var(--fb-text-secondary)]">
                      {ev.category}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-md">
                {mapSrc ? (
                  <iframe
                    title="Bản đồ"
                    src={mapSrc}
                    className="aspect-[4/3] w-full border-0 bg-[#E4E6EB]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[#E4E6EB] text-sm text-[#65676B]">
                    Chưa có địa điểm để hiển thị bản đồ
                  </div>
                )}
                <div className="border-t border-[var(--fb-divider)] p-3">
                  <p className="font-semibold text-[#050505]">{ev.location || '—'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-4 shadow-md">
                <h2 className="mb-3 text-base font-bold text-[var(--fb-text-primary)]">File phương tiện mới đây</h2>
                {eventPostMediaGallery.length === 0 ? (
                  <p className="mb-3 text-xs text-[var(--fb-text-secondary)]">Chưa có ảnh hoặc video trong bài thảo luận.</p>
                ) : (
                  <div className="mb-3 grid grid-cols-2 gap-1.5">
                    {eventPostMediaGallery.slice(0, 4).map((item) => {
                      const vid = isEventPostGalleryVideoPath(item.url);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openImageTheater(item.post, item.imageIndex)}
                          className="relative aspect-square overflow-hidden rounded-md border border-[var(--fb-divider)] bg-[var(--fb-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {vid ? (
                            <video
                              src={item.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover transition-opacity hover:opacity-90"
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt=""
                              className="h-full w-full object-cover transition-opacity hover:opacity-90"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEventDetailTab('media')}
                  className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2 text-sm font-medium text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                >
                  Xem tất cả
                </button>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-md">
              <div className="flex border-b border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 sm:px-4">
                              <div className="mx-auto flex w-full max-w-[680px] gap-1 sm:gap-6">
                                <button
                                  type="button"
                                  onClick={() => setEventDetailTab('about')}
                                  className={`relative pb-2.5 pt-1 text-[15px] font-semibold ${
                                    eventDetailTab === 'about'
                                      ? 'text-blue-600'
                                      : 'text-[#65676B] hover:text-[#050505]'
                                  }`}
                                >
                                  Chi tiết
                            {eventDetailTab === 'about' ? (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEventDetailTab('discussion')}
                                  className={`relative pb-2.5 pt-1 text-[15px] font-semibold ${
                                    eventDetailTab === 'discussion'
                                      ? 'text-blue-600'
                                      : 'text-[#65676B] hover:text-[#050505]'
                                  }`}
                                >
                                  Thảo luận
                                  {eventDetailTab === 'discussion' ? (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEventDetailTab('media')}
                                  className={`relative flex items-center gap-1 pb-2.5 pt-1 text-[15px] font-semibold ${
                                    eventDetailTab === 'media'
                                      ? 'text-blue-600'
                                      : 'text-[#65676B] hover:text-[#050505]'
                                  }`}
                                >
                                  <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
                                  File phương tiện
                                  {eventDetailTab === 'media' ? (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-600" />
                                  ) : null}
                                </button>
                              </div>
                            </div>

                            {eventDetailTab === 'about' ? (
                              <div className="bg-[#F0F2F5] p-4 sm:p-6">
                                <div className="mx-auto w-full max-w-[min(100%,680px)] space-y-4">
                                  <div className="rounded-lg border border-[var(--fb-divider)] bg-white p-4 shadow-sm">
                                    <h2 className="mb-3 text-[17px] font-bold text-[#050505]">Chi tiết</h2>
                                    <div className="divide-y divide-[#F0F2F5]">
                                      <div className="flex gap-3 py-3 first:pt-0">
                                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#65676B]" />
                                        <p className="text-[15px] text-[#050505]">
                                          <span className="font-semibold">{respondedCount}</span> người đã phản hồi
                                          {ev.maxParticipants ? (
                                            <span className="text-[#65676B]"> · tối đa {ev.maxParticipants}</span>
                                          ) : null}
                                        </p>
                                      </div>
                                      <div className="flex gap-3 py-3">
                                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#65676B]" />
                                        <p className="text-[15px] text-[#050505]">
                                          <span className="font-semibold">{goingCount}</span> sẽ tham gia
                                          <span className="mx-1.5 text-[#CCD0D5]">·</span>
                                          <span className="font-semibold">{interestedCount}</span> quan tâm
                                        </p>
                                      </div>
                                      {org ? (
                                        <div className="flex gap-3 py-3">
                                          <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#65676B]" />
                                          <p className="text-[15px] text-[#050505]">
                                            Sự kiện của{' '}
                                            <button
                                              type="button"
                                              className="font-semibold text-blue-600 hover:underline"
                                              onClick={() => {
                                                if (!orgId) return;
                                                navigate(`/profile/${orgId}`);
                                              }}
                                            >
                                              {org.name || 'Người tổ chức'}
                                            </button>
                                          </p>
                                        </div>
                                      ) : null}
                                      {ev.location ? (
                                        <div className="flex gap-3 py-3">
                                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#65676B]" />
                                          <p className="text-[15px] text-[#050505]">{ev.location}</p>
                                        </div>
                                      ) : null}
                                      <div className="flex gap-3 py-3">
                                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#65676B]" />
                                        <p className="text-[15px] text-[#050505]">{eventVisibilityLabel(ev)}</p>
                                      </div>
                                    </div>
                                    {ev.description ? (
                                      <p className="mt-4 text-[15px] leading-relaxed text-[#050505]">{ev.description}</p>
                                    ) : null}
                                    {ev.category ? (
                                      <div className="mt-3">
                                        <span className="inline-block rounded-md bg-[#E4E6EB] px-2.5 py-1 text-xs font-semibold text-[#65676B]">
                                          {ev.category}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>

                                  {org ? (
                                    <div className="rounded-lg border border-[var(--fb-divider)] bg-white p-6 text-center shadow-sm">
                                      <h2 className="mb-4 text-left text-[17px] font-bold text-[#050505]">Gặp gỡ người tổ chức</h2>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!orgId) return;
                                          navigate(`/profile/${orgId}`);
                                        }}
                                        className="mx-auto flex flex-col items-center"
                                      >
                                        <img
                                          src={resolveAvatarUrl(org.avatar, org.name, '1877f2')}
                                          alt=""
                                          className="h-24 w-24 rounded-full border border-[var(--fb-divider)] object-cover shadow-sm"
                                          onError={withAvatarFallback(org.name, '1877f2')}
                                        />
                                        <p className="mt-3 text-lg font-bold text-[#050505] hover:underline">{org.name}</p>
                                      </button>
                                      {org.studentRole ? (
                                        <p className="mt-1 text-sm text-[#65676B]">{org.studentRole}</p>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {ev.coHostInvites && ev.coHostInvites.length > 0 ? (
                                    <div className="rounded-lg border border-[var(--fb-divider)] bg-white p-4 shadow-sm">
                                      <p className="mb-3 text-sm font-semibold text-[#65676B]">Đồng tổ chức</p>
                                      <ul className="space-y-2">
                                        {ev.coHostInvites.map((inv) => {
                                          const u = inv.user;
                                          const uid = u?._id != null ? String(u._id) : String(inv.user);
                                          const name = u?.name || 'Thành viên';
                                          const avatar = u?.avatar;
                                          const st = inv.status || 'pending';
                                          return (
                                            <li
                                              key={`${uid}-${st}`}
                                              className="flex items-center gap-3 rounded-lg border border-[var(--fb-divider)] bg-[#F0F2F5] px-3 py-2.5"
                                            >
                                              <img
                                                src={resolveAvatarUrl(avatar, name)}
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                onError={withAvatarFallback(name)}
                                              />
                                              <button
                                                type="button"
                                                className="min-w-0 flex-1 truncate text-left text-sm font-bold text-[#050505] hover:underline"
                                                onClick={() =>
                                                  openCoHostStatus({
                                                    userId: uid,
                                                    name,
                                                    avatar,
                                                    status: st,
                                                  })
                                                }
                                              >
                                                {name}
                                              </button>
                                              <span className="shrink-0 text-xs font-medium text-[#65676B]">
                                                {st === 'pending'
                                                  ? 'Đang chờ'
                                                  : st === 'accepted'
                                                    ? 'Đã đồng ý'
                                                    : 'Đã từ chối'}
                                              </span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  ) : null}

                                  {ev.participants && ev.participants.length > 0 ? (
                                    <div className="rounded-lg border border-[var(--fb-divider)] bg-white p-4 shadow-sm">
                                      <p className="mb-3 text-sm font-semibold text-[#65676B]">
                                        Người tham gia ({ev.participants.length})
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {ev.participants.map((participant) => (
                                          <button
                                            key={typeof participant === 'object' ? participant._id : participant}
                                            type="button"
                                            className="flex items-center gap-2 rounded-lg border border-[var(--fb-divider)] bg-[#F0F2F5] p-2 text-left hover:bg-[#E4E6EB]"
                                            onClick={() => {
                                              const pid = participant?._id || participant?.id || participant;
                                              if (!pid) return;
                                              navigate(`/profile/${pid}`);
                                            }}
                                          >
                                            <img
                                              src={resolveAvatarUrl(participant.avatar, participant.name, '1877f2')}
                                              alt=""
                                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                                              onError={withAvatarFallback(participant.name, '1877f2')}
                                            />
                                            <span className="truncate text-sm font-medium text-[#050505]">{participant.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {ev.interestedUsers && ev.interestedUsers.length > 0 ? (
                                    <div className="rounded-lg border border-[var(--fb-divider)] bg-white p-4 shadow-sm">
                                      <p className="mb-3 text-sm font-semibold text-[#65676B]">
                                        Quan tâm ({ev.interestedUsers.length})
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {ev.interestedUsers.map((participant) => (
                                          <button
                                            key={typeof participant === 'object' ? participant._id : participant}
                                            type="button"
                                            className="flex items-center gap-2 rounded-lg border border-[var(--fb-divider)] bg-[#F0F2F5] p-2 text-left hover:bg-[#E4E6EB]"
                                            onClick={() => {
                                              const pid = participant?._id || participant?.id || participant;
                                              if (!pid) return;
                                              navigate(`/profile/${pid}`);
                                            }}
                                          >
                                            <img
                                              src={resolveAvatarUrl(participant.avatar, participant.name, '1877f2')}
                                              alt=""
                                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                                              onError={withAvatarFallback(participant.name, '1877f2')}
                                            />
                                            <span className="truncate text-sm font-medium text-[#050505]">{participant.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                              </div>
                            ) : eventDetailTab === 'discussion' ? (
                              <div className="bg-[var(--fb-app)] p-4 sm:p-6">
                                <div className="mx-auto w-full max-w-[min(100%,680px)] space-y-4">
                                  {(() => {
                                    const uid = user?.id && String(user.id);
                                    const isCo = (ev.coHostInvites || []).some(
                                      (c) => String(c.user?._id || c.user) === uid && c.status === 'accepted'
                                    );
                                    const onlyOrg = ev.onlyOrganizersPost !== false;
                                    const canPostDiscussion = !onlyOrg || isOrganizer(ev) || isCo;
                                    const discussionFirstName = (user?.name || '')
                                      .trim()
                                      .split(/\s+/)
                                      .filter(Boolean)[0];
                                    const discussionPlaceholder = discussionFirstName
                                      ? `${discussionFirstName}, bạn đang nghĩ gì thế?`
                                      : 'Bạn đang nghĩ gì thế?';
                                    return canPostDiscussion ? (
                                      <div className="overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-sm">
                                        <div className="p-4">
                                          <div className="flex items-center space-x-3">
                                            <img
                                              src={resolveAvatarUrl(user?.avatar, user?.name)}
                                              alt=""
                                              className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover"
                                              onError={withAvatarFallback(user?.name)}
                                              onClick={() => {
                                                const id = user?.id || user?._id;
                                                if (id) navigate(`/profile/${id}`);
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowEventDiscussionModal(true);
                                                queueMicrotask(() =>
                                                  discussionTextareaRef.current?.focus()
                                                );
                                              }}
                                              className="flex-1 rounded-full bg-[var(--fb-input)] px-4 py-2.5 text-left text-[15px] text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)]"
                                            >
                                              {discussionPlaceholder}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="rounded-lg border border-[var(--fb-divider)] bg-white px-4 py-3 text-sm text-[#65676B] shadow-sm">
                                        Chỉ người tổ chức và đồng tổ chức mới có thể đăng bài trong sự kiện này.
                                      </div>
                                    );
                                  })()}

                                  <p className="px-1 text-xs font-bold tracking-wide text-[#65676B]">HOẠT ĐỘNG MỚI ĐÂY</p>

                                  {eventDiscussionLoading ? (
                                    <div className="flex justify-center py-12">
                                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
                                    </div>
                                  ) : eventDiscussionPosts.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-[#CCD0D5] bg-white py-12 text-center text-[15px] text-[#65676B]">
                                      Chưa có hoạt động nào. Hãy là người đầu tiên đăng bài!
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {eventDiscussionPosts.map((post) => {
                                        const author = post.author;
                                        const uid = user?.id != null ? String(user.id) : '';
                                        const liked = (post.likes || []).some(
                                          (l) => String(typeof l === 'object' ? l._id : l) === uid
                                        );
                                        const commentCount = Array.isArray(post.comments)
                                          ? post.comments.length
                                          : 0;
                                        const shareCount = Number(post.shares ?? 0);
                                        const likeCount = (post.likes || []).length;
                                        return (
                                          <article
                                            key={String(post._id)}
                                            className="overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-white shadow-sm"
                                          >
                                            <div className="flex items-start gap-3 p-3">
                                              <img
                                                src={resolveAvatarUrl(author?.avatar, author?.name)}
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                onError={withAvatarFallback(author?.name)}
                                              />
                                              <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-[15px] text-[#050505]">
                                                  {author?.name || 'Thành viên'}
                                                </div>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[#65676B]">
                                                  <span>{formatTimeAgo(post.createdAt)}</span>
                                                  {post.updatedAt &&
                                                  new Date(post.updatedAt).getTime() !==
                                                    new Date(post.createdAt).getTime() ? (
                                                    <>
                                                      <span>•</span>
                                                      <span
                                                        className="italic opacity-80"
                                                        title={`Đã chỉnh sửa ${formatTimeAgo(post.updatedAt)}`}
                                                      >
                                                        Đã chỉnh sửa
                                                  </span>
                                                    </>
                                                  ) : null}
                                                  {post.category ? (
                                                    <>
                                                      <span>•</span>
                                                      <span className="flex items-center text-[#1877F2]">
                                                        <svg
                                                          className="mr-1 h-3 w-3 shrink-0"
                                                          fill="currentColor"
                                                          viewBox="0 0 20 20"
                                                          aria-hidden
                                                        >
                                                          <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                            clipRule="evenodd"
                                                          />
                                                        </svg>
                                                        {post.category}
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <Globe className="ml-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                                  )}
                                                </div>
                                              </div>
                                              <div className="relative event-post-options-container">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setEventPostOptionsId((prev) =>
                                                      String(prev) === String(post._id) ? null : post._id
                                                    )
                                                  }
                                                  className="rounded-full p-2 text-[#65676B] hover:bg-[#F0F2F5] transition-colors"
                                                  title="Tùy chọn"
                                                >
                                                  <MoreHorizontal className="h-5 w-5" />
                                                </button>
                                                {String(eventPostOptionsId) === String(post._id) ? (
                                                  <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-lg border border-[#E4E6EB] bg-white shadow-xl">
                                                    {(() => {
                                                      const authorId =
                                                        post.author?._id || post.author?.id || post.author;
                                                      const currentUserId = user?.id || user?._id;
                                                      const canDeletePost =
                                                        String(authorId || '') === String(currentUserId || '') ||
                                                        user?.role === 'admin';
                                                      return canDeletePost ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleDeleteEventPost(post)}
                                                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                          Xóa bài viết
                                                        </button>
                                                      ) : null;
                                                    })()}
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setEventPostOptionsId(null);
                                                        toggleEventSave(post._id);
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm text-[#050505] hover:bg-[#F0F2F5]"
                                                    >
                                                      {savedEventPostIds.has(String(post._id))
                                                        ? 'Bỏ lưu bài viết'
                                                        : 'Lưu bài viết'}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setEventPostOptionsId(null);
                                                        reportEventPost(post._id);
                                                      }}
                                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                    >
                                                      Báo cáo bài viết
                                                    </button>
                                                  </div>
                                                ) : null}
                                              </div>
                                            </div>
                                            {post.content &&
                                            post.content !== EVENT_POST_PLACEHOLDER_CONTENT ? (
                                              <div className="px-4 pb-3">
                                                {post.textBackground &&
                                                (!post.images || post.images.length === 0) &&
                                                (!post.files || post.files.length === 0) ? (
                                                  <div
                                                    className={`flex min-h-[360px] w-full items-center justify-center rounded-xl px-5 py-8 text-center text-[29px] font-semibold leading-relaxed whitespace-pre-wrap break-words md:min-h-[420px] ${
                                                      isDarkBackground(post.textBackground)
                                                        ? 'text-white'
                                                        : 'text-[var(--fb-text-primary)]'
                                                    }`}
                                                    style={{ background: post.textBackground }}
                                                  >
                                                    {post.content}
                                                  </div>
                                                ) : (
                                                  <p className="break-words whitespace-pre-wrap text-[15px] leading-relaxed text-[#050505]">
                                                    {post.content}
                                                  </p>
                                                )}
                                              </div>
                                            ) : null}
                                            {(() => {
                                              const gallery = (post.images || []).filter(
                                                (x) => typeof x === 'string'
                                              );
                                              if (!gallery.length) return null;
                                              return (
                                                <PostImageGallery
                                                  images={gallery}
                                                  resolveUrl={(img) => resolvePostImageSrc(img)}
                                                  isVideo={isEventPostGalleryVideoPath}
                                                  videoPreviewSrc={eventPostVideoPreviewSrc}
                                                  onCellClick={(index) => openImageTheater(post, index)}
                                                  cellBgClass="bg-[#F0F2F5]"
                                                />
                                              );
                                            })()}
                                            {post.files && post.files.length > 0 ? (
                                              <div className="space-y-2 px-4 pb-3">
                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                  {post.files.map((file, fi) =>
                                                    isEventPostAttachmentVideo(file) ? (
                                                      <div key={fi} className="md:col-span-2">
                                                        <video
                                                          src={eventPostVideoPreviewSrc(eventPostAttachmentUrl(file))}
                                                          controls
                                                          playsInline
                                                          preload="metadata"
                                                          className="w-full max-h-[min(70vh,620px)] rounded-lg bg-black object-contain"
                                                        />
                                                        {file.name ? (
                                                          <p className="mt-1 truncate px-0.5 text-xs text-[#65676B]">
                                                            {file.name}
                                                          </p>
                                                        ) : null}
                                                      </div>
                                                    ) : (
                                                      <div
                                                        key={fi}
                                                        className="flex items-center justify-between gap-2 rounded-lg border border-[#E4E6EB] bg-[#F0F2F5] p-3"
                                                      >
                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                          <BookOpen className="h-5 w-5 shrink-0 text-orange-600" />
                                                          <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-[#050505]">
                                                              {file.name || 'Tệp'}
                                                            </p>
                                                            <p className="text-xs text-[#65676B]">
                                                              {file.size || ''}
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <a
                                                          href={eventPostAttachmentUrl(file)}
                                                          download={file.name || 'download'}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="shrink-0 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#166FE5]"
                                                        >
                                                          Mở
                                                        </a>
                                                      </div>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            ) : null}
                                            <div className="flex items-center justify-between border-t border-[#E4E6EB] px-4 py-2.5 text-xs text-[#65676B]">
                                              <div className="flex items-center gap-2">
                                                <div className="flex items-center -space-x-1">
                                                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1877F2]">
                                                    <Heart className="h-3 w-3 fill-white text-white" />
                                                  </div>
                                                </div>
                                                <span className="text-[13px]">{likeCount}</span>
                                              </div>
                                              <div className="flex gap-4 text-[13px]">
                                                <span>{commentCount} bình luận</span>
                                                <span>{shareCount} chia sẻ</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-around border-t border-[#E4E6EB] px-2 py-1 text-[15px]">
                                              <button
                                                type="button"
                                                onClick={() => toggleEventPostLike(post._id)}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-medium transition ${
                                                  liked
                                                    ? 'text-[#1877F2] hover:bg-[#E7F3FF]'
                                                    : 'text-[#65676B] hover:bg-[#F0F2F5]'
                                                }`}
                                              >
                                                <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                                                <span className="text-sm">{liked ? 'Đã thích' : 'Thích'}</span>
                                              </button>
                                              <button
                                                type="button"
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-medium transition ${
                                                  showEventPostComments.has(String(post._id))
                                                    ? 'text-[#1877F2] hover:bg-[#E7F3FF]'
                                                    : 'text-[#65676B] hover:bg-[#F0F2F5]'
                                                }`}
                                                onClick={() => toggleEventPostComments(post._id)}
                                              >
                                                <MessageCircle className="h-5 w-5" />
                                                <span className="text-sm">Bình luận</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => openShareModalForEventPost(post)}
                                                disabled={shareSending && String(shareModalPost?._id) === String(post._id)}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-medium text-[#65676B] transition hover:bg-[#F0F2F5] disabled:cursor-wait disabled:opacity-60"
                                              >
                                                <Share2 className="h-5 w-5" />
                                                <span className="text-sm">
                                                  {shareSending && String(shareModalPost?._id) === String(post._id)
                                                    ? 'Đang gửi…'
                                                    : 'Chia sẻ'}
                                                </span>
                                              </button>
                                            </div>
                                            <PostCommentSection
                                              user={user}
                                              postId={post._id}
                                              post={post}
                                              isVisible={showEventPostComments.has(String(post._id))}
                                              onClose={() => toggleEventPostComments(post._id)}
                                              onUpdatePost={(id, fn) =>
                                                setEventDiscussionPosts((prev) =>
                                                  prev.map((p) => (String(p._id) === String(id) ? fn(p) : p))
                                                )
                                              }
                                              onRequestRefresh={() => {
                                                if (event?._id) {
                                                  setTimeout(() => refreshEventDiscussionPosts(event._id), 1000);
                                                }
                                              }}
                                              onOpenImageTheater={(idx) => openImageTheater(post, idx)}
                                            />
                                          </article>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                              </div>
                            ) : (
                              <div className="bg-[var(--fb-app)] p-4 sm:p-6">
                                <div className="mx-auto w-full max-w-[min(100%,680px)] space-y-4">
                                  <div className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-4 shadow-sm">
                                    <p className="text-sm text-[var(--fb-text-secondary)]">
                                      Ảnh và video đính kèm trong các bài thảo luận. Chọn một mục để xem kích thước đầy đủ.
                                    </p>
                                  </div>
                                  {renderEventMediaGalleryBody()}
                                </div>
                              </div>
                            )}
            </div>
          </div>
        </div>
      </div>

      {imageTheater &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const livePost =
              eventDiscussionPosts.find((p) => String(p._id) === String(imageTheater.post._id)) ||
              imageTheater.post;
            const imgs = (livePost.images || []).filter((x) => typeof x === 'string');
            const n = imgs.length;
            const idx = n ? Math.min(Math.max(0, imageTheater.imageIndex), n - 1) : 0;
            const curUrl = imgs[idx] ? resolvePostImageSrc(imgs[idx]) : '';
            const capRaw = (livePost.content || '').trim();
            const cap =
              !capRaw || capRaw === EVENT_POST_PLACEHOLDER_CONTENT ? '' : capRaw;
            const capTrunc = 220;
            const theaterUid = String(user?.id || '');
            const theaterLiked = (livePost.likes || []).some(
              (like) => String(like?._id || like) === theaterUid
            );
            const theaterLikeCount = (livePost.likes || []).length;
            const goPrev = (e) => {
              e.stopPropagation();
              if (n <= 1) return;
              setImageTheater((t) =>
                t ? { ...t, post: livePost, imageIndex: (idx - 1 + n) % n } : t
              );
            };
            const goNext = (e) => {
              e.stopPropagation();
              if (n <= 1) return;
              setImageTheater((t) =>
                t ? { ...t, post: livePost, imageIndex: (idx + 1) % n } : t
              );
            };
            const curPathRaw = imgs[idx] || '';
            const curIsVideo = isEventPostGalleryVideoPath(curPathRaw);
            const eventPostZoomIn = (e) => {
              e.stopPropagation();
              setEventPostTheaterZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
            };
            const eventPostZoomOut = (e) => {
              e.stopPropagation();
              setEventPostTheaterZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
            };
            const onEventPostWheelZoom = (e) => {
              if (curIsVideo) return;
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setEventPostTheaterZoom((z) => Math.max(1, Math.min(4, Math.round((z + delta) * 100) / 100)));
            };
            const endEventPostPan = (e, doTapZoom) => {
              const g = eventPostTheaterPanGestureRef.current;
              const el = eventPostTheaterPanRef.current;
              if (!g.active || e.pointerId !== g.pointerId) return;
              if (typeof g.detachWindowPan === 'function') {
                g.detachWindowPan();
                g.detachWindowPan = null;
              }
              if (el?.hasPointerCapture?.(e.pointerId)) {
                try {
                  el.releasePointerCapture(e.pointerId);
                } catch {
                  /* ignore */
                }
              }
              el?.classList.remove('cursor-grabbing');
              const tappedImg =
                doTapZoom &&
                !g.moved &&
                g.downTarget &&
                typeof g.downTarget.tagName === 'string' &&
                g.downTarget.tagName === 'IMG';
              g.active = false;
              g.pointerId = null;
              if (tappedImg) {
                setEventPostTheaterZoom((z) => {
                  if (z >= 4) return 1;
                  return Math.min(4, Math.round((z + 0.25) * 100) / 100);
                });
              }
            };
            const onEventPostPanPointerDown = (e) => {
              if (eventPostTheaterZoom <= 1 || curIsVideo) return;
              if (e.button !== 0) return;
              const el = eventPostTheaterPanRef.current;
              if (!el) return;
              e.preventDefault();
              e.stopPropagation();
              const prev = eventPostTheaterPanGestureRef.current;
              if (prev && typeof prev.detachWindowPan === 'function') {
                prev.detachWindowPan();
                prev.detachWindowPan = null;
              }
              try {
                el.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              const g = {
                active: true,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                lastX: e.clientX,
                lastY: e.clientY,
                moved: false,
                downTarget: e.target,
                detachWindowPan: null,
              };
              eventPostTheaterPanGestureRef.current = g;
              el.classList.add('cursor-grabbing');

              const winOpts = { capture: true, passive: false };
              const onWinMove = (ev) => {
                const ge = eventPostTheaterPanGestureRef.current;
                const pane = eventPostTheaterPanRef.current;
                if (!ge.active || ev.pointerId !== ge.pointerId || !pane) return;
                if (ev.cancelable) ev.preventDefault();
                const dx = ev.clientX - ge.lastX;
                const dy = ev.clientY - ge.lastY;
                ge.lastX = ev.clientX;
                ge.lastY = ev.clientY;
                if (Math.hypot(ev.clientX - ge.startX, ev.clientY - ge.startY) > 6) ge.moved = true;
                pane.scrollLeft -= dx;
                pane.scrollTop -= dy;
              };
              const onWinUp = (ev) => {
                const ge = eventPostTheaterPanGestureRef.current;
                if (!ge.active || ev.pointerId !== ge.pointerId) return;
                endEventPostPan(ev, !curIsVideo);
              };
              const detachWindowPan = () => {
                window.removeEventListener('pointermove', onWinMove, true);
                window.removeEventListener('pointerup', onWinUp, true);
                window.removeEventListener('pointercancel', onWinUp, true);
              };
              g.detachWindowPan = detachWindowPan;
              window.addEventListener('pointermove', onWinMove, winOpts);
              window.addEventListener('pointerup', onWinUp, winOpts);
              window.addEventListener('pointercancel', onWinUp, winOpts);
            };
            return (
              <div
                className="fixed inset-0 z-[9999] flex min-h-0 min-w-0 flex-col bg-black lg:flex-row"
                role="dialog"
                aria-modal="true"
                aria-label="Xem ảnh bài viết"
              >
                <div
                  className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black"
                  onClick={closeImageTheater}
                >
                                              <button
                                                type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeImageTheater();
                    }}
                    className="absolute left-4 top-4 z-20 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
                    title="Đóng"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  {curUrl ? (
                    <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                      {!curIsVideo ? (
                        <>
                          <button
                            type="button"
                            onClick={eventPostZoomOut}
                            disabled={eventPostTheaterZoom <= 1}
                            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            title="Thu nhỏ"
                          >
                            <ZoomOut className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={eventPostZoomIn}
                            disabled={eventPostTheaterZoom >= 4}
                            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            title="Phóng to"
                          >
                            <ZoomIn className="h-5 w-5" />
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(curUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
                        title={curIsVideo ? 'Mở video đầy đủ' : 'Mở ảnh đầy đủ'}
                      >
                        <Maximize2 className="h-5 w-5" />
                                              </button>
                                            </div>
                  ) : null}
                  {n > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:block"
                        aria-label="Ảnh trước"
                      >
                        <ChevronLeft className="h-7 w-7" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:block"
                        aria-label="Ảnh sau"
                      >
                        <ChevronRight className="h-7 w-7" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white/80">
                        {idx + 1} / {n}
                      </div>
                    </>
                  ) : null}
                  {curUrl ? (
                    curIsVideo ? (
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4 sm:p-8">
                        <video
                          src={eventPostVideoPreviewSrc(curUrl)}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-[100dvh] max-w-full object-contain"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div
                        ref={eventPostTheaterPanRef}
                        onPointerDown={onEventPostPanPointerDown}
                        onWheel={onEventPostWheelZoom}
                        onClick={(ev) => ev.stopPropagation()}
                        className={`box-border flex min-h-0 min-w-0 w-full flex-1 overflow-auto overscroll-contain p-4 sm:p-8 ${
                          eventPostTheaterZoom > 1
                            ? 'cursor-grab select-none touch-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                            : ''
                        }`}
                      >
                        <img
                          src={curUrl}
                                                      alt=""
                          draggable={false}
                          title={
                            eventPostTheaterZoom > 1
                              ? 'Kéo để xem vùng khác; chạm nhẹ vào ảnh để phóng thêm'
                              : 'Bấm để phóng thêm; khi tối đa bấm lại để vừa khung'
                          }
                          className={`m-auto block max-w-none object-contain transition-[max-height,max-width] duration-200 ease-out ${
                            eventPostTheaterZoom >= 4 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                          }`}
                          style={{
                            width: `${100 * eventPostTheaterZoom}%`,
                            maxWidth: 'none',
                            maxHeight: 'none',
                          }}
                          onClick={
                            eventPostTheaterZoom <= 1
                              ? (ev) => {
                                  ev.stopPropagation();
                                  setEventPostTheaterZoom((z) => {
                                    if (z >= 4) return 1;
                                    return Math.min(4, Math.round((z + 0.25) * 100) / 100);
                                  });
                                }
                              : undefined
                          }
                        />
                                                    </div>
                    )
                                            ) : null}
                </div>

                <aside
                  className="flex h-[min(52vh,480px)] min-h-0 w-full shrink-0 grow-0 flex-col border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl lg:h-full lg:max-w-md lg:min-w-[min(100%,28rem)] lg:shrink-0 lg:grow-0 lg:border-l lg:border-t-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="shrink-0 border-b border-[var(--fb-divider)] p-4">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-[var(--fb-hover)]"
                      onClick={() => {
                        const aid = livePost.author?._id || livePost.author?.id || livePost.author;
                        if (aid) navigate(`/profile/${aid}`);
                      }}
                    >
                      <img
                        src={resolveAvatarUrl(livePost.author?.avatar, livePost.author?.name, '1877f2')}
                                                alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                        onError={withAvatarFallback(livePost.author?.name, '1877f2')}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[var(--fb-text-primary)]">
                          {livePost.author?.name || 'Thành viên'}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--fb-text-secondary)]">
                          <span>{formatTimeAgo(livePost.createdAt)}</span>
                          <Globe className="h-3.5 w-3.5 text-[var(--fb-text-secondary)]" aria-hidden />
                        </div>
                      </div>
                    </button>
                    {cap ? (
                      <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--fb-text-primary)]">
                        {theaterCaptionExpanded || cap.length <= capTrunc ? cap : `${cap.slice(0, capTrunc)}…`}
                        {cap.length > capTrunc ? (
                          <button
                            type="button"
                            onClick={() => setTheaterCaptionExpanded((ex) => !ex)}
                            className="ml-1 font-semibold text-blue-600 hover:underline"
                          >
                            {theaterCaptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {livePost.tags && livePost.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {livePost.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center justify-between border-t border-[var(--fb-divider)] px-4 py-2.5 text-xs text-[var(--fb-text-secondary)]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--fb-surface)] bg-blue-600">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="tabular-nums text-[13px] text-[var(--fb-text-primary)]">
                        {theaterLikeCount}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="cursor-pointer text-[13px] hover:underline">
                        {livePost.comments?.length || 0} bình luận
                      </span>
                      <span className="cursor-pointer text-[13px] hover:underline">
                        {livePost.shares || 0} chia sẻ
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 border-t border-[var(--fb-divider)] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => toggleEventPostLike(livePost._id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                        theaterLiked
                          ? 'text-blue-600 hover:bg-blue-50'
                          : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${theaterLiked ? 'fill-current' : ''}`} />
                      {theaterLiked ? 'Đã thích' : 'Thích'}
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('theater-comment-input')?.focus()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-gray-200"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Bình luận
                    </button>
                    <button
                      type="button"
                      onClick={() => openShareModalForEventPost(livePost)}
                      disabled={shareSending && String(shareModalPost?._id) === String(livePost._id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Share2 className="h-5 w-5" />
                      {shareSending && String(shareModalPost?._id) === String(livePost._id)
                        ? 'Đang gửi…'
                        : 'Chia sẻ'}
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <PostCommentSection
                      key={String(livePost._id)}
                      user={user}
                      postId={livePost._id}
                      post={livePost}
                      isVisible
                      variant="theater"
                      onClose={() => {}}
                      onUpdatePost={(id, fn) =>
                        setEventDiscussionPosts((prev) =>
                          prev.map((p) => (String(p._id) === String(id) ? fn(p) : p))
                        )
                      }
                      onRequestRefresh={() => {
                        if (event?._id) {
                          setTimeout(() => refreshEventDiscussionPosts(event._id), 1000);
                        }
                      }}
                      onOpenImageTheater={(imgIdx) => openImageTheater(livePost, imgIdx)}
                    />
                                                </div>
                </aside>
                                              </div>
            );
          })(),
          document.body
        )}

      {eventSharePickerIntent &&
        event &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 p-4"
            onClick={() => {
              if (!shareSending) {
                setEventSharePickerIntent(null);
              }
            }}
            role="presentation"
          >
            <div
              className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl ${
                eventSharePickerIntent === 'invite' ? 'max-w-3xl' : 'max-w-md'
              }`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-invite-share-title"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] p-4">
                <h3 id="event-invite-share-title" className="pr-2 text-lg font-bold text-[var(--fb-text-primary)]">
                  {eventSharePickerIntent === 'invite'
                    ? 'Mời bạn bè đến sự kiện này'
                    : 'Chia sẻ tới bạn bè'}
                </h3>
                <button
                  type="button"
                  disabled={shareSending}
                  onClick={() => setEventSharePickerIntent(null)}
                  className="shrink-0 rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
                <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)]">{event.title}</p>
                <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">
                  {formatFbEventDateLine(event.date)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
                                </div>

              {shareFriendsLoading ? (
                <p className="px-4 py-16 text-center text-[var(--fb-text-secondary)]">Đang tải danh sách bạn bè…</p>
              ) : eventSharePickerIntent === 'invite' ? (
                eventInviteFriendsEligible.length === 0 ? (
                  <p className="px-4 py-16 text-center text-[var(--fb-text-secondary)]">
                    {shareFriendsList.length === 0
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
                        onClick={() => setEventSharePickerIntent(null)}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)] disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={shareSending || shareSelectedFriendIds.size === 0}
                        onClick={handleConfirmEventInviteOrShare}
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
                        {shareFriendsList.length === 0
                          ? 'Bạn chưa có bạn bè để gửi.'
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
                        onClick={() => setEventSharePickerIntent(null)}
                        className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={shareSending || shareSelectedFriendIds.size === 0}
                        onClick={handleConfirmEventInviteOrShare}
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

      {shareModalPost &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
            onClick={() => !shareSending && setShareModalPost(null)}
            role="presentation"
          >
            <div
              className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--fb-divider)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-[var(--fb-text-primary)]">Chia sẻ tới bạn bè</h3>
                              </div>
                <button
                  type="button"
                  disabled={shareSending}
                  onClick={() => setShareModalPost(null)}
                  className="rounded-full p-2 text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
                <p className="line-clamp-3 text-xs text-[var(--fb-text-secondary)]">
                  {(shareModalPost.content || '').trim() || '(Không có nội dung text)'}
                </p>
              </div>
              <div className="flex-shrink-0 px-4 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                  <input
                    type="search"
                    value={shareFriendQuery}
                    onChange={(e) => setShareFriendQuery(e.target.value)}
                    placeholder="Tìm bạn bè theo tên hoặc email..."
                    className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)]"
                  />
                </div>
              </div>
              <div className="min-h-[200px] max-h-[320px] flex-1 overflow-y-auto px-2">
                {shareFriendsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : filteredShareFriends.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                    {shareFriendsList.length === 0
                      ? 'Bạn chưa có bạn bè nào. Hãy kết bạn để chia sẻ bài viết.'
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
                              src={
                                f.avatar?.startsWith('/uploads')
                                  ? `http://localhost:5000${f.avatar}`
                                  : f.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || '?')}&background=1877f2&color=fff`
                              }
                              alt=""
                              className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
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
              <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-4 py-3">
                <span className="text-xs text-[var(--fb-text-secondary)]">
                  Đã chọn: {shareSelectedFriendIds.size} người
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={shareSending}
                    onClick={() => setShareModalPost(null)}
                    className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={shareSending || shareSelectedFriendIds.size === 0}
                    onClick={handleConfirmShareEventDiscussion}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {shareSending ? 'Đang gửi…' : 'Chia sẻ'}
                  </button>
        </div>
      </div>
            </div>
          </div>,
          document.body
        )}

      {showEventDiscussionModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowEventDiscussionModal(false)}
            role="presentation"
          >
            <div
              className="w-full max-w-[min(680px,96vw)] overflow-hidden rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--fb-divider)] px-5 py-4">
                <h3 className="text-xl font-bold">Tạo bài viết</h3>
                <button
                  type="button"
                  onClick={() => setShowEventDiscussionModal(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--fb-input)] hover:bg-[var(--fb-hover)]"
                >
                  <X className="h-5 w-5 text-[var(--fb-icon)]" />
                </button>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                    alt={user?.name || ''}
                    className="h-10 w-10 rounded-full"
                    onError={withAvatarFallback(user?.name, '1877f2')}
                  />
                  <div>
                    <div className="text-sm font-semibold">{user?.name || 'Thành viên'}</div>
                    <div className="text-xs text-[var(--fb-text-secondary)]">Đăng trong sự kiện này</div>
                  </div>
                </div>

                <textarea
                  ref={discussionTextareaRef}
                  id="event-discussion-modal-input"
                  value={discussionDraft}
                  onChange={(e) => setDiscussionDraft(e.target.value)}
                  placeholder="Bạn đang nghĩ gì?"
                  className="w-full resize-none rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] p-3 text-[18px] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--fb-text-secondary)]">
                    Loại bài viết
                  </label>
                  <select
                    value={discussionCategory}
                    onChange={(e) => setDiscussionCategory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm text-[var(--fb-text-primary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Học tập">📚 Học tập</option>
                    <option value="Tài liệu">📄 Tài liệu</option>
                    <option value="Thảo luận">💬 Thảo luận</option>
                    <option value="Sự kiện">📅 Sự kiện</option>
                    <option value="Khác">📌 Khác</option>
                  </select>
                </div>

                {discussionImages.length === 0 && discussionFiles.length === 0 ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--fb-text-secondary)]">
                      Nền cho bài viết chữ
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {TEXT_POST_BACKGROUNDS.map((item) => {
                        const active = discussionTextBackground === item.background;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.label}
                            onClick={() => setDiscussionTextBackground(item.background)}
                            className={`h-9 w-9 rounded-full border-2 transition-transform ${
                              active ? 'scale-105 border-blue-500' : 'border-white/70 hover:scale-105'
                            }`}
                            style={{
                              background: item.background || 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {discussionImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {discussionImages.map((img, index) => (
                      <div key={`${img.name}-${index}`} className="group relative">
                        {img.type?.startsWith('video/') ? (
                          <video
                            src={URL.createObjectURL(img)}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-32 w-full rounded-lg bg-black object-cover"
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(img)}
                            alt=""
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeDiscussionImage(index)}
                          className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Xóa"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {discussionFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {discussionFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm"
                      >
                        <span className="truncate text-[var(--fb-text-primary)]" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDiscussionFile(index)}
                          className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--fb-divider)] pt-2">
                  <div className="flex flex-wrap items-center gap-0.5">
                    <input
                      ref={discussionMediaInputRef}
                      type="file"
                      id="event-discussion-modal-gallery-upload"
                      accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/avi,.mp4,.webm,.mov,.mkv,.avi,.m4v,.ogv,.mpeg,.mpg"
                      multiple
                      className="hidden"
                      onChange={handleDiscussionGallerySelect}
                    />
                    <label
                      htmlFor="event-discussion-modal-gallery-upload"
                      className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                      title="Thêm ảnh hoặc video"
                    >
                      <ImageIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Ảnh/Video</span>
                    </label>
                    <input
                      ref={discussionFileInputRef}
                      type="file"
                      id="event-discussion-modal-file-upload"
                      multiple
                      className="hidden"
                      onChange={handleDiscussionDocumentSelect}
                    />
                    <label
                      htmlFor="event-discussion-modal-file-upload"
                      className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                      title="Thêm tệp đính kèm"
                    >
                      <BookOpen className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Tệp đính kèm</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscussionDraft('');
                        setDiscussionCategory('Sự kiện');
                        setDiscussionTextBackground('');
                        setDiscussionImages([]);
                        setDiscussionFiles([]);
                        setShowEventDiscussionModal(false);
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => submitEventDiscussionPost()}
                      disabled={
                        discussionSubmitting ||
                        (!discussionDraft.trim() &&
                          discussionImages.length === 0 &&
                          discussionFiles.length === 0)
                      }
                      className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {discussionSubmitting ? 'Đang đăng…' : 'Đăng'}
                    </button>
                  </div>
                </div>
              </div>
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

export default EventDetailPage;
