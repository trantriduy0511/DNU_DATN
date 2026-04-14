import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to .env file
const envPath = join(__dirname, '..', '.env');

console.log('🔍 KIỂM TRA FILE .env\n');
console.log('═'.repeat(60));

// 1. Check if file exists
console.log('\n1️⃣  Kiểm tra file .env:');
console.log(`   Path: ${envPath}`);
console.log(`   Exists: ${existsSync(envPath) ? '✅ CÓ' : '❌ KHÔNG'}`);

if (!existsSync(envPath)) {
  console.log('\n❌ File .env KHÔNG TỒN TẠI!');
  console.log('\n📝 Tạo file .env:');
  console.log('   1. Tạo file mới: backend/.env');
  console.log('   2. Thêm nội dung:');
  console.log('      EMAIL_USER=trantriduy2004ss@gmail.com');
  console.log('      EMAIL_PASSWORD=ggqxtafanoxplhwp');
  process.exit(1);
}

// 2. Read file content
console.log('\n2️⃣  Đọc nội dung file .env:');
try {
  const content = readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`   Tổng số dòng: ${lines.length}`);
  
  const emailUserLine = lines.find(line => line.startsWith('EMAIL_USER'));
  const emailPassLine = lines.find(line => line.startsWith('EMAIL_PASSWORD'));
  const geminiKeyLine = lines.find(line => line.startsWith('GEMINI_API_KEY'));
  
  if (emailUserLine) {
    console.log(`   ✅ EMAIL_USER: ${emailUserLine.trim()}`);
  } else {
    console.log(`   ❌ EMAIL_USER: KHÔNG TÌM THẤY`);
  }
  
  if (emailPassLine) {
    const passValue = emailPassLine.split('=')[1]?.trim();
    console.log(`   ✅ EMAIL_PASSWORD: ${passValue ? 'SET (' + passValue.length + ' chars)' : 'EMPTY'}`);
  } else {
    console.log(`   ❌ EMAIL_PASSWORD: KHÔNG TÌM THẤY`);
  }
  
  if (geminiKeyLine) {
    const geminiValue = geminiKeyLine.split('=')[1]?.trim();
    if (geminiValue && geminiValue !== 'your_gemini_api_key_here' && geminiValue.length > 10) {
      console.log(`   ✅ GEMINI_API_KEY: SET (${geminiValue.length} chars)`);
    } else {
      console.log(`   ⚠️  GEMINI_API_KEY: EMPTY hoặc chưa được cấu hình`);
      console.log(`      Cần thêm API key thực tế từ: https://aistudio.google.com/api-keys`);
    }
  } else {
    console.log(`   ❌ GEMINI_API_KEY: KHÔNG TÌM THẤY`);
  }
} catch (error) {
  console.error(`   ❌ Lỗi đọc file: ${error.message}`);
  process.exit(1);
}

// 3. Load with dotenv
console.log('\n3️⃣  Load với dotenv:');
dotenv.config({ path: envPath });

console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET (' + process.env.EMAIL_USER + ')' : '❌ NOT SET'}`);
console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ SET (' + process.env.EMAIL_PASSWORD.length + ' chars)' : '❌ NOT SET'}`);

const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey.trim() !== '' && geminiKey !== 'your_gemini_api_key_here' && geminiKey.length > 10) {
  console.log(`   GEMINI_API_KEY: ✅ SET (${geminiKey.length} chars)`);
} else {
  console.log(`   GEMINI_API_KEY: ❌ NOT SET hoặc chưa có giá trị thực tế`);
  console.log(`      💡 Chạy: npm run add-gemini-key`);
  console.log(`      💡 Hoặc thêm thủ công vào backend/.env`);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.log('\n❌ Biến môi trường KHÔNG được load!');
  console.log('\n💡 Có thể do:');
  console.log('   1. Format file .env sai (có khoảng trắng, dấu ngoặc kép)');
  console.log('   2. File encoding sai (phải là UTF-8)');
  console.log('   3. Có ký tự đặc biệt trong file');
  process.exit(1);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ File .env đã được cấu hình đúng!');
console.log('═'.repeat(60));



