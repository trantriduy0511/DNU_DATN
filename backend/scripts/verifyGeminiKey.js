import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env');

console.log('\n🔍 KIỂM TRA VÀ XÁC THỰC GEMINI API KEY\n');
console.log('═'.repeat(60));

// Load .env
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.log('❌ GEMINI_API_KEY không tìm thấy trong file .env');
  console.log('\n💡 Chạy: npm run add-gemini-key');
  process.exit(1);
}

console.log(`\n✅ API Key tìm thấy: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)`);

// Validate format
if (!apiKey.startsWith('AIza')) {
  console.log('\n⚠️  CẢNH BÁO: API key không đúng format!');
  console.log('   API key hợp lệ thường bắt đầu bằng "AIza"');
    console.log('   Vui lòng kiểm tra lại API key tại: https://aistudio.google.com/api-keys');
}

if (apiKey.length < 20) {
  console.log('\n❌ API key quá ngắn! Vui lòng kiểm tra lại.');
  process.exit(1);
}

// Test API key
console.log('\n🧪 Đang test API key với Google Gemini API...\n');

try {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different model names - ưu tiên model từ .env hoặc gemini-2.5-flash
  const preferredModel = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  const modelsToTry = [
    preferredModel, 
    'gemini-2.5-flash', 
    'gemini-flash-latest',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-1.5-flash', 
    'gemini-1.5-pro', 
    'gemini-pro'
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  let model = null;
  let lastError = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`   Đang thử model: ${modelName}...`);
      model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: 50,
        },
      });
      
      const result = await model.generateContent('Test');
      const response = await result.response;
      const text = response.text();
      
      console.log(`\n✅ Model "${modelName}" hoạt động!`);
      console.log(`   Test response: ${text.substring(0, 50)}...\n`);
      console.log('═'.repeat(60));
      console.log(`✅ API key hoạt động tốt với model: ${modelName}`);
      console.log('═'.repeat(60));
      process.exit(0);
    } catch (err) {
      lastError = err;
      console.log(`   ❌ Model "${modelName}" không hoạt động: ${err.message?.substring(0, 100)}...`);
      continue;
    }
  }
  
  // If all models failed, throw the last error
  throw lastError;

  const result = await model.generateContent('Test');
  const response = await result.response;
  const text = response.text();

  console.log('✅ API KEY HỢP LỆ!');
  console.log(`   Test response: ${text.substring(0, 50)}...\n`);
  console.log('═'.repeat(60));
  console.log('✅ API key hoạt động tốt! Bạn có thể sử dụng AI features.');
  console.log('═'.repeat(60));
  
} catch (error) {
  console.log('❌ API KEY KHÔNG HỢP LỆ HOẶC CÓ LỖI!\n');
  
  if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
    console.log('⚠️  Lỗi 403 Forbidden:');
    console.log('   - API key không hợp lệ hoặc chưa được kích hoạt');
    console.log('   - Hoặc API key không có quyền truy cập Gemini API');
    console.log('\n💡 Giải pháp:');
    console.log('   1. Kiểm tra API key tại: https://aistudio.google.com/api-keys');
    console.log('   2. Tạo API key mới nếu cần');
    console.log('   3. Đảm bảo API key có quyền truy cập Gemini Pro');
    console.log('   4. Cập nhật lại trong file backend/.env');
    console.log('   5. Restart server');
  } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    console.log('⚠️  Lỗi 401 Unauthorized:');
    console.log('   - API key không được xác thực');
    console.log('\n💡 Giải pháp:');
    console.log('   1. Kiểm tra API key có đúng không');
    console.log('   2. Đảm bảo không có khoảng trắng thừa');
    console.log('   3. Tạo API key mới nếu cần');
  } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
    console.log('⚠️  Lỗi Quota/Limit:');
    console.log('   - Đã vượt quá giới hạn sử dụng');
    console.log('\n💡 Giải pháp:');
    console.log('   - Đợi reset quota (thường theo ngày/tháng)');
    console.log('   - Hoặc nâng cấp tài khoản Google Cloud');
  } else {
    console.log(`⚠️  Lỗi: ${error.message}`);
  }
  
  console.log('\n' + '═'.repeat(60));
  process.exit(1);
}

