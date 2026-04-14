# 🚀 Hướng dẫn sử dụng nhiều tài khoản cùng lúc

## 📋 Tổng quan

Ứng dụng DNU Social hỗ trợ **NHIỀU NGƯỜI DÙNG** đăng nhập và hoạt động cùng lúc. Dưới đây là các cách để test và sử dụng.

---

## 🎯 Cách 1: Sử dụng Incognito/Private Window (KHUYẾN NGHỊ)

### **Chrome/Edge:**
```
1. Tab thường: Đăng nhập tài khoản A
2. Nhấn Ctrl + Shift + N (Windows) hoặc Cmd + Shift + N (Mac)
3. Cửa sổ ẩn danh mở ra: Đăng nhập tài khoản B
4. Mở thêm cửa sổ ẩn danh: Đăng nhập tài khoản C
```

### **Firefox:**
```
1. Tab thường: Đăng nhập tài khoản A
2. Nhấn Ctrl + Shift + P (Windows) hoặc Cmd + Shift + P (Mac)
3. Cửa sổ riêng tư mở ra: Đăng nhập tài khoản B
```

### **✅ Ưu điểm:**
- Không ảnh hưởng đến nhau
- Mỗi window có session riêng
- Dễ dàng test tương tác giữa các users
- An toàn và đúng cách nhất

---

## 🎯 Cách 2: Sử dụng Browser Profiles

### **Chrome:**
```
1. Click vào avatar góc trên phải Chrome
2. Chọn "Add" → Tạo profile mới
3. Mỗi profile = 1 tài khoản
```

### **Edge:**
```
1. Click vào avatar góc trên phải Edge
2. Chọn "Add profile"
3. Đăng nhập tài khoản khác ở profile mới
```

### **✅ Ưu điểm:**
- Lưu trữ lâu dài
- Không cần đăng nhập lại
- Dễ chuyển đổi

---

## 🎯 Cách 3: Sử dụng nhiều Browsers

```
- Chrome:   Tài khoản A (admin@dnu.edu.vn)
- Edge:     Tài khoản B (giaovien@dnu.edu.vn)
- Firefox:  Tài khoản C (sinhvien@dnu.edu.vn)
```

### **✅ Ưu điểm:**
- Độc lập hoàn toàn
- Dễ phân biệt
- Test cross-browser

---

## 🎯 Cách 4: Sử dụng tính năng Multi-Account trong App

### **Trong cùng 1 browser:**

```
1. Đăng nhập tài khoản A
2. Click avatar góc phải → "Thêm tài khoản"
3. Đăng nhập tài khoản B
4. Chuyển đổi nhanh giữa A và B
```

### **⚠️ Lưu ý:**
- Cách này KHÔNG mở được 2 tài khoản cùng lúc trên 2 tab
- Chỉ để CHUYỂN ĐỔI nhanh giữa các tài khoản
- Phù hợp khi 1 người quản lý nhiều tài khoản

---

## 📊 Test Scenarios

### **Scenario 1: Test Chat giữa 2 người**

```
🪟 Window 1 (Thường):
   - Đăng nhập: admin@dnu.edu.vn
   - Mở chat với "Sinh Viên A"

🪟 Window 2 (Incognito):
   - Đăng nhập: sinhvien@dnu.edu.vn
   - Nhận tin nhắn từ "Admin"
   - Trả lời tin nhắn
```

### **Scenario 2: Test Friend Request**

```
🪟 Window 1 (Chrome):
   - User A gửi friend request → User B

🪟 Window 2 (Edge):
   - User B nhận notification
   - User B accept/reject request
```

### **Scenario 3: Test Online Status**

```
🪟 Window 1: User A đăng nhập
   → Sidebar phải hiển thị "User A online"

🪟 Window 2: User B đăng nhập
   → Window 1 tự động refresh sau 30s
   → Hiển thị cả "User A" và "User B" online
```

### **Scenario 4: Test Admin vs User**

```
🪟 Window 1 (Admin):
   - Duyệt bài viết
   - Khóa tài khoản
   - Xem báo cáo

🪟 Window 2 (User):
   - Đăng bài (pending approval)
   - Thử đăng nhập sau khi bị khóa (fail)
```

---

## 🐛 Troubleshooting

### **Vấn đề: "Không thể đăng nhập tài khoản khác"**

**Nguyên nhân:**
- Đang mở 2 tabs trong cùng 1 window/session
- LocalStorage được share giữa các tabs

**Giải pháp:**
1. ✅ Dùng Incognito window (Ctrl + Shift + N)
2. ✅ Dùng browser profile khác
3. ✅ Dùng browser khác

### **Vấn đề: "Tab mới tự động đăng nhập tài khoản cũ"**

**Nguyên nhân:**
- Đây là hành vi bình thường của localStorage
- Tất cả tabs dùng chung storage

**Giải pháp:**
- Dùng Incognito/Private window
- KHÔNG dùng tab mới trong cùng session

### **Vấn đề: "Muốn 2 tài khoản hoạt động đồng thời"**

**Giải pháp:**
```
Tab 1 (Thường):      User A
Tab 2 (Incognito):   User B  ✅

Tab 1 (Thường):      User A  
Tab 2 (Thường):      User B  ❌ (Sẽ bị override)
```

---

## 💡 Best Practices

### **Khi phát triển/test:**

1. **Setup chuẩn:**
   ```
   - Window chính: Admin account
   - Incognito 1: Teacher account
   - Incognito 2: Student account
   ```

2. **Đặt tên window:**
   - Đổi title tab để dễ phân biệt
   - Sử dụng bookmark folders

3. **Auto-refresh:**
   - App tự động cập nhật online status mỗi 30s
   - Notifications polling mỗi 10s
   - Chat messages polling mỗi 3s

4. **Test real-time features:**
   - Xếp cửa sổ cạnh nhau (split screen)
   - Thao tác ở window 1, xem kết quả ở window 2

---

## 🔒 Security Notes

### **Session Management:**
- Mỗi session có JWT token riêng
- Token lưu trong localStorage
- Session ID gắn với user

### **Online Tracking:**
- User offline sau 5 phút không hoạt động
- Background job cleanup mỗi 1 phút
- lastActive tự động update với mỗi request

### **Multi-device Support:**
- ✅ Có thể đăng nhập trên nhiều thiết bị
- ✅ Có thể đăng nhập trên nhiều browsers
- ✅ Mỗi session độc lập

---

## 📱 Demo Accounts

```javascript
// Admin
Email: admin@dnu.edu.vn
Password: Admin@123

// Teacher
Email: giaovien@dnu.edu.vn
Password: Giaovien@123

// Student
Email: sinhvien@dnu.edu.vn
Password: Sinhvien@123
```

---

## 🎬 Quick Start

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Browser Windows:
# 1. Normal window:    localhost:5173 → Admin
# 2. Incognito 1:      localhost:5173 → Teacher
# 3. Incognito 2:      localhost:5173 → Student
```

---

## ✨ Features Tested

- [x] Multiple concurrent logins
- [x] Real-time online status
- [x] Chat between users
- [x] Friend requests
- [x] Notifications
- [x] Post interactions
- [x] Admin moderation
- [x] Session isolation

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Console log (F12)
2. Network tab (F12 → Network)
3. Application tab → Local Storage
4. Backend terminal logs

**Câu hỏi thường gặp:**
- "Tại sao không mở được 2 tài khoản trong 2 tabs?" → Dùng Incognito!
- "Làm sao test chat real-time?" → 2 windows, xếp cạnh nhau
- "Admin và User có thể cùng online?" → Có! Dùng windows khác nhau

---

**Tóm lại:** Ứng dụng HỖ TRỢ NHIỀU NGƯỜI dùng cùng lúc. Để test, dùng **Incognito Window** hoặc **Browser Profiles**! 🚀





















