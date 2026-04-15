import { useEffect, useMemo, useState } from 'react';

export function useProfileMediaInteractionsViewModel({ profileId, currentUser }) {
  const [profileMediaCommentInput, setProfileMediaCommentInput] = useState('');
  const [profileMediaInteractions, setProfileMediaInteractions] = useState({
    avatar: { likes: 0, likedByMe: false, comments: [], shares: 0 },
    cover: { likes: 0, likedByMe: false, comments: [], shares: 0 }
  });

  const profileMediaStorageKey = useMemo(
    () => `profile-media-interactions:${profileId || 'unknown'}`,
    [profileId]
  );

  useEffect(() => {
    if (!profileId) return;
    try {
      const raw = localStorage.getItem(profileMediaStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      setProfileMediaInteractions({
        avatar: {
          likes: Number(parsed?.avatar?.likes || 0),
          likedByMe: Boolean(parsed?.avatar?.likedByMe),
          comments: Array.isArray(parsed?.avatar?.comments) ? parsed.avatar.comments : [],
          shares: Number(parsed?.avatar?.shares || 0)
        },
        cover: {
          likes: Number(parsed?.cover?.likes || 0),
          likedByMe: Boolean(parsed?.cover?.likedByMe),
          comments: Array.isArray(parsed?.cover?.comments) ? parsed.cover.comments : [],
          shares: Number(parsed?.cover?.shares || 0)
        }
      });
    } catch {
      // ignore malformed data
    }
  }, [profileId, profileMediaStorageKey]);

  useEffect(() => {
    if (!profileId) return;
    try {
      localStorage.setItem(profileMediaStorageKey, JSON.stringify(profileMediaInteractions));
    } catch {
      // ignore storage errors
    }
  }, [profileId, profileMediaStorageKey, profileMediaInteractions]);

  const toggleProfileMediaLike = (mediaType) => {
    if (!mediaType || !['avatar', 'cover'].includes(mediaType)) return;
    setProfileMediaInteractions((prev) => {
      const item = prev[mediaType] || { likes: 0, likedByMe: false, comments: [], shares: 0 };
      const likedByMe = !item.likedByMe;
      const likes = Math.max(0, (item.likes || 0) + (likedByMe ? 1 : -1));
      return {
        ...prev,
        [mediaType]: { ...item, likes, likedByMe }
      };
    });
  };

  const shareProfileMedia = async (mediaType) => {
    if (!mediaType || !['avatar', 'cover'].includes(mediaType)) return;
    const url = window.location.href;
    const title = mediaType === 'avatar' ? 'Ảnh đại diện' : 'Ảnh bìa';
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Chia sẻ ${title}`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert('Đã sao chép liên kết để chia sẻ');
      }
    } catch {
      // ignore cancelled share
    } finally {
      setProfileMediaInteractions((prev) => {
        const item = prev[mediaType] || { likes: 0, likedByMe: false, comments: [], shares: 0 };
        return {
          ...prev,
          [mediaType]: { ...item, shares: (item.shares || 0) + 1 }
        };
      });
    }
  };

  const submitProfileMediaComment = (mediaType) => {
    if (!mediaType || !['avatar', 'cover'].includes(mediaType)) return;
    const content = String(profileMediaCommentInput || '').trim();
    if (!content) return;
    const comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorName: currentUser?.name || 'Bạn',
      content,
      createdAt: new Date().toISOString()
    };
    setProfileMediaInteractions((prev) => {
      const item = prev[mediaType] || { likes: 0, likedByMe: false, comments: [], shares: 0 };
      return {
        ...prev,
        [mediaType]: { ...item, comments: [...(item.comments || []), comment] }
      };
    });
    setProfileMediaCommentInput('');
  };

  return {
    profileMediaCommentInput,
    setProfileMediaCommentInput,
    profileMediaInteractions,
    toggleProfileMediaLike,
    shareProfileMedia,
    submitProfileMediaComment
  };
}
