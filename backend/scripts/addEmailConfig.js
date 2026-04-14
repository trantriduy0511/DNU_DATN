import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

console.log('🔧 Thêm cấu hình email vào file .env\n');

// Check if file exists
if (!existsSync(envPath)) {
  console.log('❌ File .env không tồn tại. Tạo file mới...');
  const newContent = `PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

REQUIRE_EMAIL_VERIFICATION=false
GEMINI_API_KEY=
`;
  writeFileSync(envPath, newContent, 'utf-8');
  console.log('✅ Đã tạo file .env mới với cấu hình email');
  process.exit(0);
}

// Read existing file
let content = readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

// Check if EMAIL_USER and EMAIL_PASSWORD already exist
const hasEmailUser = lines.some(line => line.trim().startsWith('EMAIL_USER='));
const hasEmailPass = lines.some(line => line.trim().startsWith('EMAIL_PASSWORD='));

if (hasEmailUser && hasEmailPass) {
  console.log('✅ EMAIL_USER và EMAIL_PASSWORD đã có trong file .env');
  console.log('\nNội dung hiện tại:');
  lines.filter(line => line.includes('EMAIL_')).forEach(line => {
    if (line.includes('EMAIL_PASSWORD')) {
      console.log(`   ${line.split('=')[0]}=[HIDDEN]`);
    } else {
      console.log(`   ${line.trim()}`);
    }
  });
  process.exit(0);
}

console.log('📝 Thêm cấu hình email vào file .env...\n');

// Add email configuration
let newLines = [...lines];

// Remove empty lines at the end
while (newLines.length > 0 && !newLines[newLines.length - 1].trim()) {
  newLines.pop();
}

// Add email config if not exists
if (!hasEmailUser && !hasEmailPass) {
  // Add both if neither exists
  newLines.push('');
  newLines.push('# Email Configuration');
  newLines.push('EMAIL_SERVICE=gmail');
  newLines.push('EMAIL_USER=trantriduy2004ss@gmail.com');
  newLines.push('EMAIL_PASSWORD=ggqxtafanoxplhwp');
  console.log('✅ Đã thêm EMAIL_USER');
  console.log('✅ Đã thêm EMAIL_PASSWORD');
} else {
  // Add individually if one exists
  if (!hasEmailUser) {
    newLines.push('');
    newLines.push('# Email Configuration');
    newLines.push('EMAIL_SERVICE=gmail');
    newLines.push('EMAIL_USER=trantriduy2004ss@gmail.com');
    console.log('✅ Đã thêm EMAIL_USER');
  }
  
  if (!hasEmailPass) {
    // Find EMAIL_USER line and add after it
    const emailUserIndex = newLines.findIndex(line => line.trim().startsWith('EMAIL_USER='));
    if (emailUserIndex >= 0) {
      newLines.splice(emailUserIndex + 1, 0, 'EMAIL_PASSWORD=ggqxtafanoxplhwp');
    } else {
      // If EMAIL_USER not found, add both
      newLines.push('');
      newLines.push('# Email Configuration');
      newLines.push('EMAIL_SERVICE=gmail');
      newLines.push('EMAIL_USER=trantriduy2004ss@gmail.com');
      newLines.push('EMAIL_PASSWORD=ggqxtafanoxplhwp');
    }
    console.log('✅ Đã thêm EMAIL_PASSWORD');
  }
}

// Add other email config if needed
if (!newLines.some(line => line.trim().startsWith('FRONTEND_URL='))) {
  newLines.push('FRONTEND_URL=http://localhost:5173');
  console.log('✅ Đã thêm FRONTEND_URL');
}

// Write back to file
const newContent = newLines.join('\n');
writeFileSync(envPath, newContent, 'utf-8');

console.log('\n✅ Đã cập nhật file .env thành công!');
console.log('\n📋 Nội dung email config:');
console.log('   EMAIL_SERVICE=gmail');
console.log('   EMAIL_USER=trantriduy2004ss@gmail.com');
console.log('   EMAIL_PASSWORD=ggqxtafanoxplhwp');
console.log('   FRONTEND_URL=http://localhost:5173');
console.log('\n⚠️  VUI LÒNG RESTART SERVER để áp dụng thay đổi!');

