# 🎓 DNU Social - Mạng xã hội sinh viên DNU

Mạng xã hội dành riêng cho cộng đồng sinh viên Đại học Đà Nẵng (DNU) để chia sẻ thông tin học tập, tài liệu, sự kiện và kết nối với nhau.

## ✨ Tính năng chính

### 👥 Dành cho Người dùng
- ✅ Đăng ký/Đăng nhập tài khoản
- ✅ Đăng bài viết, chia sẻ tài liệu học tập
- ✅ Thích, bình luận, chia sẻ bài viết
- ✅ Lưu bài viết yêu thích
- ✅ Tham gia nhóm học tập
- ✅ Đăng ký tham gia sự kiện
- ✅ Lọc bài viết theo danh mục
- ✅ Tìm kiếm bài viết, người dùng, nhóm

### 👨‍💼 Dành cho Admin
- ✅ Dashboard với biểu đồ thống kê
- ✅ Quản lý người dùng (xem, khóa, xóa)
- ✅ Quản lý bài viết (duyệt, xóa)
- ✅ Xem hoạt động gần đây
- ✅ Thống kê người dùng theo tháng
- ✅ Thống kê bài viết theo danh mục
- ✅ Phân quyền truy cập

## 🏗️ Cấu trúc dự án

```
ThongTinHocTap-DNU/
│
├── backend/                    # Backend Node.js + Express
│   ├── config/                 # Cấu hình database
│   │   └── db.js
│   ├── controllers/            # Controllers xử lý logic
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── comment.controller.js
│   │   ├── event.controller.js
│   │   ├── group.controller.js
│   │   ├── post.controller.js
│   │   └── user.controller.js
│   ├── middleware/             # Middleware
│   │   └── auth.middleware.js
│   ├── models/                 # MongoDB Models
│   │   ├── Comment.model.js
│   │   ├── Event.model.js
│   │   ├── Group.model.js
│   │   ├── Post.model.js
│   │   └── User.model.js
│   ├── routes/                 # API Routes
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── comment.routes.js
│   │   ├── event.routes.js
│   │   ├── group.routes.js
│   │   ├── post.routes.js
│   │   └── user.routes.js
│   ├── .env.example            # File mẫu biến môi trường
│   ├── package.json
│   └── server.js               # Entry point
│
├── frontend/                   # Frontend React + Vite
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   └── ProtectedRoute.jsx
│   │   ├── pages/              # Trang chính
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.jsx
│   │   │   ├── user/
│   │   │   │   └── UserHome.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── store/              # State management (Zustand)
│   │   │   └── authStore.js
│   │   ├── utils/              # Utility functions
│   │   │   ├── api.js
│   │   │   └── formatTime.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── package.json                # Root package.json
└── README.md
```

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống
- Node.js >= 16.x
- MongoDB >= 5.x
- npm hoặc yarn

### 1. Clone repository
```bash
git clone <repository-url>
cd ThongTinHocTap-DNU
```

### 2. Cài đặt dependencies

#### Cài đặt tất cả (Backend + Frontend)
```bash
npm run install-all
```

#### Hoặc cài đặt riêng từng phần

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend/`:

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa file `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 4. Khởi động MongoDB

Đảm bảo MongoDB đang chạy trên máy:

```bash
# Windows (nếu cài MongoDB dưới dạng service)
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# hoặc
brew services start mongodb-community
```

### 5. Chạy ứng dụng

#### Chạy cả Backend và Frontend cùng lúc
```bash
npm run dev
```

#### Hoặc chạy riêng từng phần

**Backend (Port 5000):**
```bash
cd backend
npm run dev
```

**Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

### 6. Truy cập ứng dụng

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## 👤 Tài khoản Demo

### Admin
- **Email:** admin@dnu.edu.vn
- **Password:** admin123

### User
- **Email:** user@dnu.edu.vn
- **Password:** user123

> **Lưu ý:** Bạn cần tạo các tài khoản này thủ công hoặc đăng ký mới.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/profile` - Cập nhật profile
- `PUT /api/auth/change-password` - Đổi mật khẩu

### Posts
- `GET /api/posts` - Lấy danh sách bài viết
- `POST /api/posts` - Tạo bài viết mới
- `GET /api/posts/:id` - Lấy chi tiết bài viết
- `PUT /api/posts/:id` - Cập nhật bài viết
- `DELETE /api/posts/:id` - Xóa bài viết
- `POST /api/posts/:id/like` - Thích bài viết
- `DELETE /api/posts/:id/like` - Bỏ thích bài viết

### Groups
- `GET /api/groups` - Lấy danh sách nhóm
- `POST /api/groups` - Tạo nhóm mới
- `GET /api/groups/:id` - Lấy chi tiết nhóm
- `POST /api/groups/:id/join` - Tham gia nhóm
- `POST /api/groups/:id/leave` - Rời nhóm

### Events
- `GET /api/events` - Lấy danh sách sự kiện
- `POST /api/events` - Tạo sự kiện mới
- `GET /api/events/:id` - Lấy chi tiết sự kiện
- `POST /api/events/:id/join` - Tham gia sự kiện

### Admin (Yêu cầu quyền admin)
- `GET /api/admin/statistics` - Lấy thống kê dashboard
- `GET /api/admin/users` - Quản lý người dùng
- `PUT /api/admin/users/:id/status` - Cập nhật trạng thái user
- `DELETE /api/admin/users/:id` - Xóa user
- `GET /api/admin/posts` - Quản lý bài viết
- `PUT /api/admin/posts/:id/approve` - Duyệt bài viết
- `DELETE /api/admin/posts/:id` - Xóa bài viết

## 🛠️ Công nghệ sử dụng

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM cho MongoDB
- **JWT** - Authentication
- **bcryptjs** - Mã hóa mật khẩu
- **express-validator** - Validation

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router DOM** - Routing
- **Tailwind CSS** - CSS framework
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Biểu đồ thống kê
- **Lucide React** - Icons

## 🔒 Phân quyền

### User (Người dùng)
- Xem, tạo, chỉnh sửa, xóa bài viết của mình
- Thích, bình luận, chia sẻ bài viết
- Tham gia nhóm và sự kiện
- Cập nhật profile cá nhân

### Admin (Quản trị viên)
- Tất cả quyền của User
- Xem dashboard thống kê
- Quản lý tất cả người dùng
- Duyệt/xóa bất kỳ bài viết nào
- Khóa/mở khóa tài khoản người dùng
- Xem hoạt động gần đây

## 🎨 Giao diện

### Trang đăng nhập/đăng ký
- Giao diện hiện đại với gradient màu
- Form validation
- Responsive design

### Dashboard Admin
- Thống kê tổng quan với các card
- Biểu đồ đường (Line Chart) - Người dùng mới theo tháng
- Biểu đồ cột (Bar Chart) - Bài viết trong tuần
- Biểu đồ tròn (Pie Chart) - Phân loại bài viết
- Bảng quản lý người dùng và bài viết
- Sidebar navigation

### Trang chủ User
- News feed với các bài viết
- Sidebar profile và quick links
- Tạo bài viết mới
- Lọc theo danh mục
- Tương tác (like, comment, share, save)

## 📱 Responsive Design

Ứng dụng được thiết kế responsive, hoạt động tốt trên:
- 💻 Desktop (>= 1024px)
- 📱 Tablet (768px - 1023px)
- 📱 Mobile (< 768px)

## 🔐 Bảo mật

- ✅ Mã hóa mật khẩu với bcrypt
- ✅ JWT token authentication
- ✅ Protected routes
- ✅ CORS configuration
- ✅ Input validation
- ✅ XSS protection
- ✅ HTTP-only cookies

## 🚧 Tính năng sắp tới

- [ ] Upload ảnh cho bài viết
- [ ] Real-time chat
- [ ] Notifications
- [ ] Email verification
- [ ] Forgot password
- [ ] Advanced search
- [ ] Tags autocomplete
- [ ] Share to social media
- [ ] Dark mode

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Dự án này được phát triển cho mục đích học tập tại Đại học Đà Nẵng.

## 📞 Liên hệ

Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ qua email hoặc tạo issue trên GitHub.

---

**Made with ❤️ for DNU Students**












