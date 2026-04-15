import apiClient from '../../../shared/infra/http/apiClient';

export async function fetchSavedPosts() {
  const res = await apiClient.get('/posts/saved');
  return res.data.posts || [];
}

export async function removeSavedPost(postId) {
  await apiClient.delete(`/posts/${postId}/save`);
}

export async function fetchFriends() {
  const res = await apiClient.get('/friends').catch(() => ({ data: { friends: [] } }));
  return res.data.friends || [];
}

export async function findConversationId(friendId) {
  const res = await apiClient.get(`/messages/conversation/${friendId}`);
  return res.data?.conversation?._id || null;
}

export async function sendMessageToConversation(conversationId, content) {
  const fd = new FormData();
  fd.append('content', content);
  await apiClient.post(`/messages/${conversationId}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export async function sharePost(postId) {
  const res = await apiClient.post(`/posts/${postId}/share`);
  return res.data?.sharesCount;
}

export async function likePost(postId) {
  await apiClient.post(`/posts/${postId}/like`);
}

export async function unlikePost(postId) {
  await apiClient.delete(`/posts/${postId}/like`);
}
