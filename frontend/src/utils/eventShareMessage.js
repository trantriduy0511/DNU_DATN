import { getBackendOrigin } from '../shared/config/runtimeConfig';

/** Marker + JSON một dòng — chat parse để hiển thị thẻ sự kiện (giống Facebook). */
export const EVENT_SHARE_MSG_MARKER = '[[DNU_EVENT_SHARE]]';

/**
 * @param {object} ev — object sự kiện (có _id, title, date, image?, location?)
 * @returns {string} nội dung gửi qua API tin nhắn
 */
export function buildEventShareMessageContent(ev) {
  if (!ev?._id) return '';
  const payload = {
    eventId: String(ev._id),
    title: (ev.title || 'Sự kiện').trim(),
    date: ev.date,
    image: ev.image != null && ev.image !== '' ? String(ev.image) : null,
    location: ev.location ? String(ev.location).trim() : null,
  };
  return `${EVENT_SHARE_MSG_MARKER}\n${JSON.stringify(payload)}`;
}

/**
 * @param {string} text
 * @returns {null | { caption: string, eventId: string, title: string, date: string, image: string | null, location: string | null }}
 */
export function parseEventShareFromMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const idx = text.indexOf(EVENT_SHARE_MSG_MARKER);
  if (idx < 0) return null;
  const caption = idx > 0 ? text.slice(0, idx).trim() : '';
  const jsonPart = text.slice(idx + EVENT_SHARE_MSG_MARKER.length).trim();
  try {
    const data = JSON.parse(jsonPart);
    if (data && data.eventId && data.title) {
      return {
        caption,
        eventId: String(data.eventId),
        title: String(data.title),
        date: data.date,
        image: data.image != null && data.image !== '' ? String(data.image) : null,
        location: data.location ? String(data.location) : null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Ảnh bìa trong chat: path từ API → URL đầy đủ */
export function resolveEventShareImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const s = imagePath.trim();
  if (s.startsWith('http')) return s;
  const backendOrigin = getBackendOrigin();
  if (s.startsWith('/uploads')) return `${backendOrigin}${s}`;
  return `${backendOrigin}/${s.replace(/^\//, '')}`;
}
