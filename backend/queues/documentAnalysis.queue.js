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

const extractSection = (text, startMarker, endMarker) => {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return null;

  const start = startIndex + startMarker.length;
  const end = endMarker ? text.indexOf(endMarker, start) : text.length;
  if (end === -1 && endMarker) return null;

  return text.substring(start, end).trim();
};

const buildAnalysisPrompt = (documentText) => `
Bạn là chuyên gia phân tích tài liệu học tập. Hãy phân tích tài liệu sau đây và cung cấp:

1. **TÓM TẮT (Summary):**
   - Tóm tắt ngắn gọn nội dung chính (100-200 từ)
   - Highlight các ý quan trọng nhất
   - Phân loại chủ đề/chuyên ngành

2. **KEY POINTS (Điểm chính):**
   - Liệt kê 5-10 điểm quan trọng nhất
   - Mỗi điểm ngắn gọn, rõ ràng
   - Sắp xếp theo thứ tự quan trọng

3. **CẤU TRÚC (Structure):**
   - Nhận diện các phần/chương chính
   - Tạo outline/bảng mục lục
   - Đánh giá độ khó (dễ/trung bình/khó)

4. **KHÁI NIỆM QUAN TRỌNG (Key Concepts):**
   - Trích xuất 5-10 khái niệm/thuật ngữ quan trọng
   - Giải thích ngắn gọn từng khái niệm
   - Gợi ý từ khóa để tìm kiếm thêm

Hãy trả lời bằng tiếng Việt, rõ ràng, có cấu trúc. Sử dụng định dạng markdown để dễ đọc.

TÀI LIỆU CẦN PHÂN TÍCH:
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

const buildAnalysisResult = (aiAnalysis, fileName, documentText, fileType) => ({
  summary: extractSection(aiAnalysis, 'TÓM TẮT', 'KEY POINTS'),
  keyPoints: extractSection(aiAnalysis, 'KEY POINTS', 'CẤU TRÚC'),
  structure: extractSection(aiAnalysis, 'CẤU TRÚC', 'KHÁI NIỆM'),
  concepts: extractSection(aiAnalysis, 'KHÁI NIỆM', null),
  fullAnalysis: aiAnalysis,
  metadata: {
    fileName,
    fileType,
    textLength: documentText.length,
    analyzedAt: new Date().toISOString(),
  },
});

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
    const fileName = docJob.metadata?.fileName || 'unknown';
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

