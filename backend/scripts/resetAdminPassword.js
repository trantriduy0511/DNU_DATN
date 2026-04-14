import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnu-social');
    console.log('✅ Connected to MongoDB\n');

    // Tìm admin user
    const adminEmail = process.argv[2] || 'admin@dnu.edu.vn';
    const newPassword = process.argv[3] || 'admin123';
    
    const admin = await User.findOne({ 
      $or: [
        { email: adminEmail },
        { role: 'admin' }
      ]
    });

    if (!admin) {
      console.log('❌ Không tìm thấy tài khoản admin!');
      console.log('💡 Chạy: npm run create-admin để tạo admin mới\n');
      process.exit(1);
    }

    // Set mật khẩu mới (plain text - User model sẽ tự hash trong pre-save hook)
    admin.password = newPassword;
    admin.role = 'admin'; // Đảm bảo role là admin
    admin.markModified('password'); // Đánh dấu password đã thay đổi để trigger pre-save hook
    await admin.save();

    console.log('✅ Đã reset mật khẩu admin thành công!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📧 Email: ' + admin.email);
    console.log('🔐 Mật khẩu mới: ' + newPassword);
    console.log('👤 Tên: ' + admin.name);
    console.log('═══════════════════════════════════════════\n');
    console.log('💡 Bạn có thể đăng nhập ngay bây giờ!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
};

resetAdminPassword();

