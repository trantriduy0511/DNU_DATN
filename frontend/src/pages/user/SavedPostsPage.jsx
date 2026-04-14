import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Plus, X, MoreHorizontal, Share2, SlidersHorizontal, Search, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { formatTimeAgo } from '../../utils/formatTime';

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [previewPost, setPreviewPost] = useState(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);
  const [collections, setCollections] = useState([{ id: 'default', name: 'Mặc định' }]);
  const [postCollectionMap, setPostCollectionMap] = useState({});
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collectionPickerPost, setCollectionPickerPost] = useState(null);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterCollectionId, setFilterCollectionId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareFriends, setShareFriends] = useState([]);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSelectedFriendIds, setShareSelectedFriendIds] = useState(() => new Set());
  const [shareLoadingFriends, setShareLoadingFriends] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const resolveAvatarUrl = (avatar, name, background = '3b82f6') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const fetchSavedPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts/saved');
      const list = res.data.posts || [];
      setPosts(list);
      window.dispatchEvent(
        new CustomEvent('savedPostsChanged', { detail: { postIds: list.map((p) => p?._id).filter(Boolean) } })
      );
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      alert('Lỗi khi tải bài viết đã lưu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  useEffect(() => {
    try {
      const savedCollections = JSON.parse(localStorage.getItem('savedPostCollections') || 'null');
      if (Array.isArray(savedCollections) && savedCollections.length > 0) {
        const hasDefault = savedCollections.some((c) => c.id === 'default');
        setCollections(hasDefault ? savedCollections : [{ id: 'default', name: 'Mặc định' }, ...savedCollections]);
      }
      const savedMap = JSON.parse(localStorage.getItem('savedPostCollectionMap') || '{}');
      if (savedMap && typeof savedMap === 'object') {
        setPostCollectionMap(savedMap);
      }
    } catch {
      // ignore malformed local storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('savedPostCollections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('savedPostCollectionMap', JSON.stringify(postCollectionMap));
  }, [postCollectionMap]);

  useEffect(() => {
    const closeMenu = () => setActiveMenuPostId(null);
    const onDocClick = (event) => {
      if (!event.target.closest('[data-saved-post-menu]')) {
        closeMenu();
      }
      if (!event.target.closest('[data-saved-filter-menu]')) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggleSave = async (postId) => {
    try {
      await api.delete(`/posts/${postId}/save`);
      await fetchSavedPosts();
    } catch (error) {
      console.error('Error unsaving post:', error);
      alert('Lỗi khi bỏ lưu bài viết');
    }
  };

  const openSavedPost = (post) => {
    if (!post?._id) return;
    setPreviewPost(post);
  };

  const getPostPreviewImage = (post) => {
    const firstImage = post?.images?.[0];
    if (firstImage && typeof firstImage === 'string') {
      return firstImage.startsWith('/uploads') ? `http://localhost:5000${firstImage}` : firstImage;
    }
    return null;
  };

  const isVideoUrl = (url = '') => /\.(mp4|webm|mov|m4v|avi|mkv|ogv|mpeg|mpg)$/i.test(String(url).split('?')[0]);

  const getPreviewMedia = (post) => {
    const firstImage = post?.images?.[0];
    if (firstImage && typeof firstImage === 'string') {
      const src = firstImage.startsWith('/uploads') ? `http://localhost:5000${firstImage}` : firstImage;
      return { type: isVideoUrl(src) ? 'video' : 'image', src };
    }

    const firstFile = post?.files?.[0];
    if (firstFile?.url) {
      const src = String(firstFile.url).startsWith('/uploads') ? `http://localhost:5000${firstFile.url}` : firstFile.url;
      const mime = String(firstFile.mimeType || '').toLowerCase();
      const isVid = mime.startsWith('video/') || isVideoUrl(src);
      if (isVid) {
        return { type: 'video', src };
      }
    }

    return null;
  };

  const getSavedPostTypeLabel = (post) => {
    const media = getPreviewMedia(post);
    if (media?.type === 'video') return 'Video';
    if (media?.type === 'image') return 'Ảnh';
    return 'Bài viết';
  };

  const getTextOnlyPreview = (post) => {
    const raw = String(post?.content || post?.title || '').trim();
    if (!raw) return 'Bài viết';
    return raw.length > 90 ? `${raw.slice(0, 90)}...` : raw;
  };

  const filteredPosts = posts.filter((post) => {
    const collectionId = postCollectionMap[post._id] || 'default';
    if (filterCollectionId !== 'all' && collectionId !== filterCollectionId) return false;
    if (filterCategory !== 'all' && (post.category || 'Khác') !== filterCategory) return false;
    if (filterKeyword.trim()) {
      const keyword = filterKeyword.trim().toLowerCase();
      const text = `${post.title || ''} ${post.content || ''} ${post.author?.name || ''}`.toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    const exists = collections.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert('Tên bộ sưu tập đã tồn tại');
      return;
    }
    const id = `col_${Date.now()}`;
    setCollections((prev) => [...prev, { id, name }]);
    setNewCollectionName('');
    setShowCreateCollectionModal(false);
  };

  const assignPostToCollection = (postId, collectionId) => {
    setPostCollectionMap((prev) => ({ ...prev, [postId]: collectionId }));
    setCollectionPickerPost(null);
    alert('✅ Đã thêm vào bộ sưu tập');
  };

  const openShareModal = async (post) => {
    if (!post?._id) return;
    setShareModalPost(post);
    setShareSearchQuery('');
    setShareSelectedFriendIds(new Set());
    setShareLoadingFriends(true);
    try {
      const friendsRes = await api.get('/friends').catch(() => ({ data: { friends: [] } }));
      setShareFriends(friendsRes.data.friends || []);
    } catch (error) {
      console.error('Error loading friends for sharing:', error);
      setShareFriends([]);
    } finally {
      setShareLoadingFriends(false);
    }
  };

  const handleShareToFriends = async () => {
    if (!shareModalPost?._id) return;
    const ids = [...shareSelectedFriendIds];
    if (ids.length === 0) return;

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
          prev.map((p) => (String(p._id) === String(postId) ? { ...p, shares: sharesCount } : p))
        );
      }
      setShareModalPost(null);
      setShareSelectedFriendIds(new Set());
      alert(`Đã gửi tới ${ids.length} người bạn qua tin nhắn.`);
    } catch (error) {
      console.error('Share to friends failed:', error);
      alert(error.response?.data?.message || 'Không thể chia sẻ. Vui lòng thử lại.');
    } finally {
      setShareSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--fb-app)]">
      <main className="max-w-7xl mx-auto px-2 lg:px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
                <div className="p-4 border-b border-[var(--fb-divider)]">
                  <h2 className="text-xl font-bold text-[var(--fb-text-primary)]">Đã lưu</h2>
                </div>
                <div className="p-3">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--fb-input)] text-[var(--fb-text-primary)] font-medium">
                    <Bookmark className="w-4 h-4 text-blue-600" />
                    <span>Mục đã lưu</span>
                  </button>
                </div>
              </div>
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-hidden">
                <div className="p-4 border-b border-[var(--fb-divider)]">
                  <h3 className="font-semibold text-[var(--fb-text-primary)]">Bộ sưu tập của tôi</h3>
                </div>
                <div className="p-3 space-y-2">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      className="rounded-lg border border-[var(--fb-divider)] p-3 text-sm text-[var(--fb-text-secondary)]"
                    >
                      {collection.name}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCreateCollectionModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo bộ sưu tập mới
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-9">
            <div className="max-w-3xl mx-auto">
              <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-[var(--fb-text-primary)]">Tất cả</h1>
                  <div className="relative" data-saved-filter-menu>
                    <button
                      type="button"
                      onClick={() => setShowFilterMenu((prev) => !prev)}
                      className="w-10 h-10 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] transition-colors inline-flex items-center justify-center"
                      title="Bộ lọc"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-[var(--fb-text-primary)]" />
                    </button>
                    {showFilterMenu && (
                      <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-xl p-3 z-[70]">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Bộ sưu tập</label>
                            <select
                              value={filterCollectionId}
                              onChange={(e) => setFilterCollectionId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm text-[var(--fb-text-primary)]"
                            >
                              <option value="all">Tất cả bộ sưu tập</option>
                              {collections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                  {collection.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Danh mục bài viết</label>
                            <select
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm text-[var(--fb-text-primary)]"
                            >
                              <option value="all">Tất cả danh mục</option>
                              <option value="Học tập">Học tập</option>
                              <option value="Tài liệu">Tài liệu</option>
                              <option value="Thảo luận">Thảo luận</option>
                              <option value="Sự kiện">Sự kiện</option>
                              <option value="Khác">Khác</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Từ khóa</label>
                            <input
                              value={filterKeyword}
                              onChange={(e) => setFilterKeyword(e.target.value)}
                              placeholder="Nhập nội dung cần tìm..."
                              className="w-full px-3 py-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm text-[var(--fb-text-primary)]"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setFilterCollectionId('all');
                                setFilterCategory('all');
                                setFilterKeyword('');
                              }}
                              className="px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Xóa lọc
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] p-12 text-center">
                  <Bookmark className="w-16 h-16 text-[var(--fb-icon)] opacity-40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--fb-text-primary)] mb-2">Không có bài viết phù hợp</h3>
                  <p className="text-sm text-[var(--fb-text-secondary)]">Thử đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <article
                      key={post._id}
                      className="bg-[var(--fb-surface)] rounded-lg shadow-sm border border-[var(--fb-divider)] overflow-visible"
                    >
                      {(() => {
                        const media = getPreviewMedia(post);
                        const typeLabel = getSavedPostTypeLabel(post);
                        return (
                      <div className="p-4 flex gap-4">
                        {media ? (
                          <button
                            type="button"
                            onClick={() => openSavedPost(post)}
                            className="shrink-0 overflow-hidden rounded-lg bg-[var(--fb-input)] w-32 h-32 hover:opacity-95"
                            title="Xem bài viết"
                          >
                            {media.type === 'image' ? (
                              <img src={media.src} alt="Saved preview" className="w-full h-full object-cover" />
                            ) : (
                              <video
                                src={media.src}
                                className="w-full h-full object-cover bg-black"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSavedPost(post)}
                            className="shrink-0 w-32 h-32 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] overflow-hidden hover:opacity-95"
                            title="Xem bài viết"
                          >
                            <img
                              src={resolveAvatarUrl(post.author?.avatar, post.author?.name)}
                              alt={post.author?.name || 'Tác giả'}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => openSavedPost(post)}
                            className="w-full text-left"
                            title="Xem bài viết"
                          >
                            <p className="text-3 text-[var(--fb-text-primary)] font-bold line-clamp-2">
                              {post.title || post.content || 'Bài viết đã lưu'}
                            </p>
                          </button>
                          <p className="text-sm text-[var(--fb-text-secondary)] mt-1">
                            {typeLabel} • Đã lưu vào mặc định
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <img
                              src={resolveAvatarUrl(post.author?.avatar, post.author?.name)}
                              alt={post.author?.name}
                              className="w-8 h-8 rounded-full object-cover cursor-pointer"
                              onClick={() => {
                                const authorId = post.author?._id || post.author?.id || post.author;
                                if (authorId) navigate(`/profile/${authorId}`);
                              }}
                            />
                            <p className="text-sm text-[var(--fb-text-primary)] line-clamp-1">
                              Đã lưu từ bài viết của <span className="font-semibold">{post.author?.name}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => setCollectionPickerPost(post)}
                              className="px-4 py-2 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] text-sm font-semibold transition-colors"
                            >
                              Thêm vào bộ sưu tập
                            </button>
                            <button
                              type="button"
                              onClick={() => openShareModal(post)}
                              className="w-10 h-10 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] transition-colors inline-flex items-center justify-center"
                              title="Chia sẻ"
                            >
                              <Share2 className="w-4 h-4 text-[var(--fb-text-primary)]" />
                            </button>
                            <div className="relative" data-saved-post-menu>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuPostId((prev) => (prev === post._id ? null : post._id))
                                }
                                className="w-10 h-10 rounded-lg bg-[var(--fb-input)] hover:bg-[var(--fb-hover)] transition-colors inline-flex items-center justify-center"
                                title="Tùy chọn"
                              >
                                <MoreHorizontal className="w-4 h-4 text-[var(--fb-text-primary)]" />
                              </button>
                              {activeMenuPostId === post._id && (
                                <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-lg py-1 z-[60]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuPostId(null);
                                      toggleSave(post._id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]"
                                  >
                                    Bỏ lưu
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--fb-text-secondary)] mt-2">
                            {formatTimeAgo(post.createdAt)}
                          </p>
                        </div>
                      </div>
                        );
                      })()}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      {previewPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewPost(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-[var(--fb-surface)] border border-[var(--fb-divider)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--fb-divider)]">
              <h3 className="font-bold text-[var(--fb-text-primary)]">Bài viết của {previewPost.author?.name || 'người dùng'}</h3>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
                onClick={() => setPreviewPost(null)}
                title="Đóng"
              >
                <X className="w-5 h-5 text-[var(--fb-icon)]" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-56px)]">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={resolveAvatarUrl(previewPost.author?.avatar, previewPost.author?.name)}
                    alt={previewPost.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-[var(--fb-text-primary)]">{previewPost.author?.name}</p>
                    <p className="text-xs text-[var(--fb-text-secondary)]">
                      {formatTimeAgo(previewPost.createdAt)} • {previewPost.category || 'Khác'}
                    </p>
                  </div>
                </div>
                <p className="text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">{previewPost.content}</p>
              </div>
              {(() => {
                const media = getPreviewMedia(previewPost);
                if (!media) return null;
                if (media.type === 'video') {
                  return (
                    <video
                      src={media.src}
                      controls
                      playsInline
                      className="w-full max-h-[420px] bg-black object-contain"
                    />
                  );
                }
                return <img src={media.src} alt="Saved post" className="w-full max-h-[420px] object-cover" />;
              })()}
              <div className="px-4 py-3 text-sm text-[var(--fb-text-secondary)] border-t border-[var(--fb-divider)] bg-[var(--fb-input)]">
                {previewPost.likes?.length || 0} lượt thích • {previewPost.comments?.length || 0} bình luận • {previewPost.shares || 0} chia sẻ
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {collectionPickerPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10002] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setCollectionPickerPost(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[var(--fb-surface)] border border-[var(--fb-divider)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--fb-divider)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--fb-text-primary)]">Thêm vào bộ sưu tập</h3>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-[var(--fb-hover)]"
                onClick={() => setCollectionPickerPost(null)}
              >
                <X className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => assignPostToCollection(collectionPickerPost._id, collection.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]"
                >
                  {collection.name}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      {showCreateCollectionModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10003] bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            setShowCreateCollectionModal(false);
            setNewCollectionName('');
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[var(--fb-surface)] border border-[var(--fb-divider)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--fb-divider)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--fb-text-primary)]">Tạo bộ sưu tập</h3>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-[var(--fb-hover)]"
                onClick={() => {
                  setShowCreateCollectionModal(false);
                  setNewCollectionName('');
                }}
              >
                <X className="w-4 h-4 text-[var(--fb-icon)]" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-xs text-[var(--fb-text-secondary)] mb-1">Tên</label>
              <input
                autoFocus
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Đặt tên cho bộ sưu tập của bạn..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] text-sm text-[var(--fb-text-primary)]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createCollection();
                }}
              />
            </div>
            <div className="px-4 py-3 border-t border-[var(--fb-divider)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateCollectionModal(false);
                  setNewCollectionName('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newCollectionName.trim()}
                onClick={createCollection}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {shareModalPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10004] bg-black/40 flex items-center justify-center p-4"
          onClick={() => !shareSending && setShareModalPost(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-[var(--fb-divider)] bg-[var(--fb-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--fb-divider)] px-4 py-3">
              <h3 className="text-lg font-bold text-[var(--fb-text-primary)]">Chia sẻ tới bạn bè</h3>
              <button
                type="button"
                disabled={shareSending}
                onClick={() => setShareModalPost(null)}
                className="rounded-lg p-2 text-[var(--fb-icon)] hover:bg-[var(--fb-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-[var(--fb-divider)] bg-[var(--fb-input)] px-4 py-3">
              <p className="line-clamp-2 text-sm font-medium text-[var(--fb-text-primary)]">
                {(shareModalPost.content || '').trim() || '(Không có nội dung text)'}
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
              <div className="border-b border-[var(--fb-divider)] p-4 md:border-b-0 md:border-r">
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--fb-icon)]" />
                  <input
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    placeholder="Tìm bạn bè theo tên..."
                    className="w-full rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-surface)] py-2 pl-9 pr-3 text-sm text-[var(--fb-text-primary)] outline-none focus:border-blue-400"
                  />
                </div>
                <div className="max-h-[42vh] overflow-y-auto rounded-lg border border-[var(--fb-divider)]">
                  {shareLoadingFriends ? (
                    <div className="p-4 text-sm text-[var(--fb-text-secondary)]">Đang tải danh sách bạn bè...</div>
                  ) : shareFriends.length === 0 ? (
                    <div className="p-4 text-sm text-[var(--fb-text-secondary)]">Bạn chưa có bạn bè để chia sẻ.</div>
                  ) : (
                    shareFriends
                      .filter((f) => (f.name || '').toLowerCase().includes(shareSearchQuery.trim().toLowerCase()))
                      .map((friend) => {
                        const fid = String(friend._id);
                        const checked = shareSelectedFriendIds.has(fid);
                        return (
                          <label
                            key={fid}
                            className="flex cursor-pointer items-center gap-3 border-b border-[var(--fb-divider)] px-3 py-2 hover:bg-[var(--fb-hover)]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setShareSelectedFriendIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(fid)) next.delete(fid);
                                  else next.add(fid);
                                  return next;
                                })
                              }
                            />
                            <img
                              src={resolveAvatarUrl(friend.avatar, friend.name)}
                              alt={friend.name}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--fb-text-primary)]">{friend.name}</p>
                              <p className="truncate text-xs text-[var(--fb-text-secondary)]">{friend.studentRole || friend.major || 'Người dùng'}</p>
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
              </div>
              <div className="p-4">
                <h4 className="mb-2 text-sm font-semibold text-[var(--fb-text-primary)]">
                  Đã chọn: {shareSelectedFriendIds.size} người
                </h4>
                <div className="mb-3 max-h-[28vh] overflow-y-auto rounded-lg border border-[var(--fb-divider)]">
                  {[...shareSelectedFriendIds].map((id) => {
                    const f = shareFriends.find((x) => String(x._id) === String(id));
                    if (!f) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 border-b border-[var(--fb-divider)] px-3 py-2">
                        <img src={resolveAvatarUrl(f.avatar, f.name)} alt={f.name} className="h-8 w-8 rounded-full object-cover" />
                        <span className="truncate text-sm text-[var(--fb-text-primary)]">{f.name}</span>
                      </div>
                    );
                  })}
                  {shareSelectedFriendIds.size === 0 && (
                    <p className="p-3 text-sm text-[var(--fb-text-secondary)]">Chưa chọn người nhận.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleShareToFriends}
                  disabled={shareSending || shareSelectedFriendIds.size === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {shareSending ? 'Đang gửi...' : 'Gửi chia sẻ'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
