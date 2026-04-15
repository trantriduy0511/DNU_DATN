import { STORAGE_KEYS } from '../../../shared/infra/storage/storageKeys';
import { loadJSON, saveJSON } from '../../../shared/infra/storage/storageService';
import {
  fetchSavedPosts,
  removeSavedPost,
  fetchFriends,
  findConversationId,
  sendMessageToConversation,
  sharePost,
  likePost,
  unlikePost
} from '../repositories/savedRepository';

export async function loadSavedPosts() {
  return fetchSavedPosts();
}

export async function unsavePost(postId) {
  return removeSavedPost(postId);
}

export function loadCollections() {
  const collections = loadJSON(STORAGE_KEYS.savedCollections, null);
  const map = loadJSON(STORAGE_KEYS.savedCollectionMap, {});
  if (Array.isArray(collections) && collections.length > 0) {
    const hasDefault = collections.some((c) => c.id === 'default');
    return {
      collections: hasDefault ? collections : [{ id: 'default', name: 'Mặc định' }, ...collections],
      map: map && typeof map === 'object' ? map : {}
    };
  }
  return { collections: [{ id: 'default', name: 'Mặc định' }], map: map && typeof map === 'object' ? map : {} };
}

export function persistCollections(collections, map) {
  saveJSON(STORAGE_KEYS.savedCollections, collections);
  saveJSON(STORAGE_KEYS.savedCollectionMap, map);
}

export async function loadShareFriends() {
  return fetchFriends();
}

export async function sharePostToFriends({ post, friendIds, senderName }) {
  const postId = post._id;
  const postUrl = `${window.location.origin}/home?post=${postId}`;
  const raw = (post.content || '').trim();
  const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
  const messageText = `${senderName || 'Một người bạn'} đã chia sẻ bài viết với bạn:\n\n${
    preview ? `“${preview}”\n\n` : ''
  }Xem tại: ${postUrl}`;

  for (const friendId of friendIds) {
    const cid = await findConversationId(friendId);
    if (!cid) continue;
    await sendMessageToConversation(cid, messageText);
  }

  return sharePost(postId);
}

export async function togglePostLike({ postId, liked }) {
  if (liked) {
    await unlikePost(postId);
    return false;
  }
  await likePost(postId);
  return true;
}
