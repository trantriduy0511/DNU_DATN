# BẢNG 6. KẾ HOẠCH CHI TIẾT THỰC HIỆN ĐỒ ÁN TỐT NGHIỆP

**Họ và tên sinh viên:** Trần Trí Duy  
**Mã sinh viên:** 1671020062  
**Lớp:** CNTT-1603  
**Địa chỉ:** Quang Vinh – Sầm Sơn – Thanh Hóa  
**E-mail:** trantriduy2004ss@gmail.com  
**Ngành:** Công nghệ thông tin  
**Tên đề tài:** Xây dựng mạng xã hội nhỏ cho cộng đồng DNU chia sẻ thông tin học tập  
**Giảng viên hướng dẫn:** TS. Trần Quý Nam  

---

## GIAI ĐOẠN 1: NGHIÊN CỨU VÀ XÂY DỰNG ĐỀ CƯƠNG
**Thời gian:** Tuần 1 - Tuần 8 (Dự kiến: 8 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 1.1 | Tuần 1 | Nhận đề tài, xác định phạm vi nghiên cứu | Đề tài cụ thể, mục tiêu rõ ràng | Trao đổi với giảng viên hướng dẫn |
| 1.2 | Tuần 2-3 | Thu thập tài liệu, nghiên cứu công nghệ | Tổng hợp tài liệu, chọn công nghệ phù hợp | Nghiên cứu React, Node.js, MongoDB, Socket.io, AI/NLP |
| 1.3 | Tuần 4-5 | Phân tích yêu cầu hệ thống | Danh sách yêu cầu chức năng, phi chức năng | Viết tài liệu đặc tả yêu cầu |
| 1.4 | Tuần 6-7 | Thiết kế kiến trúc hệ thống và cơ sở dữ liệu | Sơ đồ kiến trúc tổng thể, mô hình ERD, Schema MongoDB | Xây dựng diagram ERD, kiến trúc hệ thống |
| 1.5 | Tuần 8 | Viết đề cương đồ án tốt nghiệp | Đề cương hoàn chỉnh, đầy đủ các phần | Theo mẫu của khoa |

---

## GIAI ĐOẠN 2: PHÁT TRIỂN BACKEND VÀ CƠ SỞ DỮ LIỆU
**Thời gian:** Tuần 9 - Tuần 18 (Dự kiến: 10 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 2.1 | Tuần 9 | Cài đặt môi trường phát triển | Hoàn tất cài đặt React, Node.js, MongoDB | Cấu hình môi trường development |
| 2.2 | Tuần 10-11 | Xây dựng cấu trúc database và models | Schema MongoDB hoàn chỉnh cho tất cả collections | User, Post, Comment, Group, Event, Message, Notification, Friend models |
| 2.3 | Tuần 12-13 | Xây dựng API Authentication (đăng ký, đăng nhập, JWT) | Hệ thống có thể đăng nhập, đăng ký | JWT authentication, bcrypt |
| 2.4 | Tuần 14-15 | Xây dựng API Posts (CRUD, like, comment, share) | API CRUD cho bài viết và bình luận | Posts, Comments API |
| 2.5 | Tuần 16 | Xây dựng API Groups (tạo nhóm, tham gia, quản lý) | API cho Groups | Groups API với file sharing |
| 2.6 | Tuần 17 | Xây dựng API Events (tạo sự kiện, đăng ký) | API cho Events | Events API |
| 2.7 | Tuần 18 | Xây dựng API Friends (kết bạn, quản lý bạn bè) | API cho Friends | Friends API |

---

## GIAI ĐOẠN 3: PHÁT TRIỂN REAL-TIME COMMUNICATION VÀ AI CHATBOT
**Thời gian:** Tuần 19 - Tuần 22 (Dự kiến: 4 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 3.1 | Tuần 19 | Tích hợp Socket.io cho Real-time Communication | Socket.io server hoạt động | Cấu hình Socket.io server |
| 3.2 | Tuần 20 | Xây dựng API Messages và xử lý real-time chat | Real-time chat hoạt động | Messages API, Socket.io chat events |
| 3.3 | Tuần 21 | Xây dựng hệ thống thông báo real-time | Real-time notifications hoạt động | Notifications API, Socket.io notifications |
| 3.4 | Tuần 22 | Phát triển AI Chatbot với NLP | AI Chatbot hoạt động, trả lời câu hỏi | Pattern matching, rule-based AI, NLP xử lý |

---

## GIAI ĐOẠN 4: PHÁT TRIỂN CÁC API CÒN LẠI VÀ ADMIN
**Thời gian:** Tuần 23 - Tuần 25 (Dự kiến: 3 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 4.1 | Tuần 23 | Xây dựng API Upload files (ảnh, tài liệu) | API upload hoạt động | Multer, Sharp (image processing) |
| 4.2 | Tuần 24 | Xây dựng API Search (tìm kiếm bài viết, người dùng, nhóm) | API tìm kiếm hoạt động | Search API với MongoDB text search |
| 4.3 | Tuần 25 | Xây dựng API Admin (quản lý người dùng, nội dung, thống kê) | API Admin hoàn chỉnh | Admin API với dashboard statistics |

---

## GIAI ĐOẠN 5: PHÁT TRIỂN GIAO DIỆN FRONTEND - PHẦN 1
**Thời gian:** Tuần 26 - Tuần 30 (Dự kiến: 5 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 5.1 | Tuần 26 | Thiết kế wireframe và mockup giao diện | Wireframe và mockup hoàn chỉnh | Figma/Adobe XD |
| 5.2 | Tuần 27 | Phát triển giao diện React (trang đăng nhập, đăng ký) | Giao diện đăng nhập/đăng ký hoạt động | Login, Register pages với Tailwind CSS |
| 5.3 | Tuần 28 | Phát triển giao diện React (trang chủ User - news feed) | Trang chủ hiển thị bài viết | Home page với news feed |
| 5.4 | Tuần 29 | Phát triển giao diện React (quản lý bài viết, bình luận) | Hoàn thành trang đăng bài, bình luận | Post creation, comments UI |
| 5.5 | Tuần 30 | Phát triển giao diện React (trang profile người dùng) | Trang profile hoàn chỉnh | User profile page |

---

## GIAI ĐOẠN 6: PHÁT TRIỂN GIAO DIỆN FRONTEND - PHẦN 2
**Thời gian:** Tuần 31 - Tuần 34 (Dự kiến: 4 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 6.1 | Tuần 31 | Phát triển giao diện React (quản lý nhóm học tập) | Hoàn thành trang quản lý nhóm | Groups UI với file sharing |
| 6.2 | Tuần 32 | Phát triển giao diện React (quản lý sự kiện) | Hoàn thành trang quản lý sự kiện | Events UI |
| 6.3 | Tuần 33 | Phát triển giao diện React (chat real-time) | Hoàn thành trang chat | Chat UI với Socket.io-client |
| 6.4 | Tuần 34 | Phát triển giao diện React (AI Chatbot) | Hoàn thành giao diện chatbot | AI Chatbot UI |

---

## GIAI ĐOẠN 7: PHÁT TRIỂN DASHBOARD ADMIN VÀ TÍCH HỢP
**Thời gian:** Tuần 35 - Tuần 37 (Dự kiến: 3 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 7.1 | Tuần 35 | Phát triển Dashboard Admin với thống kê | Dashboard Admin hoàn chỉnh | Admin dashboard với charts, statistics |
| 7.2 | Tuần 36 | Tích hợp Backend và Frontend, kiểm thử cơ bản | Giao diện và API kết nối ổn định | End-to-end testing |
| 7.3 | Tuần 37 | Responsive design cho mobile | Giao diện responsive hoạt động tốt trên mobile | Mobile-first approach |

---

## GIAI ĐOẠN 8: KIỂM THỬ VÀ TỐI ƯU HÓA
**Thời gian:** Tuần 38 - Tuần 41 (Dự kiến: 4 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 8.1 | Tuần 38 | Kiểm thử chức năng hệ thống | Hệ thống hoạt động theo đúng yêu cầu | Functional testing cho tất cả features |
| 8.2 | Tuần 39 | Kiểm thử giao diện và trải nghiệm người dùng | Cải thiện UI/UX theo phản hồi | UI/UX improvements |
| 8.3 | Tuần 40 | Tối ưu hiệu suất hệ thống | Cải thiện tốc độ xử lý, tối ưu database | Performance optimization, indexing |
| 8.4 | Tuần 41 | Kiểm thử real-time features và AI Chatbot | Real-time và AI hoạt động ổn định | Socket.io testing, AI chatbot testing |

---

## GIAI ĐOẠN 9: VIẾT BÁO CÁO ĐỒ ÁN
**Thời gian:** Tuần 42 - Tuần 48 (Dự kiến: 7 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 9.1 | Tuần 42-43 | Viết Chương 1: Tổng quan về đề tài | Chương 1 hoàn chỉnh | Theo cấu trúc đã định |
| 9.2 | Tuần 44-45 | Viết Chương 2: Cơ sở lý thuyết và công nghệ sử dụng | Chương 2 hoàn chỉnh | Tổng quan công nghệ, lý thuyết |
| 9.3 | Tuần 46 | Viết Chương 3: Phân tích và thiết kế hệ thống | Chương 3 hoàn chỉnh | ERD, kiến trúc, thiết kế |
| 9.4 | Tuần 47 | Viết Chương 4: Triển khai hệ thống | Chương 4 hoàn chỉnh | Code, screenshots, hướng dẫn |
| 9.5 | Tuần 48 | Viết Chương 5: Đánh giá và hướng phát triển | Chương 5 hoàn chỉnh | Đánh giá, hạn chế, hướng phát triển |

---

## GIAI ĐOẠN 10: CHUẨN BỊ VÀ BẢO VỆ
**Thời gian:** Tuần 49 - Tuần 50 (Dự kiến: 2 tuần)

| STT | Thời gian (dự kiến) | Nội dung thực hiện | Kết quả thực hiện | Ghi chú |
|-----|---------------------|-------------------|-------------------|---------|
| 10.1 | Tuần 49 | Chỉnh sửa báo cáo theo góp ý, chuẩn bị bài thuyết trình | Báo cáo hoàn thiện, slide thuyết trình | PowerPoint/Canva, demo hệ thống |
| 10.2 | Tuần 50 | Bảo vệ đồ án tốt nghiệp | Hoàn thành bảo vệ | Theo lịch của khoa |

---

## TỔNG KẾT

| Giai đoạn | Nội dung chính | Thời gian (tuần) | Tổng thời gian |
|-----------|----------------|------------------|----------------|
| Giai đoạn 1 | Nghiên cứu và xây dựng đề cương | 8 tuần | 8 tuần |
| Giai đoạn 2 | Phát triển Backend và cơ sở dữ liệu | 10 tuần | 18 tuần |
| Giai đoạn 3 | Real-time Communication và AI Chatbot | 4 tuần | 22 tuần |
| Giai đoạn 4 | Các API còn lại và Admin | 3 tuần | 25 tuần |
| Giai đoạn 5 | Phát triển giao diện Frontend - Phần 1 | 5 tuần | 30 tuần |
| Giai đoạn 6 | Phát triển giao diện Frontend - Phần 2 | 4 tuần | 34 tuần |
| Giai đoạn 7 | Dashboard Admin và tích hợp | 3 tuần | 37 tuần |
| Giai đoạn 8 | Kiểm thử và tối ưu hóa | 4 tuần | 41 tuần |
| Giai đoạn 9 | Viết báo cáo đồ án | 7 tuần | 48 tuần |
| Giai đoạn 10 | Chuẩn bị và bảo vệ | 2 tuần | 50 tuần |

**Tổng thời gian dự kiến:** 50 tuần (khoảng 12-13 tháng)

---

## CÁC MỐC QUAN TRỌNG

| Mốc thời gian | Sự kiện | Ghi chú |
|---------------|---------|---------|
| Cuối Tuần 8 | Nộp đề cương | Deadline nộp đề cương |
| Cuối Tuần 25 | Hoàn thành Backend | Tất cả API hoàn chỉnh |
| Cuối Tuần 37 | Hoàn thành Frontend | Tất cả giao diện hoàn chỉnh |
| Cuối Tuần 41 | Hoàn thành kiểm thử | Hệ thống sẵn sàng |
| Cuối Tuần 48 | Nộp báo cáo | Deadline nộp báo cáo |
| Cuối Tuần 50 | Bảo vệ đồ án | Theo lịch của khoa |

---

## GHI CHÚ

1. **Thời gian dự kiến:** Các mốc thời gian trên là dự kiến, có thể điều chỉnh theo tiến độ thực tế và góp ý của giảng viên hướng dẫn.

2. **Công nghệ sử dụng:**
   - Frontend: React 18, Vite, Tailwind CSS, Zustand, Socket.io-client
   - Backend: Node.js, Express.js, MongoDB (Mongoose), Socket.io
   - Authentication: JWT, bcryptjs
   - File Upload: Multer, Sharp
   - AI/NLP: Xử lý ngôn ngữ tự nhiên cho chatbot

3. **Các chức năng chính cần phát triển:**
   - Authentication và Authorization
   - Quản lý bài viết (Posts)
   - Quản lý nhóm học tập (Groups)
   - Quản lý sự kiện (Events)
   - Chat real-time
   - Thông báo real-time
   - Kết bạn (Friends)
   - Tìm kiếm (Search)
   - Upload files
   - AI Chatbot
   - Dashboard Admin

4. **Phương pháp làm việc:**
   - Làm việc song song giữa Backend và Frontend khi có thể
   - Kiểm thử liên tục trong quá trình phát triển
   - Thường xuyên trao đổi với giảng viên hướng dẫn
   - Sử dụng Git để quản lý phiên bản code


