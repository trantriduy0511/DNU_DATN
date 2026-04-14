# 📧 HƯỚNG DẪN CẤU HÌNH EMAIL - DNU SOCIAL

## 🎯 HIỂU RÕ VỀ SENDER VÀ RECEIVER

### Người gửi (Sender) - Tài khoản Gmail của bạn
- **Vai trò:** Tài khoản Gmail "cố định" để gửi email
- **Vị trí:** Cấu hình trong `backend/.env`
- **Yêu cầu:** 
  - Phải bật **2-Step Verification**
  - Phải tạo **App Password** (không dùng mật khẩu thường)
- **Ví dụ:** `admin.dnu@gmail.com` hoặc Gmail cá nhân của bạn

### Người nhận (Receiver) - Email của người dùng
- **Vai trò:** Email của người dùng đăng ký/đặt lại mật khẩu
- **Vị trí:** Người dùng nhập vào form trên web
- **Ví dụ:** `trantriduy2004ss@gmail.com` (email người dùng)

---

## 📋 QUY TRÌNH CẤU HÌNH

### BƯỚC 1: Chuẩn bị Gmail "Người gửi"

**Chọn một trong hai:**

**Option A: Dùng Gmail cá nhân của bạn**
- Ví dụ: `duyso@gmail.com`
- ✅ Nhanh, dễ test
- ⚠️ Không chuyên nghiệp cho production

**Option B: Tạo Gmail mới cho dự án (Khuyến nghị)**
- Ví dụ: `admin.dnu@gmail.com` hoặc `dnu.social@gmail.com`
- ✅ Chuyên nghiệp
- ✅ Dễ quản lý
- ✅ Có thể chia sẻ với team

---

### BƯỚC 2: Lấy App Password cho Gmail "Người gửi"

1. **Đăng nhập vào Gmail "Người gửi"** (ví dụ: `admin.dnu@gmail.com`)

2. **Bật 2-Step Verification:**
   - Vào: https://myaccount.google.com/security
   - Tìm "2-Step Verification" → Turn on
   - Làm theo hướng dẫn

3. **Tạo App Password:**
   - Vào: https://myaccount.google.com/apppasswords
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → Nhập: `DNU Social Backend`
   - Click **Generate**
   - **Copy password** (16 ký tự, ví dụ: `abcd efgh ijkl mnop`)

---

### BƯỚC 3: Cấu hình trong Backend

**Tạo/sửa file:** `backend/.env`

**Thêm các dòng sau:**

```env
# Email Configuration - TÀI KHOẢN "NGƯỜI GỬI"
EMAIL_SERVICE=gmail
EMAIL_USER=admin.dnu@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
FRONTEND_URL=http://localhost:5173
```

**Giải thích:**
- `EMAIL_USER`: Email "Người gửi" (Gmail của bạn)
- `EMAIL_PASSWORD`: App Password (16 ký tự, có thể xóa khoảng trắng)
- `FRONTEND_URL`: URL frontend (để tạo links trong email)

**Lưu ý:**
- Thay `admin.dnu@gmail.com` bằng email "Người gửi" của bạn
- Thay `abcdefghijklmnop` bằng App Password đã copy
- Có thể xóa khoảng trắng trong App Password

---

### BƯỚC 4: Restart Server

**QUAN TRỌNG:** Sau khi sửa `.env`, PHẢI restart server!

```bash
# Dừng server (Ctrl+C)
cd backend
npm run dev
```

**Kiểm tra console:**
- ✅ `Email service configured successfully` → OK
- ✅ `Using: admin.dnu@gmail.com` → Đã dùng đúng email
- ❌ `Email service configuration error` → Kiểm tra lại

---

### BƯỚC 5: Test Gửi Email

**Cách 1: Dùng script test**
```bash
cd backend
npm run debug-email
```

**Cách 2: Test qua web**
1. Vào trang `/forgot-password`
2. Nhập email "Người nhận" (ví dụ: `trantriduy2004ss@gmail.com`)
3. Click "Gửi mã xác thực"
4. Kiểm tra email "Người nhận" → Sẽ nhận được mã OTP

**Kiểm tra console logs:**
```
📧 Sending OTP email to trantriduy2004ss@gmail.com...
📧 Attempting to send email to trantriduy2004ss@gmail.com...
✅ Email sent successfully to trantriduy2004ss@gmail.com
✅ OTP email sent successfully to trantriduy2004ss@gmail.com
```

---

## 🔄 QUY TRÌNH HOẠT ĐỘNG

```
1. Người dùng nhập email → trantriduy2004ss@gmail.com
   ↓
2. Backend nhận request
   ↓
3. Backend dùng EMAIL_USER (admin.dnu@gmail.com) 
   + EMAIL_PASSWORD (App Password)
   ↓
4. Gửi email từ admin.dnu@gmail.com
   ↓
5. Email đến trantriduy2004ss@gmail.com (người dùng)
```

---

## ✅ CHECKLIST

Trước khi test, đảm bảo:

- [ ] Đã chọn Gmail "Người gửi" (admin.dnu@gmail.com hoặc Gmail của bạn)
- [ ] Đã bật 2-Step Verification cho Gmail "Người gửi"
- [ ] Đã tạo App Password cho Gmail "Người gửi"
- [ ] Đã thêm `EMAIL_USER` vào `backend/.env`
- [ ] Đã thêm `EMAIL_PASSWORD` vào `backend/.env`
- [ ] Đã restart server sau khi sửa `.env`
- [ ] Console hiển thị `Email service configured successfully`

---

## 🧪 VÍ DỤ CẤU HÌNH HOÀN CHỈNH

**File `backend/.env`:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Email Configuration - TÀI KHOẢN "NGƯỜI GỬI"
EMAIL_SERVICE=gmail
EMAIL_USER=admin.dnu@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop

# Frontend URL
FRONTEND_URL=http://localhost:5173

# AI
GEMINI_API_KEY=your_gemini_api_key
```

**Khi người dùng nhập:** `trantriduy2004ss@gmail.com`

**Hệ thống sẽ:**
- Dùng `admin.dnu@gmail.com` (EMAIL_USER) để gửi
- Gửi email đến `trantriduy2004ss@gmail.com` (người dùng)
- Email chứa mã OTP 6 chữ số

---

## 🆘 TROUBLESHOOTING

### Lỗi: "Email service not configured"
**Nguyên nhân:** Chưa thêm EMAIL_USER hoặc EMAIL_PASSWORD vào `.env`
**Giải pháp:** Thêm vào `backend/.env` như hướng dẫn trên

### Lỗi: "Invalid login" hoặc "EAUTH"
**Nguyên nhân:** 
- Dùng mật khẩu thường thay vì App Password
- App Password sai
**Giải pháp:** 
- Tạo lại App Password
- Copy đúng 16 ký tự
- Dán vào EMAIL_PASSWORD

### Email không đến
**Kiểm tra:**
1. Console logs có báo lỗi không?
2. Email có vào Spam không?
3. Đã restart server chưa?
4. App Password đã đúng chưa?

---

## 📝 TÓM TẮT

1. **Chuẩn bị Gmail "Người gửi"** (admin.dnu@gmail.com)
2. **Lấy App Password** cho Gmail đó
3. **Thêm vào `backend/.env`:** EMAIL_USER và EMAIL_PASSWORD
4. **Restart server**
5. **Test:** Người dùng nhập email → Nhận mã OTP

**Sau khi làm đúng các bước trên, email sẽ được gửi thành công! 🎉**










