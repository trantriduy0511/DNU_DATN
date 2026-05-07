import { Queue, Worker } from 'bullmq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import redisConnection, { isRedisEnabled } from '../config/redis.js';
import AIAnalysisJob from '../models/AIAnalysisJob.model.js';

const QUEUE_NAME = 'document-analysis';

const documentAnalysisQueue = isRedisEnabled
  ? new Queue(QUEUE_NAME, { connection: redisConnection })
  : null;

const updateJob = async (jobId, patch) => {
  await AIAnalysisJob.findOneAndUpdate(
    { jobId },
    { ...patch, updatedAt: new Date() },
    { new: true }
  );
};

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on server');
  }
  return new GoogleGenerativeAI(apiKey);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeUploadedFileName = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return 'unknown';
  try {
    const recovered = Buffer.from(raw, 'latin1').toString('utf8');
    const hasUnicode = /[\u0100-\uFFFF]/.test(recovered);
    return hasUnicode ? recovered : raw;
  } catch {
    return raw;
  }
};

const sanitizeAiText = (value) =>
  String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[#*]/g, ' ')
    .replace(/`/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^[\-\u2022]\s+/gm, '')
    .replace(/[^\p{L}\p{N}\s.,;:!?()/%\-]/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const cleanList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAiText(item)).filter(Boolean);
  }
  const text = sanitizeAiText(value);
  if (!text) return [];
  return text
    .split(/\r?\n|;\s+/)
    .map((item) => sanitizeAiText(item))
    .filter(Boolean)
    .slice(0, 12);
};

const tryExtractJson = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return null;

  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = fencedMatch?.[1] || text;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const buildAnalysisPrompt = (documentText) => `
Bạn là trợ lý phân tích tài liệu học tập.
Hãy trả về DUY NHẤT JSON hợp lệ, không kèm markdown, không code fence, không giải thích thêm.

Schema JSON:
{
  "summary": "string, 120-220 từ",
  "keyPoints": ["string", "string", "..."], // 5-10 ý
  "structure": ["string", "string", "..."], // 4-10 mục cấu trúc/outline
  "concepts": ["string", "string", "..."] // 5-10 khái niệm quan trọng
}

Yêu cầu nội dung:
- Viết tiếng Việt, dễ hiểu, đúng trọng tâm.
- Không dùng ký tự trang trí đặc biệt.
- Mỗi phần phải khác nhau về nội dung, không lặp nguyên văn.

TÀI LIỆU:
"""
${documentText}
"""
`;

const callGeminiWithRetry = async (analysisPrompt, maxAttempts = 3) => {
  const genAI = getGenAIClient();
  const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      const isRetriable =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.message?.includes('Service Unavailable') ||
        error?.message?.includes('high demand') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('limit');

      if (!isRetriable || attempt === maxAttempts) {
        throw error;
      }

      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }

  throw lastError;
};

const buildAnalysisResult = (aiAnalysis, fileName, documentText, fileType) => {
  const parsed = tryExtractJson(aiAnalysis) || {};

  const summary = sanitizeAiText(parsed.summary || aiAnalysis || '');
  const keyPointsList = cleanList(parsed.keyPoints);
  const structureList = cleanList(parsed.structure);
  const conceptsList = cleanList(parsed.concepts);

  const keyPoints = keyPointsList.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
  const structure = structureList.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
  const concepts = conceptsList.map((item, idx) => `${idx + 1}. ${item}`).join('\n');

  const fullAnalysis = [
    `Tóm tắt:\n${summary}`,
    `Điểm chính:\n${keyPoints || 'Chưa có dữ liệu.'}`,
    `Cấu trúc:\n${structure || 'Chưa có dữ liệu.'}`,
    `Khái niệm quan trọng:\n${concepts || 'Chưa có dữ liệu.'}`,
  ].join('\n\n');

  return {
    summary: summary || 'Chưa có nội dung tóm tắt.',
    keyPoints: keyPoints || 'Chưa có danh sách điểm chính.',
    structure: structure || 'Chưa có phân tích cấu trúc.',
    concepts: concepts || 'Chưa có danh sách khái niệm.',
    fullAnalysis,
    metadata: {
      fileName,
      fileType,
      textLength: documentText.length,
      analyzedAt: new Date().toISOString(),
    },
  };
};

let workerInstance = null;

const processDocumentAnalysisByJobId = async (jobId) => {
  const docJob = await AIAnalysisJob.findOne({ jobId }).lean();
  if (!docJob) return;

  if (!docJob.sourceText || !docJob.sourceText.trim()) {
    await updateJob(jobId, {
      status: 'failed',
      progress: 100,
      message: 'Thiếu dữ liệu nguồn để phân tích',
      error: 'sourceText is empty',
    });
    return;
  }

  await updateJob(jobId, {
    status: 'processing',
    progress: 60,
    message: 'Đang gửi yêu cầu tới AI',
  });

  try {
    const prompt = buildAnalysisPrompt(docJob.sourceText);
    const aiAnalysis = await callGeminiWithRetry(prompt, 3);
    const fileName = normalizeUploadedFileName(docJob.metadata?.fileName || 'unknown');
    const fileType = docJob.metadata?.fileType || '.txt';
    const result = buildAnalysisResult(aiAnalysis, fileName, docJob.sourceText, fileType);

    await updateJob(jobId, {
      status: 'done',
      progress: 100,
      message: 'Phân tích hoàn tất',
      metadata: {
        ...docJob.metadata,
        textLength: docJob.sourceText.length,
        analyzedAt: new Date(),
      },
      result,
      error: null,
    });
  } catch (error) {
    await updateJob(jobId, {
      status: 'failed',
      progress: 100,
      message: 'Xử lý thất bại',
      error: error.message || 'Lỗi khi phân tích tài liệu',
    });
  }
};

export const startDocumentAnalysisWorker = () => {
  if (!isRedisEnabled) {
    console.log('ℹ️ AI queue worker running in local in-process mode');
    return null;
  }
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(
    QUEUE_NAME,
    async (bullJob) => {
      const { jobId } = bullJob.data;
      await processDocumentAnalysisByJobId(jobId);
    },
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.AI_QUEUE_CONCURRENCY || '2', 10),
    }
  );

  workerInstance.on('failed', (job, err) => {
    console.error(`❌ AI queue job failed: ${job?.id}`, err.message);
  });

  workerInstance.on('error', (err) => {
    console.error('❌ AI queue worker error:', err.message);
  });

  console.log('✅ AI document analysis worker started');
  return workerInstance;
};

export const enqueueDocumentAnalysisJob = async (jobId) => {
  if (isRedisEnabled && documentAnalysisQueue) {
    await documentAnalysisQueue.add(
      'analyze',
      { jobId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
    return;
  }

  // Fallback mode: process within current process (still asynchronous)
  setTimeout(() => {
    processDocumentAnalysisByJobId(jobId).catch((error) => {
      console.error('❌ Local AI queue processing error:', error.message);
    });
  }, 0);
};

