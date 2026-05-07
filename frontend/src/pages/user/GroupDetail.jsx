import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Settings, X, UserPlus, Trash2, Shield, Lock, AlertCircle, 
  FileText, Heart, MessageCircle, Bookmark, MoreHorizontal, Share2,
  Send, Image as ImageIcon, Smile, Plus, Check, Search, Image, 
  Bell, Eye, EyeOff, Pin, Edit, Trash, AlertTriangle,
  BookOpen, ChevronDown, LogOut, Globe, Users,
  ChevronLeft, ChevronRight, Maximize2, Camera, ZoomIn, ZoomOut, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { buildGroupShareMessageContent } from '../../utils/groupShareMessage.js';
import { formatTimeAgo } from '../../utils/formatTime';
import { getSocket } from '../../utils/socket';
import { resolveMediaUrl, resolveAvatarUrlWithFallback } from '../../utils/mediaUrl';
import { PostCommentSection } from '../../components/PostCommentSection';
import PostImageGallery from '../../components/PostImageGallery';

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

/** Bình luận ảnh nhóm (theater) — kiểu Facebook: bubble, avatar, thread */
function GroupCoverFacebookComment({
  comment,
  depth,
  replyMap,
  uid,
  liveUserAvatar,
  onReply,
  onToggleLike,
  onDelete,
  likeMap,
  replyingToId,
  resolveAvatarUrl,
  withAvatarFallback
}) {
  const cid = String(comment.id);
  const replies = [...(replyMap.get(cid) || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const likeArr = likeMap[cid] || [];
  const iLiked = Boolean(uid && likeArr.some((x) => String(x) === String(uid)));
  const canDelete = Boolean(uid && String(comment.authorId) === String(uid));
  const avatarCls = depth === 0 ? 'h-9 w-9' : 'h-8 w-8';
  const sameUser = uid && String(comment.authorId) === String(uid);
  const rawAvatar =
    sameUser && liveUserAvatar != null && String(liveUserAvatar).trim() !== ''
      ? liveUserAvatar
      : comment.authorAvatar;

  return (
    <div className={depth > 0 ? 'mt-2 border-l-2 border-[#CED0D4] pl-3 dark:border-zinc-600' : ''}>
      <div className="flex gap-2">
        <img
          src={resolveAvatarUrl(rawAvatar, comment.authorName, '1877f2')}
          alt=""
          className={`${avatarCls} shrink-0 rounded-full border border-[var(--fb-divider)] object-cover`}
          onError={withAvatarFallback(comment.authorName, '1877f2')}
        />
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-[min(100%,520px)] rounded-[18px] bg-[#F0F2F5] px-3 py-2 dark:bg-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--fb-text-primary)]">{comment.authorName}</p>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(cid)}
                  className="shrink-0 text-[12px] font-medium text-[#65676B] hover:underline dark:text-zinc-400"
                >
                  Xóa
                </button>
              ) : null}
            </div>
            <p className="mt-0.5 text-[15px] leading-snug text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">
              {comment.text}
            </p>
          </div>
          <div className="ml-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[#65676B] dark:text-zinc-400">
            <span>{formatTimeAgo(comment.createdAt)}</span>
            <button
              type="button"
              className={`font-semibold hover:underline ${iLiked ? 'text-blue-600' : ''}`}
              onClick={() => onToggleLike(cid)}
            >
              Thích
            </button>
            <button type="button" className="font-semibold hover:underline" onClick={() => onReply(cid)}>
              Trả lời
            </button>
          </div>
          {replyingToId === cid ? (
            <p className="ml-2 mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              Đang trả lời bình luận này…
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-1">
        {replies.map((r) => (
          <GroupCoverFacebookComment
            key={String(r.id)}
            comment={r}
            depth={depth + 1}
            replyMap={replyMap}
            uid={uid}
            liveUserAvatar={liveUserAvatar}
            onReply={onReply}
            onToggleLike={onToggleLike}
            onDelete={onDelete}
            likeMap={likeMap}
            replyingToId={replyingToId}
            resolveAvatarUrl={resolveAvatarUrl}
            withAvatarFallback={withAvatarFallback}
          />
        ))}
      </div>
    </div>
  );
}

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const resolveAvatarUrl = (avatar, name, background = '1877f2') => {
    return resolveAvatarUrlWithFallback(avatar, name, background);
  };

  const withAvatarFallback = (name, background = '1877f2') => (e) => {
    if (e.currentTarget?.dataset?.fallbackApplied) return;
    if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
    e.currentTarget.src = resolveAvatarUrl('', name, background);
  };

  
  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupPosts, setGroupPosts] = useState([]);
  const [groupAnnouncements, setGroupAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'members' | 'media' | 'announcements'
  
  // Post form states (ảnh + tài liệu/video đăng cùng bài)
  const [newGroupPostContent, setNewGroupPostContent] = useState('');
  const [newGroupPostTextBackground, setNewGroupPostTextBackground] = useState('');
  const [newGroupPostImages, setNewGroupPostImages] = useState([]);
  const [newGroupPostFiles, setNewGroupPostFiles] = useState([]);
  const [showGroupPostModal, setShowGroupPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostSaving, setEditPostSaving] = useState(false);
  const [editPostExistingImages, setEditPostExistingImages] = useState([]);
  const [editPostExistingFiles, setEditPostExistingFiles] = useState([]);
  const [editPostNewImages, setEditPostNewImages] = useState([]);
  const [editPostNewFiles, setEditPostNewFiles] = useState([]);
  const [deletingPost, setDeletingPost] = useState(null);
  const [deletePostLoading, setDeletePostLoading] = useState(false);
  const [editPostNewImagePreviewUrls, setEditPostNewImagePreviewUrls] = useState([]);
  
  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [inviteFriendsList, setInviteFriendsList] = useState([]);
  const [inviteFriendsLoading, setInviteFriendsLoading] = useState(false);
  const [inviteFriendPickerQuery, setInviteFriendPickerQuery] = useState('');
  const [selectedFriendIdsForInvite, setSelectedFriendIdsForInvite] = useState([]);
  const [inviteBatchSending, setInviteBatchSending] = useState(false);
  const [showGroupCardShareModal, setShowGroupCardShareModal] = useState(false);
  const [groupCardShareFriendsLoading, setGroupCardShareFriendsLoading] = useState(false);
  const [groupCardShareFriendsList, setGroupCardShareFriendsList] = useState([]);
  const [groupCardShareSelectedIds, setGroupCardShareSelectedIds] = useState(() => new Set());
  const [groupCardShareQuery, setGroupCardShareQuery] = useState('');
  const [groupCardShareSending, setGroupCardShareSending] = useState(false);
  /** true = đã bỏ theo dõi feed trang chủ (bài nhóm không hiện ở /home) */
  const [groupHomeFeedHidden, setGroupHomeFeedHidden] = useState(false);
  const [showGroupStatusMenu, setShowGroupStatusMenu] = useState(false);
  const groupStatusButtonRef = useRef(null);
  const groupStatusDropdownRef = useRef(null);
  const [groupStatusDropdownPos, setGroupStatusDropdownPos] = useState(null);
  const [inviteFromUrlLoading, setInviteFromUrlLoading] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchUsers, setSearchUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Announcement form states
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    isPinned: false,
    expiryDate: ''
  });
  
  // Post search and comments
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [showComments, setShowComments] = useState(new Set());
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  const [postOptionsId, setPostOptionsId] = useState(null);

  /** null | { mode: 'post', post } | { mode: 'groupCover' } */
  const [shareModal, setShareModal] = useState(null);
  const [shareFriendsList, setShareFriendsList] = useState([]);
  const [shareFriendsLoading, setShareFriendsLoading] = useState(false);
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareFriendQuery, setShareFriendQuery] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const shareScrollRef = useRef({ key: null, done: false });

  const filteredShareFriends = useMemo(() => {
    const q = shareFriendQuery.trim().toLowerCase();
    if (!q) return shareFriendsList;
    return shareFriendsList.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [shareFriendsList, shareFriendQuery]);
  
  /** Xem ảnh bài viết kiểu theater (media + sidebar); mode groupCover = ảnh nhóm */
  const [imageTheater, setImageTheater] = useState(null);
  const [theaterCaptionExpanded, setTheaterCaptionExpanded] = useState(false);
  const [groupCoverZoom, setGroupCoverZoom] = useState(1);
  /** Zoom ảnh trong theater bài viết nhóm (khác ảnh bìa) */
  const [groupPostTheaterZoom, setGroupPostTheaterZoom] = useState(1);
  const groupPostTheaterPanRef = useRef(null);
  const groupPostTheaterPanGestureRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    downTarget: null,
  });
  /** Thích ảnh nhóm (lưu cục bộ theo nhóm — chưa có API server) */
  const [groupCoverLikeData, setGroupCoverLikeData] = useState({ count: 0, liked: false });
  const [groupCoverCommentHighlight, setGroupCoverCommentHighlight] = useState(false);
  /** Bình luận ảnh nhóm (lưu cục bộ theo nhóm — chưa có API) */
  const [groupCoverComments, setGroupCoverComments] = useState([]);
  const [groupCoverCommentDraft, setGroupCoverCommentDraft] = useState('');
  /** 'newest' | 'oldest' — gốc bài (bình luận cấp 1) */
  const [groupCoverCommentSort, setGroupCoverCommentSort] = useState('newest');
  const [groupCoverReplyingTo, setGroupCoverReplyingTo] = useState(null);
  const [groupCoverCommentTabActive, setGroupCoverCommentTabActive] = useState(false);
  /** commentId -> userId[] thích từng bình luận */
  const [groupCoverCommentLikeMap, setGroupCoverCommentLikeMap] = useState({});

  const groupCoverCommentReplyData = useMemo(() => {
    const byParent = new Map();
    for (const c of groupCoverComments || []) {
      const rawPid = c.parentId;
      const pid =
        rawPid != null && rawPid !== '' ? String(rawPid) : '__root__';
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(c);
    }
    const roots = byParent.get('__root__') || [];
    const asc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const desc = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    roots.sort(groupCoverCommentSort === 'oldest' ? asc : desc);
    byParent.forEach((arr, key) => {
      if (key !== '__root__') arr.sort(asc);
    });
    return { replyMap: byParent, roots };
  }, [groupCoverComments, groupCoverCommentSort]);

  useEffect(() => {
    if (!group?._id) return;
    try {
      const raw = localStorage.getItem(`dnu-group-cover-like:${String(group._id)}`);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p.count === 'number' && typeof p.liked === 'boolean') {
          setGroupCoverLikeData(p);
          return;
        }
      }
      setGroupCoverLikeData({ count: 0, liked: false });
    } catch {
      setGroupCoverLikeData({ count: 0, liked: false });
    }
  }, [group?._id]);

  useEffect(() => {
    if (!group?._id) return;
    try {
      const raw = localStorage.getItem(`dnu-group-cover-comments:${String(group._id)}`);
      if (raw) {
        const arr = JSON.parse(raw);
        setGroupCoverComments(Array.isArray(arr) ? arr : []);
      } else {
        setGroupCoverComments([]);
      }
    } catch {
      setGroupCoverComments([]);
    }
  }, [group?._id]);

  useEffect(() => {
    if (!group?._id) return;
    try {
      const raw = localStorage.getItem(`dnu-group-cover-comment-likes:${String(group._id)}`);
      if (raw) {
        const o = JSON.parse(raw);
        setGroupCoverCommentLikeMap(
          typeof o === 'object' && o !== null && !Array.isArray(o) ? o : {}
        );
      } else {
        setGroupCoverCommentLikeMap({});
      }
    } catch {
      setGroupCoverCommentLikeMap({});
    }
  }, [group?._id]);

  /** Bình luận cũ (localStorage) thiếu authorAvatar — gắn lại ảnh user hiện tại */
  useEffect(() => {
    if (!group?._id) return;
    const uid = String(user?.id || user?._id || '');
    const av = user?.avatar ?? user?.profileImage ?? (typeof user?.picture === 'string' ? user.picture : null);
    if (!uid || !av || String(av).trim() === '') return;
    setGroupCoverComments((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        if (String(c.authorId) !== uid) return c;
        const has = c.authorAvatar != null && String(c.authorAvatar).trim() !== '';
        if (has) return c;
        changed = true;
        return { ...c, authorAvatar: String(av).trim() };
      });
      if (!changed) return prev;
      try {
        localStorage.setItem(
          `dnu-group-cover-comments:${String(group._id)}`,
          JSON.stringify(next)
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [group?._id, user?.id, user?._id, user?.avatar, user?.profileImage, user?.picture]);

  // Load liked posts on mount
  useEffect(() => {
    const loadLikedPosts = async () => {
      try {
        const liked = new Set();
        groupPosts.forEach(post => {
          if (post.likes?.some(like => {
            const likeId = like._id ? like._id.toString() : like.toString();
            const userId = user?.id || user?._id;
            return String(likeId) === String(userId);
          })) {
            liked.add(post._id);
          }
        });
        setLikedPosts(liked);
      } catch (error) {
        console.error('Error loading liked posts:', error);
      }
    };
    if (user && groupPosts.length > 0) {
      loadLikedPosts();
    }
  }, [user, groupPosts]);

  useEffect(() => {
    const loadSavedPosts = async () => {
      try {
        const res = await api.get('/posts/saved');
        const ids = new Set((res.data?.posts || []).map((p) => String(p?._id)).filter(Boolean));
        setSavedPostIds(ids);
      } catch (error) {
        console.error('Error loading saved posts:', error);
      }
    };
    if (user) {
      loadSavedPosts();
    }
  }, [user, groupPosts.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (postOptionsId && !event.target.closest('.group-post-options-container')) {
        setPostOptionsId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [postOptionsId]);

  // Toggle like post
  const toggleLike = async (postId) => {
    try {
      if (likedPosts.has(postId)) {
        await api.delete(`/posts/${postId}/like`);
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await api.post(`/posts/${postId}/like`);
        setLikedPosts(prev => new Set([...prev, postId]));
      }
      
      // Update post likes count in local state
      setGroupPosts(groupPosts.map(post => {
        if (post._id === postId) {
          const currentLikes = post.likes || [];
          if (likedPosts.has(postId)) {
            return { ...post, likes: currentLikes.filter(id => String(id) !== String(user?.id)) };
          } else {
            return { ...post, likes: [...currentLikes, user?.id] };
          }
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Lỗi thích bài viết');
    }
  };

  // Toggle comments visibility
  const toggleComments = (postId) => {
    const newShowComments = new Set(showComments);
    if (newShowComments.has(postId)) {
      newShowComments.delete(postId);
    } else {
      newShowComments.add(postId);
    }
    setShowComments(newShowComments);
  };

  const toggleSavePost = async (postId) => {
    const id = String(postId);
    const next = new Set(savedPostIds);
    try {
      if (next.has(id)) {
        await api.delete(`/posts/${postId}/save`);
        next.delete(id);
      } else {
        await api.post(`/posts/${postId}/save`);
        next.add(id);
      }
      setSavedPostIds(next);
    } catch (error) {
      console.error('Error toggling saved post:', error);
      alert(error.response?.data?.message || 'Không cập nhật được trạng thái lưu');
    }
  };

  const reportPost = async (postId) => {
    const reason = window.prompt('Nhập lý do báo cáo bài viết:');
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/posts/${postId}/report`, { reason: reason.trim() });
      alert('Đã gửi báo cáo bài viết.');
    } catch (error) {
      console.error('Error reporting post:', error);
      alert(error.response?.data?.message || 'Không thể báo cáo bài viết');
    }
  };

  const openEditPostModal = (post) => {
    if (!post?._id) return;
    setEditingPost(post);
    setEditPostContent(String(post.content || ''));
    setEditPostExistingImages(Array.isArray(post.images) ? post.images : []);
    setEditPostExistingFiles(Array.isArray(post.files) ? post.files : []);
    setEditPostNewImages([]);
    setEditPostNewFiles([]);
  };

  const closeEditPostModal = () => {
    if (editPostSaving) return;
    setEditingPost(null);
    setEditPostContent('');
    setEditPostExistingImages([]);
    setEditPostExistingFiles([]);
    setEditPostNewImages([]);
    setEditPostNewFiles([]);
  };

  useEffect(() => {
    const urls = editPostNewImages.map((file) => URL.createObjectURL(file));
    setEditPostNewImagePreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editPostNewImages]);

  const handleEditPost = async () => {
    if (!editingPost?._id) return;
    const trimmed = editPostContent.trim();
    const hasAnyMedia =
      editPostExistingImages.length > 0 ||
      editPostExistingFiles.length > 0 ||
      editPostNewImages.length > 0 ||
      editPostNewFiles.length > 0;
    if (!trimmed && !hasAnyMedia) {
      alert('Bài viết phải có nội dung hoặc ít nhất một tệp đính kèm');
      return;
    }
    setEditPostSaving(true);
    try {
      const formData = new FormData();
      formData.append('content', trimmed);
      formData.append('existingImages', JSON.stringify(editPostExistingImages));
      formData.append('existingFiles', JSON.stringify(editPostExistingFiles));
      editPostNewImages.forEach((file) => formData.append('images', file));
      editPostNewFiles.forEach((file) => formData.append('files', file));

      const res = await api.put(`/posts/${editingPost._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedPost = res.data?.post;
      if (updatedPost?._id) {
        setGroupPosts((prev) =>
          prev.map((p) => (String(p._id) === String(updatedPost._id) ? { ...p, ...updatedPost } : p))
        );
      } else {
        setGroupPosts((prev) =>
          prev.map((p) => (String(p._id) === String(editingPost._id) ? { ...p, content: trimmed } : p))
        );
      }
      setEditingPost(null);
      setEditPostContent('');
      setEditPostExistingImages([]);
      setEditPostExistingFiles([]);
      setEditPostNewImages([]);
      setEditPostNewFiles([]);
      alert('Đã cập nhật bài viết.');
    } catch (error) {
      console.error('Error updating post:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật bài viết');
    } finally {
      setEditPostSaving(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (!post?._id) return;
    try {
      await api.delete(`/posts/${post._id}`);
      setGroupPosts((prev) => prev.filter((p) => String(p._id) !== String(post._id)));
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId: post._id } }));
      setShowComments((prev) => {
        const next = new Set(prev);
        next.delete(post._id);
        return next;
      });
      alert('Đã xóa bài viết.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.message || 'Không thể xóa bài viết');
    }
  };

  const openDeletePostModal = (post) => {
    if (!post?._id) return;
    setDeletingPost(post);
  };

  const closeDeletePostModal = () => {
    if (deletePostLoading) return;
    setDeletingPost(null);
  };

  const confirmDeletePost = async () => {
    if (!deletingPost?._id) return;
    setDeletePostLoading(true);
    try {
      await api.delete(`/posts/${deletingPost._id}`);
      setGroupPosts((prev) => prev.filter((p) => String(p._id) !== String(deletingPost._id)));
      window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId: deletingPost._id } }));
      setShowComments((prev) => {
        const next = new Set(prev);
        next.delete(deletingPost._id);
        return next;
      });
      setDeletingPost(null);
      alert('Đã xóa bài viết.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(error.response?.data?.message || 'Không thể xóa bài viết');
    } finally {
      setDeletePostLoading(false);
    }
  };

  const handleEditPostImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEditPostNewImages((prev) => {
      const next = [...prev, ...files];
      return next.slice(0, MAX_GROUP_ATTACH);
    });
    e.target.value = '';
  };

  const handleEditPostFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEditPostNewFiles((prev) => {
      const next = [...prev, ...files];
      return next.slice(0, MAX_GROUP_ATTACH);
    });
    e.target.value = '';
  };

  const removeEditPostExistingImage = (index) => {
    setEditPostExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditPostExistingFile = (index) => {
    setEditPostExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditPostNewImage = (index) => {
    setEditPostNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditPostNewFile = (index) => {
    setEditPostNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Comment Section Component

  // Filter posts by search query
  const filteredPosts = groupPosts.filter(post => {
    if (!postSearchQuery.trim()) return true;
    const query = postSearchQuery.toLowerCase();
    return (
      post.content?.toLowerCase().includes(query) ||
      post.author?.name?.toLowerCase().includes(query) ||
      post.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      post.files?.some((f) => (f.name || '').toLowerCase().includes(query))
    );
  });

  const isPostEdited = (post) => {
    if (!post?.createdAt || !post?.updatedAt) return false;
    const created = new Date(post.createdAt).getTime();
    const updated = new Date(post.updatedAt).getTime();
    if (Number.isNaN(created) || Number.isNaN(updated)) return false;
    return updated - created > 1500;
  };

  /** Một ảnh nhóm: coverPhoto, hoặc ảnh cũ lưu trong avatar (legacy) */
  const groupHeroImageUrl = useMemo(() => {
    if (!group) return null;
    if (group.coverPhoto) {
      return resolveMediaUrl(group.coverPhoto);
    }
    const av = group.avatar;
    return resolveMediaUrl(av);
  }, [group]);

  const groupEmojiOnly = useMemo(() => {
    if (!group) return '📚';
    const av = group.avatar;
    if (typeof av === 'string' && av && !av.startsWith('/') && !av.startsWith('http')) return av;
    return '📚';
  }, [group]);

  const loadFriendsForShareModal = async () => {
    setShareFriendsLoading(true);
    try {
      const res = await api.get('/friends');
      setShareFriendsList(res.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      alert(error.response?.data?.message || 'Không tải được danh sách bạn bè');
      setShareModal(null);
    } finally {
      setShareFriendsLoading(false);
    }
  };

  const openShareModal = async (post) => {
    if (!post?._id) return;
    setShareModal({ mode: 'post', post });
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    await loadFriendsForShareModal();
  };

  const openShareGroupCoverModal = async () => {
    setGroupCoverCommentTabActive(false);
    setShareModal({ mode: 'groupCover' });
    setShareSelectedFriendIds(new Set());
    setShareFriendQuery('');
    await loadFriendsForShareModal();
  };

  const toggleShareFriendSelect = (friendId) => {
    const sid = String(friendId);
    setShareSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleConfirmShareToFriends = async () => {
    if (!shareModal || !id) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) {
      alert('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    if (shareModal.mode === 'post' && !shareModal.post?._id) return;

    setShareSending(true);
    try {
      if (shareModal.mode === 'groupCover') {
        const groupUrl = `${window.location.origin}/groups/${id}`;
        const lineName = (group?.name || 'Nhóm').trim();
        const messageText = `${user?.name || 'Một người bạn'} đã chia sẻ ảnh nhóm «${lineName}» với bạn.\n\nXem nhóm: ${groupUrl}`;
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
        const n = ids.length;
        setShareModal(null);
        setShareSelectedFriendIds(new Set());
        alert(`Đã gửi tới ${n} người bạn qua tin nhắn.`);
        return;
      }

      const shareModalPost = shareModal.post;
      const postId = shareModalPost._id;
      const postUrl = `${window.location.origin}/groups/${id}?post=${postId}`;
      const raw = (shareModalPost.content || '').trim();
      const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
      const messageText = `${user?.name || 'Một người bạn'} đã chia sẻ bài viết trong nhóm với bạn:\n\n${preview ? `“${preview}”\n\n` : ''}Xem tại: ${postUrl}`;

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
        setGroupPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, shares: sharesCount } : p))
        );
      }
      const n = ids.length;
      setShareModal(null);
      setShareSelectedFriendIds(new Set());
      alert(`Đã gửi tới ${n} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Share to friends failed:', error);
      alert(error.response?.data?.message || 'Không thể chia sẻ. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  useEffect(() => {
    const postIdRaw = searchParams.get('post');
    if (!postIdRaw) {
      shareScrollRef.current = { key: null, done: false };
      return;
    }
    if (!id || loading) return;
    const postId = String(postIdRaw);

    if (!groupPosts.some((p) => String(p._id) === postId)) return;

    if (activeTab !== 'posts') {
      setActiveTab('posts');
      return;
    }

    if (postSearchQuery.trim() && !filteredPosts.some((p) => String(p._id) === postId)) {
      setPostSearchQuery('');
      return;
    }
    if (!filteredPosts.some((p) => String(p._id) === postId)) return;

    const scrollKey = `${id}:${postId}`;
    if (shareScrollRef.current.key !== scrollKey) {
      shareScrollRef.current = { key: scrollKey, done: false };
    }
    if (shareScrollRef.current.done) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 50;
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(`post-${postId}`);
      if (el) {
        shareScrollRef.current.done = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        shareScrollRef.current.done = true;
        return;
      }
      window.requestAnimationFrame(tick);
    };

    const t = window.setTimeout(() => {
      if (!cancelled) window.requestAnimationFrame(tick);
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchParams, groupPosts, filteredPosts, activeTab, postSearchQuery, id, loading]);

  const resolvePostImageSrc = (src) => {
    return resolveMediaUrl(src);
  };

  const isGroupPostGalleryVideoPath = (src) => {
    if (!src || typeof src !== 'string') return false;
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(src);
  };

  const openImageTheater = (post, imageIndex = 0) => {
    const imgs = (post?.images || []).filter((x) => typeof x === 'string');
    if (!post || imgs.length === 0) return;
    const n = imgs.length;
    const idx = Math.min(Math.max(0, imageIndex), n - 1);
    setTheaterCaptionExpanded(false);
    setGroupPostTheaterZoom(1);
    setImageTheater({ post, imageIndex: idx });
    requestAnimationFrame(() => {
      groupPostTheaterPanRef.current?.scrollTo(0, 0);
    });
  };

  const openGroupCoverTheater = useCallback(() => {
    if (!groupHeroImageUrl) return;
    setGroupCoverZoom(1);
    setTheaterCaptionExpanded(false);
    setGroupCoverCommentTabActive(false);
    setGroupCoverReplyingTo(null);
    setImageTheater({ mode: 'groupCover', url: groupHeroImageUrl });
  }, [groupHeroImageUrl]);

  const toggleGroupCoverLike = useCallback(() => {
    if (!group?._id) return;
    setGroupCoverCommentTabActive(false);
    setGroupCoverLikeData((prev) => {
      const next = prev.liked
        ? { count: Math.max(0, prev.count - 1), liked: false }
        : { count: prev.count + 1, liked: true };
      try {
        localStorage.setItem(`dnu-group-cover-like:${String(group._id)}`, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, [group?._id]);

  const focusGroupCoverCommentSection = useCallback(() => {
    setGroupCoverCommentTabActive(true);
    setGroupCoverCommentHighlight(true);
    window.setTimeout(() => setGroupCoverCommentHighlight(false), 1600);
    document.getElementById('group-cover-theater-comments')?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
    window.setTimeout(() => {
      document.getElementById('group-cover-theater-comment-input')?.focus();
    }, 300);
  }, []);

  const toggleGroupCoverCommentLike = useCallback(
    (commentId) => {
      const uid = String(user?.id || user?._id || '');
      if (!uid || !group?._id) return;
      const cid = String(commentId);
      setGroupCoverCommentLikeMap((prev) => {
        const arr = [...(prev[cid] || [])];
        const ix = arr.findIndex((x) => String(x) === uid);
        if (ix >= 0) arr.splice(ix, 1);
        else arr.push(uid);
        const next = { ...prev, [cid]: arr };
        try {
          localStorage.setItem(
            `dnu-group-cover-comment-likes:${String(group._id)}`,
            JSON.stringify(next)
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [group?._id, user?.id, user?._id]
  );

  const deleteGroupCoverComment = useCallback(
    (commentId) => {
      if (!group?._id) return;
      const cid = String(commentId);
      setGroupCoverComments((prev) => {
        const removeIds = new Set([cid]);
        let added = true;
        while (added) {
          added = false;
          prev.forEach((c) => {
            const pid =
              c.parentId != null && c.parentId !== '' ? String(c.parentId) : null;
            if (pid && removeIds.has(pid) && !removeIds.has(String(c.id))) {
              removeIds.add(String(c.id));
              added = true;
            }
          });
        }
        const next = prev.filter((c) => !removeIds.has(String(c.id)));
        try {
          localStorage.setItem(
            `dnu-group-cover-comments:${String(group._id)}`,
            JSON.stringify(next)
          );
        } catch {
          /* ignore */
        }
        setGroupCoverCommentLikeMap((lp) => {
          const ln = { ...lp };
          removeIds.forEach((id) => delete ln[id]);
          try {
            localStorage.setItem(
              `dnu-group-cover-comment-likes:${String(group._id)}`,
              JSON.stringify(ln)
            );
          } catch {
            /* ignore */
          }
          return ln;
        });
        return next;
      });
      setGroupCoverReplyingTo((r) => (r === cid ? null : r));
    },
    [group?._id]
  );

  const submitGroupCoverComment = useCallback(() => {
    const text = groupCoverCommentDraft.trim();
    if (!text || !group?._id) return;
    if (!user?.id && !user?._id) {
      alert('Vui lòng đăng nhập để bình luận.');
      return;
    }
    const uid = String(user?.id || user?._id || '');
    const av =
      user?.avatar ??
      user?.profileImage ??
      (typeof user?.picture === 'string' ? user.picture : null);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text: text.slice(0, 2000),
      authorName: user?.name || 'Thành viên',
      authorId: uid,
      authorAvatar: av != null && String(av).trim() !== '' ? String(av).trim() : null,
      parentId: groupCoverReplyingTo ? String(groupCoverReplyingTo) : null,
      createdAt: new Date().toISOString()
    };
    setGroupCoverComments((prev) => {
      const next = [...prev, entry];
      try {
        localStorage.setItem(
          `dnu-group-cover-comments:${String(group._id)}`,
          JSON.stringify(next)
        );
      } catch {
        /* ignore */
      }
      return next;
    });
    setGroupCoverCommentDraft('');
    setGroupCoverReplyingTo(null);
  }, [
    groupCoverCommentDraft,
    groupCoverReplyingTo,
    group?._id,
    user?.id,
    user?._id,
    user?.name,
    user?.avatar
  ]);

  const closeImageTheater = () => {
    const g = groupPostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    groupPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setGroupCoverZoom(1);
    setGroupPostTheaterZoom(1);
    groupPostTheaterPanRef.current?.scrollTo(0, 0);
    setTheaterCaptionExpanded(false);
    setGroupCoverCommentTabActive(false);
    setGroupCoverReplyingTo(null);
    setImageTheater(null);
  };

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
        const g = groupPostTheaterPanGestureRef.current;
        if (g && typeof g.detachWindowPan === 'function') {
          g.detachWindowPan();
          g.detachWindowPan = null;
        }
        g.active = false;
        g.pointerId = null;
        groupPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
        setGroupCoverZoom(1);
        setGroupPostTheaterZoom(1);
        groupPostTheaterPanRef.current?.scrollTo(0, 0);
        setTheaterCaptionExpanded(false);
        setImageTheater(null);
        return;
      }
      if (imageTheater.mode === 'groupCover') return;
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
    if (!imageTheater || imageTheater.mode === 'groupCover') return;
    const g = groupPostTheaterPanGestureRef.current;
    if (g && typeof g.detachWindowPan === 'function') {
      g.detachWindowPan();
      g.detachWindowPan = null;
    }
    g.active = false;
    g.pointerId = null;
    groupPostTheaterPanRef.current?.classList.remove('cursor-grabbing');
    setGroupPostTheaterZoom(1);
    groupPostTheaterPanRef.current?.scrollTo(0, 0);
  }, [imageTheater?.post?._id, imageTheater?.imageIndex, imageTheater?.mode]);

  const handleDownloadPostFile = (file) => {
    const raw = file.url || '';
    const url = raw.startsWith('http') ? raw : `http://localhost:5000${raw}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const postAttachmentUrl = (file) => {
    return resolveMediaUrl(file?.url);
  };

  const videoPreviewSrc = (src) => {
    if (!src || typeof src !== 'string') return '';
    return src.includes('#') ? src : `${src}#t=0.1`;
  };

  const isPostAttachmentVideo = (file) => {
    const mime = file.mimeType || '';
    const name = file.name || '';
    const raw = file.url || '';
    if (mime.startsWith('video/')) return true;
    return /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(raw);
  };

  
  // Group Settings Form
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
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState({});
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null') {
      return;
    }
    
    fetchGroupDetail();
    fetchAnnouncements();
    
    // Setup Socket.io for real-time announcements
    const socket = getSocket();
    if (socket && id) {
      socket.emit('group:join', id);
      
      socket.on('group:announcement:new', (data) => {
        if (data.groupId === id) {
          fetchAnnouncements();
        }
      });
      
      socket.on('group:announcement:updated', (data) => {
        if (data.groupId === id) {
          fetchAnnouncements();
        }
      });
      
      socket.on('group:announcement:deleted', (data) => {
        if (data.groupId === id) {
          setGroupAnnouncements(prev => prev.filter(a => a._id !== data.announcementId));
        }
      });
      
      return () => {
        if (id && id !== 'undefined' && id !== 'null') {
          socket.emit('group:leave', id);
        }
        socket.off('group:announcement:new');
        socket.off('group:announcement:updated');
        socket.off('group:announcement:deleted');
      };
    }
  }, [id]);

  useLayoutEffect(() => {
    if (!showGroupStatusMenu) {
      setGroupStatusDropdownPos(null);
      return;
    }
    const MENU_WIDTH = 288;
    const updatePos = () => {
      const el = groupStatusButtonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, r.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8
      );
      const caretLeft = Math.min(
        Math.max(10, r.left + r.width / 2 - left - 8),
        MENU_WIDTH - 26
      );
      setGroupStatusDropdownPos({
        top: r.bottom + 8,
        left,
        width: MENU_WIDTH,
        caretLeft,
      });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [showGroupStatusMenu]);

  useEffect(() => {
    if (!showGroupStatusMenu) return;
    const onPointerDown = (e) => {
      if (groupStatusButtonRef.current?.contains(e.target)) return;
      if (groupStatusDropdownRef.current?.contains(e.target)) return;
      setShowGroupStatusMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showGroupStatusMenu]);

  const fetchGroupDetail = async () => {
    if (!id || id === 'undefined' || id === 'null') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.get(`/groups/${id}`);
      const groupData = res.data.group;
      setGroup(groupData);
      setGroupHomeFeedHidden(Boolean(res.data.homeFeedHiddenFromHome));
      
      // Set members and posts
      setGroupMembers(groupData.members || []);
      setGroupPosts(groupData.posts || []);
      
      // Check permissions
      const creatorId = groupData.creator?._id || groupData.creator;
      const uid = user?.id || user?._id;
      const isCreator = String(creatorId) === String(uid);
      setIsGroupCreator(isCreator);
      
      const member = groupData.members?.find(
        m => {
          const memberUserId = m.user?._id || m.user;
          return String(memberUserId) === String(uid);
        }
      );
      const isAdmin = isCreator || member?.role === 'admin' || member?.role === 'moderator';
      setIsGroupAdmin(isAdmin);
      
      // Debug log
      console.log('Group Detail - Permissions:', {
        creatorId,
        userId: uid,
        isCreator,
        memberRole: member?.role,
        isAdmin,
        members: groupData.members?.length
      });
    } catch (error) {
      console.error('Error fetching group:', error);
      alert('Lỗi tải thông tin nhóm');
      navigate('/home');
    }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/groups/${id}/announcements`);
      setGroupAnnouncements(res.data.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    try {
      const payload = {
        ...announcementForm,
        expiryDate: announcementForm.expiryDate || null
      };
      
      if (editingAnnouncement) {
        await api.put(`/groups/${id}/announcements/${editingAnnouncement._id}`, payload);
        alert('✅ Đã cập nhật thông báo thành công!');
      } else {
        await api.post(`/groups/${id}/announcements`, payload);
        alert('✅ Đã tạo thông báo thành công!');
      }
      
      setShowAnnouncementModal(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: '',
        content: '',
        priority: 'normal',
        isPinned: false,
        expiryDate: ''
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('❌ ' + (error.response?.data?.message || 'Lỗi tạo thông báo'));
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      expiryDate: announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().split('T')[0] : ''
    });
    setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;

    try {
      await api.delete(`/groups/${id}/announcements/${announcementId}`);
      alert('✅ Đã xóa thông báo!');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('❌ ' + (error.response?.data?.message || 'Lỗi xóa thông báo'));
    }
  };

  const handleMarkAsRead = async (announcementId) => {
    try {
      await api.post(`/groups/${id}/announcements/${announcementId}/read`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleGroupHomeFeedFollow = async (showOnHomeFeed) => {
    if (!id || id === 'undefined' || id === 'null') return;
    try {
      await api.patch(`/groups/${id}/home-feed`, { showOnHomeFeed });
      setGroupHomeFeedHidden(!showOnHomeFeed);
      setShowGroupStatusMenu(false);
      window.dispatchEvent(new CustomEvent('groupHomeFeedPrefChanged'));
    } catch (error) {
      console.error('home-feed follow:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật theo dõi nhóm trên trang chủ');
    }
  };

  const handleJoinGroup = async () => {
    try {
      const pendingInviteId = searchParams.get('invite');
      if (pendingInviteId && id) {
        const res = await api.post(`/groups/${id}/invites/${pendingInviteId}/accept`);
        alert(res.data?.message || '✅ Đã tham gia nhóm!');
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('invite');
          return next;
        }, { replace: true });
        await fetchGroupDetail();
        window.dispatchEvent(new CustomEvent('userGroupsChanged'));
        return;
      }
      await api.post(`/groups/${id}/join`);
      alert('✅ Đã tham gia nhóm thành công!');
      await fetchGroupDetail();
      window.dispatchEvent(new CustomEvent('userGroupsChanged'));
    } catch (error) {
      console.error('Error joining group:', error);
      alert('❌ ' + (error.response?.data?.message || 'Lỗi tham gia nhóm'));
    }
  };

  const handleLeaveGroup = async () => {
    if (!id || id === 'undefined' || id === 'null') {
      alert('ID nhóm không hợp lệ');
      return;
    }
    
    if (!window.confirm('Bạn có chắc muốn rời nhóm này?')) {
      return;
    }
    try {
      await api.post(`/groups/${id}/leave`);
      alert('Đã rời nhóm!');
      navigate('/home');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi rời nhóm');
    }
  };

  const handleDeleteGroup = async () => {
    if (!id || id === 'undefined' || id === 'null') {
      alert('ID nhóm không hợp lệ');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa nhóm này? Hành động này không thể hoàn tác.')) {
      return;
    }
    try {
      await api.delete(`/groups/${id}`);
      alert('Đã xóa nhóm!');
      navigate('/home');
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa nhóm');
    }
  };

  const handleCreatePost = async () => {
    const hasText = newGroupPostContent.trim().length > 0;
    const hasImages = newGroupPostImages.length > 0;
    const hasFiles = newGroupPostFiles.length > 0;
    if (!hasText && !hasImages && !hasFiles) {
      alert('Vui lòng nhập nội dung hoặc đính kèm ảnh / file / video');
      return;
    }

    // Double check membership before posting
    const currentIsMember = group?.members?.some(
      m => {
        const memberUserId = m.user?._id || m.user;
        const currentUserId = user?.id || user?._id;
        return String(memberUserId) === String(currentUserId);
      }
    );

    if (!currentIsMember) {
      alert('Bạn cần tham gia nhóm để đăng bài. Vui lòng nhấn nút "Tham gia nhóm" trước.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('content', newGroupPostContent);
      if (
        newGroupPostTextBackground &&
        newGroupPostImages.length === 0 &&
        newGroupPostFiles.length === 0
      ) {
        formData.append('textBackground', newGroupPostTextBackground);
      }

      if (newGroupPostImages.length > 0) {
        newGroupPostImages.forEach((file) => {
          formData.append('images', file);
        });
      }
      if (newGroupPostFiles.length > 0) {
        newGroupPostFiles.forEach((file) => {
          formData.append('files', file);
        });
      }

      const res = await api.post(`/groups/${id}/posts`, formData);

      setNewGroupPostContent('');
      setNewGroupPostTextBackground('');
      setNewGroupPostImages([]);
      setNewGroupPostFiles([]);
      setShowGroupPostModal(false);

      // Refresh group data to show new post
      await fetchGroupDetail();

      alert('✅ ' + (res.data.message || 'Đã đăng bài viết thành công!'));
    } catch (error) {
      console.error('Error creating group post:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Lỗi đăng bài viết';
      
      alert('❌ ' + errorMessage);
      
      // If error is about not being a member, refresh group data
      if (error.response?.status === 403) {
        await fetchGroupDetail();
      }
    }
  };

  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const res = await api.get('/users/search', { params: { q: query } });
      setSearchUsers(res.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchUsers([]);
    }
  };

  const handleAddMember = async (userId, { closeAddMemberModal = true } = {}) => {
    try {
      const res = await api.post(`/groups/${id}/invites`, { userId });
      alert(res.data?.message || 'Đã gửi lời mời tham gia nhóm');
      if (closeAddMemberModal) {
        setShowAddMemberModal(false);
        setUserSearchQuery('');
        setSearchUsers([]);
      }
      await fetchGroupDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  const closeInviteFriendsModal = () => {
    setShowInviteFriendsModal(false);
    setInviteFriendPickerQuery('');
    setSelectedFriendIdsForInvite([]);
  };

  const openInviteFriendsModal = async () => {
    setInviteFriendPickerQuery('');
    setSelectedFriendIdsForInvite([]);
    setShowInviteFriendsModal(true);
    setInviteFriendsLoading(true);
    setInviteFriendsList([]);
    try {
      const res = await api.get('/friends');
      setInviteFriendsList(res.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      alert(error.response?.data?.message || 'Không tải được danh sách bạn bè');
      closeInviteFriendsModal();
    } finally {
      setInviteFriendsLoading(false);
    }
  };

  const closeGroupCardShareModal = () => {
    setShowGroupCardShareModal(false);
    setGroupCardShareQuery('');
    setGroupCardShareSelectedIds(new Set());
    setGroupCardShareFriendsLoading(false);
  };

  const openGroupCardShareModal = () => {
    setGroupCardShareQuery('');
    setGroupCardShareSelectedIds(new Set());
    setShowGroupCardShareModal(true);
    setGroupCardShareFriendsLoading(true);
    setGroupCardShareFriendsList([]);
    void (async () => {
      try {
        const res = await api.get('/friends').catch(() => ({ data: { friends: [] } }));
        setGroupCardShareFriendsList(res.data.friends || []);
      } catch (error) {
        console.error('Error loading friends for share:', error);
        alert(error.response?.data?.message || 'Không tải được danh sách bạn bè');
        closeGroupCardShareModal();
      } finally {
        setGroupCardShareFriendsLoading(false);
      }
    })();
  };

  const toggleGroupCardShareFriendSelect = (friendId) => {
    const sid = String(friendId);
    setGroupCardShareSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleConfirmGroupCardShare = async () => {
    if (!group?._id) return;
    const ids = [...groupCardShareSelectedIds];
    if (ids.length === 0) {
      alert('Vui lòng chọn ít nhất một người bạn.');
      return;
    }
    setGroupCardShareSending(true);
    try {
      const shareContent = buildGroupShareMessageContent(group);
      for (const friendId of ids) {
        const convRes = await api.get(`/messages/conversation/${friendId}`);
        const cid = convRes.data?.conversation?._id;
        if (!cid) continue;
        const fd = new FormData();
        fd.append('content', shareContent);
        await api.post(`/messages/${cid}`, fd);
      }
      closeGroupCardShareModal();
      alert(`Đã gửi nhóm tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Group card share failed:', error);
      alert(error.response?.data?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setGroupCardShareSending(false);
    }
  };

  const toggleFriendInviteSelection = (friendId) => {
    const sid = String(friendId);
    setSelectedFriendIdsForInvite((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  };

  const removeFriendFromInviteSelection = (friendId) => {
    const sid = String(friendId);
    setSelectedFriendIdsForInvite((prev) => prev.filter((x) => x !== sid));
  };

  const handleSendBatchGroupInvites = async () => {
    if (!selectedFriendIdsForInvite.length) return;
    setInviteBatchSending(true);
    try {
      const res = await api.post(`/groups/${id}/invites`, {
        userIds: selectedFriendIdsForInvite
      });
      let msg = res.data?.message || 'Đã gửi lời mời';
      if (res.data?.notSent?.length) {
        msg += `\n\nKhông gửi được ${res.data.notSent.length} lời mời (đã là thành viên, đã có lời mời chờ, hoặc không đủ điều kiện).`;
      }
      alert(msg);
      closeInviteFriendsModal();
      await fetchGroupDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi gửi lời mời');
    } finally {
      setInviteBatchSending(false);
    }
  };

  const MAX_GROUP_ATTACH = 10;

  const handleGroupPostImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewGroupPostImages((prev) => {
      const next = [...prev, ...files];
      return next.slice(0, MAX_GROUP_ATTACH);
    });
    e.target.value = '';
  };

  const handleGroupPostDocSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewGroupPostFiles((prev) => {
      const next = [...prev, ...files];
      return next.slice(0, MAX_GROUP_ATTACH);
    });
    e.target.value = '';
  };

  const removeGroupPostImage = (index) => {
    setNewGroupPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeGroupPostFile = (index) => {
    setNewGroupPostFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) {
      return;
    }
    try {
      await api.delete(`/groups/${id}/members/${memberId}`);
      alert('Đã xóa thành viên khỏi nhóm!');
      fetchGroupDetail();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi xóa thành viên');
    }
  };

  const handleOpenGroupSettings = async (initialTab = 'general') => {
    if (!group) return;
    
    // Fetch latest group data
    try {
      const res = await api.get(`/groups/${id}`);
      const latestGroup = res.data.group;
      
      // Initialize settings form with current group data
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
      alert('Không thể tải thông tin nhóm');
    }
  };

  const handleSaveGroupSettings = async () => {
    // Validation
    const errors = {};
    if (!groupSettingsForm.name.trim()) {
      errors.name = 'Tên nhóm không được để trống';
    } else if (groupSettingsForm.name.trim().length < 3) {
      errors.name = 'Tên nhóm phải có ít nhất 3 ký tự';
    } else if (groupSettingsForm.name.trim().length > 100) {
      errors.name = 'Tên nhóm không được vượt quá 100 ký tự';
    }

    if (groupSettingsForm.description && groupSettingsForm.description.length > 500) {
      errors.description = 'Mô tả không được vượt quá 500 ký tự';
    }

    if (Array.isArray(groupSettingsForm.tags) && groupSettingsForm.tags.length > 10) {
      errors.tags = 'Chỉ được thêm tối đa 10 tags';
    }

    setSettingsErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append('name', groupSettingsForm.name);
      formData.append('description', groupSettingsForm.description);
      formData.append('category', groupSettingsForm.category);
      formData.append('rules', groupSettingsForm.rules);
      
      // Handle tags
      if (Array.isArray(groupSettingsForm.tags)) {
        formData.append('tags', JSON.stringify(groupSettingsForm.tags));
      } else {
        formData.append('tags', JSON.stringify([]));
      }
      
      // Một ảnh nhóm (coverPhoto) + emoji — chỉ người tạo nhóm
      if (isGroupCreator) {
        if (groupSettingsCoverFile) {
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
      
      // Add settings
      formData.append('settings', JSON.stringify(groupSettingsForm.settings));

      await api.put(`/groups/${id}/settings`, formData);

      // Refresh group data
      await fetchGroupDetail();
      
      // Reset file states
      setGroupSettingsCoverFile(null);
      
      // Close settings modal
      setShowGroupSettingsModal(false);
      setSettingsErrors({});
      
      alert('✅ Cập nhật cài đặt nhóm thành công!');
    } catch (error) {
      console.error('Error updating group settings:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi cập nhật cài đặt nhóm';
      alert('❌ ' + errorMessage);
    } finally {
      setSavingSettings(false);
    }
  };

  const isMember = group?.members?.some(
    m => {
      const memberUserId = m.user?._id || m.user;
      const currentUserId = user?.id || user?._id;
      // Convert both to string for comparison
      return String(memberUserId) === String(currentUserId);
    }
  );

  const canInviteToGroup =
    isMember &&
    (isGroupAdmin || group?.settings?.allowMemberInvite !== false);

  const memberIdsSet = new Set(
    groupMembers.map((m) => String(m.user?._id || m.user))
  );
  const currentUserIdStr = String(user?.id || user?._id || '');
  const inviteFriendsEligible = inviteFriendsList.filter(
    (f) =>
      f?._id &&
      !memberIdsSet.has(String(f._id)) &&
      String(f._id) !== currentUserIdStr
  );

  const inviteFriendPickerNorm = inviteFriendPickerQuery.trim().toLowerCase();
  const inviteFriendsFiltered = inviteFriendsEligible.filter((f) => {
    if (!inviteFriendPickerNorm) return true;
    const name = (f.name || '').toLowerCase();
    const email = (f.email || '').toLowerCase();
    return (
      name.includes(inviteFriendPickerNorm) ||
      email.includes(inviteFriendPickerNorm)
    );
  });

  const selectedFriendsForInvitePanel = selectedFriendIdsForInvite
    .map((sid) => inviteFriendsList.find((f) => String(f._id) === sid))
    .filter(Boolean);

  const filteredGroupCardShareFriends = useMemo(() => {
    const q = groupCardShareQuery.trim().toLowerCase();
    if (!q) return groupCardShareFriendsList;
    return groupCardShareFriendsList.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    );
  }, [groupCardShareFriendsList, groupCardShareQuery]);

  const inviteFromUrl = searchParams.get('invite');

  useEffect(() => {
    if (!inviteFromUrl || loading || !group) return;
    if (isMember) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('invite');
        return next;
      }, { replace: true });
    }
  }, [inviteFromUrl, loading, group, isMember, setSearchParams]);

  const groupPostMediaGallery = useMemo(() => {
    const items = [];
    for (const post of groupPosts) {
      const images = post.images;
      if (!Array.isArray(images) || images.length === 0) continue;
      images.forEach((img, idx) => {
        if (typeof img !== 'string') return;
        const url = resolvePostImageSrc(img);
        if (!url) return;
        items.push({ key: `${post._id}-${idx}`, url, postId: post._id, post, imageIndex: idx });
      });
    }
    return items;
  }, [groupPosts]);

  const groupAboutAccess = useMemo(() => {
    const t = group?.settings?.accessType || 'public';
    const map = {
      public: {
        title: 'Công khai',
        desc: 'Mọi người đều có thể nhìn thấy thành viên nhóm và nội dung được đăng (theo quyền truy cập).'
      },
      private: {
        title: 'Riêng tư',
        desc: 'Chỉ thành viên mới xem được danh sách thành viên và bài viết trong nhóm.'
      },
      approval: {
        title: 'Cần phê duyệt',
        desc: 'Người muốn tham gia cần được quản trị viên chấp nhận.'
      },
      'invite-only': {
        title: 'Chỉ mời',
        desc: 'Chỉ những người được mời mới có thể tham gia nhóm.'
      }
    };
    return map[t] || map.public;
  }, [group?.settings?.accessType]);

  const groupVisibilityHint = useMemo(() => {
    const t = group?.settings?.accessType || 'public';
    if (t === 'public') {
      return 'Nhóm có thể xuất hiện trong tìm kiếm và gợi ý cho người dùng.';
    }
    return 'Thông tin nhóm chủ yếu hiển thị với thành viên.';
  }, [group?.settings?.accessType]);

  const handleAcceptInviteFromUrl = async () => {
    if (!inviteFromUrl || !id) return;
    setInviteFromUrlLoading(true);
    try {
      await api.post(`/groups/${id}/invites/${inviteFromUrl}/accept`);
      alert('Đã tham gia nhóm!');
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('invite');
        return next;
      }, { replace: true });
      await fetchGroupDetail();
      window.dispatchEvent(new CustomEvent('userGroupsChanged'));
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể chấp nhận lời mời');
    } finally {
      setInviteFromUrlLoading(false);
    }
  };

  const handleDeclineInviteFromUrl = async () => {
    if (!inviteFromUrl || !id) return;
    setInviteFromUrlLoading(true);
    try {
      await api.post(`/groups/${id}/invites/${inviteFromUrl}/decline`);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('invite');
        return next;
      }, { replace: true });
    } catch (error) {
      alert(error.response?.data?.message || 'Không thể từ chối lời mời');
    } finally {
      setInviteFromUrlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-[var(--fb-text-secondary)] mt-4">Đang tải thông tin nhóm...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--fb-text-secondary)]">Không tìm thấy nhóm</p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const groupPrivacyLabel =
    group.settings?.accessType === 'private'
      ? 'Nhóm riêng tư'
      : group.settings?.accessType === 'approval'
        ? 'Cần phê duyệt'
        : group.settings?.accessType === 'invite-only'
          ? 'Chỉ mời'
          : 'Nhóm công khai';

  return (
    <div className="min-h-screen bg-[var(--fb-app)] text-[var(--fb-text-primary)] animate-fadeIn">
      {/* Ảnh bìa + header — một khung căn max-w-7xl, kiểu Facebook */}
      <div className="max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 pt-4">
        <div className="overflow-visible rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-sm">
          <div className="relative aspect-[21/9] min-h-[180px] w-full max-h-[360px] overflow-hidden rounded-t-xl bg-gradient-to-r from-blue-400 to-purple-500 sm:min-h-[200px] md:min-h-[240px]">
            {groupHeroImageUrl ? (
              <button
                type="button"
                onClick={openGroupCoverTheater}
                className="block h-full w-full cursor-zoom-in p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                aria-label="Xem ảnh nhóm toàn màn hình"
              >
                <img src={groupHeroImageUrl} alt="" className="pointer-events-none h-full w-full object-cover" />
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-6xl leading-none opacity-90 sm:text-7xl" aria-hidden>
                  {groupEmojiOnly}
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
            {isGroupCreator && (
              <button
                type="button"
                onClick={() => handleOpenGroupSettings('appearance')}
                className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-lg border border-white/40 bg-black/50 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/65 sm:text-sm sm:bottom-4 sm:right-4 sm:px-4"
              >
                <Camera className="h-4 w-4" />
                {groupHeroImageUrl ? 'Chỉnh sửa ảnh nhóm' : 'Thêm ảnh nhóm'}
              </button>
            )}
          </div>

          <div className="rounded-b-xl border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="text-[22px] font-bold leading-tight text-[var(--fb-text-primary)] sm:text-3xl sm:leading-snug">
                    {group.name}
                  </h1>
                  {group.settings?.accessType === 'private' && (
                    <Lock className="h-5 w-5 shrink-0 text-[var(--fb-icon)] sm:h-6 sm:w-6" title="Nhóm riêng tư" />
                  )}
                  {group.settings?.accessType === 'approval' && (
                    <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500 sm:h-6 sm:w-6" title="Yêu cầu phê duyệt" />
                  )}
                  {group.settings?.accessType === 'invite-only' && (
                    <Shield className="h-5 w-5 shrink-0 text-blue-500 sm:h-6 sm:w-6" title="Chỉ mời" />
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--fb-text-secondary)] sm:text-[15px]">
                  {group.settings?.accessType === 'private' ? (
                    <Lock className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  ) : (
                    <Globe className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  )}
                  <span>{groupPrivacyLabel}</span>
                  <span className="text-[var(--fb-text-secondary)]/70">·</span>
                  <span>
                    {groupMembers.length.toLocaleString('vi-VN')} thành viên
                  </span>
                  <span className="text-[var(--fb-text-secondary)]/70">·</span>
                  <span>{groupPosts.length} bài viết</span>
                  {group.category ? (
                    <>
                      <span className="text-[var(--fb-text-secondary)]/70">·</span>
                      <span>{group.category}</span>
                    </>
                  ) : null}
                </p>

                {group.tags && group.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {group.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--fb-text-secondary)] sm:line-clamp-2">
                    {group.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                  title="Quay lại"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {isGroupAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenGroupSettings}
                    className="rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                    title="Cài đặt nhóm"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
                {!isMember && (
                  <button
                    type="button"
                    onClick={() => handleJoinGroup()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    Tham gia nhóm
                  </button>
                )}
                {canInviteToGroup && (
                  <button
                    type="button"
                    onClick={openInviteFriendsModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-4"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    Mời
                  </button>
                )}
                <button
                  type="button"
                  onClick={openGroupCardShareModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm font-semibold text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)] sm:px-4"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Chia sẻ
                </button>
                {isMember && (
                  <>
                    <button
                      ref={groupStatusButtonRef}
                      type="button"
                      onClick={() => setShowGroupStatusMenu((v) => !v)}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-2.5 text-sm font-semibold text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)] sm:h-10 sm:px-3"
                      aria-expanded={showGroupStatusMenu}
                      aria-haspopup="menu"
                      title="Đã tham gia"
                    >
                      <Users className="h-4 w-4 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                      <span>Đã tham gia</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${showGroupStatusMenu ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {showGroupStatusMenu &&
                      groupStatusDropdownPos &&
                      typeof document !== 'undefined' &&
                      createPortal(
                        <div
                          ref={groupStatusDropdownRef}
                          role="menu"
                          className="fixed z-[300] rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-1 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                          style={{
                            top: groupStatusDropdownPos.top,
                            left: groupStatusDropdownPos.left,
                            width: groupStatusDropdownPos.width,
                          }}
                        >
                          <div
                            className="pointer-events-none absolute -top-2 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-[var(--fb-surface)] drop-shadow-sm"
                            style={{ left: groupStatusDropdownPos.caretLeft }}
                            aria-hidden
                          />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowGroupStatusMenu(false);
                              setActiveTab('announcements');
                              requestAnimationFrame(() => {
                                document
                                  .getElementById('group-feed-tabs')
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              });
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                          >
                            <Bell className="h-5 w-5 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                            Quản lý thông báo
                          </button>
                          {groupHomeFeedHidden ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleGroupHomeFeedFollow(true)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                            >
                              <Eye className="h-5 w-5 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                              Theo dõi nhóm
                            </button>
                          ) : (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleGroupHomeFeedFollow(false)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] text-[var(--fb-text-primary)] transition-colors hover:bg-[var(--fb-hover)]"
                            >
                              <EyeOff className="h-5 w-5 shrink-0 text-[var(--fb-icon)]" aria-hidden />
                              Bỏ theo dõi nhóm
                            </button>
                          )}
                          <div className="my-1 border-t border-[var(--fb-divider)]" role="separator" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setShowGroupStatusMenu(false);
                              if (isGroupCreator) {
                                handleDeleteGroup();
                              } else {
                                handleLeaveGroup();
                              }
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            {isGroupCreator ? (
                              <Trash2 className="h-5 w-5 shrink-0" aria-hidden />
                            ) : (
                              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                            )}
                            {isGroupCreator ? 'Xóa nhóm' : 'Rời nhóm'}
                          </button>
                        </div>,
                        document.body
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 py-6">
        {inviteFromUrl && user && !isMember && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--fb-text-primary)]">
              Bạn được mời tham gia nhóm này. Hãy chấp nhận hoặc từ chối lời mời.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={inviteFromUrlLoading}
                onClick={handleDeclineInviteFromUrl}
                className="px-3 py-1.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                type="button"
                disabled={inviteFromUrlLoading}
                onClick={handleAcceptInviteFromUrl}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {inviteFromUrlLoading ? 'Đang xử lý…' : 'Chấp nhận'}
              </button>
            </div>
          </div>
        )}
        <div className="mx-auto grid w-full max-w-[min(100%,calc(300px+680px+1rem))] grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,300px)_minmax(0,680px)] lg:gap-4">
          {/* Left Sidebar — gần cột bài viết, cả khối căn giữa trang */}
          <div className="min-w-0">
            <div className="sticky top-20 space-y-4">
              {/* Management Section for Creator/Admin */}
              {(isGroupCreator || isGroupAdmin) && (
                <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                  <h4 className="font-semibold text-[var(--fb-text-primary)] mb-3 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-500" />
                    Quản lý nhóm
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleOpenGroupSettings}
                      className="w-full flex items-center justify-between p-3 bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-[var(--fb-text-primary)]">Cài đặt nhóm</span>
                      </div>
                    </button>
                    {isGroupCreator && (
                      <button
                        onClick={() => setShowAddMemberModal(true)}
                        className="w-full flex items-center justify-between p-3 bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] rounded-lg transition-colors text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-[var(--fb-text-primary)]">Thêm thành viên</span>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingAnnouncement(null);
                        setAnnouncementForm({
                          title: '',
                          content: '',
                          priority: 'normal',
                          isPinned: false,
                          expiryDate: ''
                        });
                        setShowAnnouncementModal(true);
                      }}
                      className="w-full flex items-center justify-between p-3 bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] border border-[var(--fb-divider)] rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-[var(--fb-text-primary)]">Tạo thông báo</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Giới thiệu nhóm */}
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                <h4 className="font-semibold text-[var(--fb-text-primary)] mb-3">Giới thiệu</h4>
                <p className="text-sm text-[var(--fb-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {group.description?.trim()
                    ? group.description
                    : 'Nhóm chưa có mô tả. Chủ nhóm có thể bổ sung trong phần cài đặt nhóm.'}
                </p>
                <div className="mt-4 space-y-3 pt-4 border-t border-[var(--fb-divider)]">
                  <div className="flex gap-3">
                    <Globe className="w-5 h-5 text-[var(--fb-icon)] shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--fb-text-primary)]">{groupAboutAccess.title}</p>
                      <p className="text-xs text-[var(--fb-text-secondary)] mt-1 leading-snug">{groupAboutAccess.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Eye className="w-5 h-5 text-[var(--fb-icon)] shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--fb-text-primary)]">Hiển thị</p>
                      <p className="text-xs text-[var(--fb-text-secondary)] mt-1 leading-snug">{groupVisibilityHint}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* File phương tiện mới đây (xem nhanh) */}
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                <h4 className="font-semibold text-[var(--fb-text-primary)] mb-3">File phương tiện mới đây</h4>
                {groupPostMediaGallery.length === 0 ? (
                  <p className="text-xs text-[var(--fb-text-secondary)] mb-3">Chưa có ảnh trong bài viết nhóm.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {groupPostMediaGallery.slice(0, 4).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => openImageTheater(item.post, item.imageIndex)}
                        className="relative aspect-square rounded-md overflow-hidden bg-[var(--fb-input)] border border-[var(--fb-divider)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <img
                          src={item.url}
                          alt=""
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--fb-input)] text-[var(--fb-text-primary)] border border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors"
                >
                  Xem tất cả
                </button>
              </div>
            </div>
          </div>

          {/* Main Content — luồng bài viết */}
          <div className="min-w-0">
            <div className="mx-auto w-full max-w-[min(100%,680px)] space-y-4">
            {/* Tabs */}
            <div
              id="group-feed-tabs"
              className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)]"
            >
              <div className="flex border-b border-[var(--fb-divider)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 px-3 sm:px-6 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    activeTab === 'posts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight text-center">Thảo luận</span>
                  </span>
                  <span className="text-[11px] font-normal opacity-80">
                    {groupPosts.length} bài viết
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`flex-1 px-2 sm:px-3 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    activeTab === 'members'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight text-center">Thành viên</span>
                  </span>
                  <span className="text-[11px] font-normal opacity-80">
                    {groupMembers.length} người
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className={`flex-1 px-2 sm:px-3 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    activeTab === 'media'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight text-center">File phương tiện</span>
                  </span>
                  <span className="text-[11px] font-normal opacity-80">
                    {groupPostMediaGallery.length} ảnh
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className={`flex-1 px-2 sm:px-3 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    activeTab === 'announcements'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 flex-shrink-0" />
                    <span className="leading-tight text-center">Thông báo</span>
                  </span>
                  <span className="text-[11px] font-normal opacity-80">
                    {groupAnnouncements.length} mục
                  </span>
                </button>
              </div>
            </div>

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                {/* Nội quy + Thông tin nhóm (chỉ hiện trong tab Thông báo) */}
                {(group.rules || group.settings) && (
                  <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4 space-y-4">
                    {group.rules && (
                      <div>
                        <h4 className="font-semibold text-[var(--fb-text-primary)] mb-2 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-blue-500" />
                          Nội quy nhóm
                        </h4>
                        <div className="bg-[var(--fb-input)] rounded-lg p-4">
                          <p className="text-[var(--fb-text-primary)] whitespace-pre-line text-sm">{group.rules}</p>
                        </div>
                      </div>
                    )}
                    {group.settings && (
                      <div className={group.rules ? 'border-t pt-4' : ''}>
                        <h4 className="font-semibold text-[var(--fb-text-primary)] mb-3 flex items-center">
                          <Settings className="w-5 h-5 mr-2 text-blue-500" />
                          Thông tin nhóm
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--fb-text-secondary)]">Quyền truy cập:</span>
                            <span className="font-medium text-[var(--fb-text-primary)]">
                              {group.settings.accessType === 'public' && '🌍 Công khai'}
                              {group.settings.accessType === 'private' && '🔒 Riêng tư'}
                              {group.settings.accessType === 'approval' && '⏳ Yêu cầu phê duyệt'}
                              {group.settings.accessType === 'invite-only' && '🔐 Chỉ mời'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--fb-text-secondary)]">Quyền đăng bài:</span>
                            <span className="font-medium text-[var(--fb-text-primary)]">
                              {group.settings.postPermission === 'all-members' && 'Tất cả thành viên'}
                              {group.settings.postPermission === 'admin-moderator' && 'Admin & Moderator'}
                              {group.settings.postPermission === 'approval-required' && 'Cần phê duyệt'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--fb-text-secondary)]">Quyền bình luận:</span>
                            <span className="font-medium text-[var(--fb-text-primary)]">
                              {group.settings.commentPermission === 'all-members' && 'Tất cả mọi người'}
                              {group.settings.commentPermission === 'members-only' && 'Chỉ thành viên'}
                              {group.settings.commentPermission === 'disabled' && 'Đã tắt'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[var(--fb-text-secondary)]">Upload file:</span>
                            {group.settings.allowFileUpload ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <X className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Announcements Header */}
                <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--fb-text-primary)] flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-blue-600" />
                      Thông báo nhóm
                    </h3>
                    {isGroupAdmin && (
                      <button
                        onClick={() => {
                          setEditingAnnouncement(null);
                          setAnnouncementForm({
                            title: '',
                            content: '',
                            priority: 'normal',
                            isPinned: false,
                            expiryDate: ''
                          });
                          setShowAnnouncementModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tạo thông báo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcements List */}
                {groupAnnouncements.length === 0 ? (
                  <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-12 text-center">
                    <Bell className="w-16 h-16 text-[var(--fb-icon)] opacity-70 mx-auto mb-4" />
                    <p className="text-[var(--fb-text-secondary)]">Chưa có thông báo nào</p>
                  </div>
                ) : (
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] overflow-hidden">
                <div className="p-4 border-b border-[var(--fb-divider)] bg-[var(--fb-surface)]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--fb-text-primary)] flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-blue-600" />
                      Thông báo nhóm ({groupAnnouncements.length})
                    </h3>
                  </div>
                </div>
                <div className="divide-y">
                  {groupAnnouncements.map((announcement) => {
                    const priorityColors = {
                      normal: 'bg-blue-100 text-blue-700',
                      important: 'bg-orange-100 text-orange-700',
                      urgent: 'bg-red-100 text-red-700'
                    };
                    const isExpired = announcement.expiryDate && new Date(announcement.expiryDate) < new Date();
                    
                    if (isExpired) return null;
                    
                    return (
                      <div
                        key={announcement._id}
                        className={`p-4 hover:bg-[var(--fb-hover)] transition-colors ${
                          !announcement.isRead ? 'bg-[var(--fb-input)] border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {announcement.isPinned && (
                                <Pin className="w-4 h-4 text-blue-600 fill-current" />
                              )}
                              <h4 className="font-bold text-[var(--fb-text-primary)]">{announcement.title}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[announcement.priority]}`}>
                                {announcement.priority === 'normal' && 'Bình thường'}
                                {announcement.priority === 'important' && 'Quan trọng'}
                                {announcement.priority === 'urgent' && 'Khẩn cấp'}
                              </span>
                              {!announcement.isRead && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              )}
                            </div>
                            <p className="text-[var(--fb-text-primary)] mb-2 whitespace-pre-wrap">{announcement.content}</p>
                            <div className="flex items-center space-x-4 text-xs text-[var(--fb-text-secondary)]">
                              <span>Bởi {announcement.author?.name}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(announcement.createdAt)}</span>
                              {announcement.expiryDate && (
                                <>
                                  <span>•</span>
                                  <span>Hết hạn: {new Date(announcement.expiryDate).toLocaleDateString('vi-VN')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {(isGroupAdmin || announcement.author._id === user?.id) && (
                              <>
                                <button
                                  onClick={() => handleEditAnnouncement(announcement)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Sửa"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAnnouncement(announcement._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Xóa"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                )}
              </div>
            )}

            {/* Content based on active tab */}
            {activeTab === 'posts' && (
              <>
                {/* Composer: thu gọn như trang chủ — mở rộng khi bấm */}
                <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
                  {!isMember ? (
                    <div className="p-4 border-2 border-dashed border-[var(--fb-divider)] rounded-lg m-4 text-center">
                      <div className="mb-4">
                        <Lock className="w-12 h-12 text-[var(--fb-icon)] opacity-70 mx-auto" />
                      </div>
                      <h4 className="font-semibold text-[var(--fb-text-primary)] mb-2">Tham gia nhóm để đăng bài</h4>
                      <p className="text-sm text-[var(--fb-text-secondary)] mb-4">
                        Bạn cần tham gia nhóm để có thể chia sẻ bài viết, tài liệu và tham gia thảo luận.
                      </p>
                      <button
                        type="button"
                        onClick={handleJoinGroup}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Tham gia nhóm ngay
                      </button>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                          alt={user?.name || ''}
                          className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-[var(--fb-divider)] object-cover"
                          onError={withAvatarFallback(user?.name, '1877f2')}
                          onClick={() => navigate(`/profile/${user?.id || user?._id}`)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGroupPostModal(true)}
                          className="flex-1 text-left px-4 py-2.5 bg-[var(--fb-input)] rounded-full text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors text-[15px]"
                        >
                          Bạn đang nghĩ gì?
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Posts */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-[var(--fb-icon)] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={postSearchQuery}
                      onChange={(e) => setPostSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm bài viết..."
                      className="w-full pl-10 pr-4 py-2 border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Bài viết trong nhóm — cùng luồng hiển thị như trang chủ */}
                <div className="space-y-4">
                  {filteredPosts.length === 0 ? (
                    <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-12 text-center">
                      <FileText className="w-16 h-16 text-[var(--fb-icon)] opacity-70 mx-auto mb-4" />
                      <p className="text-[var(--fb-text-secondary)]">
                        {postSearchQuery.trim() 
                          ? `Không tìm thấy bài viết nào với từ khóa "${postSearchQuery}"`
                          : 'Chưa có bài viết nào trong nhóm'}
                      </p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => {
                      const authorName = post.author?.name || 'Thành viên';
                      const authorId = post.author?._id || post.author;
                      const currentUserId = user?.id || user?._id;
                      const canManagePost =
                        Boolean(currentUserId) &&
                        (String(authorId) === String(currentUserId) || user?.role === 'admin');
                      const postDomId = `post-${String(post._id)}`;
                      return (
                  <div
                    key={postDomId}
                    id={postDomId}
                    className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden hover:shadow-md transition-shadow scroll-mt-24"
                  >
                    <div className="p-3 flex items-center justify-between">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => authorId && navigate(`/profile/${authorId}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (authorId) navigate(`/profile/${authorId}`);
                          }
                        }}
                        className="flex items-center space-x-2 cursor-pointer flex-1 min-w-0 hover:bg-[var(--fb-hover)] -mx-3 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <img
                          src={resolveAvatarUrl(post.author?.avatar, authorName)}
                          alt={authorName}
                          className="h-10 w-10 shrink-0 rounded-full border-2 border-[var(--fb-divider)] object-cover"
                          onError={withAvatarFallback(authorName)}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--fb-text-primary)] hover:underline text-[15px] leading-tight truncate">{authorName}</h3>
                          <div className="flex items-center space-x-1.5 text-xs text-[var(--fb-text-secondary)] mt-0.5 flex-wrap">
                            <span>{formatTimeAgo(post.createdAt)}</span>
                            {isPostEdited(post) && (
                              <>
                                <span>•</span>
                                <span className="font-medium">đã chỉnh sửa</span>
                              </>
                            )}
                            {post.category && (
                              <>
                                <span>•</span>
                                <span className="flex items-center text-blue-600">
                                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  {post.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="relative group-post-options-container">
                        <button
                          type="button"
                          onClick={() =>
                            setPostOptionsId((prev) => (String(prev) === String(post._id) ? null : post._id))
                          }
                          className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal className="w-5 h-5 text-[var(--fb-icon)]" />
                        </button>
                        {String(postOptionsId) === String(post._id) && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--fb-surface)] border border-[var(--fb-divider)] rounded-lg shadow-xl overflow-hidden z-30">
                            <button
                              type="button"
                              onClick={() => {
                                setPostOptionsId(null);
                                toggleSavePost(post._id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]"
                            >
                              {savedPostIds.has(String(post._id)) ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPostOptionsId(null);
                                reportPost(post._id);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600"
                            >
                              Báo cáo bài viết
                            </button>
                            {canManagePost && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPostOptionsId(null);
                                  openEditPostModal(post);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]"
                              >
                                Chỉnh sửa bài viết
                              </button>
                            )}
                            {canManagePost && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPostOptionsId(null);
                                  openDeletePostModal(post);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600"
                              >
                                Xóa bài viết
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-3">
                      {post.textBackground &&
                      (!post.images || post.images.length === 0) &&
                      (!post.files || post.files.length === 0) ? (
                        <div
                          className={`w-full min-h-[360px] md:min-h-[420px] rounded-xl px-5 py-8 flex items-center justify-center text-center text-[29px] font-semibold leading-relaxed whitespace-pre-wrap break-words ${
                            isDarkBackground(post.textBackground) ? 'text-white' : 'text-[var(--fb-text-primary)]'
                          }`}
                          style={{ background: post.textBackground }}
                        >
                          {post.content}
                        </div>
                      ) : (
                        <p className="text-[var(--fb-text-primary)] text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {post.content}
                        </p>
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

                    {post.images && post.images.length > 0 && (
                      <PostImageGallery
                        images={post.images}
                        resolveUrl={resolvePostImageSrc}
                        isVideo={isGroupPostGalleryVideoPath}
                        videoPreviewSrc={videoPreviewSrc}
                        onCellClick={(idx) => openImageTheater(post, idx)}
                      />
                    )}

                    {post.files && post.files.length > 0 && (
                      <div className="px-4 pb-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {post.files.map((file, index) =>
                            isPostAttachmentVideo(file) ? (
                              <div key={index} className="md:col-span-2">
                                <video
                                  src={videoPreviewSrc(postAttachmentUrl(file))}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full max-h-[min(70vh,620px)] rounded-lg bg-black object-contain"
                                />
                                {file.name ? (
                                  <p className="text-xs text-[var(--fb-text-secondary)] truncate mt-1 px-0.5">{file.name}</p>
                                ) : null}
                              </div>
                            ) : (
                              <div key={index} className="flex items-center justify-between p-3 bg-[var(--fb-input)] rounded-lg border border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] transition-colors gap-2">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--fb-text-primary)] truncate">{file.name || 'Document'}</p>
                                    <p className="text-xs text-[var(--fb-text-secondary)]">{file.size || 'Unknown size'}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPostFile(file)}
                                  className="ml-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-blue-600 text-white rounded-lg hover:from-orange-600 hover:to-blue-700 transition-all text-sm font-medium flex items-center space-x-1 flex-shrink-0 shadow-md hover:shadow-lg"
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

                    <div className="px-4 py-2.5 flex items-center justify-between text-xs text-[var(--fb-text-secondary)] border-t border-[var(--fb-divider)]">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center -space-x-1">
                          <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <span className="text-[13px]">
                          {(post.likes?.length || 0) +
                            (likedPosts.has(post._id) && !post.likes?.some((like) => String(like?._id || like) === String(user?.id || user?._id)) ? 1 : 0)}
                        </span>
                      </div>
                      <div className="flex space-x-4">
                        <span className="hover:underline cursor-pointer text-[13px]">{post.comments?.length || 0} bình luận</span>
                        <span className="hover:underline cursor-pointer text-[13px]">{post.shares || 0} chia sẻ</span>
                      </div>
                    </div>

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
                            : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                        }`}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium text-sm">Bình luận</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareModal(post)}
                        disabled={
                          shareSending &&
                          shareModal?.mode === 'post' &&
                          shareModal.post?._id === post._id
                        }
                        title="Chia sẻ bài viết tới bạn bè"
                        className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors flex-1 disabled:opacity-60 disabled:cursor-wait"
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="font-medium text-sm">
                          {shareSending &&
                          shareModal?.mode === 'post' &&
                          shareModal.post?._id === post._id
                            ? 'Đang gửi…'
                            : 'Chia sẻ'}
                        </span>
                      </button>
                    </div>

                    <PostCommentSection
                      user={user}
                      postId={post._id}
                      post={post}
                      isVisible={showComments.has(post._id)}
                      onClose={() => toggleComments(post._id)}
                      onUpdatePost={(pid, fn) =>
                        setGroupPosts((prev) => prev.map((p) => (p._id === pid ? fn(p) : p)))
                      }
                      onOpenImageTheater={(idx) => openImageTheater(post, idx)}
                      validateBeforePostComment={() => {
                        const currentIsMember = group?.members?.some((m) => {
                          const memberUserId = m.user?._id || m.user;
                          const currentUserId = user?.id || user?._id;
                          return String(memberUserId) === String(currentUserId);
                        });
                        const commentPermission =
                          group?.settings?.commentPermission || 'all-members';
                        if (commentPermission === 'members-only' && !currentIsMember) {
                          return 'Bạn cần tham gia nhóm để bình luận.';
                        }
                        return null;
                      }}
                    />
                  </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {activeTab === 'members' && (
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[var(--fb-text-primary)]">
                    Thành viên ({groupMembers.length})
                  </h3>
                </div>
                <div className="space-y-2 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
                  {groupMembers.map((member) => {
                    const memberUserId = member.user?._id || member.user;
                    const creatorId = group.creator?._id || group.creator;
                    const isCreatorMember = String(memberUserId) === String(creatorId);
                    const currentUid = String(user?.id || user?._id || '');
                    const isCurrentUser = String(memberUserId) === currentUid;

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-2.5 bg-[var(--fb-input)] rounded-lg hover:bg-[var(--fb-hover)] transition-colors"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <img
                            src={resolveAvatarUrl(member.user?.avatar, member.user?.name, '3b82f6')}
                            alt={member.user?.name}
                            className="h-9 w-9 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                            onError={withAvatarFallback(member.user?.name, '3b82f6')}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-[var(--fb-text-primary)] text-sm truncate">
                                {member.user?.name}
                              </p>
                              {isCreatorMember && (
                                <Shield className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" title="Người tạo" />
                              )}
                              {member.role === 'admin' && !isCreatorMember && (
                                <span
                                  className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                                  title="Admin"
                                >
                                  A
                                </span>
                              )}
                              {member.role === 'moderator' && (
                                <span
                                  className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
                                  title="Moderator"
                                >
                                  M
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--fb-text-secondary)] truncate">
                              {member.user?.studentRole || 'Thành viên'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {isGroupAdmin && !isCreatorMember && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(memberUserId)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                              title="Xóa thành viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {isCurrentUser && !isCreatorMember && (
                            <span className="text-xs text-blue-600 font-medium">Bạn</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] p-4">
                  <p className="text-sm text-[var(--fb-text-secondary)]">
                    Ảnh đính kèm trong các bài viết nhóm. Chọn ảnh để xem kích thước đầy đủ.
                  </p>
                </div>
                {groupPostMediaGallery.length === 0 ? (
                  <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-12 text-center">
                    <ImageIcon className="w-16 h-16 text-[var(--fb-icon)] opacity-70 mx-auto mb-4" />
                    <p className="text-[var(--fb-text-secondary)]">
                      Chưa có ảnh nào trong bài viết nhóm
                    </p>
                  </div>
                ) : (
                  <div className="bg-[var(--fb-surface)] rounded-lg shadow-md border border-[var(--fb-divider)] p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {groupPostMediaGallery.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openImageTheater(item.post, item.imageIndex)}
                          className="relative aspect-square rounded-lg overflow-hidden bg-[var(--fb-input)] border border-[var(--fb-divider)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddMemberModal(false);
            setUserSearchQuery('');
            setSearchUsers([]);
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
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
                    const isAlreadyMember = groupMembers.some(m => (m.user?._id || m.user) === searchUser._id);
                    
                    return (
                      <div key={searchUser._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={resolveAvatarUrl(searchUser.avatar, searchUser.name, '3b82f6')}
                            alt={searchUser.name}
                            className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
                            onError={withAvatarFallback(searchUser.name, '3b82f6')}
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
        )
      )}

      {showInviteFriendsModal && group && (
        createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeInviteFriendsModal}
        >
          <div
            className="bg-[var(--fb-surface)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[var(--fb-divider)] shadow-xl text-[var(--fb-text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--fb-divider)] flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-[var(--fb-text-primary)] pr-2">
                Mời bạn bè tham gia nhóm này
              </h3>
              <button
                type="button"
                onClick={closeInviteFriendsModal}
                className="p-2 rounded-lg text-[var(--fb-icon)] hover:bg-[var(--fb-hover)] transition-colors shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteFriendsLoading ? (
              <p className="text-center text-[var(--fb-text-secondary)] py-16 px-4">
                Đang tải danh sách bạn bè…
              </p>
            ) : inviteFriendsEligible.length === 0 ? (
              <p className="text-center text-[var(--fb-text-secondary)] py-16 px-4">
                {inviteFriendsList.length === 0
                  ? 'Bạn chưa có bạn bè để mời.'
                  : 'Tất cả bạn bè đã tham gia nhóm hoặc không thể mời.'}
              </p>
            ) : (
              <>
                <div className="flex flex-col md:flex-row flex-1 min-h-0 md:min-h-[320px]">
                  <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[var(--fb-divider)]">
                    <div className="p-3 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fb-text-secondary)] pointer-events-none" />
                        <input
                          type="search"
                          value={inviteFriendPickerQuery}
                          onChange={(e) => setInviteFriendPickerQuery(e.target.value)}
                          placeholder="Tìm bạn bè…"
                          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>
                    </div>
                    <ul className="overflow-y-auto flex-1 p-2 space-y-1 min-h-[200px] max-h-[min(42vh,360px)] md:max-h-none">
                      {inviteFriendsFiltered.length === 0 ? (
                        <li className="text-center text-sm text-[var(--fb-text-secondary)] py-8 px-2">
                          Không có bạn bè khớp tìm kiếm.
                        </li>
                      ) : (
                        inviteFriendsFiltered.map((friend) => {
                          const fid = String(friend._id);
                          const selected = selectedFriendIdsForInvite.includes(fid);
                          return (
                            <li key={friend._id}>
                              <button
                                type="button"
                                onClick={() => toggleFriendInviteSelection(friend._id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
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
                                  <p className="font-medium text-[var(--fb-text-primary)] truncate">
                                    {friend.name}
                                  </p>
                                  {friend.email ? (
                                    <p className="text-xs text-[var(--fb-text-secondary)] truncate">
                                      {friend.email}
                                    </p>
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
                                  {selected ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : null}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>

                  <div className="w-full md:w-[280px] shrink-0 flex flex-col bg-[var(--fb-input)]/40 min-h-[160px] md:min-h-0">
                    <p className="text-[11px] font-semibold tracking-wide text-[var(--fb-text-secondary)] px-3 py-2.5 border-b border-[var(--fb-divider)] uppercase">
                      Đã chọn {selectedFriendIdsForInvite.length} người bạn
                    </p>
                    <ul className="overflow-y-auto flex-1 p-2 space-y-2">
                      {selectedFriendsForInvitePanel.length === 0 ? (
                        <li className="text-center text-xs text-[var(--fb-text-secondary)] py-6 px-2">
                          Chọn bạn bè ở cột bên trái.
                        </li>
                      ) : (
                        selectedFriendsForInvitePanel.map((friend) => (
                          <li
                            key={friend._id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-divider)]"
                          >
                            <img
                              src={resolveAvatarUrl(friend.avatar, friend.name, '3b82f6')}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                              onError={withAvatarFallback(friend.name, '3b82f6')}
                            />
                            <p className="font-medium text-sm text-[var(--fb-text-primary)] truncate flex-1 min-w-0">
                              {friend.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeFriendFromInviteSelection(friend._id)}
                              className="p-1.5 rounded-lg text-[var(--fb-text-secondary)] hover:bg-red-500/10 hover:text-red-600 transition-colors shrink-0"
                              aria-label={`Bỏ chọn ${friend.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                <div className="p-3 border-t border-[var(--fb-divider)] flex justify-end gap-2 shrink-0 bg-[var(--fb-surface)]">
                  <button
                    type="button"
                    onClick={closeInviteFriendsModal}
                    disabled={inviteBatchSending}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={
                      inviteBatchSending || selectedFriendIdsForInvite.length === 0
                    }
                    onClick={handleSendBatchGroupInvites}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteBatchSending ? 'Đang gửi…' : 'Gửi lời mời'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
        )
      )}

      {showGroupCardShareModal && group && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!groupCardShareSending) closeGroupCardShareModal();
          }}
          role="presentation"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-detail-share-group-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] p-4">
              <h3
                id="group-detail-share-group-title"
                className="pr-2 text-lg font-bold text-[var(--fb-text-primary)]"
              >
                Chia sẻ nhóm tới bạn bè
              </h3>
              <button
                type="button"
                disabled={groupCardShareSending}
                onClick={closeGroupCardShareModal}
                className="shrink-0 rounded-lg p-2 text-[var(--fb-icon)] transition-colors hover:bg-[var(--fb-hover)]"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--fb-text-primary)]">{group.name}</p>
              <p className="mt-1 text-xs text-[var(--fb-text-secondary)]">
                {group.membersCount ?? group.members?.length ?? groupMembers.length} thành viên
                {group.settings?.accessType === 'private' ? ' · Riêng tư' : ' · Công khai'}
              </p>
            </div>
            <div className="shrink-0 px-4 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-icon)]" />
                <input
                  type="search"
                  value={groupCardShareQuery}
                  onChange={(e) => setGroupCardShareQuery(e.target.value)}
                  placeholder="Tìm bạn bè theo tên hoặc email…"
                  className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>
            <div className="max-h-[320px] min-h-[200px] flex-1 overflow-y-auto px-2">
              {groupCardShareFriendsLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14">
                  <RefreshCw className="h-9 w-9 animate-spin text-blue-600" aria-hidden />
                  <p className="text-sm text-[var(--fb-text-secondary)]">Đang tải danh sách bạn bè…</p>
                </div>
              ) : filteredGroupCardShareFriends.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--fb-text-secondary)]">
                  {groupCardShareFriendsList.length === 0
                    ? 'Bạn chưa có bạn bè để gửi.'
                    : 'Không tìm thấy bạn bè phù hợp.'}
                </p>
              ) : (
                <ul className="py-1">
                  {filteredGroupCardShareFriends.map((f) => {
                    const fid = String(f._id);
                    const checked = groupCardShareSelectedIds.has(fid);
                    return (
                      <li key={fid}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--fb-hover)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroupCardShareFriendSelect(fid)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <img
                            src={resolveAvatarUrl(f.avatar, f.name, '3b82f6')}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                            onError={withAvatarFallback(f.name, '3b82f6')}
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
                Đã chọn: {groupCardShareSelectedIds.size} người
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={groupCardShareSending}
                  onClick={closeGroupCardShareModal}
                  className="rounded-lg border border-[var(--fb-divider)] px-4 py-2 text-sm font-medium text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={
                    groupCardShareSending ||
                    groupCardShareFriendsLoading ||
                    groupCardShareSelectedIds.size === 0
                  }
                  onClick={handleConfirmGroupCardShare}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {groupCardShareSending ? 'Đang gửi…' : 'Gửi tin nhắn'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Group Settings Modal */}
      {showGroupSettingsModal && group && (
        createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGroupSettingsModal(false)}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                  ...(isGroupCreator ? [{ id: 'appearance', label: 'Giao diện', icon: Image }] : [])
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên nhóm *
                      {settingsErrors.name && (
                        <span className="text-red-500 text-xs ml-2">{settingsErrors.name}</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={groupSettingsForm.name}
                      onChange={(e) => {
                        setGroupSettingsForm({ ...groupSettingsForm, name: e.target.value });
                        if (settingsErrors.name) {
                          setSettingsErrors({ ...settingsErrors, name: '' });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        settingsErrors.name 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Nhập tên nhóm..."
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">{groupSettingsForm.name.length}/100 ký tự</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mô tả
                      {settingsErrors.description && (
                        <span className="text-red-500 text-xs ml-2">{settingsErrors.description}</span>
                      )}
                    </label>
                    <textarea
                      value={groupSettingsForm.description}
                      onChange={(e) => {
                        setGroupSettingsForm({ ...groupSettingsForm, description: e.target.value });
                        if (settingsErrors.description) {
                          setSettingsErrors({ ...settingsErrors, description: '' });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                        settingsErrors.description 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Mô tả về nhóm..."
                      rows="4"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(groupSettingsForm.description || '').length}/500 ký tự
                    </p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (phân cách bằng dấu phẩy)
                      {settingsErrors.tags && (
                        <span className="text-red-500 text-xs ml-2">{settingsErrors.tags}</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(groupSettingsForm.tags) ? groupSettingsForm.tags.join(', ') : (groupSettingsForm.tags || '')}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                        setGroupSettingsForm({ ...groupSettingsForm, tags });
                        if (settingsErrors.tags) {
                          setSettingsErrors({ ...settingsErrors, tags: '' });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        settingsErrors.tags 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Ví dụ: Java, K17, Đồ án"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {Array.isArray(groupSettingsForm.tags) ? groupSettingsForm.tags.length : 0}/10 tags • 
                      Tags giúp người dùng tìm nhóm dễ dàng hơn
                    </p>
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
                        { value: 'all-members', label: 'Tất cả mọi người', desc: 'Mọi người xem đều có thể bình luận' },
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
              {activeSettingsTab === 'appearance' && isGroupCreator && (
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
                                : `http://localhost:5000${groupSettingsForm.coverPhoto}`
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
                            id="group-single-image-upload"
                          />
                          <label htmlFor="group-single-image-upload" className="cursor-pointer">
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
                  disabled={!groupSettingsForm.name.trim() || savingSettings}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {savingSettings && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>{savingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
        )
      )}

      {showGroupPostModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowGroupPostModal(false)}
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
                  onClick={() => setShowGroupPostModal(false)}
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
                    <div className="text-xs text-[var(--fb-text-secondary)]">Đăng trong nhóm này</div>
                  </div>
                </div>

                <textarea
                  value={newGroupPostContent}
                  onChange={(e) => setNewGroupPostContent(e.target.value)}
                  placeholder="Bạn đang nghĩ gì?"
                  className="w-full resize-none rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] p-3 text-[18px] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />

                {newGroupPostImages.length === 0 && newGroupPostFiles.length === 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--fb-text-secondary)]">
                      Nền cho bài viết chữ
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {TEXT_POST_BACKGROUNDS.map((item) => {
                        const active = newGroupPostTextBackground === item.background;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.label}
                            onClick={() => setNewGroupPostTextBackground(item.background)}
                            className={`h-9 w-9 rounded-full border-2 transition-transform ${
                              active ? 'scale-105 border-blue-500' : 'border-white/70 hover:scale-105'
                            }`}
                            style={{
                              background: item.background || 'linear-gradient(135deg,#f3f4f6,#e5e7eb)'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {newGroupPostImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newGroupPostImages.map((img, index) => (
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
                          onClick={() => removeGroupPostImage(index)}
                          className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newGroupPostFiles.length > 0 && (
                  <ul className="space-y-2">
                    {newGroupPostFiles.map((f, index) => (
                      <li
                        key={`${f.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-3 py-2 text-sm"
                      >
                        <span className="truncate text-[var(--fb-text-primary)]" title={f.name}>
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGroupPostFile(index)}
                          className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--fb-divider)] pt-2">
                  <div className="flex flex-wrap items-center gap-0.5">
                    <input
                      type="file"
                      id="group-post-modal-media"
                      accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/avi,.mp4,.webm,.mov,.mkv,.avi,.m4v,.ogv,.mpeg,.mpg"
                      multiple
                      className="hidden"
                      onChange={handleGroupPostImageSelect}
                    />
                    <label
                      htmlFor="group-post-modal-media"
                      className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                      title="Thêm ảnh hoặc video"
                    >
                      <ImageIcon className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Ảnh/Video</span>
                    </label>
                    {group?.settings?.allowFileUpload !== false && (
                      <>
                        <input
                          type="file"
                          id="group-post-modal-files"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv,.avi"
                          className="hidden"
                          onChange={handleGroupPostDocSelect}
                        />
                        <label
                          htmlFor="group-post-modal-files"
                          className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                          title="Thêm tệp đính kèm"
                        >
                          <BookOpen className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Tệp đính kèm</span>
                        </label>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewGroupPostContent('');
                        setNewGroupPostTextBackground('');
                        setNewGroupPostImages([]);
                        setNewGroupPostFiles([]);
                        setShowGroupPostModal(false);
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={
                        !newGroupPostContent.trim() &&
                        newGroupPostImages.length === 0 &&
                        newGroupPostFiles.length === 0
                      }
                      className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Đăng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {editingPost &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[141] flex items-center justify-center bg-black/60 p-4"
            onClick={closeEditPostModal}
            role="presentation"
          >
            <div
              className="w-full max-w-[min(640px,96vw)] overflow-hidden rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="group-edit-post-title"
            >
              <div className="flex items-center justify-between border-b border-[var(--fb-divider)] px-5 py-4">
                <h3 id="group-edit-post-title" className="text-xl font-bold">
                  Chỉnh sửa bài viết
                </h3>
                <button
                  type="button"
                  disabled={editPostSaving}
                  onClick={closeEditPostModal}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] disabled:opacity-60"
                >
                  <X className="h-5 w-5 text-[var(--fb-icon)]" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value)}
                  placeholder="Nhập nội dung bài viết..."
                  className="w-full resize-none rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] p-3 text-[16px] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={7}
                />
                {editPostExistingImages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[var(--fb-text-secondary)]">Ảnh/video hiện có</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editPostExistingImages.map((img, index) => {
                        const url = img.startsWith('http') ? img : `http://localhost:5000${img}`;
                        const isVideo = isGroupPostGalleryVideoPath(img);
                        return (
                          <div key={`${img}-${index}`} className="group relative">
                            {isVideo ? (
                              <video src={videoPreviewSrc(url)} className="h-24 w-full rounded-lg bg-black object-cover" muted />
                            ) : (
                              <img src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => removeEditPostExistingImage(index)}
                              className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-90 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {editPostNewImages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[var(--fb-text-secondary)]">Ảnh/video mới thêm</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editPostNewImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="group relative">
                          {file.type?.startsWith('video/') ? (
                            <video src={editPostNewImagePreviewUrls[index]} className="h-24 w-full rounded-lg bg-black object-cover" muted />
                          ) : (
                            <img src={editPostNewImagePreviewUrls[index]} alt="" className="h-24 w-full rounded-lg object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeEditPostNewImage(index)}
                            className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-90 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(editPostExistingFiles.length > 0 || editPostNewFiles.length > 0) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[var(--fb-text-secondary)]">Tệp đính kèm</p>
                    <ul className="space-y-1.5">
                      {editPostExistingFiles.map((file, index) => (
                        <li key={`old-${index}`} className="flex items-center justify-between rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-2.5 py-2 text-sm">
                          <span className="truncate">{file.name || 'Tệp'}</span>
                          <button type="button" onClick={() => removeEditPostExistingFile(index)} className="rounded p-1 text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                      {editPostNewFiles.map((file, index) => (
                        <li key={`new-${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] px-2.5 py-2 text-sm">
                          <span className="truncate">{file.name}</span>
                          <button type="button" onClick={() => removeEditPostNewFile(index)} className="rounded p-1 text-red-600 hover:bg-red-50">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1 border-t border-[var(--fb-divider)] pt-2">
                  <input
                    type="file"
                    id="edit-group-post-modal-media"
                    accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/avi,.mp4,.webm,.mov,.mkv,.avi,.m4v,.ogv,.mpeg,.mpg"
                    multiple
                    className="hidden"
                    onChange={handleEditPostImageSelect}
                  />
                  <label
                    htmlFor="edit-group-post-modal-media"
                    className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                    title="Thêm ảnh hoặc video"
                  >
                    <ImageIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Ảnh/Video</span>
                  </label>
                  <input
                    type="file"
                    id="edit-group-post-modal-files"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv,.avi"
                    className="hidden"
                    onChange={handleEditPostFileSelect}
                  />
                  <label
                    htmlFor="edit-group-post-modal-files"
                    className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--fb-hover)]"
                    title="Thêm tệp đính kèm"
                  >
                    <BookOpen className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-[var(--fb-text-secondary)]">Tệp đính kèm</span>
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[var(--fb-divider)] pt-2">
                  <button
                    type="button"
                    disabled={editPostSaving}
                    onClick={closeEditPostModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleEditPost}
                    disabled={editPostSaving || !editPostContent.trim()}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {editPostSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {deletingPost &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[142] flex items-center justify-center bg-black/60 p-4"
            onClick={closeDeletePostModal}
            role="presentation"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="group-delete-post-title"
            >
              <div className="border-b border-[var(--fb-divider)] px-5 py-4">
                <h3 id="group-delete-post-title" className="text-lg font-bold">Xóa bài viết?</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-[var(--fb-text-secondary)]">
                  Hành động này không thể hoàn tác. Bài viết sẽ bị xóa khỏi nhóm.
                </p>
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--fb-divider)] px-5 py-3">
                <button
                  type="button"
                  onClick={closeDeletePostModal}
                  disabled={deletePostLoading}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePost}
                  disabled={deletePostLoading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletePostLoading ? 'Đang xóa...' : 'Xóa bài'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {shareModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10001] p-4"
          onClick={() => !shareSending && setShareModal(null)}
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
                onClick={() => setShareModal(null)}
                className="p-2 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-icon)]"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-[var(--fb-divider)] bg-[var(--fb-input)]">
              {shareModal.mode === 'post' ? (
                <p className="text-xs text-[var(--fb-text-secondary)] line-clamp-3">
                  {(shareModal.post.content || '').trim() || '(Không có nội dung text)'}
                </p>
              ) : (
                <div className="text-xs text-[var(--fb-text-secondary)]">
                  <p className="font-semibold text-[var(--fb-text-primary)]">
                    Ảnh nhóm — {group?.name || 'Nhóm'}
                  </p>
                  <p className="mt-1 break-all text-[13px] text-blue-600 dark:text-blue-400">
                    {typeof window !== 'undefined' ? `${window.location.origin}/groups/${id}` : ''}
                  </p>
                  <p className="mt-2 text-[var(--fb-text-secondary)]">
                    Tin nhắn sẽ gồm liên kết tới trang nhóm để bạn của bạn mở xem.
                  </p>
                </div>
              )}
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
                    ? 'Bạn chưa có bạn bè nào. Hãy kết bạn để chia sẻ.'
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
                              f.avatar?.startsWith('/uploads')
                                ? `http://localhost:5000${f.avatar}`
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
                  onClick={() => setShareModal(null)}
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

      {/* Ảnh bài viết — theater */}
      {imageTheater &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            if (imageTheater.mode === 'groupCover' && imageTheater.url) {
              const curUrl = imageTheater.url;
              const cr = group?.creator;
              const creatorId = cr?._id ?? cr;
              const creatorName =
                typeof cr === 'object' && cr?.name ? cr.name : 'Người tạo nhóm';
              const creatorAvatar = typeof cr === 'object' ? cr.avatar : undefined;
              const when = group?.updatedAt || group?.createdAt;
              const zoomIn = (e) => {
                e.stopPropagation();
                setGroupCoverZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
              };
              const zoomOut = (e) => {
                e.stopPropagation();
                setGroupCoverZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
              };
              return (
                <div
                  className="fixed inset-0 z-[9999] flex min-h-0 min-w-0 flex-col bg-black lg:flex-row"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Xem ảnh nhóm"
                >
                  <div
                    className="relative flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center bg-black"
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
                    <div className="absolute right-4 top-4 z-20 flex gap-2">
                      <button
                        type="button"
                        onClick={zoomOut}
                        disabled={groupCoverZoom <= 1}
                        className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                        title="Thu nhỏ"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={zoomIn}
                        disabled={groupCoverZoom >= 4}
                        className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                        title="Phóng to"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(curUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
                        title="Mở ảnh đầy đủ"
                      >
                        <Maximize2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="box-border flex min-h-0 min-w-0 w-full flex-1 overflow-auto overscroll-contain p-4 sm:p-8">
                      <img
                        src={curUrl}
                        alt=""
                        title="Bấm để phóng to; bấm lại khi đã tối đa để về vừa khung"
                        className={`m-auto block max-w-none object-contain transition-[max-height,max-width] duration-200 ease-out ${
                          groupCoverZoom >= 4 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                        }`}
                        style={{
                          /* Dùng width thay vì maxWidth để zoom luôn có hiệu lực cả với ảnh nhỏ */
                          width: `${100 * groupCoverZoom}%`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupCoverZoom((z) => {
                            if (z >= 4) return 1;
                            return Math.min(4, Math.round((z + 0.25) * 100) / 100);
                          });
                        }}
                      />
                    </div>
                  </div>

                  <aside
                    className="flex h-[min(52vh,520px)] min-h-0 w-full shrink-0 grow-0 flex-col border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] shadow-2xl lg:h-full lg:max-w-md lg:min-w-[min(100%,28rem)] lg:shrink-0 lg:grow-0 lg:border-l lg:border-t-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="shrink-0 border-b border-[var(--fb-divider)] p-4">
                      <button
                        type="button"
                        className="-mx-1 flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-[var(--fb-hover)]"
                        onClick={() => {
                          if (creatorId) navigate(`/profile/${creatorId}`);
                        }}
                      >
                        <img
                          src={resolveAvatarUrl(creatorAvatar, creatorName, '1877f2')}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full border border-[var(--fb-divider)] object-cover"
                          onError={withAvatarFallback(creatorName, '1877f2')}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--fb-text-primary)]">
                            {creatorName}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--fb-text-secondary)]">
                            {when ? <span>{formatTimeAgo(when)}</span> : null}
                            <Globe className="h-3.5 w-3.5 text-[var(--fb-text-secondary)]" aria-hidden />
                          </div>
                        </div>
                      </button>
                      <p className="mt-3 text-[15px] font-semibold leading-snug text-[var(--fb-text-primary)]">
                        Ảnh nhóm
                      </p>
                      <p className="mt-1 text-sm text-[var(--fb-text-secondary)]">{group?.name}</p>
                      {group?.description?.trim() ? (
                        <p className="mt-2 text-[15px] leading-relaxed text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">
                          {theaterCaptionExpanded || group.description.length <= 220
                            ? group.description.trim()
                            : `${group.description.trim().slice(0, 220)}…`}
                          {group.description.trim().length > 220 ? (
                            <button
                              type="button"
                              onClick={() => setTheaterCaptionExpanded((e) => !e)}
                              className="ml-1 font-semibold text-blue-600 hover:underline"
                            >
                              {theaterCaptionExpanded ? 'Thu gọn' : 'Xem thêm'}
                            </button>
                          ) : null}
                        </p>
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
                        <span className="text-[13px] tabular-nums text-[var(--fb-text-primary)]">
                          {groupCoverLikeData.count}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={focusGroupCoverCommentSection}
                          className="cursor-pointer text-[13px] hover:underline"
                        >
                          {groupCoverComments.length} bình luận
                        </button>
                        <span className="cursor-default text-[13px] text-[var(--fb-text-secondary)]">
                          0 chia sẻ
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 border-t border-[var(--fb-divider)] px-2 py-1">
                      <button
                        type="button"
                        onClick={toggleGroupCoverLike}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                          groupCoverLikeData.liked
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${groupCoverLikeData.liked ? 'fill-current' : ''}`} />
                        {groupCoverLikeData.liked ? 'Đã thích' : 'Thích'}
                      </button>
                      <button
                        type="button"
                        onClick={focusGroupCoverCommentSection}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                          groupCoverCommentTabActive
                            ? 'bg-[#F0F2F5] text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                            : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                        }`}
                      >
                        <MessageCircle className="h-5 w-5" />
                        Bình luận
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareGroupCoverModal()}
                        disabled={shareSending && shareModal?.mode === 'groupCover'}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Share2 className="h-5 w-5" />
                        {shareSending && shareModal?.mode === 'groupCover' ? 'Đang gửi…' : 'Chia sẻ'}
                      </button>
                    </div>

                    <div
                      id="group-cover-theater-comments"
                      className={`flex min-h-0 flex-1 flex-col border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] transition-shadow duration-300 ${
                        groupCoverCommentHighlight ? 'ring-2 ring-inset ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex shrink-0 items-center justify-between border-b border-[var(--fb-divider)] px-3 py-2">
                        <span className="text-[15px] font-semibold text-[var(--fb-text-primary)]">
                          Bình luận
                        </span>
                        <div className="relative">
                          <select
                            value={groupCoverCommentSort}
                            onChange={(e) => setGroupCoverCommentSort(e.target.value)}
                            className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1 pl-2 pr-7 text-[13px] font-semibold text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] focus:outline-none"
                            aria-label="Sắp xếp bình luận"
                          >
                            <option value="newest">Phù hợp nhất</option>
                            <option value="oldest">Cũ nhất trước</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fb-text-secondary)]" />
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--fb-surface)] px-3 py-2">
                        {groupCoverCommentReplyData.roots.length === 0 ? (
                          <p className="py-4 text-center text-sm text-[var(--fb-text-secondary)]">
                            Chưa có bình luận. Hãy là người đầu tiên — dữ liệu lưu trên trình duyệt này.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {groupCoverCommentReplyData.roots.map((c) => (
                              <GroupCoverFacebookComment
                                key={String(c.id)}
                                comment={c}
                                depth={0}
                                replyMap={groupCoverCommentReplyData.replyMap}
                                uid={String(user?.id || user?._id || '')}
                                liveUserAvatar={
                                  user?.avatar ??
                                  user?.profileImage ??
                                  (typeof user?.picture === 'string' ? user.picture : undefined)
                                }
                                onReply={(id) => setGroupCoverReplyingTo(id)}
                                onToggleLike={toggleGroupCoverCommentLike}
                                onDelete={deleteGroupCoverComment}
                                likeMap={groupCoverCommentLikeMap}
                                replyingToId={groupCoverReplyingTo}
                                resolveAvatarUrl={resolveAvatarUrl}
                                withAvatarFallback={withAvatarFallback}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)] p-3">
                        {groupCoverReplyingTo ? (
                          <div className="mb-2 flex items-center justify-between rounded-lg bg-[#E7F3FF] px-2 py-1.5 text-xs font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                            <span>Đang trả lời bình luận</span>
                            <button
                              type="button"
                              onClick={() => setGroupCoverReplyingTo(null)}
                              className="text-blue-700 underline hover:no-underline dark:text-blue-300"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : null}
                        {user?.id || user?._id ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                              alt={user?.name || ''}
                              className="h-9 w-9 shrink-0 rounded-full object-cover"
                              onError={withAvatarFallback(user?.name, '1877f2')}
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <input
                                id="group-cover-theater-comment-input"
                                type="text"
                                value={groupCoverCommentDraft}
                                onChange={(e) => setGroupCoverCommentDraft(e.target.value)}
                                onFocus={() => setGroupCoverCommentTabActive(true)}
                                placeholder={
                                  groupCoverReplyingTo
                                    ? 'Viết phản hồi…'
                                    : 'Viết bình luận công khai…'
                                }
                                maxLength={2000}
                                className="w-full min-w-0 rounded-full border border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-2.5 text-[15px] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    submitGroupCoverComment();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={submitGroupCoverComment}
                                disabled={!groupCoverCommentDraft.trim()}
                                className="shrink-0 rounded-full p-2 transition-colors hover:bg-[var(--fb-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                title="Gửi"
                              >
                                <Send className="h-5 w-5 text-blue-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-sm text-[var(--fb-text-secondary)]">
                            Đăng nhập để bình luận
                          </p>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              );
            }

            const livePost =
              groupPosts.find((p) => String(p._id) === String(imageTheater.post._id)) ||
              imageTheater.post;
            const imgs = (livePost.images || []).filter((x) => typeof x === 'string');
            const n = imgs.length;
            const idx = n ? Math.min(Math.max(0, imageTheater.imageIndex), n - 1) : 0;
            const curUrl = imgs[idx] ? resolvePostImageSrc(imgs[idx]) : '';
            const cap = (livePost.content || '').trim();
            const capTrunc = 220;
            const uid = String(user?.id || user?._id || '');
            const likedByUser = livePost.likes?.some(
              (like) => String(like?._id || like) === uid
            );
            const likeCount =
              (livePost.likes?.length || 0) +
              (likedPosts.has(livePost._id) && !likedByUser ? 1 : 0);
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
            const curIsVideo = isGroupPostGalleryVideoPath(curPathRaw);
            const groupPostZoomIn = (e) => {
              e.stopPropagation();
              setGroupPostTheaterZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
            };
            const groupPostZoomOut = (e) => {
              e.stopPropagation();
              setGroupPostTheaterZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
            };
            const onGroupPostWheelZoom = (e) => {
              if (curIsVideo) return;
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              setGroupPostTheaterZoom((z) => Math.max(1, Math.min(4, Math.round((z + delta) * 100) / 100)));
            };
            const endGroupPostPan = (e) => {
              const g = groupPostTheaterPanGestureRef.current;
              const el = groupPostTheaterPanRef.current;
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
              g.active = false;
              g.pointerId = null;
            };
            const onGroupPostPanPointerDown = (e) => {
              if (groupPostTheaterZoom <= 1 || curIsVideo) return;
              if (e.button !== 0) return;
              const el = groupPostTheaterPanRef.current;
              if (!el) return;
              e.preventDefault();
              e.stopPropagation();
              const prev = groupPostTheaterPanGestureRef.current;
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
              groupPostTheaterPanGestureRef.current = g;
              el.classList.add('cursor-grabbing');

              const winOpts = { capture: true, passive: false };
              const onWinMove = (ev) => {
                const ge = groupPostTheaterPanGestureRef.current;
                const pane = groupPostTheaterPanRef.current;
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
                const ge = groupPostTheaterPanGestureRef.current;
                if (!ge.active || ev.pointerId !== ge.pointerId) return;
                endGroupPostPan(ev);
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
                    <X className="w-6 h-6" />
                  </button>
                  {curUrl ? (
                    <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                      {!curIsVideo ? (
                        <>
                          <button
                            type="button"
                            onClick={groupPostZoomOut}
                            disabled={groupPostTheaterZoom <= 1}
                            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                            title="Thu nhỏ"
                          >
                            <ZoomOut className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={groupPostZoomIn}
                            disabled={groupPostTheaterZoom >= 4}
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
                        ref={groupPostTheaterPanRef}
                        onPointerDown={onGroupPostPanPointerDown}
                        onWheel={onGroupPostWheelZoom}
                        onClick={(ev) => ev.stopPropagation()}
                        className={`box-border flex min-h-0 min-w-0 w-full flex-1 items-center justify-center overscroll-contain p-4 sm:p-8 ${
                          groupPostTheaterZoom > 1
                            ? 'overflow-auto cursor-grab select-none touch-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                            : 'overflow-hidden'
                        }`}
                      >
                        <img
                          src={curUrl}
                          alt=""
                          draggable={false}
                          title={
                            groupPostTheaterZoom > 1
                              ? 'Kéo để xem vùng khác; chạm nhẹ vào ảnh để phóng thêm'
                              : 'Bấm để phóng thêm; khi tối đa bấm lại để vừa khung'
                          }
                          className={`m-auto block object-contain transition-[max-height,max-width] duration-200 ease-out ${
                            groupPostTheaterZoom > 1 ? 'cursor-grab' : 'cursor-default'
                          }`}
                          style={{
                            width: groupPostTheaterZoom > 1 ? `${100 * groupPostTheaterZoom}%` : 'auto',
                            height: 'auto',
                            maxWidth: groupPostTheaterZoom > 1 ? 'none' : '100%',
                            maxHeight: groupPostTheaterZoom > 1 ? 'none' : 'calc(100dvh - 2rem)',
                          }}
                          onClick={(ev) => ev.stopPropagation()}
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
                      <span className="text-[13px] tabular-nums text-[var(--fb-text-primary)]">{likeCount}</span>
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
                      disabled={
                        shareSending &&
                        shareModal?.mode === 'post' &&
                        shareModal.post?._id === livePost._id
                      }
                      className="flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                      <Share2 className="w-5 h-5" />
                      {shareSending &&
                      shareModal?.mode === 'post' &&
                      shareModal.post?._id === livePost._id
                        ? 'Đang gửi…'
                        : 'Chia sẻ'}
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
                      onUpdatePost={(pid, fn) =>
                        setGroupPosts((prev) => prev.map((p) => (p._id === pid ? fn(p) : p)))
                      }
                      validateBeforePostComment={() => {
                        const currentIsMember = group?.members?.some((m) => {
                          const memberUserId = m.user?._id || m.user;
                          const currentUserId = user?.id || user?._id;
                          return String(memberUserId) === String(currentUserId);
                        });
                        const commentPermission =
                          group?.settings?.commentPermission || 'all-members';
                        if (commentPermission === 'members-only' && !currentIsMember) {
                          return 'Bạn cần tham gia nhóm để bình luận.';
                        }
                        return null;
                      }}
                    />
                  </div>
                </aside>
              </div>
            );
          })(),
          document.body
        )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAnnouncementModal(false);
            setEditingAnnouncement(null);
            setAnnouncementForm({
              title: '',
              content: '',
              priority: 'normal',
              isPinned: false,
              expiryDate: ''
            });
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">
                {editingAnnouncement ? 'Sửa thông báo' : 'Tạo thông báo mới'}
              </h3>
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setEditingAnnouncement(null);
                  setAnnouncementForm({
                    title: '',
                    content: '',
                    priority: 'normal',
                    isPinned: false,
                    expiryDate: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề thông báo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung *
                </label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="6"
                  placeholder="Nhập nội dung thông báo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Bình thường</option>
                    <option value="important">Quan trọng</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hết hạn (tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={announcementForm.expiryDate}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announcementForm.isPinned}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-gray-700">Ghim lên đầu</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setEditingAnnouncement(null);
                  setAnnouncementForm({
                    title: '',
                    content: '',
                    priority: 'normal',
                    isPinned: false,
                    expiryDate: ''
                  });
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAnnouncement}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {editingAnnouncement ? 'Cập nhật' : 'Tạo thông báo'}
              </button>
            </div>
          </div>
        </div>,
        document.body
        )
      )}
    </div>
  );
};

export default GroupDetail;

