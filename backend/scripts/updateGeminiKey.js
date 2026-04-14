import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

console.log('\n🔧 CẬP NHẬT GEMINI API KEY\n');
console.log(`📁 File .env: ${envPath}\n`);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('❌ File .env không tồn tại!');
  process.exit(1);
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

// Find GEMINI_API_KEY line
const geminiIndex = lines.findIndex(line => line.trim().startsWith('GEMINI_API_KEY='));

if (geminiIndex === -1) {
  console.log('❌ GEMINI_API_KEY không tìm thấy trong file .env');
  process.exit(1);
}

// Get current value
const currentLine = lines[geminiIndex];
const currentValue = currentLine.split('=')[1]?.trim() || '';

console.log(`📋 API Key hiện tại: ${currentValue ? currentValue.substring(0, 15) + '... (' + currentValue.length + ' chars)' : 'EMPTY'}`);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n💡 API Key mới của bạn: AIzaSyAINNAntvspDHxl2R4ctMfM3HxkHXpGdb0');
rl.question('\n📝 Nhập API key mới (hoặc Enter để dùng key trên): ', (apiKey) => {
  rl.close();
  
  const trimmedKey = apiKey.trim() || 'AIzaSyAINNAntvspDHxl2R4ctMfM3HxkHXpGdb0';
  
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
  console.log(`   API Key mới: ${trimmedKey.substring(0, 15)}... (${trimmedKey.length} chars)`);
  console.log('\n⚠️  QUAN TRỌNG: PHẢI RESTART SERVER để áp dụng thay đổi!');
  console.log('   1. Dừng server (Ctrl+C)');
  console.log('   2. Chạy lại: npm run dev');
  console.log('   3. Test lại: npm run test-api-key\n');
});








