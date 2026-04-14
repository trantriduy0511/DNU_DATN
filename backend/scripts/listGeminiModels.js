import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.log('❌ GEMINI_API_KEY không tìm thấy trong file .env');
  process.exit(1);
}

console.log('\n🔍 KIỂM TRA CÁC MODEL GEMINI KHẢ DỤNG\n');
console.log(`API Key: ${apiKey.substring(0, 10)}... (${apiKey.length} chars)\n`);

try {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // List available models
  console.log('📋 Đang lấy danh sách model khả dụng...\n');
  
  // Try to get model info
  const modelsToTry = [
    'gemini-1.5-pro',
    'gemini-1.5-flash', 
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'gemini-pro-vision'
  ];
  
  console.log('🧪 Đang test các model:\n');
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hi');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ ${modelName}: HOẠT ĐỘNG`);
      console.log(`   Response: ${text.substring(0, 50)}...\n`);
      
      // If this works, update all controllers to use this model
      console.log(`\n💡 Model "${modelName}" hoạt động tốt!`);
      console.log(`   Hãy cập nhật code để sử dụng model này.\n`);
      process.exit(0);
    } catch (err) {
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('404')) {
        console.log(`❌ ${modelName}: Không tìm thấy (404)`);
      } else if (errorMsg.includes('403')) {
        console.log(`⚠️  ${modelName}: Lỗi 403 (API key không có quyền)`);
      } else {
        console.log(`❌ ${modelName}: ${errorMsg.substring(0, 80)}...`);
      }
    }
  }
  
  console.log('\n❌ Không có model nào hoạt động!');
  console.log('\n💡 Có thể do:');
  console.log('   1. API key chưa được kích hoạt Gemini API');
  console.log('   2. Cần enable Gemini API trong Google Cloud Console');
  console.log('   3. API key không hợp lệ');
  console.log('\n📝 Hướng dẫn:');
  console.log('   1. Vào: https://console.cloud.google.com/apis/library');
  console.log('   2. Tìm "Generative Language API"');
  console.log('   3. Click "Enable"');
    console.log('   4. Hoặc tạo API key mới tại: https://aistudio.google.com/api-keys');
  
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}

