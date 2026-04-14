## ✅ Kế hoạch kiểm thử hệ thống DNU Social

Tài liệu này mô tả cách kiểm thử chức năng, API và giao diện người dùng cho hệ thống DNU Social, phục vụ cho phần **Chương Kiểm thử** trong báo cáo đồ án.

---

### 1. Mục tiêu kiểm thử

- Đảm bảo các chức năng chính (đăng ký, đăng nhập, đăng bài, tương tác, nhóm, sự kiện, admin) hoạt động đúng với yêu cầu.
- Phát hiện và khắc phục lỗi logic, lỗi giao diện và lỗi tích hợp giữa frontend – backend – database.
- Kiểm chứng các ràng buộc bảo mật cơ bản (không truy cập được tài nguyên khi chưa đăng nhập/không đủ quyền).

---

### 2. Môi trường kiểm thử

- **Backend**:
  - Node.js >= 16.x
  - MongoDB >= 5.x
  - Chạy lệnh:
    - `cd backend`
    - `npm run dev` (development) hoặc `npm start` (production)

- **Frontend**:
  - React + Vite
  - Chạy lệnh:
    - `cd frontend`
    - `npm run dev`
  - Truy cập: `http://localhost:5173`

- **Database**:
  - MongoDB local, database: `dnu-social`
  - Có thể sử dụng script seed để tạo dữ liệu mẫu (xem `QUICK_START.md` / `SETUP_GUIDE.md`).

- **Công cụ hỗ trợ**:
  - Trình duyệt Chrome/Edge.
  - Postman hoặc Thunder Client (VS Code) để test API.
  - MongoDB Compass để kiểm tra dữ liệu.

---

### 3. Kiểm thử chức năng (Functional Testing)

#### 3.1. Đăng ký & đăng nhập

- **TC-01: Đăng ký tài khoản hợp lệ**
  - Bước:
    1. Mở trang `/register`.
    2. Nhập tên, email `sinhvien1@dnu.edu.vn`, mật khẩu `user123`, chọn vai trò Sinh viên, ngành học.
    3. Bấm “Đăng ký”.
  - Kỳ vọng:
    - Hệ thống tạo user mới, chuyển hướng sang trang đăng nhập hoặc tự động đăng nhập.
    - Bản ghi user xuất hiện trong collection `users`.

- **TC-02: Đăng ký với email trùng**
  - Input: đăng ký lại với email đã tồn tại.
  - Kỳ vọng: hiển thị thông báo lỗi “Email đã tồn tại” (hoặc tương đương), không tạo thêm user mới.

- **TC-03: Đăng nhập thành công**
  - Dùng tài khoản demo `admin@dnu.edu.vn` hoặc user tạo ở TC-01.
  - Kỳ vọng:
    - Đăng nhập thành công, chuyển sang `/home` (user) hoặc `/admin` (admin).
    - Token JWT được lưu trữ dưới dạng cookie hoặc localStorage (tùy cách triển khai).

- **TC-04: Đăng nhập sai mật khẩu**
  - Kỳ vọng: hiển thị thông báo lỗi, không tạo session, không sinh JWT hợp lệ.

#### 3.2. Bài viết (Posts)

- **TC-10: Tạo bài viết mới**
  - Bước:
    1. Đăng nhập với user thường.
    2. Ở trang Home, nhập nội dung bài viết, chọn danh mục “Học tập”.
    3. Bấm “Đăng”.
  - Kỳ vọng:
    - Bài viết xuất hiện trên news feed ngay sau khi đăng.
    - Collection `posts` có document mới, `author` trỏ tới `users._id` tương ứng.

- **TC-11: Like/Unlike bài viết**
  - Kỳ vọng:
    - Số like tăng/giảm đúng khi bấm like/bỏ like.
    - Mỗi user chỉ được like 1 lần cho mỗi bài viết.

- **TC-12: Bình luận bài viết**
  - Kỳ vọng:
    - Comment hiển thị ngay dưới bài viết.
    - Collection `comments` tạo document mới, liên kết đúng với `post` và `author`.

- **TC-13: Lưu bài viết (Save)**
  - Kỳ vọng:
    - Bài viết được thêm vào danh sách “bài viết đã lưu” của user.
    - Trường `savedPosts` trong `users` chứa ObjectId của bài viết đó.

#### 3.3. Nhóm học tập (Groups)

- **TC-20: Xem danh sách nhóm**
  - Kỳ vọng: hiển thị danh sách các nhóm học tập có trong hệ thống.

- **TC-21: Tham gia nhóm**
  - Kỳ vọng:
    - Sau khi tham gia, user xuất hiện trong danh sách thành viên của nhóm (MongoDB: `Group.members`).
    - Giao diện thể hiện user đã là thành viên (ví dụ: nút “Đã tham gia”).

#### 3.4. Sự kiện (Events)

- **TC-30: Xem và tham gia sự kiện**
  - Kỳ vọng:
    - Danh sách sự kiện hiển thị đúng với dữ liệu trong DB.
    - Khi đăng ký tham gia, user được thêm vào danh sách `participants` của event.

#### 3.5. Chức năng Admin

- **TC-40: Đăng nhập Admin và xem Dashboard**
  - Kỳ vọng:
    - Chỉ tài khoản `role = admin` truy cập được `/admin`.
    - Dashboard hiển thị số liệu thống kê (số user, bài viết, biểu đồ).

- **TC-41: Duyệt bài viết**
  - Kỳ vọng:
    - Trạng thái bài viết chuyển từ `pending` sang `approved`.
    - Bài viết chỉ hiển thị trên news feed khi đã được duyệt (tùy logic hệ thống).

- **TC-42: Khóa tài khoản người dùng**
  - Kỳ vọng:
    - Trường `status` trong `users` chuyển sang `banned` hoặc `inactive`.
    - User bị khóa không đăng nhập được nữa (hoặc bị hạn chế hành động tùy thiết kế).

---

### 4. Kiểm thử API (sử dụng Postman/Thunder Client)

Các API chính (tham khảo chi tiết trong `README.md`):

- **Authentication**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `PUT /api/auth/change-password`

- **Posts**:
  - `GET /api/posts`
  - `POST /api/posts`
  - `GET /api/posts/:id`
  - `PUT /api/posts/:id`
  - `DELETE /api/posts/:id`
  - `POST /api/posts/:id/like`
  - `DELETE /api/posts/:id/like`

- **Groups, Events, Admin, Notifications, Messages, Reports**:
  - Test tương tự bằng cách gửi request với token JWT hợp lệ/không hợp lệ để kiểm tra phân quyền.

**Lưu ý khi test API**:

- Thêm header `Authorization: Bearer <token>` cho các endpoint yêu cầu đăng nhập.
- Kiểm tra mã trạng thái HTTP:
  - 200/201: thành công.
  - 400: dữ liệu không hợp lệ.
  - 401: chưa đăng nhập hoặc token hết hạn.
  - 403: không đủ quyền (ví dụ user thường truy cập endpoint admin).
  - 404: không tìm thấy tài nguyên.
  - 500: lỗi server.

---

### 5. Kiểm thử giao diện (UI/UX) và Responsive

- Kiểm tra trên các kích thước màn hình:
  - Desktop (≥ 1024px).
  - Tablet (768–1023px).
  - Mobile (< 768px).

- Các trường hợp cần kiểm tra:
  - Form login/register có hiển thị lỗi khi bỏ trống trường bắt buộc hoặc nhập sai định dạng email.
  - Bố cục dashboard admin có hiển thị đẹp trên màn hình laptop (thanh sidebar, card thống kê, biểu đồ).
  - News feed scroll mượt, không bị vỡ layout khi bài viết có nhiều nội dung hoặc ảnh.

---

### 6. Kiểm thử bảo mật cơ bản

- **TC-S1: Truy cập tài nguyên khi chưa đăng nhập**
  - Gửi request đến `/api/posts` hoặc `/api/admin/...` mà không gửi token.
  - Kỳ vọng: trả về 401 hoặc 403, không trả dữ liệu nhạy cảm.

- **TC-S2: Truy cập chức năng admin với user thường**
  - Dùng token của user role `user` gọi `/api/admin/users`.
  - Kỳ vọng: bị từ chối (403).

- **TC-S3: Kiểm tra mật khẩu được hash**
  - Sau khi đăng ký, kiểm tra collection `users` trong MongoDB:
    - Trường `password` không được lưu ở dạng plain text.

---

### 7. Ghi nhận và báo cáo lỗi

- Mỗi lỗi phát hiện trong quá trình test cần ghi lại:
  - Mã test case (nếu có).
  - Môi trường (browser, OS, data test).
  - Bước thực hiện.
  - Kết quả thực tế (Actual Result).
  - Kết quả mong đợi (Expected Result).
  - Mức độ ưu tiên (Cao/Trung bình/Thấp).

- Lỗi sau khi fix cần được **re-test** và **regression test** đối với các chức năng liên quan.

---

### 8. Kết luận kiểm thử

- Sau khi thực hiện đầy đủ các test case ở trên:
  - Ghi nhận lại số lượng test case **Pass/Fail**.
  - Mô tả các lỗi còn tồn tại nhưng chấp nhận được trong phạm vi đồ án (nếu có).
  - Kết luận mức độ ổn định của hệ thống và đánh giá đáp ứng yêu cầu đề tài.

Tài liệu này có thể được sử dụng trực tiếp làm nội dung cho **Chương Kiểm thử** trong báo cáo đồ án, kết hợp với các bảng test case chi tiết (đính kèm dưới dạng phụ lục nếu cần).

