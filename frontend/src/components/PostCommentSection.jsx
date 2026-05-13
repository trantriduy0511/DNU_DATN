import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, X, ChevronDown, BookOpen, Download, ImagePlus } from 'lucide-react';
import api from '../utils/api';
import { formatTimeAgo } from '../utils/formatTime';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { notify, confirmAsync } from '../lib/notify';


const resolveAvatarUrl = (avatar, name, background = '1877f2') => {
  if (avatar) {
    return resolveMediaUrl(avatar);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${background}&color=fff`;
};

const withAvatarFallback = (name, background = '1877f2') => (e) => {
  if (e.currentTarget?.dataset?.fallbackApplied) return;
  if (e.currentTarget?.dataset) e.currentTarget.dataset.fallbackApplied = '1';
  e.currentTarget.src = resolveAvatarUrl('', name, background);
};

function isPostGalleryVideoUrl(src) {
  if (!src || typeof src !== 'string') return false;
  return /\.(mp4|webm|mov|mkv|avi|m4v|ogv|mpeg|mpg)$/i.test(src);
}

function postAttachmentUrl(file) {
  const raw = file?.url || '';
  return resolveMediaUrl(raw);
}

function isPostAttachmentVideo(file) {
  const mime = file?.mimeType || '';
  const name = file?.name || '';
  const raw = file?.url || '';
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(name) || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/i.test(raw);
}

export function PostCommentSection({
  user,
  postId,
  post,
  isVisible,
  variant = 'modal',
  onClose,
  onUpdatePost,
  onRequestRefresh,
  validateBeforePostComment,
  onOpenImageTheater,
}) {
  const navigate = useNavigate();
    const [localCommentText, setLocalCommentText] = useState('');
    const [commentImages, setCommentImages] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [replyToCommentId, setReplyToCommentId] = useState(null);
    const isTheater = variant === 'theater';
    const commentListMeasureRef = useRef(null);
    const commentImageInputRef = useRef(null);

    const updateCommentThreadLines = useCallback(() => {
      const root = commentListMeasureRef.current;
      if (!root) return;
      root.querySelectorAll('[data-comment-thread]').forEach((threadEl) => {
        const elbows = Array.from(threadEl.querySelectorAll('[data-thread-elbow]'));
        if (!elbows.length) {
          threadEl.style.setProperty('--thread-tail-cut', '0px');
          return;
        }
        const threadRect = threadEl.getBoundingClientRect();
        const maxElbowBottom = Math.max(
          ...elbows.map((el) => el.getBoundingClientRect().bottom)
        );
        const cut = Math.max(0, Math.ceil(threadRect.bottom - maxElbowBottom));
        threadEl.style.setProperty('--thread-tail-cut', `${cut}px`);
      });
    }, []);

    const loadComments = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/comments/${postId}`);
        setComments(res.data.comments || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
      setLoading(false);
    };

    useEffect(() => {
      if (!isVisible) return;
      if (isTheater || comments.length === 0) {
        loadComments();
      }
    }, [isVisible, postId, isTheater]);

    useEffect(() => {
      if (!isVisible) return;
      setReplyToCommentId(null);
      setCommentImages([]);
    }, [isVisible, postId]);

    useEffect(() => {
      return () => {
        commentImages.forEach((img) => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
      };
    }, [commentImages]);

    useEffect(() => {
      if (!isVisible || !replyToCommentId) return;
      requestAnimationFrame(() => {
        document
          .getElementById(`reply-composer-anchor-${replyToCommentId}`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }, [replyToCommentId, isVisible]);

    const resetComposerToPost = () => {
      setReplyToCommentId(null);
    };

    const handleSubmitComment = async () => {
      if (!localCommentText.trim() && commentImages.length === 0) return;

      const validationMsg = validateBeforePostComment?.();
      if (validationMsg) {
        notify(validationMsg);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('content', localCommentText.trim());
        if (replyToCommentId) {
          formData.append('replyTo', replyToCommentId);
        }
        commentImages.forEach((img) => {
          formData.append('images', img.file);
        });
        const res = await api.post(`/comments/${postId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setComments([res.data.comment, ...comments]);
        setLocalCommentText('');
        commentImages.forEach((img) => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
        setCommentImages([]);
        resetComposerToPost();

        // Update post comments count
        onUpdatePost(postId, (p) => ({
          ...p,
          comments: [...(p.comments || []), res.data.comment._id],
        }));
        
        // Avoid forced full-feed refresh here to prevent modal flicker.
      } catch (error) {
        console.error('Error adding comment:', error);
        notify('Lỗi thêm bình luận');
      }
    };

    const handlePickCommentImages = (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (!imageFiles.length) return;
      setCommentImages((prev) => {
        const available = Math.max(0, 4 - prev.length);
        const picked = imageFiles.slice(0, available).map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
        }));
        return [...prev, ...picked];
      });
      e.target.value = '';
    };

    const removeCommentImage = (key) => {
      setCommentImages((prev) => {
        const target = prev.find((img) => img.key === key);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((img) => img.key !== key);
      });
    };

    const handleDeleteComment = async (commentId) => {
      if (!(await confirmAsync('Bạn có chắc muốn xóa bình luận này?'))) return;

      try {
        await api.delete(`/comments/${commentId}`);
        const removeIds = new Set([String(commentId)]);
        let growing = true;
        while (growing) {
          growing = false;
          for (const c of comments) {
            const pid = c.replyTo?._id ?? c.replyTo;
            if (pid != null && removeIds.has(String(pid)) && !removeIds.has(String(c._id))) {
              removeIds.add(String(c._id));
              growing = true;
            }
          }
        }
        setComments(comments.filter((c) => !removeIds.has(String(c._id))));

        // Update post comments count
        onUpdatePost(postId, (post) => ({
          ...post,
          comments: (post.comments || []).filter((id) => !removeIds.has(String(id))),
        }));
        
        // Avoid forced full-feed refresh here to prevent modal flicker.
      } catch (error) {
        console.error('Error deleting comment:', error);
        notify('Lỗi xóa bình luận');
      }
    };

    const commentTreeRoots = useMemo(() => {
      if (!comments.length) return [];
      const wrap = (c) => ({ raw: c, children: [] });
      const byId = new Map(comments.map((c) => [String(c._id), wrap(c)]));
      const roots = [];
      for (const c of comments) {
        const node = byId.get(String(c._id));
        const pid = c.replyTo?._id ?? c.replyTo;
        const pidStr = pid != null ? String(pid) : '';
        if (pidStr && byId.has(pidStr)) {
          byId.get(pidStr).children.push(node);
        } else {
          roots.push(node);
        }
      }
      const sortDesc = (a, b) =>
        new Date(b.raw.createdAt).getTime() - new Date(a.raw.createdAt).getTime();
      const sortAsc = (a, b) =>
        new Date(a.raw.createdAt).getTime() - new Date(b.raw.createdAt).getTime();
      roots.sort(sortDesc);
      const sortNested = (list) => {
        list.sort(sortAsc);
        list.forEach((n) => sortNested(n.children));
      };
      roots.forEach((n) => sortNested(n.children));
      return roots;
    }, [comments]);

    /** Theater dùng cùng palette sáng (--fb-*) như modal / trang chủ */
    const bubbleCls =
      'bg-[var(--fb-input)] rounded-2xl px-3 py-2 border border-[var(--fb-divider)]';
    const cnTextMain = 'text-[var(--fb-text-primary)]';
    const cnTextMuted = 'text-[var(--fb-text-secondary)]';
    const threadBorderCls = 'border-[var(--fb-divider)]';
    const replyInputCls =
      'w-full min-w-0 px-4 py-2.5 rounded-full bg-[var(--fb-input)] text-[var(--fb-text-primary)] placeholder:text-[var(--fb-text-secondary)] border border-[var(--fb-divider)] focus:outline-none';
    const linkAccent = 'text-blue-600 hover:underline';
    /** Phủ đuôi viền trái — trùng nền vùng cuộn (theater: fb-app, modal: fb-surface) */
    const threadTailMaskBg = isTheater ? 'bg-[var(--fb-app)]' : 'bg-[var(--fb-surface)]';

    useLayoutEffect(() => {
      if (!isVisible) return;
      updateCommentThreadLines();
      const root = commentListMeasureRef.current;
      if (!root || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(updateCommentThreadLines);
      });
      ro.observe(root);
      const onScroll = () => requestAnimationFrame(updateCommentThreadLines);
      root.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        ro.disconnect();
        root.removeEventListener('scroll', onScroll);
      };
    }, [isVisible, comments, commentTreeRoots, replyToCommentId, loading, updateCommentThreadLines]);

    const renderCommentNode = (node) => {
      const comment = node.raw;
      const replyingHere =
        replyToCommentId != null && String(replyToCommentId) === String(comment._id);
      const hasThread = node.children.length > 0 || replyingHere;

      return (
        <div>
          <div className="flex items-start gap-2">
            <img
              src={resolveAvatarUrl(comment.author?.avatar, comment.author?.name, '1877f2')}
              alt={comment.author?.name}
              className="w-9 h-9 rounded-full flex-shrink-0 object-cover cursor-pointer"
              onError={withAvatarFallback(comment.author?.name, '1877f2')}
              onClick={() => {
                const authorId = comment.author?._id || comment.author?.id || comment.author;
                if (!authorId) return;
                navigate(`/profile/${authorId}`);
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="inline-block max-w-full">
                <div className={bubbleCls}>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-extrabold text-[13px] ${cnTextMain} cursor-pointer hover:underline`}
                      onClick={() => {
                        const authorId = comment.author?._id || comment.author?.id || comment.author;
                        if (!authorId) return;
                        navigate(`/profile/${authorId}`);
                      }}
                    >
                      {comment.author?.name}
                    </h4>
                    {String(comment.author?._id || comment.author?.id || comment.author) === String(user?.id || user?._id) && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className={`text-xs font-semibold ${cnTextMuted} hover:text-red-600 transition-colors`}
                        title="Xóa bình luận"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <p className={`${cnTextMain} text-[15px] leading-relaxed whitespace-pre-wrap break-words`}>
                    {comment.content}
                  </p>
                  {comment.images && comment.images.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {comment.images.map((img, idx) => {
                        const src = String(img || '');
                        const url = resolveMediaUrl(src);
                        return (
                          <img
                            key={`${comment._id}-img-${idx}`}
                            src={url}
                            alt=""
                            className="h-24 w-24 rounded-lg border border-[var(--fb-divider)] object-cover"
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={`mt-1 flex items-center gap-3 text-xs ${cnTextMuted} ml-3`}>
                <span>{formatTimeAgo(comment.createdAt)}</span>
                <button type="button" className="hover:underline font-semibold">Thích</button>
                <button
                  type="button"
                  className="hover:underline font-semibold"
                  onClick={() => setReplyToCommentId(comment._id)}
                >
                  Trả lời
                </button>
              </div>
            </div>
          </div>
          {hasThread ? (
            <div
              data-comment-thread
              className={`relative ml-9 mt-2 min-w-0 border-l-2 ${threadBorderCls} pl-4 space-y-3`}
            >
              <div
                data-thread-tail-mask
                aria-hidden
                className={`pointer-events-none absolute bottom-0 left-[-1px] z-[2] w-[5px] ${threadTailMaskBg}`}
                style={{ height: 'var(--thread-tail-cut, 0px)' }}
              />
              {node.children.map((child) => (
                <div key={child.raw._id} className="relative">
                  <div
                    data-thread-elbow
                    className={`pointer-events-none absolute left-[calc(-1rem-2px)] top-[18px] z-[1] box-border h-4 w-4 rounded-bl-[10px] border-b-2 border-l-2 ${threadBorderCls} bg-[var(--fb-input)]`}
                    aria-hidden
                  />
                  {renderCommentNode(child)}
                </div>
              ))}
              {replyingHere ? (
                <div id={`reply-composer-anchor-${comment._id}`} className="relative">
                  <div
                    data-thread-elbow
                    className={`pointer-events-none absolute left-[calc(-1rem-2px)] top-[18px] z-[1] box-border h-4 w-4 rounded-bl-[10px] border-b-2 border-l-2 ${threadBorderCls} bg-[var(--fb-input)]`}
                    aria-hidden
                  />
                  <div className="flex items-center gap-2">
                      <img
                        src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                        alt={user?.name}
                        className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                        onError={withAvatarFallback(user?.name, '1877f2')}
                      />
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <input
                          value={localCommentText}
                          onChange={(e) => setLocalCommentText(e.target.value)}
                          placeholder="Viết phản hồi công khai..."
                          className={replyInputCls}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmitComment();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSubmitComment}
                          disabled={!localCommentText.trim()}
                          className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          title="Gửi"
                        >
                          <Send className="w-5 h-5 text-blue-600" />
                        </button>
                      </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    };

    if (!isVisible) return null;

    const handleClose = () => {
      onClose();
    };

    if (isTheater) {
      return (
        <div className="flex flex-col flex-1 min-h-0 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)]">
          <div className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-[var(--fb-divider)] bg-[var(--fb-surface)]">
            <span className="text-sm font-semibold text-[var(--fb-text-primary)]">Bình luận</span>
            <button
              type="button"
              disabled
              className="text-xs flex items-center gap-1 text-[var(--fb-text-secondary)] bg-[var(--fb-input)] px-2 py-1.5 rounded-md border border-[var(--fb-divider)] cursor-default opacity-90"
              title="Sắp có"
            >
              Phù hợp nhất
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            ref={commentListMeasureRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 bg-[var(--fb-app)]"
          >
            {loading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {commentTreeRoots.map((node) => (
                  <div key={node.raw._id}>{renderCommentNode(node)}</div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--fb-text-secondary)]">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Chưa có bình luận nào</p>
                <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
              </div>
            )}
          </div>
          <div className="shrink-0 p-3 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)]">
            {replyToCommentId ? (
              <div className="flex items-center justify-between gap-2 py-1">
                <p className={`text-xs min-w-0 truncate ${cnTextMuted}`}>
                  Ô nhập nằm trong luồng bình luận phía trên
                </p>
                <button
                  type="button"
                  onClick={resetComposerToPost}
                  className={`shrink-0 text-xs font-semibold ${linkAccent}`}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img
                  src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                  alt={user?.name}
                  className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                  onError={withAvatarFallback(user?.name, '1877f2')}
                />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    ref={commentImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePickCommentImages}
                  />
                  <input
                    id="theater-comment-input"
                    value={localCommentText}
                    onChange={(e) => setLocalCommentText(e.target.value)}
                    placeholder="Viết bình luận công khai..."
                    className={replyInputCls}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => commentImageInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
                    title="Thêm ảnh"
                  >
                    <ImagePlus className="w-5 h-5 text-[var(--fb-icon)]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={!localCommentText.trim() && commentImages.length === 0}
                    className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Gửi"
                  >
                    <Send className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return createPortal(
      <div
        className="fixed inset-0 z-50 overscroll-none bg-black/40 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-2xl max-h-[min(92vh,880px)] bg-[var(--fb-surface)] rounded-2xl border border-[var(--fb-divider)] shadow-xl overflow-hidden overscroll-contain flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-[var(--fb-divider)]">
            <div className="font-extrabold text-[var(--fb-text-primary)]">Bình luận</div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5 text-[var(--fb-icon)]" />
            </button>
          </div>

          {/* Bài viết gốc — luôn ở trên, ảnh lớn rõ */}
          {post && (
            <div className="shrink-0 border-b border-[var(--fb-divider)] bg-[var(--fb-input)]/40 max-h-[min(48vh,420px)] overflow-y-auto overscroll-y-contain">
              <div className="p-4">
                <p className="text-center text-sm font-bold text-[var(--fb-text-primary)] mb-3">
                  Bài viết của {post.author?.name || 'Thành viên'}
                </p>
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={resolveAvatarUrl(post.author?.avatar, post.author?.name, '1877f2')}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    onError={withAvatarFallback(post.author?.name, '1877f2')}
                    onClick={() => {
                      const aid = post.author?._id || post.author?.id || post.author;
                      if (aid) navigate(`/profile/${aid}`);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--fb-text-primary)]">{post.author?.name || 'Thành viên'}</p>
                    <p className="text-xs text-[var(--fb-text-secondary)]">{formatTimeAgo(post.createdAt)}</p>
                  </div>
                </div>
                {post.content?.trim() ? (
                  <p className="text-[15px] leading-relaxed text-[var(--fb-text-primary)] whitespace-pre-wrap break-words mb-3">
                    {post.content}
                  </p>
                ) : null}
                {(() => {
                  const imgs = (post.images || []).filter((x) => typeof x === 'string');
                  if (!imgs.length) return null;
                  const url = (src) => resolveMediaUrl(src);
                  const imgClickable = Boolean(onOpenImageTheater);
                  const openAt = (index) => (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenImageTheater?.(index);
                  };
                  if (imgs.length === 1) {
                    return (
                      <div
                        role={imgClickable ? 'button' : undefined}
                        tabIndex={imgClickable ? 0 : undefined}
                        onClick={imgClickable ? openAt(0) : undefined}
                        onKeyDown={
                          imgClickable
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onOpenImageTheater(0);
                                }
                              }
                            : undefined
                        }
                        className={`rounded-xl overflow-hidden border border-[var(--fb-divider)] bg-black/5${
                          imgClickable ? ' cursor-pointer hover:opacity-95' : ''
                        }`}
                        title={imgClickable ? 'Xem ảnh hoặc video' : undefined}
                      >
                        {isPostGalleryVideoUrl(imgs[0]) ? (
                          <video
                            src={url(imgs[0])}
                            muted
                            playsInline
                            preload="metadata"
                            className="pointer-events-none mx-auto block w-full max-h-[min(44vh,400px)] object-contain"
                          />
                        ) : (
                          <img
                            src={url(imgs[0])}
                            alt=""
                            className="pointer-events-none mx-auto block w-full max-h-[min(44vh,400px)] object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                  if (imgs.length === 2) {
                    return (
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden border border-[var(--fb-divider)]">
                        {imgs.map((src, idx) =>
                          imgClickable ? (
                            <button
                              key={idx}
                              type="button"
                              onClick={openAt(idx)}
                              title="Xem ảnh hoặc video"
                              className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left hover:opacity-95"
                            >
                              {isPostGalleryVideoUrl(src) ? (
                                <video
                                  src={url(src)}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="pointer-events-none h-52 w-full object-cover"
                                />
                              ) : (
                                <img
                                  src={url(src)}
                                  alt=""
                                  className="pointer-events-none h-52 w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </button>
                          ) : (
                            isPostGalleryVideoUrl(src) ? (
                              <video
                                key={idx}
                                src={url(src)}
                                muted
                                playsInline
                                preload="metadata"
                                className="h-52 w-full object-cover"
                              />
                            ) : (
                              <img
                                key={idx}
                                src={url(src)}
                                alt=""
                                className="h-52 w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )
                          )
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1.5">
                      <div
                        role={imgClickable ? 'button' : undefined}
                        tabIndex={imgClickable ? 0 : undefined}
                        onClick={imgClickable ? openAt(0) : undefined}
                        onKeyDown={
                          imgClickable
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onOpenImageTheater(0);
                                }
                              }
                            : undefined
                        }
                        className={`rounded-xl overflow-hidden border border-[var(--fb-divider)]${
                          imgClickable ? ' cursor-pointer hover:opacity-95' : ''
                        }`}
                        title={imgClickable ? 'Xem ảnh hoặc video' : undefined}
                      >
                        {isPostGalleryVideoUrl(imgs[0]) ? (
                          <video
                            src={url(imgs[0])}
                            muted
                            playsInline
                            preload="metadata"
                            className="pointer-events-none max-h-64 w-full object-cover"
                          />
                        ) : (
                          <img
                            src={url(imgs[0])}
                            alt=""
                            className="pointer-events-none max-h-64 w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {imgs.slice(1).map((src, idx) =>
                          imgClickable ? (
                            <button
                              key={idx}
                              type="button"
                              onClick={openAt(idx + 1)}
                              title="Xem ảnh hoặc video"
                              className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left hover:opacity-95"
                            >
                              {isPostGalleryVideoUrl(src) ? (
                                <video
                                  src={url(src)}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="pointer-events-none h-40 w-full rounded-lg border border-[var(--fb-divider)] object-cover"
                                />
                              ) : (
                                <img
                                  src={url(src)}
                                  alt=""
                                  className="pointer-events-none h-40 w-full rounded-lg border border-[var(--fb-divider)] object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </button>
                          ) : (
                            isPostGalleryVideoUrl(src) ? (
                              <video
                                key={idx}
                                src={url(src)}
                                muted
                                playsInline
                                preload="metadata"
                                className="h-40 w-full rounded-lg border border-[var(--fb-divider)] object-cover"
                              />
                            ) : (
                              <img
                                key={idx}
                                src={url(src)}
                                alt=""
                                className="h-40 w-full rounded-lg border border-[var(--fb-divider)] object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}
                {post.files && post.files.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {post.files.map((file, index) =>
                        isPostAttachmentVideo(file) ? (
                          <div key={index} className="md:col-span-2">
                            <video
                              src={postAttachmentUrl(file)}
                              controls
                              playsInline
                              className="h-auto w-full max-h-[min(50vh,420px)] rounded-lg bg-black object-contain"
                            />
                            {file.name ? (
                              <p className="mt-1 truncate px-0.5 text-xs text-[var(--fb-text-secondary)]">{file.name}</p>
                            ) : null}
                          </div>
                        ) : (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fb-divider)] bg-[var(--fb-input)] p-3"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <BookOpen className="h-5 w-5 shrink-0 text-orange-600" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--fb-text-primary)]">{file.name || 'Tệp'}</p>
                                <p className="text-xs text-[var(--fb-text-secondary)]">{file.size || 'Không rõ dung lượng'}</p>
                              </div>
                            </div>
                            <a
                              href={postAttachmentUrl(file)}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-4 w-4" />
                              Tải về
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* List */}
          <div
            ref={commentListMeasureRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-3"
          >
            {loading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {commentTreeRoots.map((node) => (
                  <div key={node.raw._id}>{renderCommentNode(node)}</div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--fb-text-secondary)]">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Chưa có bình luận nào</p>
                <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
              </div>
            )}
          </div>

          {/* Input — bình luận gốc; trả lời comment dùng ô nhập gắn vào nhánh (có đường nối) */}
          <div className="shrink-0 p-3 border-t border-[var(--fb-divider)] bg-[var(--fb-surface)]">
            {commentImages.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {commentImages.map((img) => (
                  <div key={img.key} className="relative">
                    <img
                      src={img.previewUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-[var(--fb-divider)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeCommentImage(img.key)}
                      className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
                      title="Xóa ảnh"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {replyToCommentId ? (
              <div className="flex items-center justify-between gap-2 py-1">
                <p className="text-xs text-[var(--fb-text-secondary)] min-w-0 truncate">
                  Ô nhập nằm trong luồng bình luận phía trên
                </p>
                <button
                  type="button"
                  onClick={resetComposerToPost}
                  className={`shrink-0 text-xs font-semibold ${linkAccent}`}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src={resolveAvatarUrl(user?.avatar, user?.name, '1877f2')}
                    alt={user?.name}
                    className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                    onError={withAvatarFallback(user?.name, '1877f2')}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      ref={commentImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePickCommentImages}
                    />
                    <input
                      value={localCommentText}
                      onChange={(e) => setLocalCommentText(e.target.value)}
                      placeholder="Viết bình luận công khai..."
                      className={replyInputCls}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => commentImageInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors"
                      title="Thêm ảnh"
                    >
                      <ImagePlus className="w-5 h-5 text-[var(--fb-icon)]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={!localCommentText.trim() && commentImages.length === 0}
                      className="p-2 rounded-full hover:bg-[var(--fb-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Gửi"
                    >
                      <Send className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
}
