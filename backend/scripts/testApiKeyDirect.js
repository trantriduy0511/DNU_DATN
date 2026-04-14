import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env');

console.log('\n🔍 TEST API KEY TRỰC TIẾP\n');
console.log('═'.repeat(60));

// Read .env file directly
const envContent = readFileSync(envPath, 'utf8');
const geminiLine = envContent.split('\n').find(line => line.trim().startsWith('GEMINI_API_KEY='));

if (!geminiLine) {
  console.log('❌ GEMINI_API_KEY không tìm thấy trong file .env');
  process.exit(1);
}

const apiKey = geminiLine.split('=')[1]?.trim();

if (!apiKey) {
  console.log('❌ GEMINI_API_KEY không có giá trị');
  process.exit(1);
}

console.log(`\n✅ API Key từ file .env: ${apiKey.substring(0, 15)}... (${apiKey.length} chars)`);
console.log(`   Full key: ${apiKey}\n`);

// Also load with dotenv to compare
dotenv.config({ path: envPath });
const dotenvKey = process.env.GEMINI_API_KEY?.trim();

console.log(`📋 API Key từ dotenv: ${dotenvKey ? dotenvKey.substring(0, 15) + '... (' + dotenvKey.length + ' chars)' : 'NOT SET'}`);

if (dotenvKey && dotenvKey !== apiKey) {
  console.log('\n⚠️  CẢNH BÁO: API key từ file .env khác với dotenv!');
  console.log('   Có thể server chưa restart sau khi cập nhật .env');
}

console.log('\n🧪 Đang test API key với Google Gemini API...\n');

// Test with the key from file
try {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try different model names
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro', 
    'gemini-pro'
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`   Đang thử model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: 50,
        },
      });
      
      const result = await model.generateContent('Test');
      const response = await result.response;
      const text = response.text();
      
      console.log(`\n✅ THÀNH CÔNG! Model "${modelName}" hoạt động!`);
      console.log(`   Test response: ${text.substring(0, 50)}...\n`);
      console.log('═'.repeat(60));
      console.log(`✅ API key hoạt động tốt với model: ${modelName}`);
      console.log('═'.repeat(60));
      console.log('\n💡 Nếu server vẫn báo lỗi, hãy RESTART server!');
      console.log('   Server chỉ đọc .env khi khởi động.\n');
      process.exit(0);
    } catch (err) {
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('404')) {
        console.log(`   ❌ Model "${modelName}": 404 Not Found`);
        if (errorMsg.includes('not found for API version v1beta')) {
          console.log(`      ⚠️  Có thể API chưa được kích hoạt trong Google Cloud Console`);
        }
      } else if (errorMsg.includes('403')) {
        console.log(`   ❌ Model "${modelName}": 403 Forbidden`);
        console.log(`      ⚠️  API key không có quyền hoặc chưa được kích hoạt`);
      } else if (errorMsg.includes('401')) {
        console.log(`   ❌ Model "${modelName}": 401 Unauthorized`);
        console.log(`      ⚠️  API key không hợp lệ`);
      } else {
        console.log(`   ❌ Model "${modelName}": ${errorMsg.substring(0, 100)}...`);
      }
    }
  }
  
  console.log('\n❌ Tất cả các model đều không hoạt động!');
  console.log('\n💡 Nguyên nhân có thể:');
  console.log('   1. API key chưa được kích hoạt cho Generative Language API');
  console.log('   2. Cần enable API tại: https://console.cloud.google.com/apis/library');
  console.log('   3. Chọn project "Gemini API" và enable "Generative Language API"');
  console.log('   4. Hoặc API key không hợp lệ');
  
} catch (error) {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
}








