import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatTime';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { notify } from '../lib/notify';

const SavedPostsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  const resolveAvatarUrl = (avatar, name, background = '3b82f6') => {
    if (avatar) {
      return resolveMediaUrl(avatar);
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
  };

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts/saved');
      const list = res.data.posts || [];
      setPosts(list);
      window.dispatchEvent(new CustomEvent('savedPostsChanged', { detail: { postIds: list.map(p => p?._id).filter(Boolean) } }));
    } catch (e) {
      console.error('Error fetching saved posts:', e);
      notify('Lỗi khi tải bài viết đã lưu');
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    const handler = () => open();
    window.addEventListener('openSavedPosts', handler);
    return () => window.removeEventListener('openSavedPosts', handler);
  }, [open]);

  const toggleSave = async (postId) => {
    try {
      await api.delete(`/posts/${postId}/save`);
      await fetchSaved();
    } catch (e) {
      console.error('Error unsaving post:', e);
      notify('Lỗi khi bỏ lưu bài viết');
    }
  };

  const openSavedPost = (post) => {
    const postId = post?._id;
    if (!postId) return;
    setIsOpen(false);
    navigate(`/home?post=${postId}`);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={() => setIsOpen(false)}
      style={{ zIndex: 10000 }}
    >
      <div
        className="fb-surface flex flex-col overflow-hidden max-w-4xl w-full max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bài viết đã lưu</h3>
              <p className="text-xs text-blue-100">{posts.length} bài viết</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--fb-app)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold" style={{ color: 'var(--fb-text-primary)' }}>
                Chưa có bài viết đã lưu
              </h4>
              <p className="mt-1" style={{ color: 'var(--fb-text-secondary)' }}>
                Các bài viết bạn lưu sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post._id} className="fb-surface overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--fb-divider)' }}>
                    <div className="flex items-center space-x-3">
                      <img
                        src={resolveAvatarUrl(post.author?.avatar, post.author?.name, '3b82f6')}
                        alt={post.author?.name}
                        className="w-10 h-10 rounded-full cursor-pointer"
                        onClick={() => {
                          const authorId = post.author?._id || post.author?.id || post.author;
                          if (!authorId) return;
                          setIsOpen(false);
                          navigate(`/profile/${authorId}`);
                        }}
                        title="Xem trang cá nhân"
                      />
                      <div>
                        <h4
                          className="font-semibold cursor-pointer hover:underline"
                          style={{ color: 'var(--fb-text-primary)' }}
                          onClick={() => {
                            const authorId = post.author?._id || post.author?.id || post.author;
                            if (!authorId) return;
                            setIsOpen(false);
                            navigate(`/profile/${authorId}`);
                          }}
                          title="Xem trang cá nhân"
                        >
                          {post.author?.name}
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--fb-text-secondary)' }}>
                          {post.author?.studentRole} • {formatTimeAgo(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(post._id)}
                      className="fb-iconbtn"
                      title="Bỏ lưu"
                    >
                      <Bookmark className="w-5 h-5 text-yellow-600 fill-current" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openSavedPost(post)}
                    className="w-full text-left p-4 hover:bg-[var(--fb-hover)] transition-colors"
                    title="Mở bài viết"
                  >
                    <p className="mb-2" style={{ color: 'var(--fb-text-primary)' }}>
                      {post.content}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded-full text-xs"
                            style={{
                              backgroundColor: 'rgba(24,119,242,0.12)',
                              color: 'rgb(24,119,242)'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                      {post.category}
                    </span>
                  </button>

                  {post.images && post.images.length > 0 && (() => {
                    const imageUrl = resolveMediaUrl(post.images[0]);
                    return (
                      <button
                        type="button"
                        onClick={() => openSavedPost(post)}
                        className="block w-full"
                        title="Mở bài viết"
                      >
                        <img src={imageUrl} alt="Post" className="w-full h-64 object-cover" />
                      </button>
                    );
                  })()}

                  <div
                    className="px-4 py-3 flex items-center justify-between text-sm cursor-pointer hover:bg-[var(--fb-hover)] transition-colors"
                    style={{ color: 'var(--fb-text-secondary)', backgroundColor: 'var(--fb-input)' }}
                    onClick={() => openSavedPost(post)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openSavedPost(post);
                      }
                    }}
                  >
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
  );
};

export default SavedPostsModal;

