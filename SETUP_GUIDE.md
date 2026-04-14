# 📖 Hướng dẫn cài đặt chi tiết DNU Social

## Mục lục
1. [Cài đặt môi trường](#1-cài-đặt-môi-trường)
2. [Cài đặt dự án](#2-cài-đặt-dự-án)
3. [Cấu hình Database](#3-cấu-hình-database)
4. [Tạo dữ liệu mẫu](#4-tạo-dữ-liệu-mẫu)
5. [Khắc phục lỗi thường gặp](#5-khắc-phục-lỗi-thường-gặp)

## 1. Cài đặt môi trường

### 1.1. Cài đặt Node.js

**Windows:**
1. Tải Node.js từ: https://nodejs.org/
2. Chọn phiên bản LTS (Long Term Support)
3. Chạy file cài đặt và làm theo hướng dẫn
4. Kiểm tra cài đặt:
```bash
node --version
npm --version
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 1.2. Cài đặt MongoDB

**Windows:**
1. Tải MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Chạy file cài đặt
3. Chọn "Complete" installation
4. Tích chọn "Install MongoDB as a Service"
5. Khởi động MongoDB:
```bash
net start MongoDB
```

**Linux (Ubuntu/Debian):**
```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Kiểm tra MongoDB:**
```bash
mongo --version
# hoặc
mongosh --version
```

### 1.3. Cài đặt Git (nếu chưa có)

**Windows:**
- Tải từ: https://git-scm.com/download/win
- Cài đặt với các tùy chọn mặc định

**Linux:**
```bash
sudo apt-get install git
```

## 2. Cài đặt dự án

### 2.1. Clone hoặc tạo thư mục dự án

```bash
# Nếu có git repository
git clone <repository-url>
cd ThongTinHocTap-DNU

# Hoặc tạo thư mục mới và copy các file vào
mkdir ThongTinHocTap-DNU
cd ThongTinHocTap-DNU
```

### 2.2. Cài đặt dependencies

```bash
# Cài đặt root dependencies
npm install

# Cài đặt backend dependencies
cd backend
npm install
cd ..

# Cài đặt frontend dependencies
cd frontend
npm install
cd ..
```

Hoặc dùng lệnh nhanh:
```bash
npm run install-all
```

### 2.3. Cấu hình Backend

Tạo file `.env` trong thư mục `backend/`:

```bash
cd backend
cp .env.example .env
```

Mở file `.env` và chỉnh sửa:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

> **Lưu ý:** Thay đổi `JWT_SECRET` thành một chuỗi ngẫu nhiên và bảo mật khi deploy production.

## 3. Cấu hình Database

### 3.1. Kiểm tra kết nối MongoDB

```bash
# Kết nối vào MongoDB shell
mongosh

# Hoặc với phiên bản cũ
mongo

# Tạo database (tự động tạo khi insert dữ liệu)
use dnu-social

# Thoát
exit
```

### 3.2. Tạo admin user đầu tiên

Có 2 cách:

**Cách 1: Sử dụng MongoDB Shell**

```javascript
// Kết nối vào MongoDB
mongosh

// Chọn database
use dnu-social

// Tạo admin user
db.users.insertOne({
  name: "Admin DNU",
  email: "admin@dnu.edu.vn",
  password: "$2a$10$YourHashedPasswordHere", // Cần hash bằng bcrypt
  role: "admin",
  studentRole: "Giảng viên",
  major: "Quản trị hệ thống",
  avatar: "https://ui-avatars.com/api/?name=Admin+DNU&background=3b82f6&color=fff",
  status: "active",
  postsCount: 0,
  friends: [],
  groups: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Cách 2: Đăng ký qua API (Khuyến nghị)**

1. Khởi động backend:
```bash
cd backend
npm run dev
```

2. Sử dụng Postman hoặc curl để đăng ký:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin DNU",
    "email": "admin@dnu.edu.vn",
    "password": "admin123",
    "studentRole": "Giảng viên",
    "major": "Quản trị hệ thống"
  }'
```

3. Sau đó cập nhật role thành admin trong MongoDB:
```javascript
mongosh
use dnu-social
db.users.updateOne(
  { email: "admin@dnu.edu.vn" },
  { $set: { role: "admin" } }
)
```

## 4. Tạo dữ liệu mẫu

### 4.1. Script tạo dữ liệu mẫu

Tạo file `backend/scripts/seed.js`:

```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import Group from '../models/Group.model.js';
import Event from '../models/Event.model.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Group.deleteMany({});
    await Event.deleteMany({});

    // Create users
    const users = await User.create([
      {
        name: 'Admin DNU',
        email: 'admin@dnu.edu.vn',
        password: 'admin123',
        role: 'admin',
        studentRole: 'Giảng viên',
        major: 'Quản trị hệ thống'
      },
      {
        name: 'Nguyễn Văn An',
        email: 'vana@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Công nghệ thông tin'
      },
      {
        name: 'Trần Thị Bảo',
        email: 'thib@dnu.edu.vn',
        password: 'user123',
        studentRole: 'Sinh viên',
        major: 'Khoa học dữ liệu'
      }
    ]);

    console.log('Users created');

    // Create groups
    const groups = await Group.create([
      {
        name: 'CTDL & GT K17',
        description: 'Nhóm học Cấu trúc dữ liệu và giải thuật',
        avatar: '📚',
        creator: users[0]._id,
        members: [{ user: users[0]._id, role: 'admin' }]
      },
      {
        name: 'Web Development',
        description: 'Học và chia sẻ về phát triển web',
        avatar: '💻',
        creator: users[0]._id,
        members: [{ user: users[0]._id, role: 'admin' }]
      }
    ]);

    console.log('Groups created');

    // Create events
    const events = await Event.create([
      {
        title: 'Hackathon DNU 2025',
        description: 'Cuộc thi lập trình lớn nhất năm',
        date: new Date('2025-11-15'),
        location: 'Hội trường A',
        organizer: users[0]._id,
        category: 'Hackathon'
      }
    ]);

    console.log('Events created');

    // Create posts
    const posts = await Post.create([
      {
        author: users[1]._id,
        content: 'Xin chia sẻ tài liệu ôn tập môn Cấu trúc dữ liệu và giải thuật',
        category: 'Học tập',
        tags: ['CTDL', 'Ôn tập'],
        status: 'approved'
      },
      {
        author: users[2]._id,
        content: 'Có ai muốn tham gia nhóm học Machine Learning không?',
        category: 'Thảo luận',
        tags: ['ML', 'AI'],
        status: 'approved'
      }
    ]);

    console.log('Posts created');
    console.log('✅ Seed data completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
```

Chạy script:
```bash
cd backend
node scripts/seed.js
```

## 5. Khắc phục lỗi thường gặp

### 5.1. Lỗi kết nối MongoDB

**Lỗi:** `MongoServerError: connect ECONNREFUSED`

**Giải pháp:**
```bash
# Kiểm tra MongoDB có đang chạy không
# Windows
net start MongoDB

# Linux
sudo systemctl status mongod
sudo systemctl start mongod
```

### 5.2. Lỗi Port đã được sử dụng

**Lỗi:** `Error: listen EADDRINUSE: address already in use :::5000`

**Giải pháp:**
```bash
# Windows - Tìm và kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux
lsof -i :5000
kill -9 <PID>

# Hoặc thay đổi PORT trong .env
PORT=5001
```

### 5.3. Lỗi CORS

**Lỗi:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Giải pháp:** Kiểm tra file `backend/server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true
}));
```

### 5.4. Lỗi JWT

**Lỗi:** `JsonWebTokenError: invalid signature`

**Giải pháp:**
- Clear localStorage trong browser
- Đảm bảo `JWT_SECRET` trong `.env` giống nhau khi khởi động lại server

### 5.5. Lỗi Dependencies

**Lỗi:** Module not found hoặc version conflicts

**Giải pháp:**
```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install

# Hoặc dùng npm cache
npm cache clean --force
npm install
```

## 6. Chạy dự án

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Hoặc chạy cả 2 cùng lúc:**
```bash
# Từ thư mục root
npm run dev
```

### Production Mode

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Backend:**
```bash
cd backend
npm start
```

## 7. Kiểm tra hoạt động

### 7.1. Test Backend API

```bash
# Health check
curl http://localhost:5000/api/health

# Test register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@dnu.edu.vn","password":"test123"}'
```

### 7.2. Test Frontend

1. Mở browser: http://localhost:5173
2. Đăng ký tài khoản mới
3. Đăng nhập
4. Tạo bài viết
5. Test các chức năng like, comment, etc.

## 8. Tips và Best Practices

### 8.1. Development Tips

- Sử dụng MongoDB Compass để xem database trực quan
- Cài đặt extension "Thunder Client" hoặc Postman để test API
- Bật auto-save trong VS Code
- Sử dụng git để version control

### 8.2. Debugging

**Backend:**
```javascript
// Thêm console.log để debug
console.log('User:', req.user);
console.log('Body:', req.body);
```

**Frontend:**
```javascript
// Sử dụng React DevTools
// Thêm console.log
console.log('State:', state);
console.log('Props:', props);
```

### 8.3. VS Code Extensions khuyến nghị

- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- Thunder Client (API testing)
- GitLens

---

## Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra lại các bước trong hướng dẫn
2. Xem phần "Khắc phục lỗi thường gặp"
3. Tạo issue trên GitHub
4. Liên hệ qua email

**Chúc bạn thành công! 🎉**












