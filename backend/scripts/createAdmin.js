import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@dnu.edu.vn' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin role');
      }
    } else {
      // Create new admin user
      const admin = await User.create({
        name: 'Admin DNU',
        email: 'admin@dnu.edu.vn',
        password: 'admin123',
        role: 'admin',
        studentRole: 'Giảng viên',
        major: 'Quản trị hệ thống',
        bio: 'Quản trị viên hệ thống DNU Social'
      });

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@dnu.edu.vn');
      console.log('🔐 Password: admin123');
    }

    // Create some regular users
    const users = [
      {
        name: 'Nguyễn Văn An',
        email: 'vana@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Công nghệ thông tin',
        studentId: 'K17CNTT001'
      },
      {
        name: 'Trần Thị Bảo',
        email: 'thib@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Khoa học dữ liệu',
        studentId: 'K18DS002'
      },
      {
        name: 'Lê Minh Cường',
        email: 'cuonglm@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Giảng viên',
        major: 'Khoa Công nghệ thông tin'
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name}`);
      } else {
        console.log(`⚠️  User already exists: ${userData.name}`);
      }
    }

    console.log('\n🎉 All done! You can now login with:');
    console.log('   Admin: admin@dnu.edu.vn / admin123');
    console.log('   User:  vana@dnu.edu.vn / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();












