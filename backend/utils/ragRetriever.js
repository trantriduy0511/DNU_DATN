import Post from '../models/Post.model.js';
import Event from '../models/Event.model.js';
import Group from '../models/Group.model.js';
import AIAnalysisJob from '../models/AIAnalysisJob.model.js';

const STOP_WORDS = new Set([
  'la', 'là', 'va', 'và', 'cua', 'của', 'cho', 'toi', 'tôi', 'ban', 'bạn', 'minh', 'mình',
  'nhu', 'như', 'the', 'thế', 'nao', 'nào', 'khi', 'voi', 'với', 'tren', 'trên', 'duoc', 'được',
  'khong', 'không', 'mot', 'một', 'nhung', 'những', 'cac', 'các', 'co', 'có', 'gi', 'gì',
  'tai', 'tại', 'sao', 'how', 'what', 'why', 'where', 'which', 'who'
]);

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const extractKeywords = (question = '') => {
  const words = normalize(question)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 8);
};

const textScore = (text, keywords) => {
  if (!text || keywords.length === 0) return 0;
  const normalizedText = normalize(text);
  let score = 0;
  for (const kw of keywords) {
    if (normalizedText.includes(kw)) score += 1;
  }
  return score;
};

const truncate = (text = '', max = 600) => {
  const t = String(text).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}...`;
};

export const retrieveRagContext = async ({ question, userId, maxChunks = 6 }) => {
  const keywords = extractKeywords(question);

  const [posts, events, groups, docs] = await Promise.all([
    Post.find({ status: 'approved', isPublic: true })
      .select('title content category tags createdAt')
      .sort({ createdAt: -1 })
      .limit(80)
      .lean(),
    Event.find({})
      .select('title description location category date createdAt')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean(),
    Group.find({ status: 'approved' })
      .select('name description tags category createdAt')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean(),
    AIAnalysisJob.find(
      {
        status: 'done',
        sourceText: { $exists: true, $ne: null },
        ...(userId ? { userId } : {})
      },
      { sourceText: 1, metadata: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
  ]);

  const candidates = [];

  for (const p of posts) {
    const text = `${p.title || ''}\n${p.content || ''}\n${(p.tags || []).join(', ')}\n${p.category || ''}`;
    const score = textScore(text, keywords);
    if (score > 0 || keywords.length === 0) {
      candidates.push({
        sourceType: 'post',
        title: p.title || 'Bài viết',
        text,
        score
      });
    }
  }

  for (const e of events) {
    const text = `${e.title || ''}\n${e.description || ''}\nĐịa điểm: ${e.location || 'Không rõ'}\nDanh mục: ${e.category || 'Khác'}`;
    const score = textScore(text, keywords);
    if (score > 0 || keywords.length === 0) {
      candidates.push({
        sourceType: 'event',
        title: e.title || 'Sự kiện',
        text,
        score
      });
    }
  }

  for (const g of groups) {
    const text = `${g.name || ''}\n${g.description || ''}\n${(g.tags || []).join(', ')}\nDanh mục: ${g.category || 'Khác'}`;
    const score = textScore(text, keywords);
    if (score > 0 || keywords.length === 0) {
      candidates.push({
        sourceType: 'group',
        title: g.name || 'Nhóm học tập',
        text,
        score
      });
    }
  }

  for (const d of docs) {
    const text = `${d.metadata?.fileName || 'Tài liệu'}\n${d.sourceText || ''}`;
    const score = textScore(text, keywords);
    if (score > 0 || keywords.length === 0) {
      candidates.push({
        sourceType: 'document',
        title: d.metadata?.fileName || 'Tài liệu người dùng',
        text,
        score
      });
    }
  }

  const top = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);

  const contextBlocks = top.map((item, index) => ({
    id: `R${index + 1}`,
    sourceType: item.sourceType,
    title: item.title,
    snippet: truncate(item.text, 700)
  }));

  const contextText = contextBlocks
    .map((item) => `[${item.id}] (${item.sourceType}) ${item.title}\n${item.snippet}`)
    .join('\n\n');

  return {
    contextBlocks,
    contextText
  };
};
