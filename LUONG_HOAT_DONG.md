# 📋 TÀI LIỆU KIỂM TRA LUỒNG VÀ NGUYÊN LÝ HOẠT ĐỘNG

## 🏗️ KIẾN TRÚC TỔNG QUAN

### Cấu trúc dự án
```
DNU Social Network
├── Frontend (React + Vite)
│   ├── Pages (Login, Register, UserHome, AdminDashboard, EventsPage, ...)
│   ├── Components (NavigationBar, ProtectedRoute, ChatAI, ...)
│   ├── Store (Zustand - State Management)
│   └── Utils (API, Socket, FormatTime)
│
├── Backend (Node.js + Express)
│   ├── Controllers (Business Logic)
│   ├── Models (MongoDB Schemas)
│   ├── Routes (API Endpoints)
│   ├── Middleware (Auth, Upload, Activity)
│   └── Socket (Real-time Communication)
│
└── Database (MongoDB)
    └── Collections (Users, Posts, Groups, Events, Messages, ...)
```

---

## 🔐 LUỒNG XÁC THỰC (AUTHENTICATION)

### 1. Đăng ký (Register)
```
User → Frontend (Register.jsx)
  ↓
POST /api/auth/register
  ↓
Backend (auth.controller.js)
  ├── Validate input (express-validator)
  ├── Check email exists
  ├── Hash password (bcryptjs)
  └── Create user in MongoDB
  ↓
Generate JWT Token
  ↓
Response: { token, user }
  ↓
Frontend (authStore.js)
  ├── Save token & user to Zustand store
  ├── Persist to localStorage
  └── Redirect to /home
```

### 2. Đăng nhập (Login)
```
User → Frontend (Login.jsx)
  ↓
POST /api/auth/login
  ↓
Backend (auth.controller.js)
  ├── Find user by email
  ├── Compare password (bcryptjs)
  ├── Check user status (not banned)
  └── Generate JWT Token
  ↓
Set HTTP-only Cookie + Return token
  ↓
Frontend (authStore.js)
  ├── Save to Zustand store
  ├── Support multiple accounts
  └── Redirect based on role (admin/user)
```

### 3. Bảo vệ Routes (Protected Routes)
```
User accesses protected route
  ↓
Frontend (ProtectedRoute.jsx)
  ├── Check isAuthenticated from authStore
  └── Check user.role if requireAdmin
  ↓
If not authenticated → Redirect to /login
If admin required but not admin → Redirect to /home
  ↓
If authenticated → Render component
```

### 4. API Authentication Middleware
```
API Request → Backend
  ↓
auth.middleware.js (protect)
  ├── Extract token from:
  │   ├── Cookie (req.cookies.token)
  │   └── Authorization header (Bearer token)
  ├── Verify JWT token
  ├── Get user from database
  ├── Check user status (not banned)
  └── Attach user to req.user
  ↓
Controller receives req.user
```

---

## 📡 LUỒNG API REQUEST/RESPONSE

### Request Flow
```
Frontend Component
  ↓
api.js (Axios instance)
  ├── Request Interceptor
  │   ├── Get token from localStorage
  │   └── Add Authorization header
  ├── Proxy to /api (Vite proxy → localhost:5000)
  └── Handle FormData (remove Content-Type)
  ↓
Backend (server.js)
  ├── CORS middleware
  ├── JSON parser
  ├── Cookie parser
  └── Route handler
  ↓
Middleware (if needed)
  ├── auth.middleware.js (protect)
  ├── upload.middleware.js (multer)
  └── activity.middleware.js
  ↓
Controller
  ├── Business logic
  ├── Database operations
  └── Response
  ↓
Response Interceptor (Frontend)
  ├── Handle 401 → Clear auth & redirect
  └── Return response/error
```

### Response Format
```json
{
  "success": true/false,
  "message": "Thông báo",
  "data": { ... },
  "error": "Lỗi nếu có"
}
```

---

## 💬 LUỒNG REAL-TIME COMMUNICATION (Socket.io)

### 1. Kết nối Socket
```
Frontend (socket.js)
  ├── Get token from authStore
  └── Connect to http://localhost:5000
  ↓
Backend (socketServer.js)
  ├── Socket Authentication Middleware
  │   ├── Extract token from handshake
  │   ├── Verify JWT
  │   └── Attach user to socket
  ├── On connection:
  │   ├── Add to onlineUsers Map
  │   ├── Update user.isOnline = true
  │   ├── Join user's personal room (user:userId)
  │   └── Emit 'user:online' to all clients
```

### 2. Chat Real-time
```
User sends message
  ↓
Frontend (ChatUsers.jsx)
  ├── Create FormData (content, images, files)
  └── POST /api/messages/:conversationId
  ↓
Backend (message.controller.js)
  ├── Save message to database
  ├── Update conversation
  └── Emit via Socket.io:
      ├── emitToConversation('message:new', message)
      └── emitToUser('notification:new', notification)
  ↓
All clients in conversation room receive message
  ↓
Frontend updates UI in real-time
```

### 3. Typing Indicator
```
User types
  ↓
Frontend emits 'typing:start' event
  ↓
Backend broadcasts to conversation room
  ↓
Other users see typing indicator
  ↓
User stops typing
  ↓
Frontend emits 'typing:stop' event
```

### 4. Online Status
```
User connects → Emit 'user:online'
User disconnects → Emit 'user:offline'
All clients update online status in real-time
```

---

## 📝 LUỒNG TẠO BÀI VIẾT (Posts)

### 1. Tạo bài viết
```
User → UserHome.jsx
  ├── Fill form (content, category, images, files)
  └── Click "Đăng bài"
  ↓
POST /api/posts (FormData)
  ↓
Backend (post.controller.js)
  ├── Upload middleware (multer)
  │   ├── Save images to /uploads/images
  │   └── Save files to /uploads/files
  ├── Create Post document
  ├── Update user.postsCount
  └── Populate author info
  ↓
Response: { success, post }
  ↓
Frontend
  ├── Add post to state
  └── Refresh feed
```

### 2. Duyệt bài viết (Admin)
```
Admin → AdminDashboard.jsx
  ├── View pending posts
  └── Click "Duyệt"
  ↓
PUT /api/admin/posts/:id/approve
  ↓
Backend (admin.controller.js)
  ├── Update post.status = 'approved'
  └── Create notification for author
  ↓
Socket.io emits notification
  ↓
Author receives notification in real-time
```

### 3. Tương tác (Like, Comment, Save)
```
User clicks Like/Comment/Save
  ↓
API Request (POST/DELETE)
  ↓
Backend updates database
  ↓
Response with updated data
  ↓
Frontend updates UI optimistically
```

---

## 👥 LUỒNG NHÓM (Groups)

### 1. Tạo nhóm
```
User → UserHome.jsx (Groups tab)
  ├── Fill form (name, description, avatar, category)
  └── Click "Tạo nhóm"
  ↓
POST /api/groups
  ↓
Backend (group.controller.js)
  ├── Create Group document
  ├── Add creator as admin
  └── Add creator to members
  ↓
Response: { success, group }
  ↓
Frontend
  ├── Add to myGroups list
  └── Show success message
```

### 2. Tham gia nhóm
```
User clicks "Tham gia"
  ↓
POST /api/groups/:id/join
  ↓
Backend
  ├── Add user to members array
  ├── Create notification for group admins
  └── Emit socket event to group room
  ↓
All group members see new member in real-time
```

### 3. Đăng bài trong nhóm
```
User → GroupDetail.jsx
  ├── Fill form
  └── Click "Đăng"
  ↓
POST /api/groups/:id/posts
  ↓
Backend
  ├── Create post with groupId
  └── Emit to group room
  ↓
All group members see new post
```

---

## 📅 LUỒNG SỰ KIỆN (Events)

### 1. Tạo sự kiện
```
User → EventsPage.jsx
  ├── Fill form (title, description, date, location, image)
  └── Click "Tạo sự kiện"
  ↓
POST /api/events (FormData)
  ↓
Backend (event.controller.js)
  ├── Upload image (multer)
  ├── Create Event document
  └── Set organizer = req.user.id
  ↓
Response: { success, event }
  ↓
Frontend
  ├── Add to events list
  └── Show success message
```

### 2. Tham gia sự kiện
```
User clicks "Tham gia ngay"
  ↓
POST /api/events/:id/join
  ↓
Backend
  ├── Check maxParticipants
  ├── Add user to participants array
  └── Return updated event
  ↓
Frontend updates UI
```

### 3. Google Maps Integration
```
User clicks on location
  ↓
Frontend (EventsPage.jsx)
  ├── Encode location
  └── Open: https://www.google.com/maps/dir/?api=1&destination=<location>
  ↓
Google Maps opens in new tab with directions
```

---

## 🔔 LUỒNG THÔNG BÁO (Notifications)

### 1. Tạo thông báo
```
Action occurs (like, comment, friend request, ...)
  ↓
Backend Controller
  ├── Create Notification document
  └── Emit via Socket.io:
      emitToUser(userId, 'notification:new', notification)
  ↓
Frontend receives socket event
  ↓
Update notification bell badge
  ↓
Show notification in dropdown
```

### 2. Đánh dấu đã đọc
```
User clicks notification
  ↓
PUT /api/notifications/:id/read
  ↓
Backend updates notification.read = true
  ↓
Frontend updates UI
```

---

## 👤 LUỒNG QUẢN LÝ NGƯỜI DÙNG

### 1. Multi-Account Support
```
User logs in with Account A
  ├── Save to authStore.accounts[]
  └── Set currentAccountId = A
  ↓
User logs in with Account B (without logout)
  ├── Add to authStore.accounts[]
  └── Switch to Account B
  ↓
User can switch between accounts
  ├── AccountSwitcher component
  └── switchAccount(accountId)
```

### 2. Profile Management
```
User → UserProfile.jsx
  ├── View profile
  ├── Edit profile
  └── Upload avatar/cover
  ↓
PUT /api/users/profile
  ↓
Backend
  ├── Upload images (multer)
  ├── Update user document
  └── Return updated user
  ↓
Frontend updates authStore
```

---

## 🛡️ BẢO MẬT

### 1. Authentication
- ✅ JWT tokens với expiration
- ✅ HTTP-only cookies
- ✅ Token verification middleware
- ✅ Password hashing (bcryptjs)

### 2. Authorization
- ✅ Role-based access (admin/user)
- ✅ Resource ownership checks
- ✅ Status checks (banned users)

### 3. Input Validation
- ✅ express-validator
- ✅ File type/size validation
- ✅ XSS protection

### 4. CORS
- ✅ Configured for specific origin
- ✅ Credentials enabled

---

## 📊 DATABASE MODELS & RELATIONSHIPS

### User Model
```javascript
{
  name, email, password (hashed),
  role: 'user' | 'admin',
  status: 'active' | 'banned',
  studentRole, major, studentId,
  avatar, coverPhoto, bio,
  friends: [ObjectId],
  postsCount, friendsCount,
  isOnline, lastActive
}
```

### Post Model
```javascript
{
  author: ObjectId (ref: User),
  title, content, category,
  images: [String],
  files: [Object],
  tags: [String],
  status: 'pending' | 'approved' | 'rejected',
  likes: [ObjectId],
  comments: [ObjectId],
  saves: [ObjectId]
}
```

### Group Model
```javascript
{
  name, description, avatar, coverPhoto,
  creator: ObjectId (ref: User),
  admins: [ObjectId],
  members: [ObjectId],
  category, tags: [String],
  settings: { accessType, postPermission, ... }
}
```

### Event Model
```javascript
{
  title, description, date, location,
  organizer: ObjectId (ref: User),
  participants: [ObjectId],
  maxParticipants,
  image, category,
  status: 'upcoming' | 'ongoing' | 'completed'
}
```

### Message Model
```javascript
{
  conversation: ObjectId,
  sender: ObjectId (ref: User),
  content, images: [String], files: [Object],
  readBy: [ObjectId],
  readAt: Date
}
```

---

## 🔄 STATE MANAGEMENT (Frontend)

### Zustand Store (authStore.js)
```javascript
{
  user: User object,
  token: JWT token,
  isAuthenticated: boolean,
  accounts: [Account objects],
  currentAccountId: string,
  
  // Actions
  login(email, password),
  register(userData),
  logout(logoutAll),
  switchAccount(accountId),
  updateUser(userData),
  checkAuth()
}
```

### Persistence
- ✅ Zustand persist middleware
- ✅ localStorage storage
- ✅ Auto-restore on page load

---

## 🚀 DEPLOYMENT FLOW

### Development
```
Frontend: Vite dev server (localhost:5173)
Backend: Node.js + nodemon (localhost:5000)
Database: MongoDB (localhost:27017)
```

### Production (Expected)
```
Frontend: Build → Static files → CDN/Server
Backend: Node.js → PM2 → Server
Database: MongoDB Atlas / Server
```

---

## 📈 PERFORMANCE OPTIMIZATIONS

### Frontend
- ✅ React lazy loading
- ✅ Image optimization
- ✅ Debounced search
- ✅ Optimistic UI updates
- ✅ Memoization (useMemo, useCallback)

### Backend
- ✅ Database indexing
- ✅ Population for related data
- ✅ Pagination
- ✅ File upload limits
- ✅ Error handling

---

## 🐛 ERROR HANDLING

### Frontend
- ✅ Try-catch blocks
- ✅ Error boundaries
- ✅ User-friendly error messages
- ✅ 401 auto-redirect to login

### Backend
- ✅ Global error middleware
- ✅ Multer error handling
- ✅ Validation errors
- ✅ Database errors
- ✅ Consistent error response format

---

## 📝 TÓM TẮT LUỒNG CHÍNH

1. **Authentication**: JWT-based với multi-account support
2. **API**: RESTful với middleware protection
3. **Real-time**: Socket.io cho chat, notifications, online status
4. **File Upload**: Multer với validation
5. **State Management**: Zustand với persistence
6. **Routing**: React Router với protected routes
7. **Database**: MongoDB với Mongoose ODM

---

## ✅ CHECKLIST KIỂM TRA

### Authentication Flow
- [x] Register → Create user → Generate token
- [x] Login → Verify credentials → Generate token
- [x] Protected routes → Check token → Verify user
- [x] Logout → Clear token → Redirect

### API Flow
- [x] Request → Interceptor → Backend → Middleware → Controller
- [x] Response → Interceptor → Update UI
- [x] Error handling → User-friendly messages

### Real-time Flow
- [x] Socket connection → Authentication → Join rooms
- [x] Message sending → Save DB → Emit socket → Update UI
- [x] Notifications → Create → Emit → Show badge

### File Upload Flow
- [x] Select file → Validate → Upload → Save path → Update DB

---

**Tài liệu này mô tả toàn bộ luồng và nguyên lý hoạt động của hệ thống DNU Social Network.**



