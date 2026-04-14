import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('\n🔧 Script cập nhật GEMINI_API_KEY\n');
console.log(`📁 File .env: ${envPath}\n`);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('❌ File .env không tồn tại!');
  console.log('📝 Vui lòng chạy: npm run add-gemini-key trước');
  process.exit(1);
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

// Find GEMINI_API_KEY line
const geminiIndex = lines.findIndex(line => line.trim().startsWith('GEMINI_API_KEY='));

if (geminiIndex === -1) {
  console.log('❌ GEMINI_API_KEY không tìm thấy trong file .env');
  console.log('📝 Vui lòng chạy: npm run add-gemini-key trước');
  process.exit(1);
}

// Get current value
const currentLine = lines[geminiIndex];
const currentValue = currentLine.split('=')[1]?.trim() || '';

if (currentValue && currentValue !== 'your_gemini_api_key_here' && currentValue.length > 10) {
  console.log('✅ GEMINI_API_KEY đã được cấu hình!');
  console.log(`   Giá trị hiện tại: ${currentValue.substring(0, 10)}... (${currentValue.length} chars)`);
  console.log('\n💡 Nếu muốn thay đổi, hãy sửa trực tiếp trong file backend/.env\n');
  process.exit(0);
}

console.log('⚠️  GEMINI_API_KEY chưa có giá trị thực tế!\n');
console.log('📋 HƯỚNG DẪN LẤY API KEY:\n');
console.log('1. Truy cập: https://aistudio.google.com/api-keys ✅ (Khuyến nghị)');
console.log('   Hoặc: https://makersuite.google.com/app/apikey');
console.log('2. Đăng nhập bằng tài khoản Google');
console.log('3. Click "Create API Key" hoặc "Get API Key"');
console.log('4. Copy API key (dạng: AIzaSy...xxxxx)\n');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📝 Nhập Gemini API Key của bạn (hoặc Enter để bỏ qua): ', (apiKey) => {
  rl.close();
  
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n⚠️  Bạn đã bỏ qua. Vui lòng thêm API key thủ công vào file backend/.env');
    console.log('   Format: GEMINI_API_KEY=AIzaSy...xxxxx\n');
    process.exit(0);
  }
  
  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.length < 20) {
    console.log('\n❌ API key quá ngắn. Vui lòng kiểm tra lại.');
    process.exit(1);
  }
  
  // Update the line
  lines[geminiIndex] = `GEMINI_API_KEY=${trimmedKey}`;
  
  // Write back to file
  const newContent = lines.join('\n');
  fs.writeFileSync(envPath, newContent, 'utf8');
  
  console.log('\n✅ Đã cập nhật GEMINI_API_KEY thành công!');
  console.log(`   API Key: ${trimmedKey.substring(0, 10)}... (${trimmedKey.length} chars)`);
  console.log('\n⚠️  QUAN TRỌNG: PHẢI RESTART SERVER để áp dụng thay đổi!');
  console.log('   1. Dừng server (Ctrl+C)');
  console.log('   2. Chạy lại: npm run dev\n');
});

