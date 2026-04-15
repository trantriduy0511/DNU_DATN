import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Plus, X, MoreHorizontal, Share2, SlidersHorizontal, Search, Send, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { formatTimeAgo } from '../../utils/formatTime';
import { PostCommentSection } from '../../components/PostCommentSection';
import { useSavedPostsViewModel } from '../../domains/saved/viewmodels/useSavedPostsViewModel';

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    loading,
    posts,
    filteredPosts,
    previewPost,
    setPreviewPost,
    activeMenuPostId,
    setActiveMenuPostId,
    collections,
    postCollectionMap,
    newCollectionName,
    setNewCollectionName,
    collectionPickerPost,
    setCollectionPickerPost,
    showCreateCollectionModal,
    setShowCreateCollectionModal,
    showFilterMenu,
    setShowFilterMenu,
    filterCollectionId,
    setFilterCollectionId,
    filterCategory,
    setFilterCategory,
    filterKeyword,
    setFilterKeyword,
    shareModalPost,
    setShareModalPost,
    shareFriends,
    shareSearchQuery,
    setShareSearchQuery,
    shareSelectedFriendIds,
    setShareSelectedFriendIds,
    shareLoadingFriends,
    shareSending,
    removeFromSaved,
    assignPostToCollection,
    createCollection,
    openShareModal,
    confirmShare,
    fetchSaved,
    toggleLike,
    applyPostUpdater
  } = useSavedPostsViewModel(user);

  const resolveAvatarUrl = (avatar, name, background = '3b82f6') => {
    if (avatar) {
      const a = String(avatar);
      if (a.startsWith('/uploads')) return `http://localhost:5000${a}`;
      return a;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

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
      await removeFromSaved(postId);
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

  const handleShareToFriends = async () => {
    if (!shareModalPost?._id || shareSelectedFriendIds.size === 0) return;
    try {
      const sentCount = await confirmShare();
      if (sentCount > 0) {
        alert(`Đã gửi tới ${sentCount} người bạn qua tin nhắn.`);
      }
    } catch (error) {
      console.error('Share to friends failed:', error);
      alert(error.response?.data?.message || 'Không thể chia sẻ. Vui lòng thử lại.');
    }
  };

  const updatePostInLocalState = applyPostUpdater;
  const toggleLikePost = toggleLike;
  const fetchSavedPosts = fetchSaved;

  const livePreviewPost = previewPost
    ? posts.find((p) => String(p._id) === String(previewPost._id)) || previewPost
    : null;

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
                        const collectionId = postCollectionMap[post._id] || 'default';
                        const collectionName = collections.find((c) => c.id === collectionId)?.name || 'Mặc định';
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
                            {typeLabel} • Đã lưu vào {collectionName}
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
      {livePreviewPost && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewPost(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-[var(--fb-surface)] border border-[var(--fb-divider)] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--fb-divider)]">
              <h3 className="font-bold text-[var(--fb-text-primary)]">Bài viết của {livePreviewPost.author?.name || 'người dùng'}</h3>
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
                    src={resolveAvatarUrl(livePreviewPost.author?.avatar, livePreviewPost.author?.name)}
                    alt={livePreviewPost.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-[var(--fb-text-primary)]">{livePreviewPost.author?.name}</p>
                    <p className="text-xs text-[var(--fb-text-secondary)]">
                      {formatTimeAgo(livePreviewPost.createdAt)} • {livePreviewPost.category || 'Khác'}
                    </p>
                  </div>
                </div>
                <p className="text-[var(--fb-text-primary)] whitespace-pre-wrap break-words">{livePreviewPost.content}</p>
              </div>
              {(() => {
                const media = getPreviewMedia(livePreviewPost);
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
              {(() => {
                const uid = String(user?.id || user?._id || '');
                const likedByMe = (livePreviewPost.likes || []).some((like) => String(like?._id || like) === uid);
                return (
                  <>
                    <div className="px-4 py-3 text-sm text-[var(--fb-text-secondary)] border-t border-[var(--fb-divider)] bg-[var(--fb-input)]">
                      {livePreviewPost.likes?.length || 0} lượt thích • {livePreviewPost.comments?.length || 0} bình luận • {livePreviewPost.shares || 0} chia sẻ
                    </div>
                    <div className="px-2 py-1 border-t border-[var(--fb-divider)] flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLikePost(livePreviewPost._id)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                          likedByMe ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedByMe ? 'fill-current' : ''}`} />
                        {likedByMe ? 'Đã thích' : 'Thích'}
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('theater-comment-input')?.focus()}
                        className="flex-1 rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Bình luận
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareModal(livePreviewPost)}
                        disabled={shareSending && shareModalPost?._id === livePreviewPost._id}
                        className="flex-1 rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors disabled:opacity-50"
                      >
                        <Share2 className="w-4 h-4" />
                        {shareSending && shareModalPost?._id === livePreviewPost._id ? 'Đang gửi...' : 'Chia sẻ'}
                      </button>
                    </div>
                    <div className="border-t border-[var(--fb-divider)]">
                      <PostCommentSection
                        key={String(livePreviewPost._id)}
                        user={user}
                        postId={livePreviewPost._id}
                        post={livePreviewPost}
                        isVisible
                        variant="theater"
                        onClose={() => {}}
                        onUpdatePost={(id, fn) => updatePostInLocalState(id, fn)}
                        onRequestRefresh={() => fetchSavedPosts()}
                      />
                    </div>
                  </>
                );
              })()}
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
