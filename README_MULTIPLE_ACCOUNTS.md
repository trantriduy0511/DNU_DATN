# 🔐 Hướng dẫn đăng nhập nhiều tài khoản cùng lúc

## ❓ Vấn đề

Bạn muốn đăng nhập nhiều tài khoản khác nhau (VD: Admin, Giáo viên, Sinh viên) để test hoặc sử dụng đồng thời.

## ✅ Giải pháp nhanh nhất

### **Cách 1: Dùng cửa sổ ẩn danh (KHUYẾN NGHỊ)** ⭐

```
1. Tab thường:           Đăng nhập Tài khoản A
2. Ctrl + Shift + N:     Đăng nhập Tài khoản B  
3. Ctrl + Shift + N:     Đăng nhập Tài khoản C
```

**Keyboard Shortcuts:**
- **Windows/Linux:** `Ctrl + Shift + N` (Chrome/Edge) hoặc `Ctrl + Shift + P` (Firefox)
- **Mac:** `Cmd + Shift + N` (Chrome/Edge) hoặc `Cmd + Shift + P` (Firefox)

### **Cách 2: Dùng nhiều Browsers**

```
Chrome:   admin@dnu.edu.vn
Edge:     giaovien@dnu.edu.vn
Firefox:  sinhvien@dnu.edu.vn
```

### **Cách 3: Dùng Browser Profiles**

```
Chrome → Settings → Profiles → Add Profile
Mỗi profile = 1 tài khoản riêng biệt
```

---

## 💡 Hướng dẫn sử dụng trong App

### **Bước 1: Click vào Avatar (góc phải trên)**

### **Bước 2: Xem hướng dẫn trong dropdown**

Bạn sẽ thấy:
```
┌─────────────────────────────────┐
│ 💡 Mở nhiều tài khoản cùng lúc  │
│ Nhấn Ctrl + Shift + N ...       │
│ [📋 Copy link đăng nhập]        │
└─────────────────────────────────┘
```

### **Bước 3: Click "Copy link đăng nhập"**

App sẽ:
1. ✅ Copy link đăng nhập vào clipboard
2. ✅ Hiển thị hướng dẫn chi tiết
3. ✅ Bạn chỉ cần paste vào cửa sổ ẩn danh

---

## 🎯 Demo Nhanh

### **Test Chat giữa 2 người:**

```bash
# Window 1 (Thường)
1. Đăng nhập: admin@dnu.edu.vn / Admin@123
2. Vào trang chủ
3. Mở chat với "Sinh viên"

# Window 2 (Incognito - Ctrl + Shift + N)
1. Đăng nhập: sinhvien@dnu.edu.vn / Sinhvien@123
2. Xem notification tin nhắn từ Admin
3. Chat reply

# Kết quả: Chat real-time giữa 2 người! ✅
```

### **Test Friend Request:**

```bash
# Window 1 (Chrome)
User A gửi friend request → User B

# Window 2 (Edge hoặc Incognito)
User B nhận notification → Accept/Reject
```

---

## ⚠️ Lưu ý quan trọng

### **❌ KHÔNG hoạt động:**

```
Tab 1 (cùng window): Tài khoản A
Tab 2 (cùng window): Tài khoản B  ← Sẽ bị override bởi A
```

**Tại sao?** Vì LocalStorage được share giữa các tabs trong cùng window.

### **✅ Hoạt động:**

```
Window 1 (Thường):    Tài khoản A
Window 2 (Incognito): Tài khoản B  ← Hoạt động tốt!
```

---

## 🚀 Quick Start với 3 tài khoản

### **Setup:**

```bash
# 1. Window Thường → Admin
http://localhost:5173
Email: admin@dnu.edu.vn
Pass:  Admin@123

# 2. Incognito 1 (Ctrl + Shift + N) → Giáo viên
http://localhost:5173
Email: giaovien@dnu.edu.vn
Pass:  Giaovien@123

# 3. Incognito 2 (Ctrl + Shift + N lần 2) → Sinh viên
http://localhost:5173
Email: sinhvien@dnu.edu.vn
Pass:  Sinhvien@123
```

### **Test Scenarios:**

✅ Admin duyệt bài → Sinh viên thấy bài được approve  
✅ Giáo viên đăng tài liệu → Sinh viên thấy trong tab "Tài liệu"  
✅ Sinh viên chat với Giáo viên → Real-time messaging  
✅ Admin ban user → User không đăng nhập được  
✅ Xem online status → 3 users cùng online  

---

## 🎨 Screenshot Hướng dẫn trong App

Khi click vào Avatar, bạn sẽ thấy:

```
┌─────────────────────────────────────────┐
│  👤 Nguyễn Văn A         ∨             │
├─────────────────────────────────────────┤
│ Tài khoản hiện tại:                    │
│ 👤 Nguyễn Văn A                        │
│    admin@dnu.edu.vn                     │
│    👑 Admin                    ✓        │
├─────────────────────────────────────────┤
│ 💡 Mở nhiều tài khoản cùng lúc:        │
│ Nhấn Ctrl + Shift + N (cửa sổ ẩn danh)│
│ và đăng nhập tài khoản khác.           │
│                                         │
│ [📋 Copy link đăng nhập để mở tab mới] │
├─────────────────────────────────────────┤
│ ➕ Thêm tài khoản                       │
│    Chuyển đổi nhanh giữa các tài khoản │
└─────────────────────────────────────────┘
```

---

## 📱 Tính năng Multi-Account trong App

### **Chức năng "Thêm tài khoản":**

- ✅ Lưu nhiều tài khoản
- ✅ Chuyển đổi nhanh (không cần logout)
- ✅ Badge hiển thị số tài khoản
- ⚠️ **KHÔNG** mở được 2 tài khoản cùng lúc trên 2 tabs

### **Khi nào dùng:**

```
Dùng "Thêm tài khoản":
- Khi BẠN quản lý nhiều account
- Muốn switch nhanh TRONG CÙNG tab
- Không cần hoạt động đồng thời

Dùng Incognito:
- Khi cần 2+ accounts HOẠT ĐỘNG CÙNG LÚC
- Test tương tác giữa users
- Chat, friend request, notifications real-time
```

---

## 🐛 Troubleshooting

### **"Tab mới vẫn đăng nhập tài khoản cũ"**

**Giải pháp:** Dùng Incognito (Ctrl + Shift + N), KHÔNG phải tab mới (Ctrl + T)

### **"Muốn test 2 người chat với nhau"**

**Giải pháp:**
1. Window thường: User A
2. Incognito: User B
3. Xếp 2 windows cạnh nhau
4. Chat ngay!

### **"Tài khoản B ghi đè tài khoản A"**

**Nguyên nhân:** Mở 2 tabs trong cùng window  
**Giải pháp:** Dùng Incognito window riêng

---

## 📞 Hỗ trợ

**Cần giúp đỡ?**
1. Kiểm tra Console (F12)
2. Xem file `MULTI_USER_GUIDE.md` để biết chi tiết
3. Test với demo accounts ở trên

**Câu hỏi thường gặp:**
- ✅ "Ứng dụng có hỗ trợ multi-user không?" → CÓ!
- ✅ "Làm sao mở nhiều tài khoản?" → Dùng Incognito!
- ✅ "Có giới hạn số người online không?" → KHÔNG!

---

**Tóm lại:**  
🔑 **Ctrl + Shift + N** là chìa khóa vàng để mở nhiều tài khoản! 🚀





















