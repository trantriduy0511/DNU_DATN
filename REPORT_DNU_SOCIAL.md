## 🎓 Báo cáo tóm tắt đồ án: DNU Social

### 1. Giới thiệu đề tài

- **Tên đề tài**: Xây dựng mạng xã hội nhỏ cho cộng đồng sinh viên DNU chia sẻ thông tin học tập.
- **Mục tiêu**:
  - Xây dựng một hệ thống web cho phép sinh viên và giảng viên trao đổi, chia sẻ tài liệu, thông tin học tập và sự kiện.
  - Cung cấp các chức năng mạng xã hội cơ bản (đăng bài, bình luận, thích, lưu, nhóm, sự kiện) nhưng được tối ưu cho bối cảnh học tập.
  - Đảm bảo các yêu cầu về bảo mật, phân quyền, trải nghiệm người dùng và khả năng mở rộng.

### 2. Phạm vi và đối tượng sử dụng

- **Đối tượng sử dụng**:
  - Sinh viên các khoa thuộc Đại học Đà Nẵng (DNU).
  - Giảng viên, trợ giảng muốn chia sẻ tài liệu, thông báo và tổ chức hoạt động học thuật.
  - Quản trị viên hệ thống (Admin) theo dõi, quản lý và đảm bảo môi trường trao đổi lành mạnh.

- **Phạm vi chức năng**:
  - Chỉ tập trung vào chia sẻ thông tin học tập, tài liệu, nhóm học tập, sự kiện nội bộ.
  - Không xử lý thanh toán, quảng cáo hay các chức năng thương mại.

### 3. Phân tích yêu cầu

#### 3.1. Yêu cầu chức năng chính

- **Đối với User (sinh viên/giảng viên)**:
  - Đăng ký, đăng nhập, đăng xuất.
  - Quản lý hồ sơ cá nhân (profile, avatar, mô tả, ngành học).
  - Đăng bài viết (nội dung văn bản, tags, danh mục, đính kèm ảnh/tập tin).
  - Tương tác với bài viết: thích, bình luận, lưu bài, chia sẻ.
  - Tham gia nhóm học tập, xem và tham gia sự kiện.
  - Xem news feed, lọc bài viết theo danh mục, tìm kiếm theo từ khóa.

- **Đối với Admin**:
  - Đăng nhập vào trang quản trị (Admin Dashboard).
  - Xem thống kê hệ thống (số lượng người dùng, bài viết, nhóm, sự kiện, tương tác theo thời gian).
  - Quản lý người dùng: xem, khóa/mở khóa, xóa.
  - Quản lý bài viết: duyệt, từ chối, xóa nội dung vi phạm.
  - Xem lịch sử hoạt động gần đây, báo cáo (reports) từ người dùng.

#### 3.2. Yêu cầu phi chức năng

- **Hiệu năng**:
  - Hỗ trợ số lượng người dùng đồng thời ở mức trung bình (sinh viên một trường/khoa).
  - Thời gian phản hồi hợp lý (\< 1–2 giây cho các thao tác chính trong điều kiện bình thường).

- **Bảo mật**:
  - Mã hóa mật khẩu bằng bcrypt.
  - Sử dụng JWT cho xác thực, token lưu trữ an toàn.
  - Phân quyền rõ ràng giữa user thường và admin.
  - Chống một số tấn công cơ bản (XSS, CORS, validation đầu vào).

- **Khả dụng & tiện dụng**:
  - Giao diện hiện đại, thân thiện, dễ sử dụng cho sinh viên.
  - Responsive trên desktop, tablet, mobile.
  - Tài liệu hướng dẫn cài đặt và sử dụng đầy đủ.

### 4. Thiết kế kiến trúc hệ thống

#### 4.1. Kiến trúc tổng thể

- Mô hình **Client – Server**:
  - **Frontend**: React + Vite, Tailwind CSS, React Router, Zustand (quản lý trạng thái), Axios (gọi API).
  - **Backend**: Node.js + Express, chia thành các tầng `routes` → `controllers` → `models`.
  - **Database**: MongoDB (NoSQL) sử dụng Mongoose để định nghĩa schema và thao tác dữ liệu.
  - **Realtime**: Socket.io phục vụ chat/thông báo thời gian thực (khi cấu hình đầy đủ).

- Luồng cơ bản:
  1. Người dùng thao tác trên giao diện (React).
  2. Frontend gửi request HTTP đến các endpoint `/api/...` của backend.
  3. Backend xử lý logic ở tầng controller, tương tác với MongoDB qua các model Mongoose.
  4. Kết quả trả về dạng JSON để frontend hiển thị.

#### 4.2. Các module chính Backend

- `auth.routes.js` / `auth.controller.js`: đăng ký, đăng nhập, đăng xuất, lấy thông tin user hiện tại, đổi mật khẩu, xác thực email, quên mật khẩu.
- `user.routes.js` / `user.controller.js`: quản lý hồ sơ người dùng, danh sách bạn bè, trạng thái online.
- `post.routes.js` / `post.controller.js`: CRUD bài viết, like/unlike, lưu bài, tìm kiếm, lọc.
- `comment.routes.js` / `comment.controller.js`: thêm/sửa/xóa bình luận, đếm số bình luận.
- `group.routes.js` / `group.controller.js`: nhóm học tập, tham gia/rời nhóm, chia sẻ tài liệu trong nhóm.
- `event.routes.js` / `event.controller.js`: sự kiện học thuật, đăng ký tham gia.
- `admin.routes.js` / `admin.controller.js`: dashboard, thống kê, quản lý user & post, phê duyệt nội dung.
- Các module khác: `notification`, `message`, `file`, `report`, `ai` hỗ trợ thông báo, chat, upload file, báo cáo vi phạm, tính năng AI.

#### 4.3. Thiết kế CSDL (ERD mô tả)

Các collection chính:

- **User**
  - Thuộc tính: `name`, `email`, `password`, `role`, `studentRole`, `major`, `avatar`, `bio`, `friends`, `groups`, `savedPosts`, `status`, `emailVerified`, ...
  - Quan hệ:
    - 1 User – N Post (author).
    - 1 User – N Comment.
    - N–N User (bạn bè, blockedUsers).
    - N–N Group (tham gia nhóm).

- **Post**
  - Thuộc tính: `author`, `content`, `title`, `category`, `tags`, `images`, `files`, `likes`, `comments`, `status`, `group`, ...
  - Quan hệ:
    - 1 Post – N Comment.
    - N–N User (likes, savedPosts).
    - N–1 Group (bài viết thuộc nhóm).

- **Comment**
  - Thuộc tính: `author`, `post`, `content`, `createdAt`, ...
  - Quan hệ:
    - N–1 User.
    - N–1 Post.

- **Group**
  - Thuộc tính: `name`, `description`, `avatar`, `creator`, `members`, ...
  - Quan hệ:
    - 1 User (creator) – N Group.
    - N–N User (members).
    - 1 Group – N Post, N File, N Announcement.

- **Event**
  - Thuộc tính: `title`, `description`, `date`, `location`, `organizer`, `participants`, `category`, ...
  - Quan hệ:
    - 1 User (organizer) – N Event.
    - N–N User (participants).

- **Notification, Message, Report, GroupFile, SystemSettings**:
  - Hỗ trợ tính năng thông báo, chat, báo cáo nội dung, tệp nhóm, cấu hình hệ thống.

> Lược đồ ERD có thể vẽ bằng các công cụ như draw.io, Lucidchart, hoặc StarUML, trong đó các entity tương ứng với các collection trên, quan hệ thể hiện qua ObjectId tham chiếu.

### 5. Một số sơ đồ UML gợi ý

#### 5.1. Use-case tổng quan

- **Actor**:
  - `User` (sinh viên/giảng viên).
  - `Admin`.

- **Use-case chính User**:
  - Đăng ký/Đăng nhập.
  - Xem news feed.
  - Tạo bài viết / chỉnh sửa / xóa bài viết của mình.
  - Thích/Bình luận/Lưu bài viết.
  - Tham gia nhóm, rời nhóm.
  - Xem sự kiện, đăng ký tham gia.
  - Cập nhật hồ sơ cá nhân.

- **Use-case chính Admin**:
  - Đăng nhập admin.
  - Xem dashboard thống kê.
  - Quản lý người dùng (khóa/mở khóa, xóa).
  - Duyệt/xóa bài viết.
  - Xử lý báo cáo nội dung (reports).

#### 5.2. Sơ đồ trình tự (sequence) ví dụ: Đăng bài viết

1. User nhập nội dung bài viết trên giao diện React và bấm “Đăng”.
2. Frontend gọi API `POST /api/posts` kèm JWT token.
3. Middleware `auth` xác thực token, gắn thông tin user vào `req.user`.
4. `post.controller`:
   - Validate dữ liệu đầu vào.
   - Tạo document `Post` mới trong MongoDB.
   - Cập nhật `postsCount` của User.
5. Trả về JSON chứa thông tin bài viết mới.
6. Frontend cập nhật lại news feed.

### 6. Thiết kế giao diện và UX

- **Login/Register**:
  - Giao diện hiện đại, sử dụng gradient, form validation.
  - Người dùng mới dễ hiểu luồng đăng ký/đăng nhập.

- **User Home / News feed**:
  - Danh sách bài viết ở trung tâm, sidebar trái/phải hiển thị profile, quick links, nhóm, sự kiện.
  - Cho phép tạo bài nhanh, lọc theo danh mục, xem chi tiết bài.

- **Admin Dashboard**:
  - Các card thống kê tổng quan (số user, bài viết, nhóm, sự kiện).
  - Biểu đồ (Recharts) hiển thị dữ liệu theo thời gian, danh mục.
  - Bảng quản lý user, bài viết, có chức năng hành động trực tiếp (duyệt, khóa, xóa).

### 7. Bảo mật và xử lý lỗi

- **Bảo mật**:
  - Mật khẩu được hash bằng bcrypt trước khi lưu.
  - JWT được sử dụng cho cơ chế xác thực stateless, kết hợp với middleware bảo vệ route.
  - Validation dữ liệu đầu vào bằng express-validator (ở tầng controller).
  - Cấu hình CORS cho phép frontend hợp lệ truy cập API.

- **Xử lý lỗi**:
  - Sử dụng middleware xử lý lỗi chung trong `server.js` để bắt và trả về JSON thống nhất.
  - Có xử lý riêng cho lỗi upload file (multer): giới hạn dung lượng, số lượng file.
  - Log lỗi bằng `console.error` kèm ngữ cảnh để dễ debug trong giai đoạn phát triển.

### 8. Kết luận

- Hệ thống **đáp ứng đầy đủ** các chức năng cốt lõi của một mạng xã hội học tập cho sinh viên DNU:
  - Chia sẻ bài viết, tài liệu, nhóm học tập, sự kiện.
  - Tương tác giữa người dùng (like, comment, lưu bài).
  - Phân quyền và quản trị nội dung cho Admin.
- Kiến trúc backend/frontend rõ ràng, sử dụng công nghệ hiện đại, tài liệu cài đặt và sử dụng tương đối đầy đủ.
- Hệ thống có khả năng mở rộng trong tương lai với các tính năng nâng cao như upload ảnh nâng cao, chat realtime, thông báo push, xác thực email nâng cao, v.v.

Tài liệu này có thể được dùng làm **chương Tổng quan – Phân tích – Thiết kế hệ thống** trong báo cáo đồ án, kết hợp với hình vẽ UML/ERD chi tiết được vẽ bằng các công cụ chuyên dụng.

