import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnu-social');
    console.log('✅ Connected to MongoDB\n');

    // Tìm tất cả admin
    const admins = await User.find({ role: 'admin' }).select('+password');
    
    if (admins.length === 0) {
      console.log('❌ Không tìm thấy tài khoản admin nào!\n');
      console.log('💡 Chạy: npm run create-admin để tạo admin\n');
      process.exit(1);
    }

    console.log(`✅ Tìm thấy ${admins.length} tài khoản admin:\n`);
    console.log('═══════════════════════════════════════════');
    
    for (const admin of admins) {
      console.log(`📧 Email: ${admin.email}`);
      console.log(`👤 Tên: ${admin.name}`);
      console.log(`🔑 Role: ${admin.role}`);
      console.log(`📝 Student Role: ${admin.studentRole || 'N/A'}`);
      console.log(`✅ Status: ${admin.status || 'active'}`);
      console.log(`📅 Email Verified: ${admin.emailVerified ? 'Yes' : 'No'}`);
      
      // Test mật khẩu
      const testPassword = 'admin123';
      const isMatch = await bcrypt.compare(testPassword, admin.password);
      console.log(`🔐 Test password "admin123": ${isMatch ? '✅ ĐÚNG' : '❌ SAI'}`);
      
      console.log('─────────────────────────────────────────\n');
    }
    
    console.log('═══════════════════════════════════════════\n');
    console.log('💡 Nếu mật khẩu sai, chạy: npm run reset-admin-password\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
};

checkAdmin();





