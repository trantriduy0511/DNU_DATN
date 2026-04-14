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

console.log('\n🔍 LIST CÁC MODEL KHẢ DỤNG CHO API KEY CỦA BẠN\n');
console.log('═'.repeat(60));
console.log(`API Key: ${apiKey.substring(0, 15)}... (${apiKey.length} chars)\n`);

// List models với REST API
const listModels = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(responseData);
            resolve(data);
          } catch (e) {
            reject({ statusCode: res.statusCode, error: { message: 'Invalid JSON response' } });
          }
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

    req.end();
  });
};

(async () => {
  try {
    console.log('📋 Đang lấy danh sách model từ Google...\n');
    const result = await listModels();
    
    if (result.models && result.models.length > 0) {
      console.log(`✅ Tìm thấy ${result.models.length} model:\n`);
      console.log('═'.repeat(60));
      
      result.models.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        if (model.displayName) {
          console.log(`   Display Name: ${model.displayName}`);
        }
        if (model.description) {
          console.log(`   Description: ${model.description.substring(0, 80)}...`);
        }
        if (model.supportedGenerationMethods) {
          console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
        console.log('');
      });
      
      console.log('═'.repeat(60));
      console.log('\n💡 Các model trên có thể sử dụng với API key của bạn!');
      console.log('   Hãy cập nhật GEMINI_MODEL_NAME trong .env với một trong các model trên.\n');
    } else {
      console.log('⚠️  Không tìm thấy model nào!');
    }
  } catch (error) {
    console.log('❌ LỖI KHI LIST MODELS:\n');
    console.log(`   Status Code: ${error.statusCode || 'N/A'}`);
    if (error.error) {
      console.log(`   Error Code: ${error.error.code || 'N/A'}`);
      console.log(`   Error Message: ${error.error.message || 'N/A'}`);
      if (error.error.status) {
        console.log(`   Error Status: ${error.error.status}`);
      }
    }
    
    console.log('\n═'.repeat(60));
    console.log('💡 NGUYÊN NHÂN:\n');
    
    if (error.statusCode === 403) {
      console.log('❌ 403 Forbidden: API key không có quyền list models');
      console.log('   → API key chưa được kích hoạt cho Generative Language API');
      console.log('   → Hoặc API key bị restrict');
    } else if (error.statusCode === 401) {
      console.log('❌ 401 Unauthorized: API key không hợp lệ');
      console.log('   → Kiểm tra lại API key trong file .env');
    } else if (error.statusCode === 404) {
      console.log('❌ 404 Not Found: Endpoint không tồn tại');
      console.log('   → Có thể API version không đúng');
    } else {
      console.log('❌ Lỗi không xác định');
    }
    
    console.log('\n📝 CÁCH KHẮC PHỤC:\n');
    console.log('1. Vào: https://aistudio.google.com/api-keys');
    console.log('2. Tạo API key MỚI (hoặc kiểm tra key hiện tại)');
    console.log('3. Vào: https://console.cloud.google.com/apis/library');
    console.log('4. Chọn project của API key');
    console.log('5. Tìm và enable "Generative Language API"');
    console.log('6. Đảm bảo API key không bị restrict');
    console.log('7. Restart server và test lại\n');
  }
})();





