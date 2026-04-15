import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadSavedPosts,
  unsavePost,
  loadCollections,
  persistCollections,
  loadShareFriends,
  sharePostToFriends,
  togglePostLike
} from '../services/savedService';

export function useSavedPostsViewModel(user) {
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

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadSavedPosts();
      setPosts(list);
      window.dispatchEvent(
        new CustomEvent('savedPostsChanged', { detail: { postIds: list.map((p) => p?._id).filter(Boolean) } })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => {
    const data = loadCollections();
    setCollections(data.collections);
    setPostCollectionMap(data.map);
  }, []);

  useEffect(() => {
    persistCollections(collections, postCollectionMap);
  }, [collections, postCollectionMap]);

  useEffect(() => {
    if (!posts.length) return;
    setPostCollectionMap((prev) => {
      let changed = false;
      const next = { ...prev };
      posts.forEach((post) => {
        const pid = String(post._id);
        if (!next[pid]) {
          next[pid] = 'default';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [posts]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const collectionId = postCollectionMap[post._id] || 'default';
        if (filterCollectionId !== 'all' && collectionId !== filterCollectionId) return false;
        if (filterCategory !== 'all' && (post.category || 'Khác') !== filterCategory) return false;
        if (filterKeyword.trim()) {
          const keyword = filterKeyword.trim().toLowerCase();
          const text = `${post.title || ''} ${post.content || ''} ${post.author?.name || ''}`.toLowerCase();
          if (!text.includes(keyword)) return false;
        }
        return true;
      }),
    [posts, postCollectionMap, filterCollectionId, filterCategory, filterKeyword]
  );

  const removeFromSaved = useCallback(
    async (postId) => {
      await unsavePost(postId);
      await fetchSaved();
    },
    [fetchSaved]
  );

  const assignPostToCollection = (postId, collectionId) => {
    setPostCollectionMap((prev) => ({ ...prev, [postId]: collectionId }));
    setCollectionPickerPost(null);
  };

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return false;
    const exists = collections.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return false;
    const id = `col_${Date.now()}`;
    setCollections((prev) => [...prev, { id, name }]);
    setNewCollectionName('');
    setShowCreateCollectionModal(false);
    return true;
  };

  const openShareModal = async (post) => {
    if (!post?._id) return;
    setShareModalPost(post);
    setShareSearchQuery('');
    setShareSelectedFriendIds(new Set());
    setShareLoadingFriends(true);
    try {
      const friends = await loadShareFriends();
      setShareFriends(friends);
    } finally {
      setShareLoadingFriends(false);
    }
  };

  const confirmShare = async () => {
    if (!shareModalPost?._id) return 0;
    const ids = [...shareSelectedFriendIds];
    if (!ids.length) return 0;
    setShareSending(true);
    try {
      const sharesCount = await sharePostToFriends({
        post: shareModalPost,
        friendIds: ids,
        senderName: user?.name
      });
      if (typeof sharesCount === 'number') {
        setPosts((prev) => prev.map((p) => (String(p._id) === String(shareModalPost._id) ? { ...p, shares: sharesCount } : p)));
      }
      setShareModalPost(null);
      setShareSelectedFriendIds(new Set());
      return ids.length;
    } finally {
      setShareSending(false);
    }
  };

  const applyPostUpdater = (postId, updater) => {
    setPosts((prev) => prev.map((p) => (String(p._id) === String(postId) ? updater(p) : p)));
    setPreviewPost((prev) => {
      if (!prev || String(prev._id) !== String(postId)) return prev;
      return updater(prev);
    });
  };

  const toggleLike = async (postId) => {
    const target = posts.find((p) => String(p._id) === String(postId)) || previewPost;
    if (!target) return;
    const uid = String(user?.id || user?._id || '');
    const liked = (target.likes || []).some((like) => String(like?._id || like) === uid);
    const nextLiked = await togglePostLike({ postId, liked });
    applyPostUpdater(postId, (post) => {
      const prevLikes = Array.isArray(post.likes) ? post.likes : [];
      const nextLikes = nextLiked
        ? [...prevLikes.filter((like) => String(like?._id || like) !== uid), uid]
        : prevLikes.filter((like) => String(like?._id || like) !== uid);
      return { ...post, likes: nextLikes };
    });
  };

  return {
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
  };
}
