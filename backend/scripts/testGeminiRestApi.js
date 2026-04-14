import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.log('❌ GEMINI_API_KEY không tìm thấy');
  process.exit(1);
}

console.log('\n🔍 TEST GEMINI API TRỰC TIẾP VỚI REST API\n');
console.log('═'.repeat(60));
console.log(`API Key: ${apiKey.substring(0, 15)}... (${apiKey.length} chars)\n`);

// Test với REST API trực tiếp
const testRestApi = (modelName) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: 'Hello'
        }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(responseData) });
        } else {
          try {
            const error = JSON.parse(responseData);
            reject({ 
              statusCode: res.statusCode, 
              error: error.error || error 
            });
          } catch (e) {
            reject({ 
              statusCode: res.statusCode, 
              error: { message: responseData } 
            });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject({ statusCode: null, error: { message: error.message } });
    });

    req.write(data);
    req.end();
  });
};

// Test các model
const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

(async () => {
  for (const modelName of modelsToTest) {
    try {
      console.log(`🧪 Testing ${modelName}...`);
      const result = await testRestApi(modelName);
      console.log(`✅ ${modelName}: THÀNH CÔNG!`);
      console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...\n`);
      console.log('═'.repeat(60));
      console.log(`✅ API KEY HỢP LỆ VỚI MODEL: ${modelName}`);
      console.log('═'.repeat(60));
      process.exit(0);
    } catch (error) {
      console.log(`❌ ${modelName}:`);
      console.log(`   Status: ${error.statusCode || 'N/A'}`);
      if (error.error) {
        console.log(`   Error Code: ${error.error.code || 'N/A'}`);
        console.log(`   Error Message: ${error.error.message || 'N/A'}`);
        if (error.error.status) {
          console.log(`   Error Status: ${error.error.status}`);
        }
      }
      console.log('');
    }
  }

  console.log('═'.repeat(60));
  console.log('❌ TẤT CẢ MODEL ĐỀU KHÔNG HOẠT ĐỘNG\n');
  console.log('💡 NGUYÊN NHÂN CÓ THỂ:\n');
  console.log('1. API key không hợp lệ hoặc đã bị vô hiệu hóa');
  console.log('2. API key thuộc project chưa enable "Generative Language API"');
  console.log('3. API key bị restrict và không được phép gọi Gemini API');
  console.log('4. Cần enable "Generative Language API" (KHÔNG phải "Gemini API")');
  console.log('\n📝 CÁCH KHẮC PHỤC:\n');
  console.log('1. Vào: https://aistudio.google.com/api-keys');
  console.log('2. Tạo API key MỚI');
  console.log('3. Copy key mới vào backend/.env');
  console.log('4. Vào: https://console.cloud.google.com/apis/library');
  console.log('5. Chọn project của API key mới');
  console.log('6. Tìm "Generative Language API" (KHÔNG phải "Gemini API")');
  console.log('7. Click "ENABLE"');
  console.log('8. Restart server và test lại\n');
})();





