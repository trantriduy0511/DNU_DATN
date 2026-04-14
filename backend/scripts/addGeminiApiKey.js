import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('\n🔧 Script thêm GEMINI_API_KEY vào file .env\n');
console.log(`📁 File .env: ${envPath}\n`);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('❌ File .env không tồn tại!');
  console.log('📝 Đang tạo file .env mới...\n');
  
  // Create basic .env file
  const basicEnv = `PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

# AI Configuration - Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
`;
  
  fs.writeFileSync(envPath, basicEnv, 'utf8');
  console.log('✅ Đã tạo file .env mới!\n');
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if GEMINI_API_KEY already exists
if (envContent.includes('GEMINI_API_KEY=')) {
  console.log('⚠️  GEMINI_API_KEY đã tồn tại trong file .env');
  
  // Check if it's set to placeholder
  if (envContent.includes('GEMINI_API_KEY=your_gemini_api_key') || 
      envContent.includes('GEMINI_API_KEY=your_gemini_api_key_here')) {
    console.log('📝 Giá trị hiện tại là placeholder, cần cập nhật.\n');
    console.log('💡 Hướng dẫn:');
    console.log('   1. Lấy API key từ: https://aistudio.google.com/api-keys ✅ (Khuyến nghị)');
    console.log('      Hoặc: https://makersuite.google.com/app/apikey');
    console.log('   2. Mở file backend/.env');
    console.log('   3. Thay thế: GEMINI_API_KEY=your_gemini_api_key_here');
    console.log('   4. Bằng: GEMINI_API_KEY=YOUR_ACTUAL_API_KEY\n');
  } else {
    console.log('✅ GEMINI_API_KEY đã được cấu hình!\n');
  }
} else {
  console.log('➕ Đang thêm GEMINI_API_KEY vào file .env...\n');
  
  // Add GEMINI_API_KEY if not exists
  if (!envContent.endsWith('\n')) {
    envContent += '\n';
  }
  
  envContent += '# AI Configuration - Google Gemini API\n';
  envContent += 'GEMINI_API_KEY=your_gemini_api_key_here\n';
  
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Đã thêm GEMINI_API_KEY vào file .env!\n');
}

console.log('📋 HƯỚNG DẪN LẤY GEMINI API KEY:\n');
console.log('1. Truy cập: https://aistudio.google.com/api-keys ✅ (Khuyến nghị)');
console.log('   Hoặc: https://makersuite.google.com/app/apikey');
console.log('2. Đăng nhập bằng tài khoản Google');
console.log('3. Click "Create API Key" hoặc "Get API Key"');
console.log('4. Copy API key (dạng: AIzaSy...xxxxx)');
console.log('5. Mở file backend/.env');
console.log('6. Thay thế: GEMINI_API_KEY=your_gemini_api_key_here');
console.log('   Bằng: GEMINI_API_KEY=AIzaSy...xxxxx (API key thực tế của bạn)');
console.log('7. Lưu file và restart server\n');

console.log('⚠️  LƯU Ý:');
console.log('   - API key là thông tin bảo mật, không chia sẻ công khai');
console.log('   - Sau khi thêm API key, PHẢI restart server');
console.log('   - File .env không được commit lên Git (đã có trong .gitignore)\n');

