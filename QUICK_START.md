# ⚡ Quick Start Guide - DNU Social

Hướng dẫn khởi động nhanh dự án DNU Social trong 5 phút!

## 📋 Điều kiện tiên quyết

Đảm bảo bạn đã cài đặt:
- ✅ Node.js (>= 16.x)
- ✅ MongoDB (>= 5.x)
- ✅ npm hoặc yarn

## 🚀 Các bước thực hiện

### Bước 1: Clone và cài đặt (2 phút)

```bash
# Clone repository hoặc vào thư mục dự án
cd ThongTinHocTap-DNU

# Cài đặt tất cả dependencies
npm run install-all
```

### Bước 2: Cấu hình Backend (1 phút)

```bash
# Tạo file .env
cd backend
cp .env.example .env
```

File `.env` mặc định sẽ như sau (không cần sửa nếu dùng MongoDB local):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024
JWT_EXPIRE=7d
NODE_ENV=development
```

### Bước 3: Khởi động MongoDB (30 giây)

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# hoặc
brew services start mongodb-community
```

### Bước 4: Tạo dữ liệu mẫu (30 giây)

```bash
# Vẫn ở trong thư mục backend
node scripts/seedData.js
```

Lệnh này sẽ tạo:
- 5 users (1 admin + 4 users)
- 8 bài viết
- 4 nhóm học tập
- 3 sự kiện
- 5 comments

### Bước 5: Chạy ứng dụng (1 phút)

#### Option 1: Chạy cả Backend và Frontend cùng lúc (Khuyến nghị)

```bash
# Từ thư mục root
cd ..
npm run dev
```

#### Option 2: Chạy riêng từng phần

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

## 🎯 Truy cập ứng dụng

### Frontend
Mở trình duyệt: **http://localhost:5173**

### Đăng nhập

**Admin Account:**
- Email: `admin@dnu.edu.vn`
- Password: `admin123`
- Truy cập: Admin Dashboard tại http://localhost:5173/admin

**User Account:**
- Email: `vana@dnu.edu.vn`
- Password: `user123`
- Truy cập: User Home tại http://localhost:5173/home

### Backend API
- API Endpoint: **http://localhost:5000/api**
- Health Check: **http://localhost:5000/api/health**

## ✨ Tính năng có thể test ngay

### Với tài khoản User:
1. ✅ Xem bài viết trên news feed
2. ✅ Tạo bài viết mới
3. ✅ Thích/bỏ thích bài viết
4. ✅ Lưu bài viết
5. ✅ Lọc bài viết theo danh mục
6. ✅ Xem danh sách nhóm
7. ✅ Tham gia nhóm
8. ✅ Xem sự kiện
9. ✅ Đăng ký tham gia sự kiện

### Với tài khoản Admin:
1. ✅ Xem dashboard với biểu đồ thống kê
2. ✅ Quản lý người dùng
3. ✅ Quản lý bài viết
4. ✅ Duyệt/xóa bài viết
5. ✅ Khóa/mở khóa tài khoản
6. ✅ Xem hoạt động gần đây

### Đăng nhập cả 2 tài khoản cùng lúc:
1. Mở trình duyệt thông thường → Đăng nhập Admin
2. Mở cửa sổ ẩn danh (Incognito) → Đăng nhập User
3. Thao tác trên User → Xem thống kê trên Admin

## 🔧 Các lệnh hữu ích

```bash
# Tạo lại dữ liệu mẫu (xóa dữ liệu cũ)
cd backend
node scripts/seedData.js

# Chỉ tạo admin user
node scripts/createAdmin.js

# Kiểm tra MongoDB
mongosh
use dnu-social
db.users.find()
db.posts.find()

# Clear database
mongosh
use dnu-social
db.dropDatabase()
```

## 🐛 Khắc phục lỗi nhanh

### MongoDB không chạy
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Port đã được sử dụng
```bash
# Thay đổi port trong backend/.env
PORT=5001

# Hoặc kill process đang dùng port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Lỗi Dependencies
```bash
# Xóa và cài lại
rm -rf node_modules package-lock.json
npm install
```

### Clear cache và reset
```bash
# Clear localStorage trong browser (F12 → Application → Local Storage → Clear)
# Hoặc dùng Incognito mode

# Clear npm cache
npm cache clean --force
```

## 📚 Tài liệu chi tiết

- [README.md](README.md) - Tổng quan dự án
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Hướng dẫn cài đặt chi tiết

## 💡 Tips

1. **Sử dụng MongoDB Compass** để xem database trực quan
2. **Cài extension Thunder Client** trong VS Code để test API
3. **Bật auto-save** trong editor để không mất code
4. **Dùng React DevTools** để debug frontend

## ✅ Checklist

- [ ] Đã cài Node.js và MongoDB
- [ ] Đã clone/tải dự án
- [ ] Đã chạy `npm run install-all`
- [ ] Đã tạo file `.env`
- [ ] MongoDB đang chạy
- [ ] Đã chạy script seed data
- [ ] Backend chạy thành công (port 5000)
- [ ] Frontend chạy thành công (port 5173)
- [ ] Đăng nhập được cả Admin và User
- [ ] Test các chức năng cơ bản

## 🎉 Hoàn thành!

Nếu tất cả các bước trên đều thành công, bạn đã sẵn sàng sử dụng DNU Social!

**Chúc bạn code vui vẻ! 💻🚀**

---

Có vấn đề? Xem [SETUP_GUIDE.md](SETUP_GUIDE.md) để được hướng dẫn chi tiết hơn.












