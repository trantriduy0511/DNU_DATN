import { getBackendOrigin } from '../shared/config/runtimeConfig';

/** Marker + JSON — chat parse để hiển thị thẻ nhóm (cùng kiểu với sự kiện). */
export const GROUP_SHARE_MSG_MARKER = '[[DNU_GROUP_SHARE]]';

/**
 * @param {object} group — nhóm từ API (_id, name, coverPhoto?, avatar?, members?, membersCount?, settings?)
 * @returns {string} nội dung gửi qua API tin nhắn
 */
export function buildGroupShareMessageContent(group) {
  if (!group?._id) return '';
  const cover = group.coverPhoto;
  const av = group.avatar;
  let image = null;
  if (typeof cover === 'string' && cover.trim()) {
    const c = cover.trim();
    if (c.startsWith('http') || c.startsWith('/uploads')) image = c;
  }
  if (!image && typeof av === 'string' && av.trim()) {
    const a = av.trim();
    if (a.startsWith('http') || a.startsWith('/uploads')) image = a;
  }
  const memberCount = group.membersCount ?? group.members?.length ?? 0;
  const accessLabel = group.settings?.accessType === 'private' ? 'Riêng tư' : 'Công khai';
  const payload = {
    groupId: String(group._id),
    title: (group.name || 'Nhóm học tập').trim(),
    image,
    memberCount: typeof memberCount === 'number' && !Number.isNaN(memberCount) ? memberCount : Number(memberCount) || 0,
    accessLabel,
    updatedAt: group.updatedAt || group.createdAt || null,
  };
  return `${GROUP_SHARE_MSG_MARKER}\n${JSON.stringify(payload)}`;
}

/**
 * @param {string} text
 * @returns {null | { caption: string, groupId: string, title: string, image: string | null, memberCount: number, accessLabel: string, updatedAt: string | null }}
 */
export function parseGroupShareFromMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const idx = text.indexOf(GROUP_SHARE_MSG_MARKER);
  if (idx < 0) return null;
  const caption = idx > 0 ? text.slice(0, idx).trim() : '';
  const jsonPart = text.slice(idx + GROUP_SHARE_MSG_MARKER.length).trim();
  try {
    const data = JSON.parse(jsonPart);
    if (data && data.groupId && data.title) {
      return {
        caption,
        groupId: String(data.groupId),
        title: String(data.title),
        image: data.image != null && data.image !== '' ? String(data.image) : null,
        memberCount:
          typeof data.memberCount === 'number' && !Number.isNaN(data.memberCount)
            ? data.memberCount
            : Number(data.memberCount) || 0,
        accessLabel: data.accessLabel ? String(data.accessLabel) : 'Công khai',
        updatedAt: data.updatedAt != null && data.updatedAt !== '' ? String(data.updatedAt) : null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function resolveGroupShareImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const s = imagePath.trim();
  if (s.startsWith('http')) return s;
  const backendOrigin = getBackendOrigin();
  if (s.startsWith('/uploads')) return `${backendOrigin}${s}`;
  return `${backendOrigin}/${s.replace(/^\//, '')}`;
}
