import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeft, MapPin, Calendar, Mail, BookOpen, Award, Users, MessageCircle, Heart, Share2, Bookmark, Search, ChevronLeft, ChevronRight, Image as ImageIcon, FileText, Download, X, Shield, Send, UserPlus, UserMinus, UserCheck, Clock, Trash2, MoreHorizontal, Camera, Edit, AlertCircle, Maximize2, ZoomIn, ZoomOut, Globe } from 'lucide-react';
import { PostCommentSection } from '../../components/PostCommentSection';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { formatTimeAgo } from '../../utils/formatTime';
import ImageUploadModal from '../../components/ImageUploadModal';
import PostImageGallery from '../../components/PostImageGallery';
import { useProfileMediaInteractionsViewModel } from '../../domains/profile/viewmodels/useProfileMediaInteractionsViewModel';
import { resolveMediaUrl, resolveAvatarUrlWithFallback } from '../../utils/mediaUrl';
import { getBackendOrigin } from '../../shared/config/runtimeConfig';
import { notify, confirmAsync } from '../../lib/notify';

function isProfilePostGalleryVideoPath(src) {
  if (!src || typeof src !== 'string') return false;
  return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(src);
}

export default function UserProfile() {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, updateUser } = useAuthStore();
  
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightboxMenu, setShowLightboxMenu] = useState(false);
  const [deletingLightboxImage, setDeletingLightboxImage] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none');
  const normalizedFriendStatus = useMemo(() => {
    const allowed = new Set(['none', 'request_sent', 'request_received', 'friends', 'self']);
    return allowed.has(friendStatus) ? friendStatus : 'none';
  }, [friendStatus]);

  const [followStatus, setFollowStatus] = useState('not_following'); // following | not_following
  const [actionLoading, setActionLoading] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsQuery, setFriendsQuery] = useState('');
  const [friendsSubTab, setFriendsSubTab] = useState('all'); // all | requests
  const [friendRequests, setFriendRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [openFriendMenuId, setOpenFriendMenuId] = useState(null);
  const [followingQuery, setFollowingQuery] = useState('');
  const [openFollowingMenuId, setOpenFollowingMenuId] = useState(null);
  const [savedSet, setSavedSet] = useState(() => new Set());
  const [likedPosts, setLikedPosts] = useState(() => new Set());
  const [showComments, setShowComments] = useState(() => new Set());
  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareFriendsList, setShareFriendsList] = useState([]);
  const [shareFriendsLoading, setShareFriendsLoading] = useState(false);
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareFriendQuery, setShareFriendQuery] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [profileImageTheater, setProfileImageTheater] = useState(null);
  const [profileTheaterPostMenuOpen, setProfileTheaterPostMenuOpen] = useState(false);
  const [profileTheaterCaptionExpanded, setProfileTheaterCaptionExpanded] = useState(false);
  const [profilePostTheaterZoom, setProfilePostTheaterZoom] = useState(1);
  const profilePostTheaterPanRef = useRef(null);
  const profilePostTheaterPanGestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    downTarget: null,
  });
  const [aboutSection, setAboutSection] = useState('overview'); // overview | contact | basic
  const [showEditAboutModal, setShowEditAboutModal] = useState(false);
  const [editAboutForm, setEditAboutForm] = useState({
    name: '',
    major: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    facebook: ''
  });
  const [editAboutError, setEditAboutError] = useState('');
  const [editAboutSaving, setEditAboutSaving] = useState(false);

  const profileId = useMemo(() => {
    const raw = routeUserId != null ? String(routeUserId).trim() : '';
    if (raw && raw !== 'undefined' && raw !== 'null') return raw;
    const fallback = currentUser?.id || currentUser?._id;
    return fallback ? String(fallback) : '';
  }, [routeUserId, currentUser?.id, currentUser?._id]);

  const isMe = String(currentUser?.id || currentUser?._id || '') === String(profileId || '');
  const uidStr = String(currentUser?.id || currentUser?._id || '');
  const isPostLikedFromPayload = (post) =>
    (post?.likes || []).some((like) => String(like?._id || like) === uidStr);
  const getFeedPostLikeDisplayCount = (post) =>
    (post?.likes?.length || 0) +
    (likedPosts.has(post._id) && !isPostLikedFromPayload(post) ? 1 : 0);

  const {
    profileMediaCommentInput,
    setProfileMediaCommentInput,
    profileMediaInteractions,
    toggleProfileMediaLike,
    shareProfileMedia,
    submitProfileMediaComment
  } = useProfileMediaInteractionsViewModel({ profileId, currentUser });

  useEffect(() => {
    const onDocDown = (e) => {
      if (!openFriendMenuId && !openFollowingMenuId) return;
      const target = e.target;
      if (target?.closest?.('.friend-menu-container')) return;
      if (target?.closest?.('.following-menu-container')) return;
      setOpenFriendMenuId(null);
      setOpenFollowingMenuId(null);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [openFriendMenuId, openFollowingMenuId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/posts/saved');
        const ids = (res.data?.posts || []).map(p => p?._id).filter(Boolean);
        setSavedSet(new Set(ids));
      } catch {
        setSavedSet(new Set());
      }
    };
    load();
    const handler = (e) => {
      const ids = e?.detail?.postIds;
      if (!Array.isArray(ids)) return;
      setSavedSet(new Set(ids));
    };
    window.addEventListener('savedPostsChanged', handler);
    return () => window.removeEventListener('savedPostsChanged', handler);
  }, []);

  const toggleSavePost = async (postId) => {
    if (!postId) return;
    const next = new Set(savedSet);
    try {
      if (next.has(postId)) {
        await api.delete(`/posts/${postId}/save`);
        next.delete(postId);
      } else {
        await api.post(`/posts/${postId}/save`);
        next.add(postId);
      }
      setSavedSet(next);
      window.dispatchEvent(new CustomEvent('savedPostsChanged', { detail: { postIds: Array.from(next) } }));
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi lưu bài viết');
    }
  };

  const handleUnfriendFromList = async (friendId) => {
    if (!friendId) return;
    if (!(await confirmAsync('Bạn có chắc chắn muốn hủy kết bạn?'))) return;
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => prev.filter((x) => String(x?._id || x?.id) !== String(friendId)));
      setOpenFriendMenuId(null);
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi hủy kết bạn');
    }
  };

  const filteredFollowing = useMemo(() => {
    const list = Array.isArray(profileUser?.following) ? profileUser.following : [];
    const q = String(followingQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => String(u?.name || '').toLowerCase().includes(q));
  }, [profileUser?.following, followingQuery]);

  const handleUnfollowFromList = async (targetUserId) => {
    if (!targetUserId) return;
    if (!(await confirmAsync('Bỏ theo dõi người này?'))) return;
    try {
      await api.delete(`/users/follow/${targetUserId}`);
      setProfileUser((prev) => {
        if (!prev) return prev;
        const nextFollowing = (prev.following || []).filter((u) => String(u?._id || u?.id || u) !== String(targetUserId));
        return { ...prev, following: nextFollowing };
      });
      setOpenFollowingMenuId(null);
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi bỏ theo dõi');
    }
  };

  const openEditAbout = () => {
    setEditAboutForm({
      name: profileUser?.name || currentUser?.name || '',
      major: profileUser?.major || currentUser?.major || '',
      bio: profileUser?.bio || '',
      location: profileUser?.location || '',
      phone: profileUser?.phone || '',
      website: profileUser?.website || '',
      facebook: profileUser?.facebook || ''
    });
    setEditAboutError('');
    setShowEditAboutModal(true);
  };

  const handleEditAboutChange = (e) => {
    const { name, value } = e.target;
    setEditAboutForm((prev) => ({ ...prev, [name]: value }));
    setEditAboutError('');
  };

  const handleSubmitEditAbout = async () => {
    try {
      setEditAboutSaving(true);
      setEditAboutError('');
      const name = (editAboutForm.name || '').trim();
      const major = (editAboutForm.major || '').trim();
      if (!name) {
        setEditAboutError('Vui lòng nhập họ và tên');
        return;
      }
      const payload = {
        name,
        major,
        bio: editAboutForm.bio ?? '',
        location: editAboutForm.location ?? '',
        phone: editAboutForm.phone ?? '',
        website: editAboutForm.website ?? '',
        facebook: editAboutForm.facebook ?? ''
      };
      const res = await api.put('/users/profile', payload);
      if (res?.data?.user) {
        updateUser(res.data.user);
        setProfileUser((prev) => (prev ? { ...prev, ...res.data.user } : res.data.user));
      } else {
        setProfileUser((prev) => (prev ? { ...prev, ...payload } : prev));
      }
      setShowEditAboutModal(false);
    } catch (error) {
      setEditAboutError(error.response?.data?.message || 'Lỗi cập nhật giới thiệu');
    } finally {
      setEditAboutSaving(false);
    }
  };

  // Allow deep-linking to a specific tab/sub-tab
  useEffect(() => {
    const sp = new URLSearchParams(location.search || '');
    const tab = sp.get('tab');
    const sub = sp.get('sub');

    if (tab && ['posts', 'about', 'friends', 'photos'].includes(tab)) {
      setActiveTab(tab);
    }

    if (tab === 'friends') {
      if (sub === 'requests') {
        setFriendsSubTab('requests');
        fetchFriendRequests();
      } else if (sub === 'following') {
        setFriendsSubTab('following');
      } else if (sub === 'all') {
        setFriendsSubTab('all');
      }
    }
  }, [location.search, profileId]);

  // Follow status
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!profileId || isMe) return;
      try {
        const res = await api.get(`/users/follow/status/${profileId}`);
        const st = res.data?.status;
        setFollowStatus(st === 'following' ? 'following' : 'not_following');
      } catch {
        setFollowStatus('not_following');
      }
    };
    loadFollowStatus();
  }, [profileId, isMe]);

  const handleToggleFollow = async () => {
    if (!profileId || isMe) return;
    try {
      setActionLoading(true);
      if (followStatus === 'following') {
        await api.delete(`/users/follow/${profileId}`);
        setFollowStatus('not_following');
        setProfileUser((prev) => (prev ? { ...prev, followers: (prev.followers || []).filter((id) => String(id) !== String(currentUser?.id)) } : prev));
      } else {
        await api.post(`/users/follow/${profileId}`);
        setFollowStatus('following');
        setProfileUser((prev) => (prev ? { ...prev, followers: [...(prev.followers || []), currentUser?.id].filter(Boolean) } : prev));
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Lỗi theo dõi');
    } finally {
      setActionLoading(false);
    }
  };

  const resolveAvatarUrl = (avatar, name, background = '3b82f6') => {
    return resolveAvatarUrlWithFallback(avatar, name, background);
  };

  const resolveCoverUrl = (cover) => {
    return resolveMediaUrl(cover);
  };

  const resolvePostImageSrc = (src) => {
    return resolveMediaUrl(src);
  };

  const withAvatarFallback = (name, background = '1877f2') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    fetchUserProfile();
    fetchUserPosts();
    fetchFriends();
    if (String(profileId) !== String(currentUser?.id || currentUser?._id || '')) {
      fetchFriendStatus();
    }
  }, [profileId, currentUser?.id, currentUser?._id]);

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
  }, [userPosts, activeTab]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPostOptions && !event.target.closest('.post-options-container')) {
        setShowPostOptions(null);
      }
    };

    if (showPostOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPostOptions]);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get(`/users/${profileId}`);
      setProfileUser(res.data.user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await api.get(`/posts?author=${profileId}&status=approved`);
      const posts = res.data.posts || [];
      setUserPosts(posts);
      const liked = new Set();
      const uid = String(currentUser?.id || currentUser?._id || '');
      posts.forEach((post) => {
        if ((post.likes || []).some((like) => String(like?._id || like) === uid)) {
          liked.add(post._id);
        }
      });
      setLikedPosts(liked);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const res = isMe
        ? await api.get('/friends')
        : await api.get(`/friends/user/${profileId}`);
      setFriends(res.data?.friends || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    if (!isMe) return;
    try {
      setRequestsLoading(true);
      const res = await api.get('/friends/requests');
      setFriendRequests(res.data?.requests || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      setFriendRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (fromUserId) => {
    try {
      setActionLoading(true);
      await api.put(`/friends/accept/${fromUserId}`);
      setFriendRequests((prev) => prev.filter((r) => (r.from?._id || r.from?.id) !== fromUserId));
      fetchFriends();
      fetchUserProfile();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      notify('Lỗi khi chấp nhận lời mời');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectFriendRequest = async (fromUserId) => {
    try {
      setActionLoading(true);
      await api.put(`/friends/reject/${fromUserId}`);
      setFriendRequests((prev) => prev.filter((r) => (r.from?._id || r.from?.id) !== fromUserId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      notify('Lỗi khi từ chối lời mời');
    } finally {
      setActionLoading(false);
    }
  };

  const openLightbox = (imageUrl, index = 0) => {
    setLightboxImage(imageUrl);
    setLightboxIndex(index);
    setShowLightboxMenu(false);
    setShowImageLightbox(true);
  };

  const goLightbox = (direction) => {
    if (!allPhotoUrls?.length) return;
    const next = (lightboxIndex + direction + allPhotoUrls.length) % allPhotoUrls.length;
    setLightboxIndex(next);
    setLightboxImage(allPhotoUrls[next]);
    setShowLightboxMenu(false);
  };

  const handleDeleteCurrentLightboxImage = async () => {
    const photo = currentLightboxPhoto;
    if (!photo || photo.type !== 'post-image' || !photo.postId) {
      notify('Ảnh này không hỗ trợ xóa từ màn hình xem nhanh.');
      return;
    }

    const post = userPosts.find((p) => String(p._id) === String(photo.postId));
    if (!post) {
      notify('Không tìm thấy bài viết chứa ảnh này.');
      return;
    }

    const nextImages = (post.images || []).filter((img) => String(img || '') !== String(photo.raw || ''));
    if (nextImages.length === (post.images || []).length) {
      notify('Không thể xác định ảnh cần xóa.');
      return;
    }

    if (!(await confirmAsync('Bạn có chắc muốn xóa ảnh này?'))) return;

    try {
      setDeletingLightboxImage(true);
      setShowLightboxMenu(false);
      const formData = new FormData();
      formData.append('existingImages', JSON.stringify(nextImages));
      const res = await api.put(`/posts/${post._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedPost = res?.data?.post;
      setUserPosts((prev) =>
        prev.map((p) => (String(p._id) === String(post._id) ? (updatedPost || { ...p, images: nextImages }) : p))
      );
    } catch (error) {
      console.error('Delete image failed:', error);
      notify(error.response?.data?.message || 'Xóa ảnh thất bại');
    } finally {
      setDeletingLightboxImage(false);
    }
  };

  const handleDownloadFile = (file) => {
    if (!file?.url) {
      notify(`📥 Đang tải xuống: ${file?.name || 'file'}`);
      return;
    }
    const fileUrl = resolveMediaUrl(file.url);
    const fileName = file.name || file.url.split('/').pop() || 'download';
    window.open(
      `${getBackendOrigin()}/api/files/download-url?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`,
      '_blank'
    );
  };

  const postAttachmentUrl = (file) => {
    const raw = file.url || '';
    if (!raw) return '';
    return resolveMediaUrl(raw);
  };

  const videoPreviewSrc = (src) => {
    if (!src || typeof src !== 'string') return '';
    return src.includes('#') ? src : `${src}#t=0.1`;
  };

  const isPostAttachmentVideo = (file) => {
    const mime = file.mimeType || file.type || '';
    const name = file.name || '';
    const raw = file.url || '';
    if (mime.startsWith('video/')) return true;
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(raw);
  };

  const handleDeletePost = async (postId) => {
    if (!(await confirmAsync('Bạn có chắc chắn muốn xóa bài viết này?'))) {
      return;
    }

    try {
      await api.delete(`/posts/${postId}`);
      notify('✅ Đã xóa bài viết thành công!');

      setProfileImageTheater((t) => (t?.post?._id === postId ? null : t));
      setProfileTheaterPostMenuOpen(false);

      // Remove post from state
      setUserPosts(userPosts.filter(post => post._id !== postId));
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId } }));
      
      // Close post options if open
      setShowPostOptions(null);
      
      // Refresh profile to update post count
      fetchUserProfile();
    } catch (error) {
      console.error('Error deleting post:', error);
      notify('❌ Lỗi xóa bài viết: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAvatarUploadSuccess = (newAvatar) => {
    setProfileUser({ ...profileUser, avatar: newAvatar });
    // Update current user in store nếu là trang của chính mình
    if (isMe) {
      const { updateUser } = useAuthStore.getState();
      updateUser({ avatar: newAvatar });
    }
    notify('✅ Cập nhật ảnh đại diện thành công!');
  };

  const handleCoverUploadSuccess = (newCoverPhoto) => {
    setProfileUser({ ...profileUser, coverPhoto: newCoverPhoto });
    notify('✅ Cập nhật ảnh bìa thành công!');
  };

  const fetchFriendStatus = async () => {
    try {
      const res = await api.get(`/friends/status/${profileId}`);
      const status = res.data?.status;
      setFriendStatus(status || 'none');
    } catch (error) {
      console.error('Error fetching friend status:', error);
      setFriendStatus('none');
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      setActionLoading(true);
      await api.post(`/friends/request/${profileId}`);
      setFriendStatus('request_sent');
      notify('✅ Đã gửi lời mời kết bạn');
    } catch (error) {
      console.error('Error sending friend request:', error);
      notify(error.response?.data?.message || 'Lỗi khi gửi lời mời kết bạn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/friends/request/${profileId}`);
      setFriendStatus('none');
      notify('✅ Đã hủy lời mời kết bạn');
    } catch (error) {
      console.error('Error canceling request:', error);
      notify('Lỗi khi hủy lời mời');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      await api.put(`/friends/accept/${profileId}`);
      setFriendStatus('friends');
      notify('✅ Đã chấp nhận lời mời kết bạn');
    } catch (error) {
      console.error('Error accepting request:', error);
      notify('Lỗi khi chấp nhận lời mời');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setActionLoading(true);
      await api.put(`/friends/reject/${profileId}`);
      setFriendStatus('none');
      notify('✅ Đã từ chối lời mời kết bạn');
    } catch (error) {
      console.error('Error rejecting request:', error);
      notify('Lỗi khi từ chối lời mời');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!(await confirmAsync('Bạn có chắc muốn hủy kết bạn?'))) return;
    
    try {
      setActionLoading(true);
      await api.delete(`/friends/${profileId}`);
      setFriendStatus('none');
      notify('✅ Đã hủy kết bạn');
    } catch (error) {
      console.error('Error unfriending:', error);
      notify('Lỗi khi hủy kết bạn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      // Get or create conversation
      const res = await api.get(`/messages/conversation/${profileId}`);
      // Open chat directly without navigating away
      window.dispatchEvent(new CustomEvent('openChat', { 
        detail: { 
          conversationId: res.data.conversation._id,
          userId: profileId // Pass userId to help find conversation faster
        } 
      }));
    } catch (error) {
      console.error('Error starting chat:', error);
      notify('Lỗi khi mở chat');
    }
  };

  const handleStartChatWithUser = async (targetUserId) => {
    try {
      const res = await api.get(`/messages/conversation/${targetUserId}`);
      window.dispatchEvent(new CustomEvent('openChat', {
        detail: {
          conversationId: res.data.conversation._id,
          userId: targetUserId
        }
      }));
    } catch (error) {
      console.error('Error starting chat with user:', error);
      notify('Lỗi khi mở chat');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const profileTabs = useMemo(() => ([
    { id: 'posts', label: 'Tất cả' },
    { id: 'about', label: 'Giới thiệu' },
    { id: 'friends', label: 'Bạn bè' },
    { id: 'photos', label: 'Ảnh' },
  ]), []);

  const allPhotos = useMemo(() => {
    const items = [];
    if (profileUser?.avatar) {
      const url = resolveAvatarUrl(profileUser.avatar, profileUser.name, '3b82f6');
      items.push({ url, type: 'avatar', key: `avatar:${url}` });
    }
    if (profileUser?.coverPhoto) {
      const url = resolveCoverUrl(profileUser.coverPhoto);
      items.push({ url, type: 'cover', key: `cover:${url}` });
    }

    for (const post of userPosts || []) {
      for (const img of post?.images || []) {
        const raw = String(img || '');
        if (!raw) continue;
        const url = resolveMediaUrl(raw);
        items.push({
          url,
          raw,
          type: 'post-image',
          postId: post?._id,
          key: `post:${post?._id}:${raw}`
        });
      }
    }

    // Deduplicate while preserving order
    const seen = new Set();
    return items.filter((item) => {
      if (!item?.url) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [profileUser?.avatar, profileUser?.coverPhoto, profileUser?.name, userPosts]);

  const allPhotoUrls = useMemo(() => allPhotos.map((p) => p.url), [allPhotos]);
  const currentLightboxPhoto = useMemo(
    () => (lightboxIndex >= 0 && lightboxIndex < allPhotos.length ? allPhotos[lightboxIndex] : null),
    [allPhotos, lightboxIndex]
  );

  const filteredFriends = useMemo(() => {
    const q = friendsQuery.trim().toLowerCase();
    if (!q) return friends;
    return (friends || []).filter((f) => String(f?.name || '').toLowerCase().includes(q));
  }, [friends, friendsQuery]);

  const filteredShareFriends = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return shareFriendsList;
    return shareFriendsList.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [shareFriendsList, shareFriendQuery]);

  const openPhotoAtIndex = (index) => {
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= allPhotos.length) return;
    const photo = allPhotos[idx];
    if (!photo) return;

    // Tab Ảnh: nếu URL thuộc bất kỳ ảnh nào trong bài viết thì luôn mở theater đầy đủ như ảnh mẫu.
    const matchedPost = (userPosts || []).find((p) =>
      (p.images || []).some((img) => {
        const raw = String(img || '');
        if (!raw) return false;
        const resolved = resolveMediaUrl(raw);
        return resolved === photo.url;
      })
    );
    if (matchedPost) {
      const postImageIndex = (matchedPost.images || []).findIndex((img) => {
        const raw = String(img || '');
        if (!raw) return false;
        const resolved = resolveMediaUrl(raw);
        return resolved === photo.url;
      });
      openProfileImageTheater(matchedPost, postImageIndex >= 0 ? postImageIndex : 0);
      return;
    }

    // Ảnh đại diện/ảnh bìa: mở cùng theater để giao diện đồng nhất.
    openProfileImageTheater(
      {
        _id: null,
        author: {
          _id: profileUser?._id || profileUser?.id || currentUser?.id || currentUser?._id,
          name: profileUser?.name || currentUser?.name || 'Thành viên',
          avatar: profileUser?.avatar || currentUser?.avatar || '',
        },
        content: photo.type === 'avatar' ? 'Ảnh đại diện' : 'Ảnh bìa',
        images: [photo.url],
        likes: [],
        comments: [],
        shares: 0,
        tags: [],
        __mediaType: photo.type,
        createdAt: profileUser?.updatedAt || profileUser?.createdAt || new Date().toISOString(),
      },
      0
    );
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleLike = async (postId) => {
    const newLiked = new Set(likedPosts);
    const uid = currentUser?.id || currentUser?._id;
    try {
      if (newLiked.has(postId)) {
        await api.delete(`/posts/${postId}/like`);
        newLiked.delete(postId);
      } else {
        await api.post(`/posts/${postId}/like`);
        newLiked.add(postId);
      }
      setLikedPosts(newLiked);
      setUserPosts((posts) =>
        posts.map((post) => {
          if (post._id !== postId) return post;
          const likedByPayload = (post.likes || []).some((l) => String(l?._id || l) === String(uid));
          if (newLiked.has(postId)) {
            if (likedByPayload) return post;
            return { ...post, likes: [...(post.likes || []), uid] };
          }
          return {
            ...post,
            likes: (post.likes || []).filter((id) => String(id?._id || id) !== String(uid)),
          };
        })
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      notify(error.response?.data?.message || 'Lỗi thích bài viết');
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
    const messageText = `${currentUser?.name || 'Một người bạn'} đã chia sẻ bài viết với bạn:\n\n${preview ? `“${preview}”\n\n` : ''}Xem tại: ${postUrl}`;

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
        setUserPosts((prev) =>
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

  const openProfileImageTheater = (post, imageIndex = 0) => {
    const imgs = (post?.images || []).filter((x) => typeof x === 'string');
    if (!post || imgs.length === 0) return;
    const n = imgs.length;
    const idx = Math.min(Math.max(0, imageIndex), n - 1);
    setProfileTheaterCaptionExpanded(false);
    setProfileTheaterPostMenuOpen(false);
    setProfilePostTheaterZoom(1);
    setProfileImageTheater({ post, imageIndex: idx });
    requestAnimationFrame(() => {
      profilePostTheaterPanRef.current?.scrollTo(0, 0);
    });
  };

  const closeProfileImageTheater = () => {
    const g = profilePostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    profilePostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setProfilePostTheaterZoom(1);
    profilePostTheaterPanRef.current?.scrollTo(0, 0);
    setProfileImageTheater(null);
    setProfileTheaterPostMenuOpen(false);
  };

  useEffect(() => {
    if (!profileImageTheater) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [profileImageTheater]);

  useEffect(() => {
    if (!profileImageTheater) return;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        const g = profilePostTheaterPanGestureRef.current;
        if (g && typeof g.detachWindowPan === 'function') {
          g.detachWindowPan();
          g.detachWindowPan = null;
        }
        g.active = false;
        g.pointerId = null;
        profilePostTheaterPanRef.current?.classList.remove('cursor-grabbing');
        setProfilePostTheaterZoom(1);
        profilePostTheaterPanRef.current?.scrollTo(0, 0);
        setProfileImageTheater(null);
        setProfileTheaterPostMenuOpen(false);
        return;
      }
      const imgs = (profileImageTheater.post?.images || []).filter((x) => typeof x === 'string');
      if (imgs.length <= 1) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setProfileImageTheater((t) => {
          if (!t) return t;
          const list = (t.post?.images || []).filter((x) => typeof x === 'string');
          const n = list.length;
          if (n <= 1) return t;
          return { ...t, imageIndex: (t.imageIndex - 1 + n) % n };
        });
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setProfileImageTheater((t) => {
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
  }, [profileImageTheater]);

  useEffect(() => {
    if (!profileImageTheater) return;
    const g = profilePostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    profilePostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setProfilePostTheaterZoom(1);
    profilePostTheaterPanRef.current?.scrollTo(0, 0);
  }, [profileImageTheater?.post?._id, profileImageTheater?.imageIndex]);

  useEffect(() => {
    if (activeTab !== 'friends') return;
    if (!isMe) return;
    fetchFriendRequests();
  }, [activeTab, isMe]);

  useEffect(() => {
    if (!showImageLightbox) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowImageLightbox(false);
      if (e.key === 'ArrowLeft') goLightbox(-1);
      if (e.key === 'ArrowRight') goLightbox(1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showImageLightbox, lightboxIndex, allPhotoUrls.length]);

  useEffect(() => {
    if (!showImageLightbox) return;
    const n = allPhotoUrls.length;
    if (n === 0) {
      setShowImageLightbox(false);
      setShowLightboxMenu(false);
      return;
    }
    if (lightboxIndex >= n) {
      const next = n - 1;
      setLightboxIndex(next);
      setLightboxImage(allPhotoUrls[next]);
      return;
    }
    const expected = allPhotoUrls[lightboxIndex];
    if (expected && lightboxImage !== expected) {
      setLightboxImage(expected);
    }
  }, [showImageLightbox, allPhotoUrls, lightboxIndex, lightboxImage]);

  const PostCard = ({ post }) => (
    <div className="mb-4 bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] shadow-sm transition-shadow overflow-hidden max-lg:mb-0 max-lg:rounded-none max-lg:border-x-0 max-lg:shadow-none lg:mb-4 lg:hover:shadow-md">
      {/* Post Header */}
      <div className="p-4 border-b border-[var(--fb-divider)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={resolveAvatarUrl(profileUser.avatar, profileUser.name, '3b82f6')}
              alt={profileUser.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-[var(--fb-text-primary)]">{profileUser.name}</h3>
                {profileUser.role === 'admin' && (
                  <Shield className="w-4 h-4 text-purple-600" title="Admin" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-[var(--fb-text-secondary)]">
                <span className="text-blue-600 font-medium">{profileUser.studentRole}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
              {post.category || 'Khác'}
            </span>
            {/* Chỉ hiển thị nút xóa nếu đang xem trang của chính mình */}
            {isMe && (
              <div className="relative post-options-container">
                <button 
                  onClick={() => setShowPostOptions(showPostOptions === post._id ? null : post._id)}
                  className="p-2 hover:bg-[var(--fb-hover)] rounded-full transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5 text-[var(--fb-icon)]" />
                </button>
                
                {showPostOptions === post._id && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--fb-surface)] rounded-xl shadow-xl border border-[var(--fb-divider)] z-50 py-1">
                    <button
                      onClick={() => {
                        setShowPostOptions(null);
                        toggleSavePost(post._id);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-amber-50 transition-colors text-amber-700"
                    >
                      <Bookmark className={`w-4 h-4 ${savedSet.has(post._id) ? 'fill-current' : ''}`} />
                      <span className="font-medium">{savedSet.has(post._id) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        {post.title && (
          <h3 className="text-lg font-bold text-[var(--fb-text-primary)] mb-2">{post.title}</h3>
        )}
        <p className="text-[var(--fb-text-primary)] whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{post.content}</p>

        {/* Post Images — bố cục kiểu Facebook */}
        {post.images && post.images.length > 0 && (
          <div className="mt-4">
            <PostImageGallery
              images={post.images}
              resolveUrl={(raw) =>
                resolveMediaUrl(raw)
              }
              isVideo={isProfilePostGalleryVideoPath}
              videoPreviewSrc={videoPreviewSrc}
              onCellClick={(idx) => {
                openProfileImageTheater(post, idx);
              }}
            />
          </div>
        )}

        {/* Post Files / video */}
        {post.files && post.files.length > 0 && (
          <div className="mt-4 space-y-3">
            {post.files.map((file, idx) =>
              isPostAttachmentVideo(file) && postAttachmentUrl(file) ? (
                <div key={idx}>
                  <video
                    src={videoPreviewSrc(postAttachmentUrl(file))}
                    controls
                    playsInline
                    preload="metadata"
                    data-scroll-autoplay="true"
                    className="w-full max-h-[480px] rounded-xl bg-black"
                  />
                  {file.name ? (
                    <p className="text-xs text-[var(--fb-text-secondary)] truncate mt-1">{file.name}</p>
                  ) : null}
                </div>
              ) : (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[var(--fb-input)] rounded-xl border border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--fb-text-primary)] text-sm">{file.name}</p>
                      <p className="text-xs text-[var(--fb-text-secondary)]">{file.size} • {(file.mimeType || file.type || 'unknown')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải xuống</span>
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-1 bg-[var(--fb-input)] text-[var(--fb-text-secondary)] text-xs rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats — giống trang chủ */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs text-[var(--fb-text-secondary)] border-t border-[var(--fb-divider)]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center -space-x-1">
            <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-[var(--fb-surface)] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <span className="text-[13px] tabular-nums">{getFeedPostLikeDisplayCount(post)}</span>
        </div>
        <div className="flex space-x-4">
          <span className="hover:underline cursor-pointer text-[13px]">{post.comments?.length || 0} bình luận</span>
          <span className="hover:underline cursor-pointer text-[13px]">{post.shares || 0} chia sẻ</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center justify-around border-t border-[var(--fb-divider)]">
        <button
          type="button"
          onClick={() => toggleLike(post._id)}
          className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors flex-1 ${
            likedPosts.has(post._id)
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
          }`}
        >
          <Heart className={`w-5 h-5 ${likedPosts.has(post._id) ? 'fill-current' : ''}`} />
          <span className="font-medium text-sm">{likedPosts.has(post._id) ? 'Đã thích' : 'Thích'}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleComments(post._id)}
          className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors flex-1 ${
            showComments.has(post._id)
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Bình luận</span>
        </button>
        <button
          type="button"
          onClick={() => openShareModal(post)}
          disabled={shareSending && shareModalPost?._id === post._id}
          title="Chia sẻ bài viết tới bạn bè"
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors flex-1 disabled:opacity-60 disabled:cursor-wait"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-medium text-sm">
            {shareSending && shareModalPost?._id === post._id ? 'Đang gửi…' : 'Chia sẻ'}
          </span>
        </button>
      </div>

      <PostCommentSection
        user={currentUser}
        postId={post._id}
        post={post}
        isVisible={showComments.has(post._id)}
        onClose={() => toggleComments(post._id)}
        onUpdatePost={(id, fn) =>
          setUserPosts((prev) => prev.map((p) => (p._id === id ? fn(p) : p)))
        }
        onRequestRefresh={() => {
          setTimeout(() => fetchUserPosts(), 1000);
        }}
        onOpenImageTheater={(idx) => openProfileImageTheater(post, idx)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fb-app)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-[var(--fb-text-secondary)]">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[var(--fb-app)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--fb-text-secondary)]">Không tìm thấy người dùng</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--fb-app)] animate-fadeIn">
      {/* Profile Header (Facebook-like) */}
      <div className="bg-[var(--fb-surface)] border-b border-[var(--fb-divider)]">
        <div className="max-w-6xl mx-auto px-0 sm:px-2 lg:px-4">
          {/* Cover */}
          <div className="relative">
            <div className="h-[220px] sm:h-[300px] rounded-b-xl overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              {profileUser.coverPhoto ? (
                <img
                  src={resolveCoverUrl(profileUser.coverPhoto)}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>

            {isMe && (
              <button
                onClick={() => setShowCoverModal(true)}
                className="absolute bottom-3 right-3 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2.5 rounded-xl flex items-center space-x-2 border border-gray-200 shadow-md transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {profileUser.coverPhoto ? 'Chỉnh sửa ảnh bìa' : 'Thêm ảnh bìa'}
                </span>
              </button>
            )}
          </div>

          {/* Header Info Row */}
          <div className="px-2 sm:px-4 pb-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 -mt-8 sm:-mt-14">
              <div className="flex items-start sm:items-end gap-3 sm:gap-4 min-w-0">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={resolveAvatarUrl(profileUser.avatar, profileUser.name, '3b82f6')}
                    alt={profileUser.name}
                    className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-[var(--fb-surface)] shadow-md object-cover bg-[var(--fb-surface)]"
                  />
                  {isMe && (
                    <button
                      onClick={() => setShowAvatarModal(true)}
                      className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-[var(--fb-surface)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] rounded-full p-1.5 sm:p-2 border border-[var(--fb-divider)] shadow-sm transition-colors"
                      title="Thay đổi ảnh đại diện"
                    >
                      <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>

                {/* Name + meta */}
                <div className="min-w-0 pt-1 sm:pb-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-[28px] leading-tight font-extrabold text-[var(--fb-text-primary)] break-words">
                      {profileUser.name}
                    </h1>
                    {profileUser.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">Admin</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm text-[var(--fb-text-secondary)]">
                    {profileUser.studentRole && (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                        <Award className="w-4 h-4" />
                        {profileUser.studentRole}
                      </span>
                    )}
                    {profileUser.major && (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {profileUser.major}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {profileUser.friends?.length || 0} bạn bè
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap md:justify-end gap-2 pb-2">
                {isMe ? (
                  <>
                    <button
                      onClick={openEditAbout}
                      className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors"
                    >
                      Chỉnh sửa thông tin
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openSavedPosts'))}
                      className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors"
                    >
                      Đã lưu
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartChat}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Nhắn tin
                    </button>

                    {normalizedFriendStatus === 'none' && (
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <UserPlus className="w-4 h-4" />
                        Kết bạn
                      </button>
                    )}

                    {normalizedFriendStatus === 'request_sent' && (
                      <button
                        onClick={handleCancelRequest}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <Clock className="w-4 h-4" />
                        Đã gửi lời mời
                      </button>
                    )}

                    {normalizedFriendStatus === 'request_received' && (
                      <>
                        <button
                          onClick={handleAcceptRequest}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          Chấp nhận
                        </button>
                        <button
                          onClick={handleRejectRequest}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {normalizedFriendStatus === 'friends' && (
                      <button
                        onClick={handleUnfriend}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        Bạn bè
                      </button>
                    )}

                    <button
                      onClick={handleToggleFollow}
                      disabled={actionLoading}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50 ${
                        followStatus === 'following'
                          ? 'bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)]'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      title={followStatus === 'following' ? 'Bỏ theo dõi' : 'Theo dõi'}
                    >
                      <Users className="w-4 h-4" />
                      {followStatus === 'following' ? 'Đang theo dõi' : 'Theo dõi'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex items-center justify-between border-t border-[var(--fb-divider)]">
              <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                {profileTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                      activeTab === t.id
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    {t.id === 'posts' ? `${t.label} (${userPosts.length})` : t.label}
                  </button>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-2 py-1">
                <button
                  onClick={() => navigate(-1)}
                  className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors inline-flex items-center gap-2"
                  title="Quay lại"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-0 sm:px-2 lg:px-4 max-lg:pt-0 pb-4 lg:py-4">
        {activeTab === 'posts' ? (
          <div className="grid grid-cols-1 items-start gap-0 md:grid-cols-12 lg:gap-4">
            {/* Left column */}
            <aside className="md:col-span-5 lg:col-span-5 xl:col-span-4 space-y-0 max-lg:divide-y max-lg:divide-[var(--fb-divider)] max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm max-lg:overflow-hidden lg:sticky lg:top-[76px] lg:self-start lg:space-y-4 lg:border-0 lg:bg-transparent lg:shadow-none">
              {/* Intro */}
              <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Giới thiệu</h2>
                  {isMe && (
                    <button
                      onClick={openEditAbout}
                      className="px-3 py-1.5 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] text-sm font-semibold transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>
                {profileUser.bio && (
                  <p className="text-[var(--fb-text-primary)] mb-3 whitespace-pre-wrap">{profileUser.bio}</p>
                )}
                <div className="space-y-2 text-[var(--fb-text-primary)]">
                  {profileUser.major && (
                    <div className="flex items-center gap-2 text-[var(--fb-text-secondary)]">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm">
                        Học <span className="font-semibold text-[var(--fb-text-primary)]">{profileUser.major}</span>
                      </span>
                    </div>
                  )}
                  {profileUser.email && (
                    <div className="flex items-center gap-2 text-[var(--fb-text-secondary)]">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm break-all">
                        <span className="font-semibold text-[var(--fb-text-primary)]">{profileUser.email}</span>
                      </span>
                    </div>
                  )}
                  {profileUser.location && (
                    <div className="flex items-center gap-2 text-[var(--fb-text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">
                        Sống tại <span className="font-semibold text-[var(--fb-text-primary)]">{profileUser.location}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[var(--fb-text-secondary)]">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Tham gia <span className="font-semibold text-[var(--fb-text-primary)]">{formatDate(profileUser.createdAt)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos preview */}
              <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Ảnh</h2>
                  <button
                    onClick={() => setActiveTab('photos')}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Xem tất cả ảnh
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                  {allPhotoUrls.slice(0, 6).map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => openPhotoAtIndex(i)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-[var(--fb-input)] border border-[var(--fb-divider)]"
                      title="Xem ảnh"
                    >
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                        loading="lazy"
                      />
                    </button>
                  ))}
                  {allPhotoUrls.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-[var(--fb-input)] border border-[var(--fb-divider)]"
                      />
                    ))}
                </div>
                <p className="mt-3 text-sm text-[var(--fb-text-secondary)]">
                  {allPhotoUrls.length > 0 ? `${allPhotoUrls.length} ảnh` : 'Chưa có ảnh'}
                </p>
              </div>

              {/* Friends preview */}
              <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Bạn bè</h2>
                  <button
                    onClick={() => setActiveTab('friends')}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Xem tất cả bạn bè
                  </button>
                </div>
                <p className="text-sm text-[var(--fb-text-secondary)] mb-3">
                  {friendsLoading ? 'Đang tải...' : `${friends.length} bạn bè`}
                </p>
                <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                  {(friends || []).slice(0, 6).map((f) => (
                    <button
                      key={f._id || f.id || f.email || f.name}
                      type="button"
                      onClick={() => navigate(`/profile/${f._id || f.id}`)}
                      className="text-left space-y-2"
                      title={f.name}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-[var(--fb-input)] border border-[var(--fb-divider)]">
                        <img
                          src={resolveAvatarUrl(f.avatar, f.name, '1877f2')}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-semibold text-[var(--fb-text-primary)] truncate">
                        {f.name}
                      </div>
                    </button>
                  ))}
                  {(!friendsLoading && friends.length === 0) &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-square rounded-lg bg-[var(--fb-input)] border border-[var(--fb-divider)]" />
                        <div className="h-3 rounded bg-[var(--fb-input)] w-4/5" />
                      </div>
                    ))}
                </div>
              </div>
            </aside>

            {/* Right column */}
            <main className="md:col-span-7 lg:col-span-7 xl:col-span-8 max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm lg:border-0 lg:bg-transparent lg:shadow-none">
              <div className="mx-auto lg:mx-0 w-full max-w-[min(100%,760px)] 2xl:max-w-[820px] space-y-0 max-lg:divide-y max-lg:divide-[var(--fb-divider)] lg:space-y-4">
              {/* Composer (only me) */}
              {isMe && (
                <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatarUrl(profileUser.avatar, profileUser.name, '3b82f6')}
                      alt={profileUser.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <button
                      onClick={() => navigate('/home')}
                      className="flex-1 text-left px-4 py-2.5 bg-[var(--fb-input)] rounded-full text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors text-[15px]"
                    >
                      Bạn đang nghĩ gì?
                    </button>
                  </div>
                </div>
              )}

              {/* Posts */}
              {userPosts.length === 0 ? (
                <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-12 text-center max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                  <ImageIcon className="w-16 h-16 text-[var(--fb-text-secondary)]/40 mx-auto mb-4" />
                  <p className="text-[var(--fb-text-secondary)] text-lg">Chưa có bài viết nào</p>
                </div>
              ) : (
                userPosts.map(post => <PostCard key={post._id} post={post} />)
              )}
              </div>
            </main>
          </div>
        ) : activeTab === 'about' ? (
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-12 lg:gap-4">
            <aside className="lg:col-span-4 space-y-0 max-lg:divide-y max-lg:divide-[var(--fb-divider)] max-lg:border-x-0 max-lg:border-y max-lg:border-[var(--fb-divider)] max-lg:bg-[var(--fb-surface)] max-lg:shadow-sm max-lg:overflow-hidden lg:space-y-4 lg:border-0 lg:bg-transparent lg:shadow-none">
              <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Giới thiệu</h2>
                  {isMe && (
                    <button
                      type="button"
                      onClick={openEditAbout}
                      className="px-3 py-1.5 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] text-sm font-semibold transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  <button
                    type="button"
                    onClick={() => setAboutSection('overview')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors ${
                      aboutSection === 'overview'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    Tổng quan
                  </button>
                  <button
                    type="button"
                    onClick={() => setAboutSection('contact')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors ${
                      aboutSection === 'contact'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    Thông tin liên hệ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAboutSection('basic')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors ${
                      aboutSection === 'basic'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                    }`}
                  >
                    Thông tin cơ bản
                  </button>
                </div>
              </div>
            </aside>

            <main className="lg:col-span-8 space-y-4">
              {/* Overview */}
              {aboutSection === 'overview' && (
                <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
                  <h3 className="text-base font-extrabold text-[var(--fb-text-primary)] mb-3">Tổng quan</h3>
                  <div className="space-y-3">
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Tiểu sử</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)] whitespace-pre-wrap">
                        {profileUser.bio?.trim() ? profileUser.bio : 'Chưa có tiểu sử.'}
                      </div>
                    </div>

                    {profileUser.major && (
                      <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                        <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Chuyên ngành</div>
                        <div className="mt-1 text-sm text-[var(--fb-text-primary)]">{profileUser.major}</div>
                      </div>
                    )}

                    {profileUser.location?.trim() && (
                      <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                        <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Địa điểm</div>
                        <div className="mt-1 text-sm text-[var(--fb-text-primary)]">{profileUser.location}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact */}
              {aboutSection === 'contact' && (
                <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
                  <h3 className="text-base font-extrabold text-[var(--fb-text-primary)] mb-3">Thông tin liên hệ</h3>
                  <div className="space-y-3">
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Email</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)] break-all">
                        {profileUser.email || '—'}
                      </div>
                    </div>
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Số điện thoại</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)] break-all">
                        {profileUser.phone?.trim() ? profileUser.phone : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic info */}
              {aboutSection === 'basic' && (
                <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
                  <h3 className="text-base font-extrabold text-[var(--fb-text-primary)] mb-3">Thông tin cơ bản</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Họ và tên</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)]">{profileUser.name}</div>
                    </div>
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Vai trò</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)]">{profileUser.studentRole || '—'}</div>
                    </div>
                    <div className="bg-[var(--fb-input)] border border-[var(--fb-divider)] rounded-xl p-3">
                      <div className="text-xs text-[var(--fb-text-secondary)] font-semibold">Ngày tham gia</div>
                      <div className="mt-1 text-sm text-[var(--fb-text-primary)]">{formatDate(profileUser.createdAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        ) : activeTab === 'friends' ? (
          <div className="space-y-4">
            {/* Header (like Facebook friends page) */}
            <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Bạn bè</h2>
                  <p className="text-sm text-[var(--fb-text-secondary)] mt-1">
                    {friendsLoading ? 'Đang tải...' : `${friends.length} bạn bè`}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Search (desktop) */}
                  <div className="hidden sm:block">
                    <div className="relative w-[260px]">
                      <Search className="w-4 h-4 text-[var(--fb-text-secondary)] absolute left-3 top-3" />
                      <input
                        value={friendsSubTab === 'following' ? followingQuery : friendsQuery}
                        onChange={(e) => {
                          if (friendsSubTab === 'following') setFollowingQuery(e.target.value);
                          else setFriendsQuery(e.target.value);
                        }}
                        placeholder={friendsSubTab === 'following' ? 'Tìm kiếm đang theo dõi' : 'Tìm kiếm'}
                        className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] border border-[var(--fb-divider)] focus:outline-none"
                      />
                    </div>
                  </div>

                  {isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/home?tab=friends');
                      }}
                      className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors"
                    >
                      Lời mời kết bạn
                      {friendRequests.length > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full px-2 py-0.5">
                          {friendRequests.length}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/home?tab=friends&friendsTab=all')}
                    className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors"
                  >
                    Tìm bạn bè
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors"
                    title="Tùy chọn"
                    onClick={() => {}}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search (mobile) */}
              <div className="sm:hidden mt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--fb-text-secondary)] absolute left-3 top-3" />
                  <input
                    value={friendsSubTab === 'following' ? followingQuery : friendsQuery}
                    onChange={(e) => {
                      if (friendsSubTab === 'following') setFollowingQuery(e.target.value);
                      else setFriendsQuery(e.target.value);
                    }}
                    placeholder={friendsSubTab === 'following' ? 'Tìm kiếm đang theo dõi' : 'Tìm kiếm'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] border border-[var(--fb-divider)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Category row (text + underline) */}
              <div className="mt-3 pt-3 border-t border-[var(--fb-divider)] overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-6 min-w-max">
                  <button
                    type="button"
                    onClick={() => setFriendsSubTab('all')}
                    className={`text-sm font-semibold pb-2 border-b-2 transition-colors whitespace-nowrap ${
                      friendsSubTab === 'all'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-[var(--fb-text-secondary)] border-transparent hover:text-[var(--fb-text-primary)]'
                    }`}
                  >
                    Tất cả bạn bè
                  </button>

                  <button
                    type="button"
                    onClick={() => setFriendsSubTab('following')}
                    className={`text-sm font-semibold pb-2 border-b-2 transition-colors whitespace-nowrap ${
                      friendsSubTab === 'following'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-[var(--fb-text-secondary)] border-transparent hover:text-[var(--fb-text-primary)]'
                    }`}
                  >
                    Đang theo dõi
                  </button>

                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
                {friendsSubTab === 'following' ? (
                  filteredFollowing.length === 0 ? (
                    <div className="p-8 text-center text-[var(--fb-text-secondary)]">
                      {String(followingQuery || '').trim()
                        ? 'Không tìm thấy người phù hợp.'
                        : 'Chưa theo dõi ai.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                      {filteredFollowing.map((u) => {
                        const uid = u?._id || u?.id;
                        return (
                          <div
                            key={uid || u?.email || u?.name}
                            className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] relative"
                          >
                            {isMe && uid && (
                            <div className="absolute top-2 right-2 z-20 following-menu-container">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenFollowingMenuId((prev) => (prev === uid ? null : uid));
                                  }}
                                  className="p-1.5 rounded-full bg-[var(--fb-surface)]/90 hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-icon)] transition-colors"
                                  title="Tùy chọn"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {openFollowingMenuId === uid && (
                                  <div className="absolute right-0 mt-2 w-40 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-xl border border-[var(--fb-divider)] overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnfollowFromList(uid);
                                      }}
                                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 hover:text-red-600 transition-colors font-semibold"
                                    >
                                      Bỏ theo dõi
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => uid && navigate(`/profile/${uid}`)}
                              className="w-full text-left"
                              title={u?.name}
                            >
                              <div className="aspect-square bg-[var(--fb-input)] overflow-hidden rounded-t-lg">
                                <img
                                  src={resolveAvatarUrl(u?.avatar, u?.name, '1877f2')}
                                  alt={u?.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <div className="p-1.5">
                                <div className="text-xs font-extrabold text-[var(--fb-text-primary)] truncate">{u?.name}</div>
                                <div className="text-[10px] text-[var(--fb-text-secondary)] truncate">
                                  {u?.studentRole}{u?.major ? ` • ${u.major}` : ''}
                                </div>
                              </div>
                            </button>

                            <div className="px-1.5 pb-1.5">
                              <button
                                type="button"
                                onClick={() => uid && handleStartChatWithUser(uid)}
                                className="w-full px-2 py-1 rounded-md bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors text-xs"
                                disabled={!uid}
                              >
                                Nhắn tin
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : isMe && friendsSubTab === 'requests' ? (
                  requestsLoading ? (
                    <div className="p-8 text-center text-[var(--fb-text-secondary)]">Đang tải lời mời kết bạn...</div>
                  ) : friendRequests.length === 0 ? (
                    <div className="p-8 text-center text-[var(--fb-text-secondary)]">Không có lời mời kết bạn.</div>
                  ) : (
                    <div className="space-y-3">
                      {friendRequests.map((r) => {
                        const u = r.from || {};
                        const uid = u._id || u.id;
                        return (
                          <div
                            key={r._id || uid}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--fb-divider)]"
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/profile/${uid}`)}
                              className="flex items-center gap-3 text-left min-w-0"
                              title={u.name}
                            >
                              <img
                                src={resolveAvatarUrl(u.avatar, u.name, '1877f2')}
                                alt={u.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-extrabold text-[var(--fb-text-primary)] truncate">{u.name}</div>
                                <div className="text-xs text-[var(--fb-text-secondary)] truncate">
                                  {u.studentRole}{u.major ? ` • ${u.major}` : ''}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleAcceptFriendRequest(uid)}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
                              >
                                Chấp nhận
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRejectFriendRequest(uid)}
                                className="px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : friendsLoading ? (
                  <div className="p-8 text-center text-[var(--fb-text-secondary)]">Đang tải danh sách bạn bè...</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="p-8 text-center text-[var(--fb-text-secondary)]">
                    {friendsQuery.trim() ? 'Không tìm thấy bạn bè phù hợp.' : 'Chưa có bạn bè.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {filteredFriends.map((f) => (
                      <div
                        key={f._id || f.id || f.email || f.name}
                        className="rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] relative"
                      >
                        {isMe && (
                          <div className="absolute top-2 right-2 z-20 friend-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const fid = f._id || f.id;
                                setOpenFriendMenuId((prev) => (prev === fid ? null : fid));
                              }}
                              className="p-1.5 rounded-full bg-[var(--fb-surface)]/90 hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-icon)] transition-colors"
                              title="Tùy chọn"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openFriendMenuId === (f._id || f.id) && (
                              <div className="absolute right-0 mt-2 w-40 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-xl border border-[var(--fb-divider)] overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnfriendFromList(f._id || f.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left hover:bg-red-50 hover:text-red-600 transition-colors font-semibold"
                                >
                                  Hủy kết bạn
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${f._id || f.id}`)}
                          className="w-full text-left"
                          title={f.name}
                        >
                          <div className="aspect-square bg-[var(--fb-input)] overflow-hidden rounded-t-lg">
                            <img
                              src={resolveAvatarUrl(f.avatar, f.name, '1877f2')}
                              alt={f.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-1.5">
                            <div className="text-xs font-extrabold text-[var(--fb-text-primary)] truncate">{f.name}</div>
                            <div className="text-[10px] text-[var(--fb-text-secondary)] truncate">
                              {f.studentRole}{f.major ? ` • ${f.major}` : ''}
                            </div>
                          </div>
                        </button>

                        <div className="px-1.5 pb-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartChatWithUser(f._id || f.id)}
                            className="w-full px-2 py-1 rounded-md bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] font-semibold transition-colors text-xs"
                          >
                            Nhắn tin
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        ) : activeTab === 'photos' ? (
          <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Ảnh</h2>
                <p className="text-sm text-[var(--fb-text-secondary)] mt-1">{allPhotoUrls.length} ảnh</p>
              </div>
            </div>

            {allPhotoUrls.length === 0 ? (
              <div className="p-10 text-center text-[var(--fb-text-secondary)]">
                Chưa có ảnh nào để hiển thị.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {allPhotoUrls.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => openPhotoAtIndex(i)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-[var(--fb-input)] border border-[var(--fb-divider)]"
                    title="Xem ảnh"
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[var(--fb-surface)] rounded-xl border border-[var(--fb-divider)] p-8 text-center text-[var(--fb-text-secondary)]">
            Tính năng đang hoàn thiện.
          </div>
        )}
      </div>

      {/* Unified edit modal (basic + about + contact) */}
      {showEditAboutModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={() => {
            if (editAboutSaving) return;
            setShowEditAboutModal(false);
            setEditAboutError('');
          }}
        >
          <div
            className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-2xl shadow-2xl border border-[var(--fb-divider)] w-full max-w-md overflow-hidden flex flex-col h-[90vh] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] p-4 flex-shrink-0 border-b border-[var(--fb-divider)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[var(--fb-input)] rounded-full flex items-center justify-center">
                    <Edit className="w-5 h-5 text-[var(--fb-icon)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--fb-text-primary)]">Chỉnh sửa thông tin</h3>
                    <p className="text-sm text-[var(--fb-text-secondary)] mt-0.5">Cập nhật cơ bản, giới thiệu và liên hệ</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={editAboutSaving}
                  onClick={() => {
                    setShowEditAboutModal(false);
                    setEditAboutError('');
                  }}
                  className="text-[var(--fb-icon)] hover:bg-[var(--fb-hover)] p-2 rounded-full transition-colors disabled:opacity-60"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              {editAboutError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{editAboutError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  name="name"
                  value={editAboutForm.name}
                  onChange={handleEditAboutChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                  Chuyên ngành
                </label>
                <input
                  type="text"
                  name="major"
                  value={editAboutForm.major}
                  onChange={handleEditAboutChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Công nghệ thông tin"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                  Tiểu sử
                </label>
                <textarea
                  name="bio"
                  value={editAboutForm.bio}
                  onChange={handleEditAboutChange}
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Viết vài dòng về bạn..."
                />
                <div className="text-xs text-[var(--fb-text-secondary)] mt-1">
                  {String(editAboutForm.bio || '').length}/500
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                  Địa điểm
                </label>
                <input
                  type="text"
                  name="location"
                  value={editAboutForm.location}
                  onChange={handleEditAboutChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Hà Nội"
                />
              </div>

              <div className="pt-2 border-t border-[var(--fb-divider)]">
                <div className="text-sm font-extrabold text-[var(--fb-text-primary)] mb-2">Thông tin liên hệ</div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--fb-text-secondary)] mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={editAboutForm.phone}
                      onChange={handleEditAboutChange}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: 09xxxxxxxx"
                    />
                  </div>

                </div>
              </div>
            </div>

            <div className="bg-[var(--fb-surface)] border-t border-[var(--fb-divider)] p-3 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={editAboutSaving}
                onClick={() => {
                  setShowEditAboutModal(false);
                  setEditAboutError('');
                }}
                className="px-4 py-2 rounded-xl bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] font-semibold transition-colors disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={editAboutSaving}
                onClick={handleSubmitEditAbout}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {editAboutSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {profileImageTheater &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const livePost =
              userPosts.find((p) => String(p._id) === String(profileImageTheater.post._id)) ||
              profileImageTheater.post;
            const hasInteractivePost = Boolean(livePost?._id);
            const profileMediaType =
              livePost?.__mediaType && ['avatar', 'cover'].includes(livePost.__mediaType)
                ? livePost.__mediaType
                : null;
            const mediaInteractions = profileMediaType
              ? profileMediaInteractions[profileMediaType] || { likes: 0, likedByMe: false, comments: [], shares: 0 }
              : null;
            const imgs = (livePost.images || []).filter((x) => typeof x === 'string');
            const n = imgs.length;
            const idx = n ? Math.min(Math.max(0, profileImageTheater.imageIndex), n - 1) : 0;
            const curUrl = imgs[idx] ? resolvePostImageSrc(imgs[idx]) : '';
            const cap = (livePost.content || '').trim();
            const capTrunc = 220;
            const postAuthorId = livePost.author?._id || livePost.author;
            const currentUserId = currentUser?.id || currentUser?._id;
            const isOwner = String(postAuthorId) === String(currentUserId);
            const goPrev = (e) => {
              e.stopPropagation();
              if (n <= 1) return;
              setProfileImageTheater((t) =>
                t ? { ...t, post: livePost, imageIndex: (idx - 1 + n) % n } : t
              );
            };
            const goNext = (e) => {
              e.stopPropagation();
              if (n <= 1) return;
              setProfileImageTheater((t) =>
                t ? { ...t, post: livePost, imageIndex: (idx + 1) % n } : t
              );
            };
            const theaterUid = String(currentUser?.id || currentUser?._id || '');
            const theaterLikedByUser = (livePost.likes || []).some(
              (like) => String(like?._id || like) === theaterUid
            );
            const theaterLikeCount = mediaInteractions
              ? mediaInteractions.likes || 0
              : (livePost.likes?.length || 0) +
                (hasInteractivePost && likedPosts.has(livePost._id) && !theaterLikedByUser ? 1 : 0);
            const curPathRaw = imgs[idx] || '';
            const curIsVideo = isProfilePostGalleryVideoPath(curPathRaw);
            const profilePostZoomIn = (e) => {
              e.stopPropagation();
              setProfilePostTheaterZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
            };
            const profilePostZoomOut = (e) => {
              e.stopPropagation();
              setProfilePostTheaterZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
            };
            const onProfilePostWheelZoom = (e) => {
              if (curIsVideo) return;
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setProfilePostTheaterZoom((z) => Math.max(1, Math.min(4, Math.round((z + delta) * 100) / 100)));
            };
            const endProfilePostPan = (e, doTapZoom) => {
              const g = profilePostTheaterPanGestureRef.current;
              const el = profilePostTheaterPanRef.current;
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
                setProfilePostTheaterZoom((z) => {
                  if (z >= 4) return 1;
                  return Math.min(4, Math.round((z + 0.25) * 100) / 100);
                });
              }
            };
            const onProfilePostPanPointerDown = (e) => {
              if (profilePostTheaterZoom <= 1 || curIsVideo) return;
              if (e.button !== 0) return;
              const el = profilePostTheaterPanRef.current;
              if (!el) return;
              e.preventDefault();
              e.stopPropagation();
              const prev = profilePostTheaterPanGestureRef.current;
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
              profilePostTheaterPanGestureRef.current = g;
              el.classList.add('cursor-grabbing');

              const winOpts = { capture: true, passive: false };
              const onWinMove = (ev) => {
                const ge = profilePostTheaterPanGestureRef.current;
                const pane = profilePostTheaterPanRef.current;
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
                const ge = profilePostTheaterPanGestureRef.current;
                if (!ge.active || ev.pointerId !== ge.pointerId) return;
                endProfilePostPan(ev, !curIsVideo);
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
                className="fixed inset-0 z-[10050] flex min-h-0 min-w-0 flex-col bg-black lg:flex-row"
                role="dialog"
                aria-modal="true"
                aria-label="Xem ảnh bài viết"
              >
                <div
                  className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black"
                  onClick={closeProfileImageTheater}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeProfileImageTheater();
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
                            onClick={profilePostZoomOut}
                            disabled={profilePostTheaterZoom <= 1}
                            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            title="Thu nhỏ"
                          >
                            <ZoomOut className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={profilePostZoomIn}
                            disabled={profilePostTheaterZoom >= 4}
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
                        ref={profilePostTheaterPanRef}
                        onPointerDown={onProfilePostPanPointerDown}
                        onWheel={onProfilePostWheelZoom}
                        onClick={(ev) => ev.stopPropagation()}
                        className={`box-border flex min-h-0 min-w-0 w-full flex-1 overflow-auto overscroll-contain p-4 sm:p-8 ${
                          profilePostTheaterZoom > 1
                            ? 'cursor-grab select-none touch-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                            : ''
                        }`}
                      >
                        <img
                          src={curUrl}
                          alt=""
                          draggable={false}
                          title={
                            profilePostTheaterZoom > 1
                              ? 'Kéo để xem vùng khác; chạm nhẹ vào ảnh để phóng thêm'
                              : 'Bấm để phóng thêm; khi tối đa bấm lại để vừa khung'
                          }
                          className={`m-auto block object-contain transition-[width,max-width,max-height] duration-200 ease-out ${
                            profilePostTheaterZoom >= 4 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                          }`}
                          style={
                            profilePostTheaterZoom <= 1
                              ? {
                                  width: 'auto',
                                  height: 'auto',
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                }
                              : {
                                  width: `${100 * profilePostTheaterZoom}%`,
                                  maxWidth: 'none',
                                  maxHeight: 'none',
                                }
                          }
                          onClick={
                            profilePostTheaterZoom <= 1
                              ? (ev) => {
                                  ev.stopPropagation();
                                  setProfilePostTheaterZoom((z) => {
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
                          onClick={() => setProfileTheaterPostMenuOpen((o) => !o)}
                          className="p-2 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-icon)]"
                          aria-expanded={profileTheaterPostMenuOpen}
                          aria-haspopup="true"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {profileTheaterPostMenuOpen ? (
                          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl z-30">
                            <button
                              type="button"
                              disabled={!hasInteractivePost}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-amber-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => {
                                if (!hasInteractivePost) return;
                                setProfileTheaterPostMenuOpen(false);
                                toggleSavePost(livePost._id);
                              }}
                            >
                              <Bookmark className={`w-4 h-4 ${hasInteractivePost && savedSet.has(livePost._id) ? 'fill-current' : ''}`} />
                              {hasInteractivePost && savedSet.has(livePost._id) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                            </button>
                            {hasInteractivePost && isOwner ? (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-red-600"
                                onClick={() => {
                                  setProfileTheaterPostMenuOpen(false);
                                  closeProfileImageTheater();
                                  handleDeletePost(livePost._id);
                                }}
                              >
                                Xóa bài viết
                              </button>
                            ) : hasInteractivePost ? (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--fb-hover)] text-red-600"
                                onClick={() => {
                                  setProfileTheaterPostMenuOpen(false);
                                  closeProfileImageTheater();
                                  notify('Vui lòng mở bài viết từ trang chủ để báo cáo.');
                                }}
                              >
                                Báo cáo bài viết
                              </button>
                            ) : (
                              <div className="px-3 py-2 text-sm text-[var(--fb-text-secondary)]">
                                Ảnh hồ sơ
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {cap ? (
                      <div className="mt-3 text-[15px] leading-relaxed text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">
                        {profileTheaterCaptionExpanded || cap.length <= capTrunc
                          ? cap
                          : `${cap.slice(0, capTrunc)}…`}
                        {cap.length > capTrunc ? (
                          <button
                            type="button"
                            onClick={() => setProfileTheaterCaptionExpanded((e) => !e)}
                            className="ml-1 font-semibold text-blue-600 hover:underline"
                          >
                            {profileTheaterCaptionExpanded ? 'Thu gọn' : 'Xem thêm'}
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
                      <span className="text-[13px] tabular-nums text-[var(--fb-text-primary)]">
                        {theaterLikeCount}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="hover:underline cursor-pointer text-[13px]">
                        {mediaInteractions ? (mediaInteractions.comments?.length || 0) : (livePost.comments?.length || 0)} bình luận
                      </span>
                      <span className="hover:underline cursor-pointer text-[13px]">
                        {mediaInteractions ? (mediaInteractions.shares || 0) : (livePost.shares || 0)} chia sẻ
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex border-t border-[var(--fb-divider)] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (mediaInteractions && profileMediaType) {
                          toggleProfileMediaLike(profileMediaType);
                          return;
                        }
                        if (!hasInteractivePost) return;
                        toggleLike(livePost._id);
                      }}
                      disabled={!hasInteractivePost && !mediaInteractions}
                      className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        (mediaInteractions ? mediaInteractions.likedByMe : (hasInteractivePost && likedPosts.has(livePost._id)))
                          ? 'text-blue-600 hover:bg-blue-50'
                          : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Heart className={`w-5 h-5 ${(mediaInteractions ? mediaInteractions.likedByMe : (hasInteractivePost && likedPosts.has(livePost._id))) ? 'fill-current' : ''}`} />
                      {(mediaInteractions ? mediaInteractions.likedByMe : (hasInteractivePost && likedPosts.has(livePost._id))) ? 'Đã thích' : 'Thích'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById('theater-comment-input')?.focus()
                      }
                      disabled={!hasInteractivePost && !mediaInteractions}
                      className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-blue-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Bình luận
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (mediaInteractions && profileMediaType) {
                          shareProfileMedia(profileMediaType);
                          return;
                        }
                        if (!hasInteractivePost) return;
                        openShareModal(livePost);
                      }}
                      disabled={(!hasInteractivePost && !mediaInteractions) || (hasInteractivePost && shareSending && shareModalPost?._id === livePost._id)}
                      className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-5 h-5" />
                      {shareSending && shareModalPost?._id === livePost._id ? 'Đang gửi…' : 'Chia sẻ'}
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {hasInteractivePost ? (
                      <PostCommentSection
                        key={String(livePost._id)}
                        user={currentUser}
                        postId={livePost._id}
                        post={livePost}
                        isVisible
                        variant="theater"
                        onClose={() => {}}
                        onUpdatePost={(id, fn) =>
                          setUserPosts((prev) => prev.map((p) => (p._id === id ? fn(p) : p)))
                        }
                        onRequestRefresh={() => {
                          setTimeout(() => fetchUserPosts(), 1000);
                        }}
                      />
                    ) : mediaInteractions ? (
                      <div className="flex h-full min-h-0 flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                          {mediaInteractions.comments?.length ? (
                            mediaInteractions.comments.map((c) => (
                              <div key={c.id} className="rounded-lg bg-[var(--fb-input)] px-3 py-2">
                                <p className="text-sm font-semibold text-[var(--fb-text-primary)]">{c.authorName}</p>
                                <p className="text-sm text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">{c.content}</p>
                                <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">{formatTimeAgo(c.createdAt)}</p>
                              </div>
                            ))
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-[var(--fb-text-secondary)]">
                              Chưa có bình luận nào.
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 border-t border-[var(--fb-divider)] p-3">
                          <div className="flex items-center gap-2">
                            <input
                              id="theater-comment-input"
                              type="text"
                              value={profileMediaCommentInput}
                              onChange={(e) => setProfileMediaCommentInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitProfileMediaComment(profileMediaType);
                                }
                              }}
                              placeholder="Viết bình luận..."
                              className="flex-1 rounded-full border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            />
                            <button
                              type="button"
                              onClick={() => submitProfileMediaComment(profileMediaType)}
                              className="rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              Gửi
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-sm text-[var(--fb-text-secondary)]">
                        Ảnh này không có bình luận.
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            );
          })(),
          document.body
        )}

      {/* Chia sẻ bài viết — chọn bạn bè */}
      {shareModalPost &&
        typeof document !== 'undefined' &&
        createPortal(
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
                                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || '?')}&background=1877f2&color=fff`
                              }
                              alt=""
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-[var(--fb-text-primary)] truncate">{f.name}</p>
                              <p className="text-xs text-[var(--fb-text-secondary)] truncate">
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

      {/* Image Upload Modals */}
      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSuccess={handleAvatarUploadSuccess}
        type="avatar"
        currentImage={profileUser?.avatar}
      />
      <ImageUploadModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        onSuccess={handleCoverUploadSuccess}
        type="cover"
        currentImage={profileUser?.coverPhoto}
      />

      {/* Image Lightbox */}
      {showImageLightbox &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[10060] flex h-[100dvh] w-full items-center justify-center bg-black"
            onClick={() => setShowImageLightbox(false)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute z-30 top-4 left-3 sm:left-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
              aria-label="Đóng xem ảnh"
            >
              <X className="w-6 h-6" />
            </button>
            {isMe && (
              <div className="absolute z-30 top-4 right-3 sm:right-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLightboxMenu((v) => !v);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                  aria-label="Tùy chọn ảnh"
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
                {showLightboxMenu && (
                  <div
                    className="absolute right-0 mt-2 w-40 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={!currentLightboxPhoto || currentLightboxPhoto.type !== 'post-image' || deletingLightboxImage}
                      onClick={handleDeleteCurrentLightboxImage}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{deletingLightboxImage ? 'Đang xóa...' : 'Xóa ảnh'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {allPhotoUrls.length > 1 && (
              <div className="absolute z-30 top-5 left-1/2 -translate-x-1/2 text-white/85 text-sm font-medium">
                {lightboxIndex + 1}/{allPhotoUrls.length}
              </div>
            )}

            {allPhotoUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goLightbox(-1);
                  }}
                  className="absolute z-30 left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white bg-black/35 hover:bg-black/55 p-1.5 sm:p-2 rounded-full transition-colors"
                  title="Ảnh trước"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goLightbox(1);
                  }}
                  className="absolute z-30 right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white bg-black/35 hover:bg-black/55 p-1.5 sm:p-2 rounded-full transition-colors"
                  title="Ảnh tiếp"
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </>
            )}

            <div
              className="relative flex h-full w-full items-center justify-center overflow-hidden px-1 sm:px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Full size"
                className="max-h-[100dvh] w-auto max-w-full object-contain"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
