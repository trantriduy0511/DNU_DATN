import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Home, Users, BookOpen, Calendar, Bell, Search, MessageCircle, Heart, Share2, Bookmark, MoreHorizontal, Send, Image, Award, TrendingUp, User, Settings, LogOut, Plus, Filter, X, Edit, Trash2, UserPlus, Shield, RefreshCw, Flag, AlertCircle, Lock, Check, FileText, MapPin, Navigation, ExternalLink, Clock, ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, Globe, ChevronDown, Star, CheckCircle, Ban, Tag, Compass, Newspaper, Mail } from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { buildEventShareMessageContent } from '../../utils/eventShareMessage.js';
import { buildGroupShareMessageContent } from '../../utils/groupShareMessage.js';
import { formatTimeAgo } from '../../utils/formatTime';
import { useHomeSavedActionsViewModel } from '../../domains/home/viewmodels/useHomeSavedActionsViewModel';
import { resolveMediaUrl, resolveAvatarUrlWithFallback } from '../../utils/mediaUrl';
import { notify, confirmAsync } from '../../lib/notify';
// Chat overlays are mounted globally in NavigationBar
import OnlineUsers from '../../components/OnlineUsers';
import DocumentAnalyzer from '../../components/DocumentAnalyzer';
import { PostCommentSection } from '../../components/PostCommentSection';
import PostImageGallery from '../../components/PostImageGallery';

function homeEventPid(p) {
  return String(typeof p === 'object' && p != null ? p._id : p);
}

function getHomeUserEventRsvp(event, userId) {
  if (!event || !userId) return null;
  const uid = String(userId);
  if ((event.participants || []).some((p) => homeEventPid(p) === uid)) return 'going';
  if ((event.interestedUsers || []).some((p) => homeEventPid(p) === uid)) return 'interested';
  if ((event.declinedUsers || []).some((p) => homeEventPid(p) === uid)) return 'declined';
  return null;
}

function homeRsvpLabel(rsvp) {
  if (rsvp === 'going') return 'Tham gia';
  if (rsvp === 'interested') return 'Quan tâm';
  if (rsvp === 'declined') return 'Không tham gia';
  return 'Quan tâm';
}

function homeRsvpBtnClass(rsvp) {
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

function formatHomeEventCardDateShort(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('vi-VN', { weekday: 'short' });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const wcap = wd ? wd.charAt(0).toUpperCase() + wd.slice(1) : '';
  return `${wcap}, ${day} tháng ${month}, ${year} lúc ${t}`;
}

function homeEventCardPhase(iso) {
  const now = new Date();
  const date = new Date(iso);
  if (date < now) return 'completed';
  const diffDays = (date - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 'ongoing';
  return 'upcoming';
}

function homeEventCardStatusColor(phase) {
  switch (phase) {
    case 'upcoming':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-300';
    case 'ongoing':
      return 'bg-green-100 text-green-700 dark:bg-green-900/45 dark:text-green-300';
    case 'completed':
      return 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)]';
    default:
      return 'bg-[var(--fb-input)] text-[var(--fb-text-secondary)]';
  }
}

function homeEventCardStatusLabel(phase) {
  switch (phase) {
    case 'upcoming':
      return 'Sắp diễn ra';
    case 'ongoing':
      return 'Đang diễn ra';
    case 'completed':
      return 'Đã kết thúc';
    default:
      return phase;
  }
}

function getHomeEventFriendSocialLine(event, friendsList, currentUserId) {
  if (!friendsList?.length) return null;
  const friendIds = new Set(friendsList.map((f) => String(f._id)));
  const seen = new Set();
  const names = [];
  for (const list of [event.participants, event.interestedUsers]) {
    for (const p of list || []) {
      const id = homeEventPid(p);
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

function isLecturerDocumentAuthor(post) {
  const authorRole = post?.author?.role;
  const authorStudentRole = post?.author?.studentRole;
  return authorRole === 'admin' || authorStudentRole === 'Giảng viên';
}

function isLecturerDocumentPost(post) {
  return post?.category === 'Tài liệu' && isLecturerDocumentAuthor(post);
}

// Giới hạn số ký tự text trước khi hiện "Xem thêm" để mọi bài viết không tràn quá viewport.
const POST_TEXT_PREVIEW_LIMIT = 360;

function PostContentText({ content, postId }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [postId, content]);

  const raw = typeof content === 'string' ? content : '';
  const isLong = raw.length > POST_TEXT_PREVIEW_LIMIT;
  const display = !expanded && isLong ? `${raw.slice(0, POST_TEXT_PREVIEW_LIMIT).trimEnd()}…` : raw;

  return (
    <div>
      <p className="text-[var(--fb-text-primary)] text-[15px] leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">
        {display}
        {isLong && !expanded ? ' ' : null}
        {isLong && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="ml-1 text-sm font-semibold text-[var(--fb-text-secondary)] hover:underline"
          >
            Xem thêm
          </button>
        )}
      </p>
      {isLong && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-sm font-semibold text-[var(--fb-text-secondary)] hover:underline"
        >
          Thu gọn
        </button>
      )}
    </div>
  );
}

const UserHome = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize activeTab from URL to prevent flash
  const getInitialTab = () => {
    if (location.pathname === '/home' || location.pathname === '/') {
      const tab = searchParams.get('tab');
      if (tab && ['groups', 'events', 'documents', 'friends'].includes(tab)) {
        return tab;
      }
    }
    return 'home';
  };
  
  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [groupsSubTab, setGroupsSubTab] = useState('myGroups'); // 'feed' | 'myGroups' | 'explore'
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [savedPosts, setSavedPosts] = useState(new Set());
  const searchTimeoutRef = useRef(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTextBackground, setNewPostTextBackground] = useState('');
  const [showHomePostModal, setShowHomePostModal] = useState(false);
  const [homePostSubmitting, setHomePostSubmitting] = useState(false);
  const homePostSubmittingRef = useRef(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostCategory, setNewPostCategory] = useState('Khác');
  const [newPostImages, setNewPostImages] = useState([]); // Lưu File objects
  const [newPostFiles, setNewPostFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [exploreSearchQuery, setExploreSearchQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('Tất cả');
  const [exploreSortBy, setExploreSortBy] = useState('popular');
  const [exploreLoading, setExploreLoading] = useState(false);
  const [myGroupsSearchQuery, setMyGroupsSearchQuery] = useState('');
  const [groupsSortBy, setGroupsSortBy] = useState('recent');
  const [groupCardMenuId, setGroupCardMenuId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const groupsCacheRef = useRef({ data: null, timestamp: 0 });
  const fetchDataRef = useRef(() => Promise.resolve());
  const CACHE_DURATION = 30000; // 30 seconds
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [showComments, setShowComments] = useState(new Set());
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [friendsHubTab, setFriendsHubTab] = useState('requests'); // requests | all
  const [friendsHubLoading, setFriendsHubLoading] = useState(false);
  const [friendsHubRequests, setFriendsHubRequests] = useState([]);
  const [friendsHubAll, setFriendsHubAll] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [groupChatsLoading, setGroupChatsLoading] = useState(false);
  
  // Group management states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    avatar: '📚',
    category: 'Học tập'
  });
  const groupCreateAvatarInputRef = useRef(null);
  const [groupCreateAvatarFile, setGroupCreateAvatarFile] = useState(null);
  const [groupCreateAvatarPreview, setGroupCreateAvatarPreview] = useState(null);
  const [groupSettingsForm, setGroupSettingsForm] = useState({
    name: '',
    description: '',
    avatar: '',
    coverPhoto: '',
    category: 'Học tập',
    tags: [],
    rules: '',
    settings: {
      accessType: 'public',
      postPermission: 'all-members',
      commentPermission: 'all-members',
      allowFileUpload: true,
      allowMemberInvite: true
    }
  });
  const [groupSettingsCoverFile, setGroupSettingsCoverFile] = useState(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  
  // Group posts states
  const [groupPosts, setGroupPosts] = useState([]);
  const [loadingGroupPosts, setLoadingGroupPosts] = useState(false);
  const [newGroupPostContent, setNewGroupPostContent] = useState('');
  const [newGroupPostImages, setNewGroupPostImages] = useState([]); // Lưu File objects
  const [newGroupPostFiles, setNewGroupPostFiles] = useState([]);
  const [showGroupPostForm, setShowGroupPostForm] = useState(false);

  // Event management states
  const [homeRsvpMenuEventId, setHomeRsvpMenuEventId] = useState(null);
  const [eventTabFriends, setEventTabFriends] = useState([]);
  const [eventFilter, setEventFilter] = useState('all'); // all, upcoming, ongoing, completed
  
  // Saved posts modal
  const [showSavedPostsModal, setShowSavedPostsModal] = useState(false);
  const [savedPostsList, setSavedPostsList] = useState([]);
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);
  
  /** Xem ảnh kiểu theater: { post, imageIndex } */
  const [imageTheater, setImageTheater] = useState(null);
  const [theaterCaptionExpanded, setTheaterCaptionExpanded] = useState(false);
  const [theaterPostMenuOpen, setTheaterPostMenuOpen] = useState(false);
  /** Phóng to ảnh trong theater (giống Facebook — chỉ ảnh tĩnh) */
  const [postTheaterZoom, setPostTheaterZoom] = useState(1);
  const postTheaterPanRef = useRef(null);
  const postTheaterPanGestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    downTarget: null,
  });

  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  
  // Report post states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('Spam');
  const [likesModalPost, setLikesModalPost] = useState(null);
  const [likesModalUsers, setLikesModalUsers] = useState([]);
  const [likesModalLoading, setLikesModalLoading] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState(null);
  const [currentTrendingTag, setCurrentTrendingTag] = useState(null);
  /** Modal chia sẻ bài viết tới bạn bè */
  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareFriendsList, setShareFriendsList] = useState([]);
  const [shareFriendsLoading, setShareFriendsLoading] = useState(false);
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareFriendQuery, setShareFriendQuery] = useState('');
  const [shareSending, setShareSending] = useState(false);

  const [homeEventMoreMenuId, setHomeEventMoreMenuId] = useState(null);
  const [homeEventShareModalEvent, setHomeEventShareModalEvent] = useState(null);
  const [homeEventShareModalIntent, setHomeEventShareModalIntent] = useState('share');
  const [homeEventShareSelectedIds, setHomeEventShareSelectedIds] = useState(() => new Set());
  const [homeEventShareQuery, setHomeEventShareQuery] = useState('');
  const [homeEventShareSending, setHomeEventShareSending] = useState(false);

  const [homeGroupShareModalGroup, setHomeGroupShareModalGroup] = useState(null);
  const [homeGroupShareSelectedIds, setHomeGroupShareSelectedIds] = useState(() => new Set());
  const [homeGroupShareQuery, setHomeGroupShareQuery] = useState('');
  const [homeGroupShareSending, setHomeGroupShareSending] = useState(false);
  const [homeGroupShareFriendsLoading, setHomeGroupShareFriendsLoading] = useState(false);

  const {
    savedCollections,
    saveCollectionModalPostId,
    setSaveCollectionModalPostId,
    saveCollectionChoice,
    setSaveCollectionChoice,
    newSaveCollectionName,
    setNewSaveCollectionName,
    toggleSave,
    openSaveToCollectionModal,
    createSaveCollectionInModal,
    confirmSaveToCollection
  } = useHomeSavedActionsViewModel(savedPosts, setSavedPosts);

  const filteredShareFriends = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return shareFriendsList;
    return shareFriendsList.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [shareFriendsList, shareFriendQuery]);

  const filteredHomeEventShareFriends = useMemo(() => {
    const q = homeEventShareQuery.trim().toLowerCase();
    if (!q) return eventTabFriends;
    return eventTabFriends.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [eventTabFriends, homeEventShareQuery]);

  const filteredHomeGroupShareFriends = useMemo(() => {
    const q = homeGroupShareQuery.trim().toLowerCase();
    if (!q) return eventTabFriends;
    return eventTabFriends.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [eventTabFriends, homeGroupShareQuery]);
  
  // Edit post states
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostCategory, setEditPostCategory] = useState('Khác');
  const [editPostTags, setEditPostTags] = useState([]);
  const [editPostTagInput, setEditPostTagInput] = useState('');
  const [editPostImages, setEditPostImages] = useState([]); // Existing images (URLs)
  const [editPostNewImages, setEditPostNewImages] = useState([]); // New images (File objects)
  const [editPostFiles, setEditPostFiles] = useState([]); // Existing files
  const [editPostNewFiles, setEditPostNewFiles] = useState([]); // New files (File objects)
  
  // Profile editing has been moved to Profile (name/major) and Settings (password)

  const navigate = useNavigate();
  const { user, token, logout, updateUser, checkAuth } = useAuthStore();
  const isInitialMount = useRef(true);
  const canPostLecturerDocuments =
    user?.role === 'admin' || String(user?.studentRole || '').trim() === 'Giảng viên';

  const homeEventInviteFriendsEligible = useMemo(() => {
    const ev = homeEventShareModalEvent;
    if (!ev || homeEventShareModalIntent !== 'invite') return [];
    const going = new Set((ev.participants || []).map(homeEventPid));
    const interested = new Set((ev.interestedUsers || []).map(homeEventPid));
    const uid = String(user?.id || user?._id || '');
    return eventTabFriends.filter((f) => {
      const id = String(f._id);
      if (!id || id === uid) return false;
      if (going.has(id) || interested.has(id)) return false;
      return true;
    });
  }, [eventTabFriends, homeEventShareModalEvent, homeEventShareModalIntent, user?.id, user?._id]);

  const homeEventInviteFriendsFiltered = useMemo(() => {
    const q = homeEventShareQuery.trim().toLowerCase();
    if (!q) return homeEventInviteFriendsEligible;
    return homeEventInviteFriendsEligible.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [homeEventInviteFriendsEligible, homeEventShareQuery]);

  const selectedHomeEventInviteFriendsPanel = useMemo(
    () =>
      [...homeEventShareSelectedIds]
        .map((sid) => eventTabFriends.find((f) => String(f._id) === sid))
        .filter(Boolean),
    [homeEventShareSelectedIds, eventTabFriends]
  );

  useEffect(() => {
    const fetchRequestsCount = async () => {
      try {
        const res = await api.get('/friends/requests');
        const requests = res.data?.requests || [];
        setFriendRequestsCount(Array.isArray(requests) ? requests.length : 0);
      } catch {
        setFriendRequestsCount(0);
      }
    };

    fetchRequestsCount();
    // Auto-refresh disabled: only refresh when user triggers actions manually.
  }, []);

  const fetchGroupChats = useCallback(async () => {
    try {
      setGroupChatsLoading(true);
      const res = await api.get('/messages/conversations');
      const conversations = res.data?.conversations || [];
      const groups = conversations.filter((c) => c?.type === 'group');
      setGroupChats(groups);
    } catch {
      setGroupChats([]);
    } finally {
      setGroupChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupChats();

    const refreshGroupChats = () => {
      fetchGroupChats();
    };

    window.addEventListener('chatGroupsUpdated', refreshGroupChats);
    window.addEventListener('messagesUpdated', refreshGroupChats);
    return () => {
      window.removeEventListener('chatGroupsUpdated', refreshGroupChats);
      window.removeEventListener('messagesUpdated', refreshGroupChats);
    };
  }, [fetchGroupChats]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const videos = Array.from(document.querySelectorAll('video[data-scroll-autoplay="true"]'));
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(() => {});
            }
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );

    videos.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [posts, activeTab]);

  const resolveAvatarUrl = (avatar, name, background = '1877f2') => {
    return resolveAvatarUrlWithFallback(avatar, name, background);
  };

  const withAvatarFallback = (name, background = '1877f2') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  const openLikesModal = async (post) => {
    if (!post?._id) return;
    setLikesModalPost(post);
    setLikesModalUsers([]);
    setLikesModalLoading(true);
    try {
      const likes = Array.isArray(post.likes) ? post.likes : [];
      const inlineUsers = likes
        .map((like) => (typeof like === 'object' && like?._id ? like : null))
        .filter(Boolean);
      const inlineIds = new Set(inlineUsers.map((u) => String(u._id)));
      const missingIds = likes
        .map((like) => (typeof like === 'object' ? like?._id : like))
        .filter(Boolean)
        .map(String)
        .filter((id) => !inlineIds.has(id));

      if (missingIds.length === 0) {
        setLikesModalUsers(inlineUsers);
        return;
      }

      const fetched = await Promise.allSettled(missingIds.map((id) => api.get(`/users/${id}`)));
      const fetchedUsers = fetched
        .map((r) => (r.status === 'fulfilled' ? r.value?.data?.user : null))
        .filter(Boolean);
      setLikesModalUsers([...inlineUsers, ...fetchedUsers]);
    } catch (error) {
      console.error('Error loading liked users:', error);
      setLikesModalUsers([]);
    } finally {
      setLikesModalLoading(false);
    }
  };

  // Sync activeTab with URL query params (only on mount or when URL changes externally)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const friendsTabParam = searchParams.get('friendsTab');
    if (location.pathname === '/home' || location.pathname === '/') {
      if (tab && ['groups', 'events', 'documents', 'friends'].includes(tab)) {
        if (tab === 'documents') {
          setSelectedCategory('Tài liệu');
          setCurrentTrendingTag(null);
        } else if (tab === 'friends') {
          setFriendsHubTab(friendsTabParam === 'all' ? 'all' : 'requests');
        }
        if (activeTab !== tab) {
          // Instant scroll (no smooth) to prevent flicker
          window.scrollTo({ top: 0, behavior: 'auto' });
          setActiveTab(tab);
        }
      } else if (!tab) {
        // If no tab param, default to 'home'
        if (activeTab !== 'home') {
          window.scrollTo({ top: 0, behavior: 'auto' });
          setActiveTab('home');
        }
      }
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [searchParams, location.pathname]); // Removed activeTab from deps to avoid loop

  useEffect(() => {
    // Only fetch data when tab changes or filters change, not on every render
    if (activeTab) {
      fetchData();
    }
    // Refresh user data when switching tabs to ensure latest permissions
    if (activeTab === 'documents') {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCategory, eventFilter, currentTrendingTag, groupsSubTab, myGroupsSearchQuery]);

  // Refresh user data once on mount.
  useEffect(() => {
    const refreshUserData = async () => {
      await checkAuth();
    };
    
    refreshUserData();
    // Auto-refresh disabled: only refresh when user triggers actions manually.
  }, []);
  
  // Auto-refresh disabled globally for this page.
  useEffect(() => {
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCategory, eventFilter, currentTrendingTag]);

  useEffect(() => {
    // Load saved posts status when component mounts
    const loadSavedPostsStatus = async () => {
      try {
        const res = await api.get('/posts/saved');
        const saved = new Set();
        res.data.posts?.forEach(post => {
          saved.add(post._id);
        });
        setSavedPosts(saved);
      } catch (error) {
        console.error('Error loading saved posts status:', error);
      }
    };
    loadSavedPostsStatus();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const ids = e?.detail?.postIds;
      if (!Array.isArray(ids)) return;
      setSavedPosts(new Set(ids));
    };
    window.addEventListener('savedPostsChanged', handler);
    return () => window.removeEventListener('savedPostsChanged', handler);
  }, []);

  // Mở /home?post=<id> → cuộn tới đúng bài (sau khi danh sách đã có dữ liệu)
  const shareScrollState = useRef({ param: null, completed: false });
  const shareFetchState = useRef({ param: null, requested: false });
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId !== shareFetchState.current.param) {
      shareFetchState.current = { param: postId, requested: false };
    }
    if (!postId || shareFetchState.current.requested) return;
    if (posts.some((p) => String(p._id) === String(postId))) return;
    shareFetchState.current.requested = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/posts/${postId}`);
        const sharedPost = res.data?.post;
        if (!sharedPost || cancelled) return;
        setPosts((prev) => {
          if (prev.some((p) => String(p._id) === String(postId))) return prev;
          return [sharedPost, ...prev];
        });
      } catch (error) {
        // Nếu không tìm thấy bài thì bỏ qua để không phá flow chat
        console.error('Cannot load shared post by id:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, posts]);

  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId !== shareScrollState.current.param) {
      shareScrollState.current = { param: postId, completed: false };
    }
    if (!postId || shareScrollState.current.completed) return;
    if (!posts.some((p) => String(p._id) === String(postId))) return;
    shareScrollState.current.completed = true;
    const t = window.setTimeout(() => {
      document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
    return () => window.clearTimeout(t);
  }, [searchParams, posts]);

  useEffect(() => {
    const urlPid = searchParams.get('post');
    const th = imageTheater;
    if (th?.post?._id) {
      const p = th.post;
      window.dispatchEvent(
        new CustomEvent('chatAISetPostContext', {
          detail: { postId: String(p._id), title: (p.title || '').trim() || 'Bài viết' }
        })
      );
      return;
    }
    if (urlPid) {
      const p = posts.find((x) => String(x._id) === String(urlPid));
      window.dispatchEvent(
        new CustomEvent('chatAISetPostContext', {
          detail: { postId: urlPid, title: (p?.title || '').trim() || 'Bài viết' }
        })
      );
      return;
    }
    window.dispatchEvent(new CustomEvent('chatAISetPostContext', { detail: { postId: null, title: '' } }));
  }, [imageTheater, searchParams, posts]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('chatAISetPostContext', { detail: { postId: null, title: '' } }));
    };
  }, []);

  // Saved posts modal is mounted globally with NavigationBar now.

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


  useEffect(() => {
    if (!imageTheater) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [imageTheater]);

  useEffect(() => {
    if (!imageTheater) return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        const g = postTheaterPanGestureRef.current;
        if (g && typeof g.detachWindowPan === 'function') {
          g.detachWindowPan();
          g.detachWindowPan = null;
        }
        g.active = false;
        g.pointerId = null;
        postTheaterPanRef.current?.classList.remove('cursor-grabbing');
        setPostTheaterZoom(1);
        postTheaterPanRef.current?.scrollTo(0, 0);
        setImageTheater(null);
        setTheaterPostMenuOpen(false);
        return;
      }
      const imgs = (imageTheater.post?.images || []).filter((x) => typeof x === 'string');
      if (imgs.length <= 1) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setImageTheater((t) => {
          if (!t) return t;
          const list = (t.post?.images || []).filter((x) => typeof x === 'string');
          const n = list.length;
          if (n <= 1) return t;
          return { ...t, imageIndex: (t.imageIndex - 1 + n) % n };
        });
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
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
    const g = postTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    postTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setPostTheaterZoom(1);
    postTheaterPanRef.current?.scrollTo(0, 0);
  }, [imageTheater?.post?._id, imageTheater?.imageIndex]);
  
  // Close post options dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPostOptions && !event.target.closest('.post-options-container')) {
        setShowPostOptions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPostOptions]);

  const fetchData = async () => {
    // Only set main loading for initial load or tab changes that need full reload
    if (activeTab === 'home' || activeTab === 'events' || activeTab === 'friends') {
    setLoading(true);
    }
    try {
      if (activeTab === 'home') {
        const isLecturerDocsCategory = selectedCategory === 'Tài liệu giảng viên';
        const params = {
          category:
            selectedCategory === 'Tất cả'
              ? undefined
              : isLecturerDocsCategory
                ? 'Tài liệu'
                : selectedCategory,
          // Chỉ lọc theo xu hướng khi đang ở tab "Tất cả"
          search: selectedCategory === 'Tất cả' ? currentTrendingTag || undefined : undefined
        };
        const res = await api.get('/posts', {
          params: {
            ...params,
            limit: 40,
            /** Bảng tin: bài cá nhân từ mình / bạn bè / người theo dõi + bài nhóm đã tham gia + bài sự kiện đã tham gia (backend gộp; danh mục chỉ lọc bài cá nhân) */
            personalScope: user?.role === 'admin' ? undefined : 'network'
          }
        });
        const homePosts = isLecturerDocsCategory
          ? (res.data.posts || []).filter(isLecturerDocumentPost)
          : (res.data.posts || []);
        setPosts(homePosts);
        
        // Initialize liked posts from backend data
        const liked = new Set();
        homePosts.forEach(post => {
          if (post.likes?.includes(user?.id)) {
            liked.add(post._id);
          }
        });
        setLikedPosts(liked);
      } else if (activeTab === 'documents') {
        setPosts([]);
        setLikedPosts(new Set());
      } else if (activeTab === 'groups') {
        // Check cache first
        const now = Date.now();
        const cache = groupsCacheRef.current;
        
        if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
          // Use cached data - no loading needed
          setGroups(cache.data);
          setGroupsLoading(false);
        } else {
          // Show loading immediately if no cache
          if (!cache.data) {
            setGroupsLoading(true);
          }
          
        // Load joined groups directly from backend.
        // This prevents missing private groups that are not returned by default /groups.
        const myGroupsRes = await api.get('/groups', { params: { joined: true } });
        const myJoinedGroups = myGroupsRes.data.groups || [];
          
          // Update cache
          groupsCacheRef.current = {
            data: myJoinedGroups,
            timestamp: now
          };
          
        setGroups(myJoinedGroups);
          setGroupsLoading(false);
        }
        
        // Only fetch discover groups if we're on explore tab and haven't loaded them yet
        // This avoids unnecessary API calls
        if (groupsSubTab === 'explore' && discoverGroups.length === 0) {
          const discoverRes = await api.get('/groups/discover');
          setDiscoverGroups(discoverRes.data.groups || []);
        }
        if (groupsSubTab === 'feed') {
          const res = await api.get('/posts', {
            params: {
              groupFeedOnly: true,
              search: myGroupsSearchQuery || undefined
            }
          });
          setPosts(res.data.posts || []);
        }

        // Danh sách bạn bè cho modal "Chia sẻ nhóm" / chia sẻ sự kiện (trước đây chỉ tải ở tab Sự kiện)
        try {
          const friendsRes = await api.get('/friends').catch(() => ({ data: { friends: [] } }));
          setEventTabFriends(friendsRes.data.friends || []);
        } catch {
          setEventTabFriends([]);
        }
      } else if (activeTab === 'events') {
        const params = eventFilter !== 'all' ? { status: eventFilter } : {};
        const [eventsRes, friendsRes] = await Promise.all([
          api.get('/events', { params }),
          api.get('/friends').catch(() => ({ data: { friends: [] } }))
        ]);
        setEvents(eventsRes.data.events || []);
        setEventTabFriends(friendsRes.data.friends || []);
      } else if (activeTab === 'friends') {
        await fetchFriendsHubData();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
    setGroupsLoading(false);
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    const onUserGroupsChanged = () => {
      groupsCacheRef.current = { data: null, timestamp: 0 };
      fetchDataRef.current?.();
    };
    const onGroupHomeFeedPrefChanged = () => {
      fetchDataRef.current?.();
    };
    const onPostDeleted = (event) => {
      const postId = String(event?.detail?.postId || '');
      if (!postId) return;
      setPosts((prev) => prev.filter((post) => String(post._id) !== postId));
      setGroupPosts((prev) => prev.filter((post) => String(post._id) !== postId));
      setSavedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    };
    window.addEventListener('userGroupsChanged', onUserGroupsChanged);
    window.addEventListener('groupHomeFeedPrefChanged', onGroupHomeFeedPrefChanged);
    window.addEventListener('postDeleted', onPostDeleted);
    return () => {
      window.removeEventListener('userGroupsChanged', onUserGroupsChanged);
      window.removeEventListener('groupHomeFeedPrefChanged', onGroupHomeFeedPrefChanged);
      window.removeEventListener('postDeleted', onPostDeleted);
    };
  }, []);
  
  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setLastRefreshTime(Date.now());
    setTimeout(() => setIsRefreshing(false), 500); // Show animation for 500ms
  };

  const toggleLike = async (postId) => {
    const newLiked = new Set(likedPosts);
    
    try {
      if (newLiked.has(postId)) {
        await api.delete(`/posts/${postId}/like`);
        newLiked.delete(postId);
      } else {
        await api.post(`/posts/${postId}/like`);
        newLiked.add(postId);
      }
      setLikedPosts(newLiked);
      
      // Update post in state
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: newLiked.has(postId)
              ? [...(post.likes || []), user.id]
              : (post.likes || []).filter(id => id !== user.id)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const openShareModal = async (post) => {
    if (!post?._id) return;
    setShareModalPost(post);
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    setShareFriendsLoading(true);
    try {
      const res = await api.get('/friends');
      setShareFriendsList(res.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      notify(error.response?.data?.message || 'Không tải được danh sách bạn bè');
      setShareModalPost(null);
    } finally {
      setShareFriendsLoading(false);
    }
  };

  const toggleShareFriendSelect = (friendId) => {
    const id = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmShareToFriends = async () => {
    if (!shareModalPost?._id) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) {
      notify('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const postId = shareModalPost._id;
    const postUrl = `${window.location.origin}/home?post=${postId}`;
    const raw = (shareModalPost.content || '').trim();
    const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
    const messageText = `${user?.name || 'Một người bạn'} đã chia sẻ bài viết với bạn:\n\n${preview ? `“${preview}”\n\n` : ''}Xem tại: ${postUrl}`;

    setShareSending(true);
    try {
      for (const friendId of ids) {
        const convRes = await api.get(`/messages/conversation/${friendId}`);
        const cid = convRes.data?.conversation?._id;
        if (!cid) continue;
        const fd = new FormData();
        fd.append('content', messageText);
        await api.post(`/messages/${cid}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      const shareRes = await api.post(`/posts/${postId}/share`);
      const sharesCount = shareRes.data?.sharesCount;
      if (typeof sharesCount === 'number') {
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, shares: sharesCount } : p))
        );
      }
      const n = ids.length;
      setShareModalPost(null);
      setShareSelectedFriendIds(new Set());
      notify(`Đã gửi tới ${n} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Share to friends failed:', error);
      notify(error.response?.data?.message || 'Không thể chia sẻ. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  const fetchSavedPosts = async () => {
    setLoadingSavedPosts(true);
    try {
      const res = await api.get('/posts/saved');
      setSavedPostsList(res.data.posts || []);
      
      // Update savedPosts set
      const saved = new Set();
      res.data.posts?.forEach(post => {
        saved.add(post._id);
      });
      setSavedPosts(saved);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
    setLoadingSavedPosts(false);
  };

  const handleOpenSavedPosts = () => {
    window.dispatchEvent(new CustomEvent('openSavedPosts'));
  };

  const resolvePostImageSrc = (src) => {
    if (!src || typeof src !== 'string') return '';
    return resolveMediaUrl(src);
  };

  const openImageTheater = (post, imageIndex = 0) => {
    const imgs = (post?.images || []).filter((x) => typeof x === 'string');
    if (!post || imgs.length === 0) return;
    const n = imgs.length;
    const idx = Math.min(Math.max(0, imageIndex), n - 1);
    setTheaterCaptionExpanded(false);
    setTheaterPostMenuOpen(false);
    setPostTheaterZoom(1);
    setImageTheater({ post, imageIndex: idx });
    requestAnimationFrame(() => {
      postTheaterPanRef.current?.scrollTo(0, 0);
    });
  };

  const closeImageTheater = () => {
    const g = postTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    postTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setPostTheaterZoom(1);
    postTheaterPanRef.current?.scrollTo(0, 0);
    setImageTheater(null);
    setTheaterPostMenuOpen(false);
  };

  const handleDownloadFile = (file) => {
    const link = document.createElement('a');
    const fileUrl = String(file?.url || '').trim();
    const fileName = String(file?.name || 'document').trim() || 'document';

    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      link.href = `/api/files/download-url?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`;
      link.target = '_blank';
    } else {
      link.href = fileUrl || '#';
      link.download = fileName;
    }
    link.click();
  };

  const handleOpenReportModal = (post) => {
    setReportingPost(post);
    setShowReportModal(true);
    setShowPostOptions(null);
  };
  
  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      notify('Vui lòng nhập lý do báo cáo');
      return;
    }
    
    try {
      await api.post('/reports', {
        postId: reportingPost._id,
        category: reportCategory,
        reason: reportReason
      });
      
      notify('✅ Đã gửi báo cáo. Chúng tôi sẽ xem xét trong thời gian sớm nhất.');
      setShowReportModal(false);
      setReportingPost(null);
      setReportReason('');
      setReportCategory('Spam');
    } catch (error) {
      console.error('Error submitting report:', error);
      notify('❌ Lỗi gửi báo cáo: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewPostImages([...newPostImages, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewPostFiles([...newPostFiles, ...files]);
  };

  const removeImage = (index) => {
    setNewPostImages(newPostImages.filter((_, i) => i !== index));
  };

  const removeFile = (index) => {
    setNewPostFiles(newPostFiles.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    const text = newPostContent.trim();
    const hasMedia = newPostImages.length > 0 || newPostFiles.length > 0;
    if (!text && !hasMedia) return;
    if (homePostSubmittingRef.current) return;
    if (newPostCategory === 'Tài liệu' && !canPostLecturerDocuments) {
      notify('Chỉ Giảng viên hoặc Admin mới được đăng bài trong mục Tài liệu giảng viên');
      return;
    }
    homePostSubmittingRef.current = true;
    setHomePostSubmitting(true);
    try {
        // Tạo FormData để upload file
        const formData = new FormData();
        formData.append('content', text);
        formData.append('category', newPostCategory);
        formData.append('tags', JSON.stringify([]));
        if (newPostTextBackground && !hasMedia) {
          formData.append('textBackground', newPostTextBackground);
        }
        
        // Thêm ảnh vào FormData
        newPostImages.forEach((file) => {
          formData.append('images', file);
        });
        
        // Thêm files vào FormData (upload files thực sự)
        newPostFiles.forEach((file) => {
          formData.append('files', file);
        });

        const res = await api.post('/posts', formData);
        
        // Show success message
        notify('✅ ' + res.data.message);
        
        // Clear form
        setNewPostContent('');
        setNewPostCategory('Khác');
        setNewPostImages([]);
        setNewPostFiles([]);
        setNewPostTextBackground('');
        setShowNewPost(false);
        setShowHomePostModal(false);
        
        // Refresh posts
        fetchData();
    } catch (error) {
      console.error('Error posting:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      notify('Lỗi đăng bài viết: ' + errorMessage);
    } finally {
      homePostSubmittingRef.current = false;
      setHomePostSubmitting(false);
    }
  };

  const handleOpenEditPost = (post) => {
    setEditingPost(post);
    setEditPostContent(post.content || '');
    setEditPostCategory(post.category || 'Khác');
    setEditPostTags(post.tags || []);
    setEditPostTagInput('');
    setEditPostImages(post.images || []);
    setEditPostNewImages([]);
    setEditPostFiles(post.files || []);
    setEditPostNewFiles([]);
    setShowEditPostModal(true);
  };

  const handleCloseEditPost = () => {
    setShowEditPostModal(false);
    setEditingPost(null);
    setEditPostContent('');
    setEditPostCategory('Khác');
    setEditPostTags([]);
    setEditPostTagInput('');
    setEditPostImages([]);
    setEditPostNewImages([]);
    setEditPostFiles([]);
    setEditPostNewFiles([]);
  };

  const handleAddEditTag = () => {
    if (editPostTagInput.trim() && !editPostTags.includes(editPostTagInput.trim())) {
      setEditPostTags([...editPostTags, editPostTagInput.trim()]);
      setEditPostTagInput('');
    }
  };

  const handleRemoveEditTag = (tagToRemove) => {
    setEditPostTags(editPostTags.filter(tag => tag !== tagToRemove));
  };

  const handleRemoveEditImage = (indexToRemove) => {
    setEditPostImages(editPostImages.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveEditNewImage = (indexToRemove) => {
    setEditPostNewImages(editPostNewImages.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveEditFile = (indexToRemove) => {
    setEditPostFiles(editPostFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveEditNewFile = (indexToRemove) => {
    setEditPostNewFiles(editPostNewFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleUpdatePost = async () => {
    if (!editPostContent.trim()) {
      notify('Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      // Tạo FormData để upload file
      const formData = new FormData();
      formData.append('content', editPostContent.trim());
      formData.append('category', editPostCategory);
      formData.append('tags', JSON.stringify(editPostTags));
      
      // Giữ lại images cũ (URLs)
      if (editPostImages.length > 0) {
        formData.append('existingImages', JSON.stringify(editPostImages));
      }
      
      // Thêm ảnh mới vào FormData
      editPostNewImages.forEach((file) => {
        formData.append('images', file);
      });
      
      // Giữ lại files cũ
      if (editPostFiles.length > 0) {
        formData.append('existingFiles', JSON.stringify(editPostFiles));
      }
      
      // Thêm files mới vào FormData
      editPostNewFiles.forEach((file) => {
        formData.append('files', file);
      });

      await api.put(`/posts/${editingPost._id}`, formData);
      
      notify('✅ Đã cập nhật bài viết thành công!');
      handleCloseEditPost();
      fetchData();
    } catch (error) {
      console.error('Error updating post:', error);
      notify('❌ Lỗi cập nhật bài viết: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!(await confirmAsync('Bạn có chắc chắn muốn xóa bài viết này?'))) {
      return;
    }

    try {
      await api.delete(`/posts/${postId}`);
      notify('✅ Đã xóa bài viết thành công!');
      
      // Remove post from state
      setPosts(posts.filter(post => post._id !== postId));
      
      // Remove from group posts if exists
      setGroupPosts(groupPosts.filter(post => post._id !== postId));
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId } }));
      
      // Close post options if open
      setShowPostOptions(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      notify('❌ Lỗi xóa bài viết: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const res = await api.post(`/groups/${groupId}/join`);
      if (res.data.success) {
        // Fetch the joined group details
        const groupRes = await api.get(`/groups/${groupId}`);
        const joinedGroup = groupRes.data.group;
        
        // Add to my groups
        setGroups(prev => {
          // Check if already exists
          if (prev.some(g => g._id === groupId)) {
            return prev;
          }
          return [...prev, joinedGroup];
        });
        
        // Remove from discover groups
        setDiscoverGroups(prev => prev.filter(g => g._id !== groupId));
        
        notify('Đã tham gia nhóm thành công!');
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi tham gia nhóm');
    }
  };

  const handleLeaveGroupFromCard = async (groupId) => {
    if (!groupId) return;
    if (!(await confirmAsync('Bạn có chắc muốn rời nhóm này?'))) return;
    try {
      await api.post(`/groups/${groupId}/leave`);
      setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
      setGroupCardMenuId(null);
      window.dispatchEvent(new CustomEvent('userGroupsChanged'));
      fetchData();
      notify('Đã rời nhóm!');
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi rời nhóm');
    }
  };

  const fetchFriendsHubData = useCallback(async () => {
    setFriendsHubLoading(true);
    try {
      const [requestsRes, friendsRes] = await Promise.all([
        api.get('/friends/requests').catch(() => ({ data: { requests: [] } })),
        api.get('/friends').catch(() => ({ data: { friends: [] } }))
      ]);
      const requests = requestsRes.data?.requests || [];
      const friends = friendsRes.data?.friends || [];
      setFriendsHubRequests(requests);
      setFriendsHubAll(friends);
      setFriendRequestsCount(Array.isArray(requests) ? requests.length : 0);
    } finally {
      setFriendsHubLoading(false);
    }
  }, []);

  const openFriendsHub = (tab = 'requests') => {
    setFriendsHubTab(tab);
    handleTabChange('friends', { friendsSubTab: tab === 'all' ? 'all' : 'requests' });
  };

  const handleAcceptFriendRequestFromHub = async (fromUserId) => {
    try {
      await api.put(`/friends/accept/${fromUserId}`);
      await fetchFriendsHubData();
      window.dispatchEvent(new CustomEvent('messagesUpdated'));
    } catch (error) {
      notify(error.response?.data?.message || 'Không thể chấp nhận lời mời');
    }
  };

  const handleRejectFriendRequestFromHub = async (fromUserId) => {
    try {
      await api.put(`/friends/reject/${fromUserId}`);
      await fetchFriendsHubData();
    } catch (error) {
      notify(error.response?.data?.message || 'Không thể từ chối lời mời');
    }
  };

  const handleOpenChatWithFriend = async (friendId) => {
    try {
      const res = await api.get(`/messages/conversation/${friendId}`);
      const conversationId = res.data?.conversation?._id;
      if (!conversationId) return;
      window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId } }));
    } catch (error) {
      notify(error.response?.data?.message || 'Không thể mở cuộc trò chuyện');
    }
  };

  const handleToggleGroupHomeFeedFollow = async (groupId, nextShowOnHomeFeed) => {
    if (!groupId) return;
    try {
      await api.patch(`/groups/${groupId}/home-feed`, { showOnHomeFeed: nextShowOnHomeFeed });
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(groupId)
            ? { ...g, homeFeedHiddenFromHome: !nextShowOnHomeFeed }
            : g
        )
      );
      if (groupsSubTab === 'feed') {
        await fetchData();
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Không thể cập nhật theo dõi feed nhóm');
    }
  };

  const handleSetHomeEventRsvp = async (eventId, status, e) => {
    e?.stopPropagation?.();
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      setHomeRsvpMenuEventId(null);
      await fetchData();
    } catch (error) {
      notify(error.response?.data?.message || 'Không cập nhật được phản hồi');
    }
  };

  useEffect(() => {
    if (!homeRsvpMenuEventId) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-home-rsvp-menu]')) return;
      setHomeRsvpMenuEventId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [homeRsvpMenuEventId]);

  useEffect(() => {
    if (!homeEventMoreMenuId) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-home-event-more-root]')) return;
      setHomeEventMoreMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [homeEventMoreMenuId]);

  const handleOpenEventDetail = (event) => {
    if (!event?._id) return;
    navigate(`/events/${event._id}`);
  };

  const openHomeEventShareModal = (e, event, intent = 'share') => {
    e.stopPropagation();
    setHomeEventShareModalIntent(intent === 'invite' ? 'invite' : 'share');
    setHomeEventShareModalEvent(event);
    setHomeEventShareSelectedIds(new Set());
    setHomeEventShareQuery('');
  };

  const toggleHomeEventShareFriendSelect = (friendId) => {
    const id = String(friendId);
    setHomeEventShareSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeHomeEventShareFriendSelection = (friendId) => {
    const id = String(friendId);
    setHomeEventShareSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleHomeGroupShareFriendSelect = (friendId) => {
    const id = String(friendId);
    setHomeGroupShareSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openHomeGroupShareFromCard = (group) => {
    if (!group?._id) return;
    setGroupCardMenuId(null);
    setHomeGroupShareModalGroup(group);
    setHomeGroupShareSelectedIds(new Set());
    setHomeGroupShareQuery('');
    setHomeGroupShareFriendsLoading(true);
    void (async () => {
      try {
        const friendsRes = await api.get('/friends').catch(() => ({ data: { friends: [] } }));
        setEventTabFriends(friendsRes.data.friends || []);
      } catch {
        setEventTabFriends([]);
      } finally {
        setHomeGroupShareFriendsLoading(false);
      }
    })();
  };

  const handleConfirmHomeGroupShare = async () => {
    if (!homeGroupShareModalGroup?._id) return;
    const ids = [...homeGroupShareSelectedIds];
    if (ids.length === 0) {
      notify('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const grp = homeGroupShareModalGroup;
    setHomeGroupShareSending(true);
    try {
      const shareContent = buildGroupShareMessageContent(grp);
      for (const friendId of ids) {
        const convRes = await api.get(`/messages/conversation/${friendId}`);
        const cid = convRes.data?.conversation?._id;
        if (!cid) continue;
        const fd = new FormData();
        fd.append('content', shareContent);
        await api.post(`/messages/${cid}`, fd);
      }
      setHomeGroupShareModalGroup(null);
      setHomeGroupShareSelectedIds(new Set());
      setHomeGroupShareQuery('');
      setHomeGroupShareFriendsLoading(false);
      notify(`Đã gửi nhóm tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Home group share failed:', error);
      notify(error.response?.data?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setHomeGroupShareSending(false);
    }
  };

  const handleConfirmHomeEventShareOrInvite = async () => {
    if (!homeEventShareModalEvent?._id) return;
    const ids = [...homeEventShareSelectedIds];
    if (ids.length === 0) {
      notify('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    const ev = homeEventShareModalEvent;
    setHomeEventShareSending(true);
    try {
      if (homeEventShareModalIntent === 'invite') {
        const res = await api.post(`/events/${ev._id}/invite-notify`, {
          recipientIds: ids,
        });
        const sent = res.data?.sentCount ?? ids.length;
        setHomeEventShareModalEvent(null);
        setHomeEventShareSelectedIds(new Set());
        setHomeEventShareModalIntent('share');
        notify(res.data?.message || `Đã gửi ${sent} lời mời.`);
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
      setHomeEventShareModalEvent(null);
      setHomeEventShareSelectedIds(new Set());
      setHomeEventShareModalIntent('share');
      notify(`Đã gửi sự kiện tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Home event share/invite failed:', error);
      notify(error.response?.data?.message || 'Không thể hoàn tất. Vui lòng thử lại.');
    } finally {
      setHomeEventShareSending(false);
    }
  };

  const openGoogleMaps = (location, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!location) return;
    const encodedLocation = encodeURIComponent(location);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
    window.open(mapsUrl, '_blank');
  };

  // Group management functions
  const resetGroupCreateModalExtras = () => {
    setGroupCreateAvatarFile(null);
    setGroupCreateAvatarPreview(null);
    if (groupCreateAvatarInputRef.current) groupCreateAvatarInputRef.current.value = '';
  };

  const handleGroupCreateAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify('Ảnh không được vượt quá 10MB');
      e.target.value = '';
      return;
    }
    setGroupCreateAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setGroupCreateAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreateGroup = async () => {
    try {
      const fd = new FormData();
      fd.append('name', groupForm.name.trim());
      fd.append('description', (groupForm.description || '').trim());
      fd.append('category', groupForm.category);
      fd.append('avatar', groupForm.avatar || '📚');
      if (groupCreateAvatarFile) {
        fd.append('images', groupCreateAvatarFile);
      }
      const res = await api.post('/groups', fd);
      setShowCreateGroupModal(false);
      resetGroupCreateModalExtras();
      setGroupForm({
        name: '',
        description: '',
        avatar: '📚',
        category: 'Học tập'
      });
      fetchData();
      notify(res.data?.message || 'Đã gửi yêu cầu tạo nhóm. Nhóm của bạn đang chờ admin duyệt.');
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi tạo nhóm');
    }
  };

  const handleOpenGroupDetail = async (group) => {
    // Navigate directly to group detail page
    // GroupDetail component will handle fetching data
    navigate(`/groups/${group._id}`);
  };

  const handleOpenGroupSettings = async (initialTab = 'general') => {
    if (!selectedGroup) return;
    
    // Fetch latest group data to ensure we have the most up-to-date info
    try {
      const res = await api.get(`/groups/${selectedGroup._id}`);
      const latestGroup = res.data.group;
      
      const rawAv = latestGroup.avatar || '📚';
      const avIsUrl =
        typeof rawAv === 'string' &&
        (rawAv.startsWith('http') || rawAv.startsWith('/uploads'));
      setGroupSettingsForm({
        name: latestGroup.name || '',
        description: latestGroup.description || '',
        avatar: avIsUrl ? '📚' : rawAv,
        coverPhoto: latestGroup.coverPhoto || (avIsUrl ? rawAv : ''),
        category: latestGroup.category || 'Học tập',
        tags: latestGroup.tags || [],
        rules: latestGroup.rules || '',
        settings: {
          accessType: latestGroup.settings?.accessType || 'public',
          postPermission: latestGroup.settings?.postPermission || 'all-members',
          commentPermission: latestGroup.settings?.commentPermission || 'all-members',
          allowFileUpload: latestGroup.settings?.allowFileUpload !== false,
          allowMemberInvite: latestGroup.settings?.allowMemberInvite !== false
        }
      });
      
      // Update selectedGroup with latest data
      setSelectedGroup(latestGroup);
      
      setGroupSettingsCoverFile(null);
      const cr = latestGroup.creator?._id || latestGroup.creator;
      const uid = user?.id || user?._id;
      const openAsCreator = String(cr) === String(uid);
      const safeTab =
        initialTab === 'appearance' && !openAsCreator ? 'general' : initialTab;
      setActiveSettingsTab(safeTab);
      setShowGroupSettingsModal(true);
    } catch (error) {
      console.error('Error fetching group data:', error);
      notify('Không thể tải thông tin nhóm');
    }
  };

  const handleSaveGroupSettings = async () => {
    if (!selectedGroup) return;

    // Validation
    if (!groupSettingsForm.name || !groupSettingsForm.name.trim()) {
      notify('Tên nhóm không được để trống');
      return;
    }

    if (groupSettingsForm.name.length > 100) {
      notify('Tên nhóm không được vượt quá 100 ký tự');
      return;
    }

    if (groupSettingsForm.description && groupSettingsForm.description.length > 500) {
      notify('Mô tả không được vượt quá 500 ký tự');
      return;
    }

    if (groupSettingsForm.rules && groupSettingsForm.rules.length > 2000) {
      notify('Nội quy không được vượt quá 2000 ký tự');
      return;
    }

    // Validate tags
    if (Array.isArray(groupSettingsForm.tags) && groupSettingsForm.tags.length > 10) {
      notify('Tối đa 10 tags');
      return;
    }

    try {
      const creatorId =
        selectedGroup.creator?._id != null
          ? String(selectedGroup.creator._id)
          : String(selectedGroup.creator);
      const uid = user?.id || user?._id;
      const selectedIsGroupCreator = String(creatorId) === String(uid);

      const formData = new FormData();
      
      // Add text fields
      formData.append('name', groupSettingsForm.name.trim());
      formData.append('description', (groupSettingsForm.description || '').trim());
      formData.append('category', groupSettingsForm.category);
      formData.append('rules', (groupSettingsForm.rules || '').trim());
      
      // Một ảnh nhóm + emoji — chỉ người tạo nhóm (backend cũng chặn)
      if (selectedIsGroupCreator) {
        if (groupSettingsCoverFile) {
          if (groupSettingsCoverFile.size > 5 * 1024 * 1024) {
            notify('Ảnh nhóm không được vượt quá 5MB');
            return;
          }
          formData.append('images', groupSettingsCoverFile);
        }
        if (
          groupSettingsForm.avatar &&
          !groupSettingsForm.avatar.startsWith('http') &&
          !groupSettingsForm.avatar.startsWith('/uploads/')
        ) {
          formData.append('avatarEmoji', groupSettingsForm.avatar);
        }
        if (groupSettingsForm.coverPhoto !== undefined) {
          formData.append('coverPhoto', groupSettingsForm.coverPhoto || '');
        }
      }
      
      // Add tags
      if (Array.isArray(groupSettingsForm.tags)) {
        // Filter and limit tags
        const validTags = groupSettingsForm.tags
          .filter(tag => tag && tag.trim() && tag.length <= 20)
          .slice(0, 10)
          .map(tag => tag.trim());
        formData.append('tags', JSON.stringify(validTags));
      } else if (typeof groupSettingsForm.tags === 'string') {
        formData.append('tags', groupSettingsForm.tags);
      }
      
      // Add settings
      formData.append('settings', JSON.stringify(groupSettingsForm.settings));

      const res = await api.put(`/groups/${selectedGroup._id}/settings`, formData);

      // Fetch updated group data
      const updatedGroupRes = await api.get(`/groups/${selectedGroup._id}`);
      const updatedGroup = updatedGroupRes.data.group;
      
      // Update selected group
      setSelectedGroup(updatedGroup);
      
      // Refresh groups list
      const groupsRes = await api.get('/groups');
      setGroups(groupsRes.data.groups || []);
      
      // Reset file states
      setGroupSettingsCoverFile(null);
      
      // Close settings modal
      setShowGroupSettingsModal(false);
      
      notify('Cập nhật cài đặt nhóm thành công!');
    } catch (error) {
      console.error('Error updating group settings:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi cập nhật cài đặt nhóm';
      notify(errorMessage);
    }
  };
  
  const fetchGroupPosts = async (groupId) => {
    setLoadingGroupPosts(true);
    try {
      const res = await api.get(`/groups/${groupId}/posts`);
      setGroupPosts(res.data.posts || []);
    } catch (error) {
      console.error('Error fetching group posts:', error);
    }
    setLoadingGroupPosts(false);
  };
  
  const handleCreateGroupPost = async () => {
    if (!newGroupPostContent.trim() || !selectedGroup) return;
    
    try {
      // Tạo FormData để upload file
      const formData = new FormData();
      formData.append('content', newGroupPostContent);
      
      // Thêm ảnh vào FormData
      newGroupPostImages.forEach((file) => {
        formData.append('images', file);
      });
      
      // Thêm files vào FormData (upload files thực sự)
      newGroupPostFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      const res = await api.post(`/groups/${selectedGroup._id}/posts`, formData);
      
      // Add new post to the list
      setGroupPosts([res.data.post, ...groupPosts]);
      
      // Clear form
      setNewGroupPostContent('');
      setNewGroupPostImages([]);
      setNewGroupPostFiles([]);
      setShowGroupPostForm(false);
      
      notify('✅ Đã đăng bài trong nhóm!');
    } catch (error) {
      console.error('Error creating group post:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message;
      const debugInfo = error.response?.data?.debug;
      
      if (debugInfo) {
        console.log('Debug info:', debugInfo);
      }
      
      notify('❌ Lỗi đăng bài: ' + errorMsg);
    }
  };
  
  const handleGroupPostImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewGroupPostImages(prev => [...prev, ...files]);
  };
  
  const handleGroupPostFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewGroupPostFiles(prev => [...prev, ...files]);
  };
  
  const removeGroupPostImage = (index) => {
    setNewGroupPostImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeGroupPostFile = (index) => {
    setNewGroupPostFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const res = await api.get(`/users/search?q=${query}`);
      setSearchUsers(res.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/invites`, { userId });
      notify(res.data?.message || 'Đã gửi lời mời tham gia nhóm');
      setShowAddMemberModal(false);
      setUserSearchQuery('');
      setSearchUsers([]);
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!(await confirmAsync('Bạn có chắc muốn xóa thành viên này khỏi nhóm?'))) {
      return;
    }

    try {
      const res = await api.delete(`/groups/${selectedGroup._id}/members/${memberId}`);
      setGroupMembers(res.data.members || []);
      notify('Đã xóa thành viên khỏi nhóm!');
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi xóa thành viên');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      const res = await api.put(`/groups/${selectedGroup._id}/members/${memberId}`, { role: newRole });
      setGroupMembers(res.data.members || []);
      notify('Đã cập nhật vai trò thành viên!');
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi cập nhật vai trò');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!(await confirmAsync('Bạn có chắc muốn xóa nhóm này? Hành động này không thể hoàn tác!'))) {
      return;
    }

    try {
      await api.delete(`/groups/${groupId}`);
      setShowGroupDetailModal(false);
      setSelectedGroup(null);
      fetchData();
      notify('Đã xóa nhóm thành công!');
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi xóa nhóm');
    }
  };

  const toggleComments = (postId) => {
    const newShowComments = new Set(showComments);
    if (newShowComments.has(postId)) {
      newShowComments.delete(postId);
    } else {
      newShowComments.add(postId);
    }
    setShowComments(newShowComments);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query || query.trim().length < 2) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setShowSearchResults(true);
    setSearchLoading(true);

    // Debounce search - wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(async () => {
      let allResults = [];

      try {
        // Search posts
        try {
          const postsRes = await api.get('/posts', { params: { search: query.trim(), limit: 5, status: 'approved' } });
          if (postsRes.data?.posts && Array.isArray(postsRes.data.posts)) {
            allResults.push(...postsRes.data.posts.map(p => ({ ...p, type: 'post' })));
          }
        } catch (error) {
          console.error('Error searching posts:', error);
          // Continue with other searches
        }

        // Search users
        try {
          const usersRes = await api.get('/users/search', { params: { q: query.trim(), limit: 5 } });
          if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
            allResults.push(...usersRes.data.users.map(u => ({ ...u, type: 'user' })));
          }
        } catch (error) {
          console.error('Error searching users:', error);
          // Continue with other searches
        }

        // Search groups
        try {
          const groupsRes = await api.get('/groups', { params: { search: query.trim(), limit: 5 } });
          if (groupsRes.data?.groups && Array.isArray(groupsRes.data.groups)) {
            allResults.push(...groupsRes.data.groups.map(g => ({ ...g, type: 'group' })));
          }
        } catch (error) {
          console.error('Error searching groups:', error);
          // Continue with other searches
        }

        setSearchResults(allResults);
      } catch (error) {
        console.error('Error in search:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce
  };

  const handleSearchResultClick = (result, e) => {
    // Prevent navigation if clicking on action buttons
    if (e?.target?.closest('.search-action-button')) {
      return;
    }
    
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (result.type === 'user') {
      // Navigate to user profile
      navigate(`/profile/${result._id || result.id}`);
    } else if (result.type === 'group') {
      handleTabChange('groups');
    } else if (result.type === 'post') {
      handleTabChange('home');
      // Could scroll to specific post if needed
    }
  };

  const handleQuickAddFriend = async (userId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/friends/request/${userId}`);
      notify('✅ Đã gửi lời mời kết bạn');
      // Update search results to reflect the change
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
      setShowSearchResults(false);
      setSearchQuery('');
      // Open chat window
      window.dispatchEvent(new CustomEvent('openChat', { 
        detail: { conversationId: res.data.conversation._id } 
      }));
    } catch (error) {
      console.error('Error starting chat:', error);
      notify('Lỗi khi mở chat');
    }
  };


  const postAttachmentUrl = (file) => {
    const raw = file.url || '';
    return resolveMediaUrl(raw);
  };

  const isPostAttachmentVideo = (file) => {
    const mime = file.mimeType || '';
    const name = file.name || '';
    const raw = file.url || '';
    if (mime.startsWith('video/')) return true;
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(raw);
  };

  const isPostGalleryMediaVideo = (src) => {
    if (!src || typeof src !== 'string') return false;
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(src);
  };

  const videoPreviewSrc = (src) => {
    if (!src || typeof src !== 'string') return '';
    return src.includes('#') ? src : `${src}#t=0.1`;
  };

  const renderPostCard = (post) => (
    <div
      id={`post-${String(post._id)}`}
      className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] max-lg:rounded-none max-lg:border-0 max-lg:shadow-none rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden max-lg:hover:shadow-none lg:hover:shadow-md transition-shadow scroll-mt-24"
    >
      {/* Header — cùng lề ngang với nội dung trên mobile */}
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-3 sm:py-3">
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0 hover:bg-[var(--fb-hover)] -mx-3 px-3 py-1.5 rounded-lg transition-colors"
          onClick={() => navigate(`/profile/${post.author?._id}`)}
        >
          <img
            src={
              post.author?.avatar
                ? resolveMediaUrl(post.author.avatar)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=1877f2&color=fff`
            }
            alt={post.author?.name}
            className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-[var(--fb-divider)]"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--fb-text-primary)] hover:underline text-[15px] leading-tight">{post.author?.name}</h3>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--fb-text-secondary)] mt-0.5">
              <span>{formatTimeAgo(post.createdAt)}</span>
              {post.updatedAt && new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime() && (
                <>
                  <span>•</span>
                  <span className="text-[var(--fb-text-secondary)] opacity-80 italic" title={`Đã chỉnh sửa ${formatTimeAgo(post.updatedAt)}`}>
                    Đã chỉnh sửa
                  </span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center text-blue-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {post.category}
              </span>
              {post.group && (post.group._id || post.group) ? (
                <>
                  <span className="text-[var(--fb-text-secondary)]/70">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const gid = post.group?._id || post.group;
                      if (gid) navigate(`/groups/${gid}`);
                    }}
                    className="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] hover:text-[var(--fb-text-primary)]"
                    title="Mở nhóm"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                    <span className="truncate">{post.group?.name || 'Nhóm'}</span>
                  </button>
                </>
              ) : null}
              {post.event && (post.event._id || post.event) ? (
                <>
                  <span className="text-[var(--fb-text-secondary)]/70">•</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const eid = post.event?._id || post.event;
                      if (eid) navigate(`/events/${eid}`);
                    }}
                    className="inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] hover:text-[var(--fb-text-primary)]"
                    title="Mở sự kiện"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                    <span className="truncate">{post.event?.title || 'Sự kiện'}</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
        
        {/* Post Options Dropdown */}
        <div className="relative post-options-container">
          <button 
            onClick={() => setShowPostOptions(showPostOptions === post._id ? null : post._id)}
            className="p-2 hover:bg-[var(--fb-hover)] rounded-full transition-colors"
          >
          <MoreHorizontal className="w-5 h-5 text-[var(--fb-icon)]" />
          </button>
          
          {showPostOptions === post._id && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-xl border border-[var(--fb-divider)] z-50 py-1 overflow-hidden">
              <button
                onClick={() => {
                  setShowPostOptions(null);
                  openSaveToCollectionModal(post._id);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-amber-50 transition-colors text-amber-700"
              >
                <Bookmark className={`w-4 h-4 ${savedPosts.has(post._id) ? 'fill-current' : ''}`} />
                <span className="font-medium">{savedPosts.has(post._id) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
              </button>
              {/* Chỉ hiển thị nút xóa nếu user là tác giả của bài viết */}
              {/* Convert cả hai về string để so sánh chính xác */}
              {(() => {
                const postAuthorId = post.author?._id || post.author;
                const currentUserId = user?.id || user?._id;
                const isOwner = String(postAuthorId) === String(currentUserId);
                
                // Debug: Uncomment để kiểm tra
                // console.log('Post author ID:', postAuthorId, 'Current user ID:', currentUserId, 'Is owner:', isOwner);
                
                return (
                  <>
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setShowPostOptions(null);
                            handleOpenEditPost(post);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-blue-50 transition-colors text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="font-medium">Sửa bài viết</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowPostOptions(null);
                            handleDeletePost(post._id);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="font-medium">Xóa bài viết</span>
                        </button>
                      </>
                    )}
                    {!isOwner && (
                      <button
                        onClick={() => {
                          setShowPostOptions(null);
                          handleOpenReportModal(post);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600"
                      >
                        <Flag className="w-4 h-4" />
                        <span className="font-medium">Báo cáo bài viết</span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Nội dung chữ + hashtag (lề khớp header); ảnh/gallery full viền bên dưới */}
      <div className="px-3 pb-2 pt-0 sm:px-4 sm:pb-3">
        {post.textBackground && (!post.images || post.images.length === 0) && (!post.files || post.files.length === 0) ? (
          <div
            className={`w-full min-h-[200px] sm:min-h-[260px] md:min-h-[320px] max-h-[55vh] overflow-y-auto rounded-xl px-4 sm:px-5 py-6 sm:py-8 flex items-center justify-center text-center text-xl sm:text-2xl md:text-[29px] font-semibold leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] ${isDarkBackground(post.textBackground) ? 'text-white' : 'text-[var(--fb-text-primary)]'}`}
            style={{ background: post.textBackground }}
          >
            {post.content}
          </div>
        ) : (
          <PostContentText content={post.content} postId={post._id} />
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.map((tag, index) => (
              <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 cursor-pointer transition-colors">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Images — bố cục kiểu Facebook (3 ảnh: 1 lớn + 2 nhỏ; không ô trống) */}
      {post.images && post.images.length > 0 && (
        <PostImageGallery
          images={post.images}
          resolveUrl={(raw) => resolveMediaUrl(raw)}
          isVideo={isPostGalleryMediaVideo}
          videoPreviewSrc={videoPreviewSrc}
          onCellClick={(index) => openImageTheater(post, index)}
          galleryVideoMode="controls"
        />
      )}

      {/* Files / video đính kèm — video tràn ngang mobile (bù padding); file trong lề */}
      {post.files && post.files.length > 0 && (
        <div className="space-y-2 px-3 pb-2 sm:px-4 sm:pb-3">
          <div className="space-y-2">
            {post.files.map((file, index) =>
              isPostAttachmentVideo(file) ? (
                <div key={index} className="w-full max-lg:-mx-3 max-lg:w-[calc(100%+1.5rem)] sm:mx-0 sm:w-full">
                  <video
                    src={videoPreviewSrc(postAttachmentUrl(file))}
                    controls
                    playsInline
                    preload="metadata"
                    data-scroll-autoplay="true"
                    className="h-auto w-full max-h-[min(55vh,500px)] max-lg:max-h-[min(60vh,560px)] bg-black object-contain max-lg:rounded-none sm:rounded-lg"
                  />
                </div>
              ) : (
                <div key={index} className="flex w-full items-center justify-between rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] p-3 transition-colors hover:bg-[var(--fb-hover)]">
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fb-text-primary)] break-words leading-5">{file.name || 'Document'}</p>
                      <p className="text-xs text-[var(--fb-text-secondary)]">{file.size || 'Unknown size'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-blue-600 text-white rounded-lg hover:from-orange-600 hover:to-blue-700 transition-all text-sm font-medium flex items-center space-x-1 flex-shrink-0 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Tải về</span>
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Thống kê + hành động — một khối liền, một viền mỏng giữa hai hàng (kiểu Facebook) */}
      <div className="border-t border-[var(--fb-divider)] max-lg:bg-[var(--fb-input)]/35 max-lg:dark:bg-[var(--fb-input)]/20">
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[var(--fb-text-secondary)] sm:px-4 sm:py-2">
          <button
            type="button"
            onClick={() => openLikesModal(post)}
            className="text-[13px] hover:underline"
          >
            {(post.likes?.length || 0) + (likedPosts.has(post._id) && !post.likes?.includes(user?.id) ? 1 : 0)} lượt thích
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => toggleComments(post._id)}
              className="text-[13px] hover:underline"
            >
              {post.comments?.length || 0} bình luận
            </button>
            <button
              type="button"
              onClick={() => openShareModal(post)}
              disabled={shareSending && shareModalPost?._id === post._id}
              className="text-[13px] hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              {post.shares || 0} chia sẻ
            </button>
          </div>
        </div>

        <div className="flex items-center justify-around border-t border-[var(--fb-divider)] px-0.5 py-0.5 sm:px-2">
          <button
            onClick={() => toggleLike(post._id)}
            className={`flex flex-1 items-center justify-center space-x-2 rounded-md px-2 py-1.5 transition-colors max-lg:rounded-none sm:px-4 sm:py-2 sm:rounded-lg ${
              likedPosts.has(post._id)
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
            }`}
          >
            <Heart className={`h-5 w-5 shrink-0 ${likedPosts.has(post._id) ? 'fill-current' : ''}`} />
            <span className="text-sm font-semibold">{likedPosts.has(post._id) ? 'Đã thích' : 'Thích'}</span>
          </button>
          <button
            onClick={() => toggleComments(post._id)}
            className={`flex flex-1 items-center justify-center space-x-2 rounded-md px-2 py-1.5 transition-colors max-lg:rounded-none sm:px-4 sm:py-2 sm:rounded-lg ${
              showComments.has(post._id)
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
            }`}
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">Bình luận</span>
          </button>
          <button
            type="button"
            onClick={() => openShareModal(post)}
            disabled={shareSending && shareModalPost?._id === post._id}
            title="Chia sẻ bài viết tới bạn bè"
            className="flex flex-1 items-center justify-center space-x-2 rounded-md px-2 py-1.5 text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)] max-lg:rounded-none disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:py-2 sm:rounded-lg"
          >
            <Share2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">
              {shareSending && shareModalPost?._id === post._id ? 'Đang gửi…' : 'Chia sẻ'}
            </span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <PostCommentSection
        user={user}
        postId={post._id}
        post={post}
        isVisible={showComments.has(post._id)}
        onClose={() => toggleComments(post._id)}
        onUpdatePost={(id, fn) =>
          setPosts((prev) => prev.map((p) => (p._id === id ? fn(p) : p)))
        }
        onRequestRefresh={() => {
          setTimeout(() => fetchData(), 1000);
        }}
        onOpenImageTheater={(idx) => openImageTheater(post, idx)}
      />
    </div>
  );

  const renderHome = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 max-w-7xl mx-auto px-0 sm:px-2 lg:px-4">
      {/* Left Sidebar - Facebook Style */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-20 space-y-4">
          {/* User Profile Card - Facebook Style */}
          <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:bg-[var(--fb-hover)] -mx-4 px-4 py-2 rounded-lg transition-colors"
                onClick={() => navigate(`/profile/${user?.id}`)}
              >
                <img
                  src={
                    user?.avatar
                      ? resolveMediaUrl(user.avatar)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1877f2&color=fff`
                  }
                  alt={user?.name}
                  className="w-12 h-12 rounded-full border-2 border-[var(--fb-divider)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--fb-text-primary)] truncate text-[15px]">{user?.name}</p>
                  <p className="text-xs text-[var(--fb-text-secondary)] truncate">{user?.studentRole || user?.major}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shortcuts - Facebook Style */}
          <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
            <div className="p-3">
              <div className="space-y-0.5">
            <button 
              onClick={() => {
                setSelectedCategory('Tài liệu');
                setCurrentTrendingTag(null);
                handleTabChange('documents');
              }}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
            >
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
                <span className="text-sm font-medium text-[var(--fb-text-primary)]">Phân tích tài liệu</span>
            </button>
            <button 
              onClick={() => handleTabChange('groups')}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
            >
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="w-5 h-5 text-green-600" />
              </div>
                <span className="text-sm font-medium text-[var(--fb-text-primary)]">Nhóm học tập</span>
            </button>
            <button 
              onClick={() => {
                openFriendsHub('requests');
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-[var(--fb-text-primary)]">Bạn bè</span>
              </div>
              {friendRequestsCount > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                  {friendRequestsCount > 99 ? '99+' : friendRequestsCount}
                </span>
              )}
            </button>
            <button 
              onClick={handleOpenSavedPosts}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
            >
                  <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <Bookmark className="w-5 h-5 text-yellow-600" />
              </div>
                <span className="text-sm font-medium text-[var(--fb-text-primary)]">Đã lưu</span>
            </button>
              <button 
                onClick={() => navigate('/events')}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
              >
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Calendar className="w-5 h-5 text-purple-600" />
          </div>
                <span className="text-sm font-medium text-[var(--fb-text-primary)]">Sự kiện</span>
              </button>
              </div>
        </div>
      </div>
        </div>
      </aside>

      {/* Main Feed - Facebook Style (~680px max readable width, full width on small screens) */}
      <div className="lg:col-span-6">
        <div className="mx-auto flex w-full max-w-[min(100%,760px)] flex-col lg:gap-2 2xl:max-w-[820px]">
        <div className="flex min-w-0 flex-col max-lg:divide-y max-lg:divide-[var(--fb-divider)] max-lg:overflow-hidden max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm lg:contents">
        {/* New Post - Facebook Style */}
        <div className="overflow-hidden border border-[var(--fb-divider)] bg-[var(--fb-surface)] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none lg:rounded-lg lg:shadow-sm">
          <div className="p-3 sm:p-4">
          <div className="flex items-center space-x-3">
              <img
                src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                alt={user?.name}
                className="w-10 h-10 rounded-full cursor-pointer"
                onError={withAvatarFallback(user?.name, '1877f2')}
                onClick={() => navigate(`/profile/${user?.id}`)}
              />
            <button
              type="button"
              onClick={async () => {
                try {
                  await checkAuth();
                } catch {
                  /* bỏ qua — vẫn mở modal */
                }
                setShowHomePostModal(true);
              }}
                className="flex-1 text-left px-4 py-2.5 bg-[var(--fb-input)] rounded-full text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors text-[15px]"
            >
              Bạn đang nghĩ gì?
            </button>
          </div>
          </div>
        </div>

        {/* Filter - Facebook Style */}
        <div className="overflow-hidden border border-[var(--fb-divider)] bg-[var(--fb-surface)] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none lg:rounded-lg lg:shadow-sm">
          <div className="flex items-center space-x-1 p-1.5 sm:p-2 overflow-x-auto scrollbar-hide">
            {['Tất cả', 'Học tập', 'Sự kiện', 'Thảo luận', 'Tài liệu', 'Tài liệu giảng viên'].map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  if (category === 'Tất cả') {
                    setCurrentTrendingTag(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="bg-[var(--fb-surface)] py-12 text-center max-lg:bg-transparent lg:rounded-lg lg:border lg:border-[var(--fb-divider)] lg:shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-[var(--fb-text-secondary)]">Đang tải...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-12 text-center max-lg:border-0 max-lg:bg-transparent lg:rounded-lg lg:shadow-sm">
            <div className="w-16 h-16 bg-[var(--fb-input)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-[var(--fb-icon)] opacity-70" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--fb-text-primary)] mb-2">Chưa có bài viết nào</h3>
            <p className="text-[var(--fb-text-secondary)] text-sm">Hãy là người đầu tiên chia sẻ!</p>
          </div>
        ) : (
          posts.map((post) => (
            <React.Fragment key={post._id}>{renderPostCard(post)}</React.Fragment>
          ))
        )}
        </div>
        </div>
      </div>

      {/* Right Sidebar - Facebook Style */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-20 space-y-4">
          {/* Contacts */}
          <OnlineUsers variant="contacts" />

          {/* Group chats */}
          <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <h3 className="font-semibold text-[var(--fb-text-primary)] text-[15px]">Nhóm chat</h3>
              <button
                className="p-2 hover:bg-[var(--fb-hover)] rounded-full transition-colors"
                title="Tạo nhóm chat"
                onClick={() => window.dispatchEvent(new CustomEvent('openCreateGroupChat'))}
              >
                <Plus className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
            </div>
            <div className="border-t border-[var(--fb-divider)]">
              {groupChatsLoading ? (
                <div className="p-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : groupChats.length === 0 ? (
                <div className="p-4 text-sm text-[var(--fb-text-secondary)]">Chưa có nhóm chat.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {groupChats.slice(0, 12).map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId: c._id } }))}
                      className="w-full p-3 border-b border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors flex items-center gap-3 text-left"
                      title={c.name}
                    >
                      <div className="w-9 h-9 rounded-full bg-[var(--fb-input)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {c.avatar && (String(c.avatar).startsWith('http') || String(c.avatar).startsWith('/uploads')) ? (
                          <img
                            src={resolveMediaUrl(c.avatar)}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{c.avatar || '👥'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--fb-text-primary)] truncate">{c.name || 'Nhóm chat'}</div>
                        {c.lastMessage?.createdAt && (
                          <div className="text-xs text-[var(--fb-text-secondary)] truncate">
                            {formatTimeAgo(c.lastMessage.createdAt)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const handleExploreSearch = async () => {
    setExploreLoading(true);
    try {
      const params = {
        search: exploreSearchQuery || undefined,
        category: exploreCategory !== 'Tất cả' ? exploreCategory : undefined,
        sortBy: exploreSortBy,
        limit: 20
      };
      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      const res = await api.get('/groups/discover', { params });
      setDiscoverGroups(res.data.groups || []);
    } catch (error) {
      console.error('Error searching groups:', error);
    }
    setExploreLoading(false);
  };

  // Fetch explore groups when switching to explore tab
  useEffect(() => {
    if (activeTab === 'groups' && groupsSubTab === 'explore') {
      handleExploreSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsSubTab, activeTab]);
  
  // Fetch explore groups when filters change (only if on explore tab)
  useEffect(() => {
    if (activeTab === 'groups' && groupsSubTab === 'explore') {
      // Debounce search query changes
      const timeoutId = setTimeout(() => {
        handleExploreSearch();
      }, exploreSearchQuery ? 500 : 0); // Wait 500ms after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreCategory, exploreSortBy, exploreSearchQuery]);

  useEffect(() => {
    if (!groupCardMenuId) return;
    const onDoc = (e) => {
      if (!e.target.closest?.('[data-group-card-menu]')) setGroupCardMenuId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [groupCardMenuId]);

  const userIsMemberOfGroup = useCallback(
    (group) => {
      if (!group?._id) return false;
      const uid = String(user?.id || user?._id || '');
      if (!uid) return false;
      if (groups.some((g) => String(g._id) === String(group._id))) return true;
      const members = group.members;
      if (Array.isArray(members)) {
        return members.some((m) => {
          if (m == null) return false;
          const id = typeof m === 'object' && m._id != null ? String(m._id) : String(m);
          return id === uid;
        });
      }
      return false;
    },
    [user, groups]
  );

  const renderGroups = () => {
    const mediaForGroup = (group) => {
      const coverRaw = group.coverPhoto;
      const coverUrl = resolveMediaUrl(coverRaw);
      const av = group.avatar;
      const legacyAvatarUrl = resolveMediaUrl(av);
      const heroUrl = coverUrl || legacyAvatarUrl;
      const emoji =
        typeof av === 'string' &&
        av &&
        !av.startsWith('http') &&
        !av.startsWith('/uploads')
          ? av
          : null;
      return { heroUrl, emoji };
    };

    const qMy = (myGroupsSearchQuery || '').trim().toLowerCase();
    let filteredMy = groups;
    if (qMy) {
      filteredMy = groups.filter(
        (g) =>
          (g.name || '').toLowerCase().includes(qMy) ||
          (g.description || '').toLowerCase().includes(qMy) ||
          (g.tags || []).some((t) => String(t).toLowerCase().includes(qMy))
      );
    }
    const sortedMyGroups = [...filteredMy].sort((a, b) => {
      if (groupsSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' });
      }
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    const sidebarJoinedPreview = [...groups]
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 12);

    const goMyGroups = () => {
      setGroupCardMenuId(null);
      setGroupsSubTab('myGroups');
    };
    const goFeed = () => {
      setGroupCardMenuId(null);
      setGroupsSubTab('feed');
    };
    const goExplore = () => {
      setGroupCardMenuId(null);
      setGroupsSubTab('explore');
      if (discoverGroups.length === 0) handleExploreSearch();
    };

    const navBtn = (active, onClick, Icon, label) => (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors ${
          active
            ? 'bg-[#E7F3FF] text-[#1877F2] dark:bg-blue-900/35 dark:text-blue-200'
            : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-input)]'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-90" />
        {label}
      </button>
    );

    /** Tab ngang (mobile) — kiểu Facebook, tránh danh sách dọc dài */
    const navTabMobile = (active, onClick, Icon, label) => (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap ${
          active
            ? 'bg-[#E7F3FF] text-[#1877F2] dark:bg-blue-900/35 dark:text-blue-200'
            : 'bg-[var(--fb-input)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" />
        {label}
      </button>
    );

    return (
      <div className="mx-auto max-w-7xl px-0 pb-6 sm:px-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-4 max-lg:gap-0">
          <div className="flex flex-col overflow-hidden max-lg:divide-y max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm lg:contents">
          <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-[300px] xl:w-[320px]">
            <div className="rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3 shadow-sm max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[22px] font-bold text-[var(--fb-text-primary)]">Nhóm</h2>
              </div>

              <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:hidden">
                {navTabMobile(groupsSubTab === 'feed', goFeed, Newspaper, 'Bảng feed')}
                {navTabMobile(groupsSubTab === 'explore', goExplore, Compass, 'Khám phá')}
                {navTabMobile(groupsSubTab === 'myGroups', goMyGroups, Users, 'Nhóm tôi')}
              </div>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                <input
                  type="text"
                  value={groupsSubTab === 'explore' ? exploreSearchQuery : myGroupsSearchQuery}
                  onChange={(e) =>
                    groupsSubTab === 'explore'
                      ? setExploreSearchQuery(e.target.value)
                      : setMyGroupsSearchQuery(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && groupsSubTab === 'explore') handleExploreSearch();
                  }}
                  placeholder="Tìm kiếm nhóm"
                  className="w-full rounded-full border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2.5 pl-10 pr-3 text-sm text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="hidden space-y-1 lg:block">
                {navBtn(groupsSubTab === 'feed', goFeed, Newspaper, 'Bảng feed nhóm')}
                {navBtn(groupsSubTab === 'explore', goExplore, Compass, 'Khám phá')}
                {navBtn(groupsSubTab === 'myGroups', goMyGroups, Users, 'Nhóm của tôi')}
              </div>

              <div className={groupsSubTab === 'myGroups' ? 'contents' : 'hidden lg:contents'}>
              <button
                type="button"
                onClick={() => {
                  setGroupCardMenuId(null);
                  setShowCreateGroupModal(true);
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#E7F3FF] py-2.5 text-[15px] font-semibold text-[#1877F2] transition-colors hover:bg-[#D8ECFC] dark:bg-blue-900/35 dark:text-blue-200 dark:hover:bg-blue-900/50"
              >
                <Plus className="h-5 w-5" />
                Tạo nhóm mới
              </button>

              <div className="mt-5 border-t border-[var(--fb-divider)] pt-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[13px] font-semibold text-[var(--fb-text-secondary)]">
                    Nhóm bạn đã tham gia
                  </span>
                  {groups.length > 12 ? (
                    <button
                      type="button"
                      onClick={goMyGroups}
                      className="text-[13px] font-medium text-[#1877F2] hover:underline"
                    >
                      Xem tất cả
                    </button>
                  ) : null}
                </div>
                <div className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto pr-1">
                  {sidebarJoinedPreview.length === 0 ? (
                    <p className="px-1 text-sm text-[var(--fb-text-secondary)]">Chưa có nhóm</p>
                  ) : (
                    sidebarJoinedPreview.map((g) => {
                      const { heroUrl, emoji } = mediaForGroup(g);
                      return (
                        <button
                          key={g._id}
                          type="button"
                          onClick={() => {
                            setGroupCardMenuId(null);
                            handleOpenGroupDetail(g);
                          }}
                          className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-[var(--fb-input)]"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--fb-input)]">
                            {heroUrl ? (
                              <div
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${heroUrl})` }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-lg">
                                {emoji || '📚'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[var(--fb-text-primary)]">
                              {g.name}
                            </p>
                            <p className="text-xs text-[var(--fb-text-secondary)]">
                              Hoạt động: {formatTimeAgo(g.updatedAt || g.createdAt)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 max-lg:px-2 max-lg:py-3">
            {groupsSubTab === 'myGroups' ? (
              <>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2 max-lg:mb-3">
                  <h3 className="text-lg font-bold text-[var(--fb-text-primary)] sm:text-xl">
                    Tất cả các nhóm bạn đã tham gia ({sortedMyGroups.length})
                  </h3>
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-2 py-1 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fb-text-secondary)]">
                      Sắp xếp
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGroupsSortBy((s) => (s === 'recent' ? 'name' : 'recent'))
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--fb-input)] px-3 py-1.5 text-sm font-semibold text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                    >
                      {groupsSortBy === 'recent' ? 'Gần đây' : 'Tên A–Z'}
                      <ChevronDown className="h-4 w-4 text-[var(--fb-icon)]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupsLoading ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3"
                      >
                        <div className="mb-3 flex gap-3">
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-[var(--fb-input)]" />
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-4 w-3/4 rounded bg-[var(--fb-input)]" />
                            <div className="h-3 w-1/2 rounded bg-[var(--fb-input)]" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-9 flex-1 rounded-md bg-[var(--fb-input)]" />
                          <div className="h-9 w-9 rounded-md bg-[var(--fb-input)]" />
                        </div>
                      </div>
                    ))
                  ) : groups.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-12 text-center shadow-sm">
                      <Users className="mx-auto mb-4 h-16 w-16 text-[var(--fb-text-secondary)] opacity-50" />
                      <h3 className="mb-2 text-xl font-semibold text-[var(--fb-text-primary)]">
                        Bạn chưa tham gia nhóm nào
                      </h3>
                      <p className="mb-4 text-[var(--fb-text-secondary)]">
                        Hãy khám phá và tham gia các nhóm học tập phù hợp với bạn
                      </p>
                      <button
                        type="button"
                        onClick={goExplore}
                        className="rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166FE5]"
                      >
                        Khám phá nhóm
                      </button>
                    </div>
                  ) : (
                    sortedMyGroups.map((group) => {
                      const isCreator =
                        group.creator?._id === user?.id || group.creator === user?.id;
                      const inGroup = userIsMemberOfGroup(group);
                      const { heroUrl, emoji } = mediaForGroup(group);
                      const menuOpen = groupCardMenuId === group._id;
                      return (
                        <div
                          key={group._id}
                          className="flex flex-col gap-3 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Mở nhóm ${group.name}`}
                            onClick={() => handleOpenGroupDetail(group)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenGroupDetail(group);
                              }
                            }}
                            className="group flex cursor-pointer gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fb-surface)] dark:focus-visible:ring-offset-zinc-900"
                          >
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--fb-input)]">
                              {heroUrl ? (
                                <div
                                  className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
                                  style={{ backgroundImage: `url(${heroUrl})` }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-2xl text-white/90">
                                  {emoji || '📚'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 font-semibold text-[var(--fb-text-primary)] group-hover:text-[#1877F2]">
                                {group.name}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--fb-text-secondary)]">
                                Lần truy cập gần đây nhất:
                              </p>
                              <p className="text-xs text-[var(--fb-text-secondary)]">
                                {formatTimeAgo(group.updatedAt || group.createdAt)}
                              </p>
                              {group.settings?.accessType === 'private' ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--fb-text-secondary)]">
                                  <Lock className="h-3 w-3" />
                                  Riêng tư
                                </span>
                              ) : (
                                <span className="mt-1 inline-block text-[11px] text-[var(--fb-text-secondary)]">
                                  Công khai
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="flex gap-2"
                            data-group-card-menu
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (inGroup) {
                                  handleOpenGroupDetail(group);
                                } else {
                                  handleJoinGroup(group._id);
                                }
                              }}
                              className="min-h-9 flex-1 rounded-lg bg-[#E7F3FF] px-3 py-2 text-center text-sm font-semibold text-[#1877F2] transition-colors hover:bg-[#D8ECFC] dark:bg-blue-900/35 dark:text-blue-200 dark:hover:bg-blue-900/50"
                            >
                              {inGroup ? 'Xem nhóm' : 'Tham gia nhóm'}
                            </button>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setGroupCardMenuId(menuOpen ? null : group._id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-divider)]"
                                aria-label="Thêm tùy chọn"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                              {menuOpen ? (
                                <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[180px] overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => openHomeGroupShareFromCard(group)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--fb-input)]"
                                  >
                                    <Share2 className="h-4 w-4" />
                                    Chia sẻ
                                  </button>
                                  {inGroup ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGroupCardMenuId(null);
                                        handleToggleGroupHomeFeedFollow(
                                          group._id,
                                          !!group.homeFeedHiddenFromHome
                                        );
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--fb-input)]"
                                    >
                                      <Newspaper className="h-4 w-4" />
                                      {group.homeFeedHiddenFromHome
                                        ? 'Theo dõi trên bảng feed nhóm'
                                        : 'Bỏ theo dõi trên bảng feed nhóm'}
                                    </button>
                                  ) : null}
                                  {inGroup && !isCreator ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGroupCardMenuId(null);
                                        handleLeaveGroupFromCard(group._id);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <LogOut className="h-4 w-4" />
                                      Rời nhóm
                                    </button>
                                  ) : null}
                                  {isCreator ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGroupCardMenuId(null);
                                        handleDeleteGroup(group._id);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Xóa nhóm
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : groupsSubTab === 'feed' ? (
              <>
                {/* Đồng bộ kích thước bài với feed trang chủ: cột main giới hạn ~620-680px */}
                <div className="mx-auto w-full max-w-[min(100%,620px)] 2xl:max-w-[680px]">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[var(--fb-text-primary)] sm:text-xl">
                      Bảng feed nhóm
                    </h3>
                    <p className="text-sm text-[var(--fb-text-secondary)]">
                      Bài viết mới nhất từ các nhóm bạn đã tham gia và đang theo dõi.
                    </p>
                  </div>
                  {groupsLoading ? (
                    <div className="py-16 text-center">
                      <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-[#1877F2]" />
                      <p className="text-[var(--fb-text-secondary)]">Đang tải bảng feed nhóm...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-12 text-center shadow-sm">
                      <Newspaper className="mx-auto mb-4 h-16 w-16 text-[var(--fb-text-secondary)] opacity-50" />
                      <h3 className="mb-2 text-xl font-semibold text-[var(--fb-text-primary)]">
                        Chưa có bài viết nhóm
                      </h3>
                      <p className="text-[var(--fb-text-secondary)]">
                        Hãy theo dõi nhóm để nhận bài mới ở bảng feed nhóm.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {posts.map((post) => (
                        <React.Fragment key={post._id}>{renderPostCard(post)}</React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--fb-text-primary)] sm:text-xl">
                    Khám phá
                  </h3>
                  <p className="text-sm text-[var(--fb-text-secondary)]">
                    Gợi ý nhóm phù hợp — dùng ô tìm kiếm bên trái hoặc bộ lọc bên dưới
                  </p>
                </div>

                <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3 shadow-sm">
                  <select
                    value={exploreCategory}
                    onChange={(e) => setExploreCategory(e.target.value)}
                    className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Tất cả">Tất cả danh mục</option>
                    <option value="Học tập">Học tập</option>
                    <option value="Thảo luận">Thảo luận</option>
                    <option value="Dự án">Dự án</option>
                    <option value="Nghiên cứu">Nghiên cứu</option>
                    <option value="Khác">Khác</option>
                  </select>
                  <select
                    value={exploreSortBy}
                    onChange={(e) => setExploreSortBy(e.target.value)}
                    className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="popular">Phổ biến nhất</option>
                    <option value="recent">Mới nhất</option>
                    <option value="name">Theo tên A-Z</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleExploreSearch}
                    disabled={exploreLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166FE5] disabled:opacity-50"
                  >
                    {exploreLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Tìm kiếm
                  </button>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-base font-bold text-[var(--fb-text-primary)]">
                    Gợi ý cho bạn
                  </h4>
                  <span className="text-sm text-[var(--fb-text-secondary)]">
                    {discoverGroups.length} nhóm
                  </span>
                </div>

                {exploreLoading ? (
                  <div className="py-16 text-center">
                    <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin text-[#1877F2]" />
                    <p className="text-[var(--fb-text-secondary)]">Đang tải nhóm...</p>
                  </div>
                ) : discoverGroups.length === 0 ? (
                  <div className="rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-12 text-center shadow-sm">
                    <Compass className="mx-auto mb-4 h-16 w-16 text-[var(--fb-text-secondary)] opacity-50" />
                    <h3 className="mb-2 text-xl font-semibold text-[var(--fb-text-primary)]">
                      Không tìm thấy nhóm nào
                    </h3>
                    <p className="text-[var(--fb-text-secondary)]">
                      Thử đổi bộ lọc hoặc từ khóa tìm kiếm
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {discoverGroups.map((group) => {
                      const { heroUrl, emoji } = mediaForGroup(group);
                      const membersN = group.membersCount ?? group.members?.length ?? 0;
                      const postsN = group.postsCount ?? 0;
                      return (
                        <div
                          key={group._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenGroupDetail(group)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenGroupDetail(group);
                            }
                          }}
                          className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fb-surface)] dark:focus-visible:ring-offset-zinc-900"
                        >
                          <div className="relative h-36 shrink-0 overflow-hidden bg-[var(--fb-input)]">
                            {heroUrl ? (
                              <div
                                className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                                style={{ backgroundImage: `url(${heroUrl})` }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-5xl text-white/90">
                                {emoji || '📚'}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1.5 p-3">
                            <p className="line-clamp-2 text-left font-bold leading-snug text-[var(--fb-text-primary)] group-hover:text-[#1877F2]">
                              {group.name}
                            </p>
                            <p className="text-xs text-[var(--fb-text-secondary)]">
                              {membersN} thành viên
                              {postsN > 0 ? ` · ${postsN} bài viết` : ''}
                            </p>
                            <div className="mt-auto pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinGroup(group._id);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--fb-input)] py-2 text-[13px] font-semibold text-[var(--fb-text-primary)] hover:bg-[var(--fb-divider)] dark:bg-zinc-800 dark:hover:bg-zinc-700"
                              >
                                <UserPlus className="h-4 w-4 shrink-0" />
                                Tham gia nhóm
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </main>
          </div>
        </div>
      </div>
    );
  };

  const renderFriends = () => {
    const isRequests = friendsHubTab === 'requests';
    const items = isRequests ? friendsHubRequests : friendsHubAll;

    return (
      <div className="grid max-w-7xl mx-auto grid-cols-1 gap-0 lg:grid-cols-12 lg:gap-4">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-20 rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3">
            <h2 className="px-2 py-1 text-2xl font-bold text-[var(--fb-text-primary)]">Bạn bè</h2>
            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setFriendsHubTab('requests');
                  handleTabChange('friends', { friendsSubTab: 'requests' });
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  isRequests ? 'bg-blue-50 text-blue-700' : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Lời mời kết bạn {friendRequestsCount > 0 ? `(${friendRequestsCount})` : ''}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFriendsHubTab('all');
                  handleTabChange('friends', { friendsSubTab: 'all' });
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  !isRequests ? 'bg-blue-50 text-blue-700' : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                Tất cả bạn bè ({friendsHubAll.length})
              </button>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-9 max-lg:overflow-hidden max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm">
          {/* Mobile: tab ngang cuộn được (giống Facebook) */}
          <div className="mb-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:hidden max-lg:mb-0 max-lg:border-b max-lg:border-[var(--fb-divider)] max-lg:px-2 max-lg:py-2">
            <button
              type="button"
              onClick={() => {
                setFriendsHubTab('requests');
                handleTabChange('friends', { friendsSubTab: 'requests' });
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                isRequests
                  ? 'bg-[#E7F3FF] text-[#1877F2] dark:bg-blue-900/35 dark:text-blue-200'
                  : 'bg-[var(--fb-input)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
              }`}
            >
              Lời mời kết bạn{friendRequestsCount > 0 ? ` (${friendRequestsCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setFriendsHubTab('all');
                handleTabChange('friends', { friendsSubTab: 'all' });
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                !isRequests
                  ? 'bg-[#E7F3FF] text-[#1877F2] dark:bg-blue-900/35 dark:text-blue-200'
                  : 'bg-[var(--fb-input)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
              }`}
            >
              Tất cả bạn bè ({friendsHubAll.length})
            </button>
          </div>
          <div className="rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3 lg:p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--fb-text-primary)]">
                {isRequests ? 'Lời mời kết bạn' : 'Tất cả bạn bè'}
              </h3>
            </div>

            {friendsHubLoading ? (
              <div className="py-12 text-center text-sm text-[var(--fb-text-secondary)]">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--fb-text-secondary)]">
                {isRequests ? 'Không có lời mời kết bạn.' : 'Chưa có bạn bè.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {items.map((item) => {
                  const person = isRequests ? (item.from || item.sender || item.user || {}) : item;
                  const personId = person?._id || person?.id;
                  const keyId = String(item?._id || personId);
                  return (
                    <article key={keyId} className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] overflow-hidden">
                      <button
                        type="button"
                        disabled={!personId}
                        onClick={() => {
                          if (!personId) return;
                          navigate(`/profile/${personId}`);
                        }}
                        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[var(--fb-hover)]/40 transition-colors"
                        title={person?.name ? `Xem trang cá nhân — ${person.name}` : 'Xem trang cá nhân'}
                      >
                        <div className="aspect-square bg-[var(--fb-input)]">
                          <img
                            src={resolveAvatarUrl(person?.avatar, person?.name)}
                            alt={person?.name || 'Người dùng'}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                        <div className="p-2.5 pb-1">
                          <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)] min-h-[2.4rem]">
                            {person?.name || 'Người dùng'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--fb-text-secondary)]">
                            {person?.studentRole || person?.major || ' '}
                          </p>
                        </div>
                      </button>
                      <div className="p-2.5 pt-0">
                        {isRequests ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleAcceptFriendRequestFromHub(personId)}
                              disabled={!personId}
                              className="w-full rounded-md bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              Xác nhận
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectFriendRequestFromHub(personId)}
                              disabled={!personId}
                              className="w-full rounded-md bg-[var(--fb-input)] py-1.5 text-xs font-semibold text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                            >
                              Xóa
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChatWithFriend(personId)}
                            className="w-full rounded-md bg-blue-50 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Nhắn tin
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderDocuments = () => {
    return (
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-0 sm:px-2 lg:grid-cols-12 lg:gap-6 lg:px-4">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-20 space-y-4">
            <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div
                  className="flex items-center space-x-3 cursor-pointer hover:bg-[var(--fb-hover)] -mx-4 px-4 py-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/profile/${user?.id}`)}
                >
                  <img
                    src={
                      user?.avatar
                        ? resolveMediaUrl(user.avatar)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1877f2&color=fff`
                    }
                    alt={user?.name}
                    className="w-12 h-12 rounded-full border-2 border-[var(--fb-divider)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--fb-text-primary)] truncate text-[15px]">{user?.name}</p>
                    <p className="text-xs text-[var(--fb-text-secondary)] truncate">{user?.studentRole || user?.major}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
              <div className="p-3">
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedCategory('Tài liệu');
                      setCurrentTrendingTag(null);
                      handleTabChange('documents');
                    }}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-[var(--fb-text-primary)]">Phân tích tài liệu</span>
                  </button>
                  <button
                    onClick={() => handleTabChange('groups')}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-[var(--fb-text-primary)]">Nhóm học tập</span>
                  </button>
                  <button
                    onClick={() => {
                      openFriendsHub('requests');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-[var(--fb-text-primary)]">Bạn bè</span>
                    </div>
                    {friendRequestsCount > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                        {friendRequestsCount > 99 ? '99+' : friendRequestsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleOpenSavedPosts}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                      <Bookmark className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-[var(--fb-text-primary)]">Đã lưu</span>
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-[var(--fb-hover)] transition-colors text-left group"
                  >
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-[var(--fb-text-primary)]">Sự kiện</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-6">
          <div className="mx-auto w-full max-w-[min(100%,760px)] 2xl:max-w-[820px]">
            <DocumentAnalyzer />
          </div>
        </div>

        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-20 space-y-4">
            <OnlineUsers variant="contacts" />
            <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <h3 className="font-semibold text-[var(--fb-text-primary)] text-[15px]">Nhóm chat</h3>
                <button
                  className="p-2 hover:bg-[var(--fb-hover)] rounded-full transition-colors"
                  title="Tạo nhóm chat"
                  onClick={() => window.dispatchEvent(new CustomEvent('openCreateGroupChat'))}
                >
                  <Plus className="w-4 h-4 text-[var(--fb-icon)]" />
                </button>
              </div>
              <div className="border-t border-[var(--fb-divider)]">
                {groupChatsLoading ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : groupChats.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--fb-text-secondary)]">Chưa có nhóm chat.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {groupChats.slice(0, 12).map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId: c._id } }))}
                        className="w-full p-3 border-b border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors flex items-center gap-3 text-left"
                        title={c.name}
                      >
                        <div className="w-9 h-9 rounded-full bg-[var(--fb-input)] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {c.avatar && (String(c.avatar).startsWith('http') || String(c.avatar).startsWith('/uploads')) ? (
                            <img
                              src={resolveMediaUrl(c.avatar)}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{c.avatar || '👥'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--fb-text-primary)] truncate">{c.name || 'Nhóm chat'}</div>
                          {c.lastMessage?.createdAt && (
                            <div className="text-xs text-[var(--fb-text-secondary)] truncate">
                              {formatTimeAgo(c.lastMessage.createdAt)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
  };

  const renderEvents = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col lg:gap-6 max-lg:gap-0">
        <div className="flex flex-col overflow-hidden max-lg:divide-y max-lg:divide-gray-200 max-lg:border-x-0 max-lg:border-y max-lg:border-gray-200 max-lg:bg-white max-lg:shadow-sm lg:contents">
      <div className="mb-6 bg-white p-6 shadow-md max-lg:mb-0 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none lg:mb-6 lg:rounded-lg lg:border lg:border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Sự kiện</h2>
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            <Calendar className="w-4 h-4" />
            Xem tất cả
          </button>
        </div>
        
        {/* Event Filter Tabs */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => setEventFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              eventFilter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setEventFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              eventFilter === 'upcoming'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sắp diễn ra
          </button>
          <button
            onClick={() => setEventFilter('ongoing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              eventFilter === 'ongoing'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Đang diễn ra
          </button>
          <button
            onClick={() => setEventFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              eventFilter === 'completed'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Đã kết thúc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 max-lg:px-2 max-lg:py-3">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Đang tải sự kiện...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {eventFilter === 'all' 
                ? 'Chưa có sự kiện nào' 
                : `Chưa có sự kiện ${
                    eventFilter === 'upcoming' ? 'sắp diễn ra' : 
                    eventFilter === 'ongoing' ? 'đang diễn ra' : 'đã kết thúc'
                  }`
              }
            </p>
          </div>
        ) : (
          events.map((event) => {
          const er = getHomeUserEventRsvp(event, user?.id);
          const goingN = event.participantsCount ?? event.participants?.length ?? 0;
          const intN = event.interestedCount ?? event.interestedUsers?.length ?? 0;
          const evPhase = homeEventCardPhase(event.date);
          const socialLine = getHomeEventFriendSocialLine(event, eventTabFriends, user?.id);
          const coverUrl = resolveMediaUrl(event.image);

          return (
            <div
              key={event._id}
              className={`group relative flex aspect-square w-full cursor-pointer flex-col rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-md transition-shadow hover:shadow-lg hover:ring-2 hover:ring-blue-500/20 ${
                homeEventMoreMenuId != null && String(homeEventMoreMenuId) === String(event._id)
                  ? 'z-[25] overflow-visible'
                  : 'overflow-hidden'
              }`}
              onClick={() => handleOpenEventDetail(event)}
            >
              <div className="relative h-[40%] min-h-0 shrink-0 bg-[var(--fb-input)]">
                <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                  {coverUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: `url(${coverUrl})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                      <Calendar className="h-12 w-12 text-white/40" />
                    </div>
                  )}
                </div>
                <div
                  className="absolute right-2 top-2 z-20"
                  data-home-event-more-root
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/65"
                    aria-label="Thêm tùy chọn"
                    aria-expanded={homeEventMoreMenuId != null && String(homeEventMoreMenuId) === String(event._id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHomeEventMoreMenuId((id) =>
                        id != null && String(id) === String(event._id) ? null : event._id
                      );
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {homeEventMoreMenuId != null && String(homeEventMoreMenuId) === String(event._id) ? (
                    <div className="absolute right-0 top-full mt-1 w-[min(100vw-2rem,220px)] overflow-hidden rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                        onClick={(e) => {
                          setHomeEventMoreMenuId(null);
                          openHomeEventShareModal(e, event, 'invite');
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
                          setHomeEventMoreMenuId(null);
                          openHomeEventShareModal(e, event, 'share');
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

              <div className="flex h-[60%] min-h-0 flex-col border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-2.5 py-2 text-[var(--fb-text-primary)]">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                  <span
                    className={`max-w-[55%] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${homeEventCardStatusColor(evPhase)}`}
                  >
                    {homeEventCardStatusLabel(evPhase)}
                  </span>
                  {event.category ? (
                    <span className="flex max-w-[45%] items-center gap-1 truncate rounded-full bg-[var(--fb-input)] px-2 py-0.5 text-[11px] font-medium leading-tight text-[var(--fb-text-secondary)]">
                      <Tag className="h-3 w-3 shrink-0 text-[var(--fb-icon)]" />
                      {event.category}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs font-semibold leading-snug text-orange-700 line-clamp-1 dark:text-amber-400/95 sm:text-[13px]">
                  {formatHomeEventCardDateShort(event.date)}
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
                  <button
                    type="button"
                    className="mt-1 line-clamp-2 w-full text-left text-xs leading-snug text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] sm:line-clamp-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGoogleMaps(event.location, e);
                    }}
                  >
                    {event.location}
                  </button>
                ) : null}
                {socialLine ? (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {(() => {
                        const friendIds = new Set((eventTabFriends || []).map((f) => String(f._id)));
                        const seen = new Set();
                        const rows = [];
                        for (const list of [event.participants, event.interestedUsers]) {
                          for (const p of list || []) {
                            const id = homeEventPid(p);
                            if (!friendIds.has(id) || seen.has(id)) continue;
                            seen.add(id);
                            const friend = eventTabFriends.find((f) => String(f._id) === id);
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
                ) : goingN > 0 || intN > 0 ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-[var(--fb-text-secondary)] line-clamp-2 sm:line-clamp-1">
                    {goingN > 0 ? `${goingN} tham gia` : null}
                    {goingN > 0 && intN > 0 ? ' · ' : null}
                    {intN > 0 ? `${intN} quan tâm` : null}
                    {event.maxParticipants ? ` · max ${event.maxParticipants}` : ''}
                  </p>
                ) : null}

                <div
                  className="relative mt-auto w-full pt-1.5"
                  data-home-rsvp-menu
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHomeRsvpMenuEventId((id) => (String(id) === String(event._id) ? null : event._id));
                    }}
                    className={`flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors sm:text-[13px] ${homeRsvpBtnClass(er)}`}
                  >
                    {er === 'going' ? (
                      <CheckCircle className="h-4 w-4 shrink-0" />
                    ) : er === 'declined' ? (
                      <Ban className="h-4 w-4 shrink-0" />
                    ) : (
                      <Star
                        className={`h-4 w-4 shrink-0 ${er === 'interested' ? 'fill-amber-400 text-amber-500 dark:fill-amber-400/90' : ''}`}
                      />
                    )}
                    <span className="truncate">{homeRsvpLabel(er)}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </button>
                  {homeRsvpMenuEventId != null && String(homeRsvpMenuEventId) === String(event._id) ? (
                    <div className="absolute bottom-full left-0 right-0 z-[60] mb-1 max-h-[min(70vh,320px)] overflow-y-auto overflow-x-hidden rounded-md border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                        onClick={(e) => handleSetHomeEventRsvp(event._id, 'interested', e)}
                      >
                        {er === 'interested' ? (
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
                        onClick={(e) => handleSetHomeEventRsvp(event._id, 'going', e)}
                      >
                        {er === 'going' ? (
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
                        onClick={(e) => handleSetHomeEventRsvp(event._id, 'declined', e)}
                      >
                        {er === 'declined' ? (
                          <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <Ban className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" />
                        Không tham gia
                      </button>
                      {er ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border-t border-[var(--fb-divider)] px-3 py-2 text-left text-sm text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                          onClick={(e) => handleSetHomeEventRsvp(event._id, 'none', e)}
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
          );
        })
        )}
      </div>
        </div>
      </div>
    </div>
  );

  /**
   * Đổi tab trên /home: replace để không chồng hàng chục mục lịch sử khi bấm qua lại.
   * Gộp query (giữ post khi về Bảng tin; giữ friendsTab khi ở tab Bạn bè).
   */
  const handleTabChange = (newTab, options = {}) => {
    const friendsSub = options.friendsSubTab;
    setActiveTab(newTab);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (newTab === 'home') {
          p.delete('tab');
          p.delete('friendsTab');
        } else {
          p.set('tab', newTab);
          if (newTab === 'friends') {
            if (friendsSub === 'all') {
              p.set('friendsTab', 'all');
            } else {
              p.delete('friendsTab');
            }
          } else {
            p.delete('friendsTab');
          }
          p.delete('post');
        }
        return p;
      },
      { replace: true }
    );
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const hasBlockingOverlay =
    showCreateGroupModal ||
    showGroupDetailModal ||
    showAddMemberModal ||
    !!homeEventShareModalEvent ||
    !!homeGroupShareModalGroup ||
    showSavedPostsModal ||
    !!imageTheater ||
    (showEditPostModal && !!editingPost) ||
    (showGroupSettingsModal && !!selectedGroup);

  useEffect(() => {
    if (!hasBlockingOverlay) return undefined;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [hasBlockingOverlay]);

  return (
    <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)]">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 max-lg:pt-0 pb-3 sm:pb-4 lg:py-4">
        {/* Render active tab content - keep container static to prevent flicker */}
        <div className="tab-content">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'groups' && renderGroups()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'friends' && renderFriends()}
        </div>
      </main>

      {/* Create Group Modal - rendered via Portal and centered in viewport */}
      {showCreateGroupModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg max-w-md w-full p-6 border border-[var(--fb-divider)] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--fb-text-primary)]">Tạo nhóm mới</h3>
              <button
                type="button"
                onClick={() => {
                  resetGroupCreateModalExtras();
                  setShowCreateGroupModal(false);
                }}
                className="text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--fb-text-secondary)]">
                  Ảnh nhóm (tùy chọn, một ảnh)
                </label>
                <input
                  ref={groupCreateAvatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleGroupCreateAvatarChange}
                />
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => groupCreateAvatarInputRef.current?.click()}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-secondary)] transition hover:border-blue-400 hover:bg-[var(--fb-hover)]"
                    title="Chọn ảnh"
                  >
                    {groupCreateAvatarPreview ? (
                      <img src={groupCreateAvatarPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl leading-none">{groupForm.avatar}</span>
                    )}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => groupCreateAvatarInputRef.current?.click()}
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm font-semibold text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] sm:w-auto"
                    >
                      Chọn ảnh từ máy
                    </button>
                    {groupCreateAvatarFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupCreateAvatarFile(null);
                          setGroupCreateAvatarPreview(null);
                          if (groupCreateAvatarInputRef.current) groupCreateAvatarInputRef.current.value = '';
                        }}
                        className="text-left text-sm font-medium text-red-600 hover:underline"
                      >
                        Xóa ảnh (dùng emoji bên dưới)
                      </button>
                    ) : (
                      <p className="text-xs text-[var(--fb-text-secondary)]">
                        JPG, PNG, GIF, WebP — tối đa 10MB. Ảnh hiển thị làm ảnh nhóm; nếu không chọn, dùng emoji bên dưới.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-1">Tên nhóm</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên nhóm..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-1">Mô tả</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả về nhóm..."
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-1">
                  Biểu tượng (khi không dùng ảnh)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['📚', '💡', '🎓', '📖', '✏️', '🔬', '💻', '🎨'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setGroupCreateAvatarFile(null);
                        setGroupCreateAvatarPreview(null);
                        if (groupCreateAvatarInputRef.current) groupCreateAvatarInputRef.current.value = '';
                        setGroupForm({ ...groupForm, avatar: emoji });
                      }}
                      className={`rounded-lg border-2 p-2 text-2xl ${
                        groupForm.avatar === emoji && !groupCreateAvatarFile
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-[var(--fb-divider)] hover:bg-[var(--fb-hover)]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-1">Danh mục</label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Học tập">Học tập</option>
                  <option value="Sự kiện">Sự kiện</option>
                  <option value="Dự án">Dự án</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetGroupCreateModalExtras();
                    setShowCreateGroupModal(false);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--fb-divider)] text-[var(--fb-text-primary)] rounded-lg hover:bg-[var(--fb-hover)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!groupForm.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Tạo nhóm
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Thêm thành viên</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setUserSearchQuery('');
                  setSearchUsers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchUsers.length === 0 && userSearchQuery.trim().length >= 2 ? (
                  <p className="text-center text-gray-500 py-4">Không tìm thấy người dùng</p>
                ) : searchUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Nhập tên hoặc email để tìm kiếm</p>
                ) : (
                  searchUsers.map((searchUser) => {
                    const isAlreadyMember = groupMembers.some(m => m.user?._id === searchUser._id);
                    
                    return (
                      <div key={searchUser._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={searchUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchUser.name)}&background=3b82f6&color=fff`}
                            alt={searchUser.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-800">{searchUser.name}</p>
                            <p className="text-xs text-gray-500">{searchUser.email}</p>
                          </div>
                        </div>

                        {isAlreadyMember ? (
                          <span className="text-xs text-gray-500">Đã là thành viên</span>
                        ) : (
                          <button
                            onClick={() => handleAddMember(searchUser._id)}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            Thêm
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {homeEventShareModalEvent && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!homeEventShareSending) {
              setHomeEventShareModalEvent(null);
              setHomeEventShareModalIntent('share');
            }
          }}
          role="presentation"
        >
          <div
            className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl ${
              homeEventShareModalIntent === 'invite' ? 'max-w-3xl' : 'max-w-md'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-share-event-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] p-4">
              <h3 id="home-share-event-title" className="pr-2 text-lg font-bold text-[var(--fb-text-primary)]">
                {homeEventShareModalIntent === 'invite'
                  ? 'Mời bạn bè đến sự kiện này'
                  : 'Chia sẻ tới bạn bè'}
              </h3>
              <button
                type="button"
                disabled={homeEventShareSending}
                onClick={() => {
                  setHomeEventShareModalEvent(null);
                  setHomeEventShareModalIntent('share');
                }}
                className="shrink-0 rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)]">
                {homeEventShareModalEvent.title}
              </p>
              <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">
                {formatHomeEventCardDateShort(homeEventShareModalEvent.date)}
                {homeEventShareModalEvent.location ? ` · ${homeEventShareModalEvent.location}` : ''}
              </p>
            </div>

            {homeEventShareModalIntent === 'invite' ? (
              homeEventInviteFriendsEligible.length === 0 ? (
                <p className="px-4 py-16 text-center text-[var(--fb-text-secondary)]">
                  {eventTabFriends.length === 0
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
                            value={homeEventShareQuery}
                            onChange={(e) => setHomeEventShareQuery(e.target.value)}
                            placeholder="Tìm bạn bè…"
                            className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] py-2.5 pl-10 pr-3 text-sm text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        </div>
                      </div>
                      <ul className="max-h-[min(42vh,360px)] min-h-[200px] flex-1 space-y-1 overflow-y-auto p-2 md:max-h-none">
                        {homeEventInviteFriendsFiltered.length === 0 ? (
                          <li className="px-2 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                            Không có bạn bè khớp tìm kiếm.
                          </li>
                        ) : (
                          homeEventInviteFriendsFiltered.map((friend) => {
                            const fid = String(friend._id);
                            const selected = homeEventShareSelectedIds.has(fid);
                            return (
                              <li key={friend._id}>
                                <button
                                  type="button"
                                  onClick={() => toggleHomeEventShareFriendSelect(friend._id)}
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
                        Đã chọn {homeEventShareSelectedIds.size} người bạn
                      </p>
                      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
                        {selectedHomeEventInviteFriendsPanel.length === 0 ? (
                          <li className="px-2 py-6 text-center text-xs text-[var(--fb-text-secondary)]">
                            Chọn bạn bè ở cột bên trái.
                          </li>
                        ) : (
                          selectedHomeEventInviteFriendsPanel.map((friend) => (
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
                                onClick={() => removeHomeEventShareFriendSelection(friend._id)}
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
                      disabled={homeEventShareSending}
                      onClick={() => {
                        setHomeEventShareModalEvent(null);
                        setHomeEventShareModalIntent('share');
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)] disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={homeEventShareSending || homeEventShareSelectedIds.size === 0}
                      onClick={handleConfirmHomeEventShareOrInvite}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {homeEventShareSending ? 'Đang gửi…' : 'Gửi lời mời'}
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
                      value={homeEventShareQuery}
                      onChange={(e) => setHomeEventShareQuery(e.target.value)}
                      placeholder="Tìm bạn bè theo tên hoặc email…"
                      className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)]"
                    />
                  </div>
                </div>
                <div className="max-h-[320px] min-h-[200px] flex-1 overflow-y-auto px-2">
                  {filteredHomeEventShareFriends.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                      {eventTabFriends.length === 0
                        ? 'Bạn chưa có bạn bè để gửi.'
                        : 'Không tìm thấy bạn bè phù hợp.'}
                    </p>
                  ) : (
                    <ul className="py-1">
                      {filteredHomeEventShareFriends.map((f) => {
                        const fid = String(f._id);
                        const checked = homeEventShareSelectedIds.has(fid);
                        return (
                          <li key={fid}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--fb-hover)]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleHomeEventShareFriendSelect(fid)}
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
                    Đã chọn: {homeEventShareSelectedIds.size} người
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={homeEventShareSending}
                      onClick={() => {
                        setHomeEventShareModalEvent(null);
                        setHomeEventShareModalIntent('share');
                      }}
                      className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={homeEventShareSending || homeEventShareSelectedIds.size === 0}
                      onClick={handleConfirmHomeEventShareOrInvite}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {homeEventShareSending ? 'Đang gửi…' : 'Gửi tin nhắn'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {homeGroupShareModalGroup && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!homeGroupShareSending) {
              setHomeGroupShareModalGroup(null);
              setHomeGroupShareSelectedIds(new Set());
              setHomeGroupShareQuery('');
              setHomeGroupShareFriendsLoading(false);
            }
          }}
          role="presentation"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-share-group-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] p-4">
              <h3 id="home-share-group-title" className="pr-2 text-lg font-bold text-[var(--fb-text-primary)]">
                Chia sẻ nhóm tới bạn bè
              </h3>
              <button
                type="button"
                disabled={homeGroupShareSending}
                onClick={() => {
                  setHomeGroupShareModalGroup(null);
                  setHomeGroupShareSelectedIds(new Set());
                  setHomeGroupShareQuery('');
                  setHomeGroupShareFriendsLoading(false);
                }}
                className="shrink-0 rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)]">
                {homeGroupShareModalGroup.name}
              </p>
              <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">
                {homeGroupShareModalGroup.membersCount ??
                  homeGroupShareModalGroup.members?.length ??
                  0}{' '}
                thành viên
                {homeGroupShareModalGroup.settings?.accessType === 'private'
                  ? ' · Riêng tư'
                  : ' · Công khai'}
              </p>
            </div>
            <div className="shrink-0 px-4 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                <input
                  type="search"
                  value={homeGroupShareQuery}
                  onChange={(e) => setHomeGroupShareQuery(e.target.value)}
                  placeholder="Tìm bạn bè theo tên hoặc email…"
                  className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>
            <div className="max-h-[320px] min-h-[200px] flex-1 overflow-y-auto px-2">
              {homeGroupShareFriendsLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14">
                  <RefreshCw className="h-9 w-9 animate-spin text-[#1877F2]" aria-hidden />
                  <p className="text-sm text-[var(--fb-text-secondary)]">Đang tải danh sách bạn bè…</p>
                </div>
              ) : filteredHomeGroupShareFriends.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                  {eventTabFriends.length === 0
                    ? 'Bạn chưa có bạn bè để gửi.'
                    : 'Không tìm thấy bạn bè phù hợp.'}
                </p>
              ) : (
                <ul className="py-1">
                  {filteredHomeGroupShareFriends.map((f) => {
                    const fid = String(f._id);
                    const checked = homeGroupShareSelectedIds.has(fid);
                    return (
                      <li key={fid}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--fb-hover)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHomeGroupShareFriendSelect(fid)}
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
                Đã chọn: {homeGroupShareSelectedIds.size} người
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={homeGroupShareSending}
                  onClick={() => {
                    setHomeGroupShareModalGroup(null);
                    setHomeGroupShareSelectedIds(new Set());
                    setHomeGroupShareQuery('');
                    setHomeGroupShareFriendsLoading(false);
                  }}
                  className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    homeGroupShareSending ||
                    homeGroupShareFriendsLoading ||
                    homeGroupShareSelectedIds.size === 0
                  }
                  onClick={handleConfirmHomeGroupShare}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {homeGroupShareSending ? 'Đang gửi…' : 'Gửi tin nhắn'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Chia sẻ bài viết — chọn bạn bè */}
      {shareModalPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10001] p-4"
          onClick={() => !shareSending && setShareModalPost(null)}
          role="presentation"
        >
          <div
            className="bg-[var(--fb-surface)] rounded-xl shadow-2xl border border-[var(--fb-divider)] w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--fb-divider)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-[var(--fb-text-primary)]">Chia sẻ tới bạn bè</h3>
              </div>
              <button
                type="button"
                disabled={shareSending}
                onClick={() => setShareModalPost(null)}
                className="p-2 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-icon)]"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-[var(--fb-divider)] bg-[var(--fb-input)]">
              <p className="text-xs text-[var(--fb-text-secondary)] line-clamp-3">
                {(shareModalPost.content || '').trim() || '(Không có nội dung text)'}
              </p>
            </div>
            <div className="px-4 py-2 flex-shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--fb-icon)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={shareFriendQuery}
                  onChange={(e) => setShareFriendQuery(e.target.value)}
                  placeholder="Tìm bạn bè theo tên hoặc email..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm text-[var(--fb-text-primary)]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[320px] px-2">
              {shareFriendsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : filteredShareFriends.length === 0 ? (
                <p className="text-center text-sm text-[var(--fb-text-secondary)] py-8 px-4">
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
                        <label className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--fb-hover)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleShareFriendSelect(fid)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <img
                            src={
                              f.avatar
                                ? resolveMediaUrl(f.avatar)
                                : f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || '?')}&background=1877f2&color=fff`
                            }
                            alt=""
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-[var(--fb-text-primary)] truncate">{f.name}</p>
                            <p className="text-xs text-[var(--fb-text-secondary)] truncate">{f.studentRole || ''}{f.email ? ` · ${f.email}` : ''}</p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--fb-divider)] flex items-center justify-between gap-2 flex-shrink-0 bg-[var(--fb-surface)]">
              <span className="text-xs text-[var(--fb-text-secondary)]">
                Đã chọn: {shareSelectedFriendIds.size} người
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={shareSending}
                  onClick={() => setShareModalPost(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--fb-divider)] text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={shareSending || shareSelectedFriendIds.size === 0}
                  onClick={handleConfirmShareToFriends}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shareSending ? 'Đang gửi…' : 'Chia sẻ'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {likesModalPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setLikesModalPost(null);
            setLikesModalUsers([]);
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--fb-divider)] px-4 py-3">
              <h3 className="text-base font-semibold text-[var(--fb-text-primary)]">
                Lượt thích ({likesModalUsers.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setLikesModalPost(null);
                  setLikesModalUsers([]);
                }}
                className="rounded-full p-1.5 text-[var(--fb-text-secondary)] transition-colors hover:bg-[var(--fb-hover)]"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {likesModalLoading ? (
                <div className="p-6 text-center text-sm text-[var(--fb-text-secondary)]">Đang tải...</div>
              ) : likesModalUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--fb-text-secondary)]">
                  Chưa có ai thích bài viết này.
                </div>
              ) : (
                likesModalUsers.map((likedUser) => {
                  const uid = likedUser?._id || likedUser?.id;
                  return (
                    <button
                      key={String(uid)}
                      type="button"
                      onClick={() => {
                        if (!uid) return;
                        setLikesModalPost(null);
                        setLikesModalUsers([]);
                        navigate(`/profile/${uid}`);
                      }}
                      className="flex w-full items-center gap-3 border-b border-[var(--fb-divider)] px-4 py-3 text-left transition-colors hover:bg-[var(--fb-hover)] last:border-b-0"
                    >
                      <img
                        src={resolveAvatarUrl(likedUser?.avatar, likedUser?.name)}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                        onError={withAvatarFallback(likedUser?.name)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--fb-text-primary)]">
                          {likedUser?.name || 'Người dùng'}
                        </p>
                        {likedUser?.studentRole ? (
                          <p className="truncate text-xs text-[var(--fb-text-secondary)]">{likedUser.studentRole}</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Saved Posts Modal - Rendered via Portal to body */}
      {showSavedPostsModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSavedPostsModal(false)}
          style={{ zIndex: 10000 }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-w-4xl w-full max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Bài viết đã lưu</h3>
                  <p className="text-xs text-yellow-100">{savedPostsList.length} bài viết</p>
                </div>
              </div>
              <button
                onClick={() => setShowSavedPostsModal(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingSavedPosts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : savedPostsList.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Chưa có bài viết đã lưu</h4>
                  <p className="text-gray-500">Các bài viết bạn lưu sẽ hiển thị ở đây</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedPostsList.map((post) => (
                    <div key={post._id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      {/* Post Header */}
                      <div className="p-4 flex items-center justify-between border-b">
                        <div className="flex items-center space-x-3">
                          <img
                            src={post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}&background=3b82f6&color=fff`}
                            alt={post.author?.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <h4 className="font-semibold text-gray-800">{post.author?.name}</h4>
                            <p className="text-xs text-gray-500">{post.author?.studentRole} • {formatTimeAgo(post.createdAt)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openSaveToCollectionModal(post._id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          title="Bỏ lưu"
                        >
                          <Bookmark className="w-5 h-5 text-yellow-600 fill-current" />
                        </button>
                      </div>

                      {/* Post Content */}
                      <div className="p-4">
                        <p className="text-gray-800 mb-2">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {post.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-medium">
                          {post.category}
                        </span>
                      </div>

                      {/* Post Images */}
                      {post.images && post.images.length > 0 && (() => {
                        const raw = post.images[0];
                        const imageUrl = raw.startsWith('/uploads')
                          ? resolveMediaUrl(raw)
                          : raw;
                        if (isPostGalleryMediaVideo(raw)) {
                          return (
                            <video
                              src={videoPreviewSrc(imageUrl)}
                              controls
                              playsInline
                              preload="metadata"
                              data-scroll-autoplay="true"
                              className="h-64 w-full bg-black object-cover"
                            />
                          );
                        }
                        return <img src={imageUrl} alt="Post" className="h-64 w-full object-cover" />;
                      })()}

                      {/* Post Stats */}
                      <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-600 bg-gray-50">
                        <span>{post.likes?.length || 0} lượt thích</span>
                        <div className="flex space-x-3">
                          <span>{post.comments?.length || 0} bình luận</span>
                          <span>{post.shares || 0} chia sẻ</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {saveCollectionModalPostId && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10020] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSaveCollectionModalPostId(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--fb-divider)] flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--fb-text-primary)]">Lưu vào bộ sưu tập</h3>
              <button
                type="button"
                onClick={() => setSaveCollectionModalPostId(null)}
                className="p-2 rounded-full hover:bg-[var(--fb-hover)]"
              >
                <X className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Chọn bộ sưu tập</label>
                <select
                  value={saveCollectionChoice}
                  onChange={(e) => setSaveCollectionChoice(e.target.value)}
                  className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm text-[var(--fb-text-primary)]"
                >
                  {savedCollections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Tạo bộ sưu tập mới</label>
                <div className="flex gap-2">
                  <input
                    value={newSaveCollectionName}
                    onChange={(e) => setNewSaveCollectionName(e.target.value)}
                    placeholder="Ví dụ: Dự án môn học"
                    className="flex-1 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] px-3 py-2 text-sm text-[var(--fb-text-primary)]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const result = createSaveCollectionInModal();
                        if (!result.ok && result.reason === 'duplicate') {
                          notify('Tên bộ sưu tập đã tồn tại.');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const result = createSaveCollectionInModal();
                      if (!result.ok && result.reason === 'duplicate') {
                        notify('Tên bộ sưu tập đã tồn tại.');
                      }
                    }}
                    disabled={!newSaveCollectionName.trim()}
                    className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-sm font-medium text-[var(--fb-text-primary)] disabled:opacity-50"
                  >
                    Tạo
                  </button>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[var(--fb-divider)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveCollectionModalPostId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmSaveToCollection}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Lưu bài viết
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showHomePostModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[140] bg-black/60 flex items-center justify-center p-4" onClick={() => { if (!homePostSubmitting) setShowHomePostModal(false); }}>
          <div
            className="w-full max-w-[min(680px,96vw)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-2xl shadow-2xl border border-[var(--fb-divider)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--fb-divider)] flex items-center justify-between">
              <h3 className="text-xl font-bold">Tạo bài viết</h3>
              <button
                type="button"
                onClick={() => { if (!homePostSubmitting) setShowHomePostModal(false); }}
                disabled={homePostSubmitting}
                className="h-9 w-9 rounded-full bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] grid place-items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-[var(--fb-icon)]" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <img
                  src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full"
                  onError={withAvatarFallback(user?.name, '1877f2')}
                />
                <div className="text-sm font-semibold">{user?.name || 'Người dùng'}</div>
              </div>

              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Bạn đang nghĩ gì?"
                className="w-full p-3 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-[18px]"
                rows="4"
              />

              {newPostImages.length === 0 && newPostFiles.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-2">Nền cho bài viết chữ</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TEXT_POST_BACKGROUNDS.map((item) => {
                      const active = newPostTextBackground === item.background;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          onClick={() => setNewPostTextBackground(item.background)}
                          className={`h-9 w-9 rounded-full border-2 transition-transform ${active ? 'border-blue-500 scale-105' : 'border-white/70 hover:scale-105'}`}
                          style={{ background: item.background || 'linear-gradient(135deg,#f3f4f6,#e5e7eb)' }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--fb-text-secondary)] mb-2">Loại bài viết</label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="Học tập">📚 Học tập</option>
                  {canPostLecturerDocuments ? (
                    <option value="Tài liệu">📄 Tài liệu giảng viên</option>
                  ) : null}
                  <option value="Thảo luận">💬 Thảo luận</option>
                  <option value="Sự kiện">📅 Sự kiện</option>
                  <option value="Khác">📌 Khác</option>
                </select>
              </div>

              {newPostImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newPostImages.map((img, index) => (
                    <div key={`${img.name}-${index}`} className="relative group">
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
                          alt={`Preview ${index}`}
                          className="h-32 w-full rounded-lg object-cover"
                        />
                      )}
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newPostFiles.length > 0 && (
                <div className="space-y-2">
                  {newPostFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[var(--fb-input)] rounded-lg">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-orange-600" />
                        <span className="text-sm text-[var(--fb-text-primary)]">{file.name}</span>
                        <span className="text-xs text-[var(--fb-text-secondary)]">({(file.size / 1024).toFixed(2)} KB)</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--fb-divider)]">
                <div className="flex space-x-1">
                  <input
                    type="file"
                    id="home-image-upload"
                    accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/avi,.mp4,.webm,.mov,.mkv,.avi,.m4v,.ogv,.mpeg,.mpg"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="home-image-upload"
                    className="flex items-center space-x-2 px-3 py-2 hover:bg-[var(--fb-hover)] rounded-lg transition-colors cursor-pointer"
                    title="Thêm ảnh hoặc video"
                  >
                    <Image className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-[var(--fb-text-secondary)] font-medium">Ảnh/Video</span>
                  </label>

                  <>
                    <input
                      type="file"
                      id="home-file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv,.avi"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="home-file-upload"
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-[var(--fb-hover)] rounded-lg transition-colors cursor-pointer"
                      title="Thêm tệp đính kèm"
                    >
                      <BookOpen className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-[var(--fb-text-secondary)] font-medium">Tệp đính kèm</span>
                    </label>
                  </>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (homePostSubmitting) return;
                      setShowHomePostModal(false);
                      setNewPostContent('');
                      setNewPostCategory('Khác');
                      setNewPostImages([]);
                      setNewPostFiles([]);
                      setNewPostTextBackground('');
                    }}
                    disabled={homePostSubmitting}
                    className="px-4 py-2 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handlePost}
                    disabled={
                      homePostSubmitting ||
                      (!newPostContent.trim() && newPostImages.length === 0 && newPostFiles.length === 0)
                    }
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                  >
                    {homePostSubmitting ? 'Đang đăng…' : 'Đăng'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Ảnh bài viết — theater (media trái + sidebar phải) */}
      {imageTheater &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const livePost =
              posts.find((p) => String(p._id) === String(imageTheater.post._id)) || imageTheater.post;
            const imgs = (livePost.images || []).filter((x) => typeof x === 'string');
            const n = imgs.length;
            const idx = n ? Math.min(Math.max(0, imageTheater.imageIndex), n - 1) : 0;
            const curPath = imgs[idx] || '';
            const curUrl = curPath ? resolvePostImageSrc(curPath) : '';
            const curIsVideo = isPostGalleryMediaVideo(curPath);
            const cap = (livePost.content || '').trim();
            const capTrunc = 220;
            const postAuthorId = livePost.author?._id || livePost.author;
            const currentUserId = user?.id || user?._id;
            const isOwner = String(postAuthorId) === String(currentUserId);
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
            const theaterUid = String(user?.id || user?._id || '');
            const theaterLikedByUser = (livePost.likes || []).some(
              (like) => String(like?._id || like) === theaterUid
            );
            const theaterLikeCount =
              (livePost.likes?.length || 0) +
              (likedPosts.has(livePost._id) && !theaterLikedByUser ? 1 : 0);
            const theaterZoomIn = (e) => {
              e.stopPropagation();
              setPostTheaterZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
            };
            const theaterZoomOut = (e) => {
              e.stopPropagation();
              setPostTheaterZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
            };
            const onPostTheaterWheelZoom = (e) => {
              if (curIsVideo) return;
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setPostTheaterZoom((z) => Math.max(1, Math.min(4, Math.round((z + delta) * 100) / 100)));
            };
            const endPostTheaterPan = (e, doTapZoom) => {
              const g = postTheaterPanGestureRef.current;
              const el = postTheaterPanRef.current;
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
                setPostTheaterZoom((z) => {
                  if (z >= 4) return 1;
                  return Math.min(4, Math.round((z + 0.25) * 100) / 100);
                });
              }
            };
            const onPostTheaterPanPointerDown = (e) => {
              if (postTheaterZoom <= 1 || curIsVideo) return;
              if (e.button !== 0) return;
              const el = postTheaterPanRef.current;
              if (!el) return;
              e.preventDefault();
              e.stopPropagation();
              const prev = postTheaterPanGestureRef.current;
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
              postTheaterPanGestureRef.current = g;
              el.classList.add('cursor-grabbing');

              const winOpts = { capture: true, passive: false };
              const onWinMove = (ev) => {
                const ge = postTheaterPanGestureRef.current;
                const pane = postTheaterPanRef.current;
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
                const ge = postTheaterPanGestureRef.current;
                if (!ge.active || ev.pointerId !== ge.pointerId) return;
                endPostTheaterPan(ev, !curIsVideo);
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
                            onClick={theaterZoomOut}
                            disabled={postTheaterZoom <= 1}
                            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            title="Thu nhỏ"
                          >
                            <ZoomOut className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={theaterZoomIn}
                            disabled={postTheaterZoom >= 4}
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors hidden sm:block"
                        aria-label="Media trước"
                      >
                        <ChevronLeft className="w-7 h-7" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors hidden sm:block"
                        aria-label="Media sau"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-sm text-white/80 bg-black/50 px-3 py-1 rounded-full">
                        {idx + 1} / {n}
                      </div>
                    </>
                  ) : null}
                  {curUrl ? (
                    curIsVideo ? (
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4 sm:p-8">
                        <video
                          src={videoPreviewSrc(curUrl)}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-[100dvh] max-w-full object-contain"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div
                        ref={postTheaterPanRef}
                        onPointerDown={onPostTheaterPanPointerDown}
                        onWheel={onPostTheaterWheelZoom}
                        onClick={(ev) => ev.stopPropagation()}
                        className={`box-border flex min-h-0 min-w-0 w-full flex-1 overflow-auto overscroll-contain p-4 sm:p-8 ${
                          postTheaterZoom > 1
                            ? 'cursor-grab select-none touch-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                            : ''
                        }`}
                      >
                        <img
                          src={curUrl}
                          alt=""
                          draggable={false}
                          title={
                            postTheaterZoom > 1
                              ? 'Kéo để xem vùng khác; chạm nhẹ vào ảnh để phóng thêm'
                              : 'Bấm để phóng thêm; khi tối đa bấm lại để vừa khung'
                          }
                          className={`m-auto block object-contain transition-[width,max-width,max-height] duration-200 ease-out ${
                            postTheaterZoom >= 4 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                          }`}
                          style={
                            postTheaterZoom <= 1
                              ? {
                                  width: 'auto',
                                  height: 'auto',
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                }
                              : {
                                  width: `${100 * postTheaterZoom}%`,
                                  maxWidth: 'none',
                                  maxHeight: 'none',
                                }
                          }
                          onClick={
                            postTheaterZoom <= 1
                              ? (ev) => {
                                  ev.stopPropagation();
                                  setPostTheaterZoom((z) => {
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
                  <div className="shrink-0 p-4 border-b border-[var(--fb-divider)]">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-2 min-w-0 text-left rounded-lg hover:bg-[var(--fb-hover)] px-1 py-0.5 -mx-1 transition-colors"
                        onClick={() => {
                          const aid = livePost.author?._id || livePost.author?.id || livePost.author;
                          if (aid) navigate(`/profile/${aid}`);
                        }}
                      >
                        <img
                          src={resolveAvatarUrl(livePost.author?.avatar, livePost.author?.name, '1877f2')}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[var(--fb-divider)]"
                          onError={withAvatarFallback(livePost.author?.name, '1877f2')}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[15px] text-[var(--fb-text-primary)] truncate">
                            {livePost.author?.name || 'Thành viên'}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--fb-text-secondary)] mt-0.5">
                            <span>{formatTimeAgo(livePost.createdAt)}</span>
                            <Globe className="w-3.5 h-3.5 text-[var(--fb-text-secondary)]" aria-hidden />
                          </div>
                        </div>
                      </button>
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setTheaterPostMenuOpen((o) => !o)}
                          className="p-2 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-icon)]"
                          aria-expanded={theaterPostMenuOpen}
                          aria-haspopup="true"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {theaterPostMenuOpen ? (
                          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl z-30">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-amber-700 flex items-center gap-2"
                              onClick={() => {
                                setTheaterPostMenuOpen(false);
                                openSaveToCollectionModal(livePost._id);
                              }}
                            >
                              <Bookmark className={`w-4 h-4 ${savedPosts.has(livePost._id) ? 'fill-current' : ''}`} />
                              {savedPosts.has(livePost._id) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                            </button>
                            {isOwner ? (
                              <>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-blue-600"
                                  onClick={() => {
                                    setTheaterPostMenuOpen(false);
                                    closeImageTheater();
                                    handleOpenEditPost(livePost);
                                  }}
                                >
                                  Sửa bài viết
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-red-600"
                                  onClick={() => {
                                    setTheaterPostMenuOpen(false);
                                    closeImageTheater();
                                    handleDeletePost(livePost._id);
                                  }}
                                >
                                  Xóa bài viết
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-red-600"
                                onClick={() => {
                                  setTheaterPostMenuOpen(false);
                                  closeImageTheater();
                                  handleOpenReportModal(livePost);
                                }}
                              >
                                Báo cáo bài viết
                              </button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {cap ? (
                      <div className="mt-3 text-[15px] leading-relaxed text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">
                        {theaterCaptionExpanded || cap.length <= capTrunc ? cap : `${cap.slice(0, capTrunc)}…`}
                        {cap.length > capTrunc ? (
                          <button
                            type="button"
                            onClick={() => setTheaterCaptionExpanded((e) => !e)}
                            className="ml-1 font-semibold text-blue-600 hover:underline"
                          >
                            {theaterCaptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {livePost.tags && livePost.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {livePost.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 px-4 py-2.5 flex items-center justify-between text-xs text-[var(--fb-text-secondary)] border-t border-[var(--fb-divider)]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-[var(--fb-surface)] flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-[13px] tabular-nums text-[var(--fb-text-primary)]">{theaterLikeCount}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="hover:underline cursor-pointer text-[13px]">
                        {livePost.comments?.length || 0} bình luận
                      </span>
                      <span className="hover:underline cursor-pointer text-[13px]">
                        {livePost.shares || 0} chia sẻ
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex border-t border-[var(--fb-divider)] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => toggleLike(livePost._id)}
                      className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        likedPosts.has(livePost._id)
                          ? 'text-blue-600 hover:bg-blue-50'
                          : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${likedPosts.has(livePost._id) ? 'fill-current' : ''}`} />
                      {likedPosts.has(livePost._id) ? 'Đã thích' : 'Thích'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById('theater-comment-input')?.focus()
                      }
                      className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-blue-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Bình luận
                    </button>
                    <button
                      type="button"
                      onClick={() => openShareModal(livePost)}
                      disabled={shareSending && shareModalPost?._id === livePost._id}
                      className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Share2 className="w-5 h-5" />
                      {shareSending && shareModalPost?._id === livePost._id ? 'Đang gửi…' : 'Chia sẻ'}
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <PostCommentSection
                      key={String(livePost._id)}
                      user={user}
                      postId={livePost._id}
                      post={livePost}
                      isVisible
                      variant="theater"
                      onClose={() => {}}
                      onUpdatePost={(id, fn) =>
                        setPosts((prev) => prev.map((p) => (p._id === id ? fn(p) : p)))
                      }
                      onRequestRefresh={() => {
                        setTimeout(() => fetchData(), 1000);
                      }}
                    />
                  </div>
                </aside>
              </div>
            );
          })(),
          document.body
        )}

      {/* Report Post Modal */}
      {showReportModal && reportingPost && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Flag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Báo cáo bài viết</h3>
                    <p className="text-blue-100 text-sm mt-1">Vui lòng cho chúng tôi biết vấn đề</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportingPost(null);
                    setReportReason('');
                    setReportCategory('Spam');
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Post Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <img
                    src={resolveAvatarUrl(reportingPost.author?.avatar, reportingPost.author?.name, '3b82f6')}
                    alt={reportingPost.author?.name}
                    className="w-8 h-8 rounded-full"
                    onError={withAvatarFallback(reportingPost.author?.name, '3b82f6')}
                  />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{reportingPost.author?.name}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(reportingPost.createdAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{reportingPost.content}</p>
              </div>

              {/* Report Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại vi phạm
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Spam">Spam</option>
                  <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
                  <option value="Quấy rối">Quấy rối</option>
                  <option value="Thông tin sai lệch">Thông tin sai lệch</option>
                  <option value="Ngôn từ gây thù ghét">Ngôn từ gây thù ghét</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Report Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do báo cáo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Thông tin của bạn sẽ được bảo mật
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingPost(null);
                  setReportReason('');
                  setReportCategory('Spam');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Edit Post Modal - Sidebar Style like Chat */}
      {showEditPostModal && editingPost && typeof document !== 'undefined' && createPortal(
        <div 
          className="edit-post-window-fixed-absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[600px] h-[700px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ 
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            zIndex: 9997,
            transform: 'none'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 shadow-md flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Edit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Chỉnh sửa bài viết</h3>
                  <p className="text-blue-100 text-xs mt-0.5">Cập nhật nội dung bài viết của bạn</p>
                </div>
              </div>
              <button
                onClick={handleCloseEditPost}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
              {/* Content Textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung bài viết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="6"
                  placeholder="Bạn đang nghĩ gì?"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Danh mục
                </label>
                <select
                  value={editPostCategory}
                  onChange={(e) => setEditPostCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Học tập">Học tập</option>
                  <option value="Sự kiện">Sự kiện</option>
                  <option value="Thảo luận">Thảo luận</option>
                  {(canPostLecturerDocuments || editPostCategory === 'Tài liệu') && <option value="Tài liệu">Tài liệu giảng viên</option>}
                  <option value="Nhóm">Nhóm</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editPostTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveEditTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={editPostTagInput}
                    onChange={(e) => setEditPostTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditTag();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tag và nhấn Enter"
                  />
                  <button
                    onClick={handleAddEditTag}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Existing Images */}
              {editPostImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh hiện tại
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {editPostImages.map((image, index) => {
                      const imageUrl = image.startsWith('/uploads')
                        ? resolveMediaUrl(image)
                        : image;
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveEditImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Images */}
              {editPostNewImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh mới
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {editPostNewImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleRemoveEditNewImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thêm ảnh
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setEditPostNewImages([...editPostNewImages, ...files]);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Existing Files */}
              {editPostFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Files hiện tại
                  </label>
                  <div className="space-y-2">
                    {editPostFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">{file.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveEditFile(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Files */}
              {editPostNewFiles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Files mới
                  </label>
                  <div className="space-y-2">
                    {editPostNewFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveEditNewFile(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thêm files
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setEditPostNewFiles([...editPostNewFiles, ...files]);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="p-5 border-t border-gray-200 bg-white flex justify-end space-x-3 flex-shrink-0">
            <button
              onClick={handleCloseEditPost}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdatePost}
              disabled={!editPostContent.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              Cập nhật bài viết
            </button>
          </div>
        </div>
      , document.body)}

      {/* Group Settings Modal */}
      {showGroupSettingsModal && selectedGroup && (() => {
        const creatorId =
          selectedGroup.creator?._id != null
            ? String(selectedGroup.creator._id)
            : String(selectedGroup.creator);
        const uid = user?.id || user?._id;
        const selectedIsGroupCreator = String(creatorId) === String(uid);
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Cài đặt nhóm</h3>
                <button
                  onClick={() => setShowGroupSettingsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b bg-gray-50">
              <div className="flex space-x-1 px-6">
                {[
                  { id: 'general', label: 'Thông tin chung', icon: Settings },
                  { id: 'access', label: 'Quyền truy cập', icon: Lock },
                  { id: 'permissions', label: 'Quyền đăng bài', icon: FileText },
                  ...(selectedIsGroupCreator ? [{ id: 'appearance', label: 'Giao diện', icon: Image }] : [])
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id)}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeSettingsTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 inline mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* General Tab */}
              {activeSettingsTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhóm *</label>
                    <input
                      type="text"
                      value={groupSettingsForm.name}
                      onChange={(e) => setGroupSettingsForm({ ...groupSettingsForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tên nhóm..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                    <textarea
                      value={groupSettingsForm.description}
                      onChange={(e) => setGroupSettingsForm({ ...groupSettingsForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mô tả về nhóm..."
                      rows="4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                    <select
                      value={groupSettingsForm.category}
                      onChange={(e) => setGroupSettingsForm({ ...groupSettingsForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Học tập">Học tập</option>
                      <option value="Sự kiện">Sự kiện</option>
                      <option value="Dự án">Dự án</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags (phân cách bằng dấu phẩy)</label>
                    <input
                      type="text"
                      value={Array.isArray(groupSettingsForm.tags) ? groupSettingsForm.tags.join(', ') : groupSettingsForm.tags}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                        setGroupSettingsForm({ ...groupSettingsForm, tags });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ví dụ: Java, K17, Đồ án"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tags giúp người dùng tìm nhóm dễ dàng hơn</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nội quy nhóm</label>
                    <textarea
                      value={groupSettingsForm.rules}
                      onChange={(e) => setGroupSettingsForm({ ...groupSettingsForm, rules: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập nội quy của nhóm..."
                      rows="6"
                    />
                    <p className="text-xs text-gray-500 mt-1">Nội quy sẽ hiển thị cho tất cả thành viên</p>
                  </div>
                </div>
              )}

              {/* Access Tab */}
              {activeSettingsTab === 'access' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Quyền truy cập nhóm</label>
                    <div className="space-y-3">
                      {[
                        { value: 'public', label: 'Công khai', desc: 'Ai cũng có thể tìm thấy và tham gia nhóm' },
                        { value: 'private', label: 'Riêng tư', desc: 'Chỉ thành viên mới thấy nhóm' },
                        { value: 'approval', label: 'Yêu cầu phê duyệt', desc: 'Mọi người có thể yêu cầu tham gia, admin phê duyệt' },
                        { value: 'invite-only', label: 'Chỉ mời', desc: 'Chỉ admin mời mới tham gia được' }
                      ].map(option => (
                        <label key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="accessType"
                            value={option.value}
                            checked={groupSettingsForm.settings.accessType === option.value}
                            onChange={(e) => setGroupSettingsForm({
                              ...groupSettingsForm,
                              settings: { ...groupSettingsForm.settings, accessType: e.target.value }
                            })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-800">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeSettingsTab === 'permissions' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Quyền đăng bài</label>
                    <div className="space-y-3">
                      {[
                        { value: 'all-members', label: 'Tất cả thành viên', desc: 'Mọi thành viên đều có thể đăng bài' },
                        { value: 'admin-moderator', label: 'Chỉ Admin/Moderator', desc: 'Chỉ admin và moderator mới đăng được' },
                        { value: 'approval-required', label: 'Cần phê duyệt', desc: 'Thành viên đăng bài cần admin/mod phê duyệt' }
                      ].map(option => (
                        <label key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="postPermission"
                            value={option.value}
                            checked={groupSettingsForm.settings.postPermission === option.value}
                            onChange={(e) => setGroupSettingsForm({
                              ...groupSettingsForm,
                              settings: { ...groupSettingsForm.settings, postPermission: e.target.value }
                            })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-800">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Quyền bình luận</label>
                    <div className="space-y-3">
                      {[
                        { value: 'all-members', label: 'Tất cả thành viên', desc: 'Mọi thành viên đều có thể bình luận' },
                        { value: 'members-only', label: 'Chỉ thành viên', desc: 'Chỉ thành viên mới bình luận được' },
                        { value: 'disabled', label: 'Tắt bình luận', desc: 'Không cho phép bình luận' }
                      ].map(option => (
                        <label key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="commentPermission"
                            value={option.value}
                            checked={groupSettingsForm.settings.commentPermission === option.value}
                            onChange={(e) => setGroupSettingsForm({
                              ...groupSettingsForm,
                              settings: { ...groupSettingsForm.settings, commentPermission: e.target.value }
                            })}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-800">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSettingsForm.settings.allowFileUpload}
                        onChange={(e) => setGroupSettingsForm({
                          ...groupSettingsForm,
                          settings: { ...groupSettingsForm.settings, allowFileUpload: e.target.checked }
                        })}
                        className="w-5 h-5"
                      />
                      <div>
                        <div className="font-medium text-gray-800">Cho phép upload file</div>
                        <div className="text-sm text-gray-500">Thành viên có thể đính kèm file trong bài viết</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSettingsForm.settings.allowMemberInvite}
                        onChange={(e) => setGroupSettingsForm({
                          ...groupSettingsForm,
                          settings: { ...groupSettingsForm.settings, allowMemberInvite: e.target.checked }
                        })}
                        className="w-5 h-5"
                      />
                      <div>
                        <div className="font-medium text-gray-800">Cho phép thành viên mời người khác</div>
                        <div className="text-sm text-gray-500">Thành viên có thể mời bạn bè vào nhóm</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Appearance Tab — chỉ người tạo nhóm: một ảnh + emoji khi không ảnh */}
              {activeSettingsTab === 'appearance' && selectedIsGroupCreator && (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Ảnh nhóm (một ảnh duy nhất)
                    </label>
                    <div className="space-y-3">
                      {groupSettingsCoverFile ? (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(groupSettingsCoverFile)}
                            alt=""
                            className="h-48 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setGroupSettingsCoverFile(null)}
                            className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : groupSettingsForm.coverPhoto ? (
                        <div className="relative">
                          <img
                            src={
                              groupSettingsForm.coverPhoto.startsWith('http')
                                ? groupSettingsForm.coverPhoto
                                : resolveMediaUrl(groupSettingsForm.coverPhoto)
                            }
                            alt=""
                            className="h-48 w-full rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setGroupSettingsForm({ ...groupSettingsForm, coverPhoto: '' })}
                            className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) => {
                              if (e.target.files[0]) setGroupSettingsCoverFile(e.target.files[0]);
                            }}
                            className="hidden"
                            id="home-group-single-image-upload"
                          />
                          <label htmlFor="home-group-single-image-upload" className="cursor-pointer">
                            <Image className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                            <p className="text-gray-600">Chọn ảnh nhóm</p>
                            <p className="mt-1 text-xs text-gray-500">JPG, PNG, GIF, WebP — gợi ý tỉ lệ ngang (ví dụ 1200×400)</p>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Biểu tượng khi chưa có ảnh
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Hiển thị trên nền gradient nếu nhóm chưa tải ảnh.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['📚', '💡', '🎓', '📖', '✏️', '🔬', '💻', '🎨'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setGroupSettingsForm({ ...groupSettingsForm, avatar: emoji })}
                          className={`rounded-lg border-2 p-2 text-2xl ${
                            groupSettingsForm.avatar === emoji
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-6 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowGroupSettingsModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveGroupSettings}
                  disabled={!groupSettingsForm.name.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default UserHome;

