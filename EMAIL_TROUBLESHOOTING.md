# 🔧 HƯỚNG DẪN KHẮC PHỤC LỖI EMAIL

## ❌ VẤN ĐỀ: Email không được gửi

### Bước 1: Kiểm tra cấu hình

Mở file `backend/.env` và đảm bảo có các biến sau:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:5173
```

### Bước 2: Test email service

Chạy script test:

```bash
cd backend
npm run test-email
```

Script này sẽ:
- ✅ Kiểm tra biến môi trường
- ✅ Verify email configuration
- ✅ Gửi email test

### Bước 3: Kiểm tra logs

Khi khởi động server, bạn sẽ thấy:
- ✅ `Email service configured successfully` → Email đã được cấu hình
- ❌ `Email service configuration error` → Có lỗi cấu hình

Khi gửi email, bạn sẽ thấy:
- ✅ `Email sent successfully to ...` → Email đã được gửi
- ❌ `Error sending email: ...` → Có lỗi khi gửi

---

## 🔍 CÁC LỖI THƯỜNG GẶP

### 1. "Email service not configured"

**Nguyên nhân:** Chưa set `EMAIL_USER` hoặc `EMAIL_PASSWORD` trong `.env`

**Giải pháp:**
1. Mở `backend/.env`
2. Thêm:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```
3. Restart server

### 2. "Invalid login" hoặc "EAUTH"

**Nguyên nhân:** 
- Sai email hoặc password
- Với Gmail: Đang dùng mật khẩu thường thay vì App Password

**Giải pháp cho Gmail:**
1. Vào [Google Account](https://myaccount.google.com/)
2. Security → 2-Step Verification (bật nếu chưa có)
3. App passwords → Generate new app password
4. Copy password 16 ký tự (không có khoảng trắng)
5. Dán vào `EMAIL_PASSWORD` trong `.env`

**Lưu ý:** 
- App Password có dạng: `abcd efgh ijkl mnop` (16 ký tự, có khoảng trắng)
- Khi copy vào `.env`, có thể giữ nguyên khoảng trắng hoặc xóa đều được

### 3. "ECONNECTION" hoặc "Cannot connect"

**Nguyên nhân:** 
- Không có internet
- SMTP settings sai
- Firewall chặn

**Giải pháp:**
1. Kiểm tra internet
2. Kiểm tra SMTP settings trong `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

### 4. Email vào Spam

**Giải pháp:**
- Kiểm tra thư mục Spam
- Thêm email vào whitelist
- Với production: Cấu hình SPF/DKIM records

---

## 🧪 TEST EMAIL SERVICE

### Cách 1: Dùng script test

```bash
cd backend
npm run test-email
```

### Cách 2: Test thủ công

1. Khởi động server
2. Kiểm tra console logs khi khởi động
3. Thử gửi email qua API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@gmail.com"}'
   ```

### Cách 3: Kiểm tra trong code

Mở `backend/utils/emailService.js` và xem logs:
- `✅ Email sent successfully` → Thành công
- `❌ Error sending email` → Có lỗi

---

## 📝 CẤU HÌNH GMAIL APP PASSWORD

### Bước 1: Bật 2-Step Verification

1. Vào [Google Account](https://myaccount.google.com/)
2. Security
3. 2-Step Verification → Turn on
4. Làm theo hướng dẫn

### Bước 2: Tạo App Password

1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: "Mail"
3. Select device: "Other (Custom name)" → Nhập "DNU Social"
4. Generate
5. Copy password (16 ký tự)

### Bước 3: Thêm vào .env

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

**Lưu ý:** Có thể xóa khoảng trắng:
```env
EMAIL_PASSWORD=abcdefghijklmnop
```

---

## 🔄 RESTART SERVER SAU KHI CẤU HÌNH

Sau khi thêm/sửa `.env`:

1. **Dừng server** (Ctrl+C)
2. **Khởi động lại:**
   ```bash
   npm run dev
   ```
3. **Kiểm tra logs:**
   - ✅ `Email service configured successfully`
   - ❌ `Email service configuration error` → Kiểm tra lại `.env`

---

## ✅ KIỂM TRA NHANH

1. **File `.env` có tồn tại?**
   ```bash
   ls backend/.env
   ```

2. **Email variables đã được set?**
   ```bash
   cd backend
   node -e "require('dotenv').config(); console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');"
   ```

3. **Test email service:**
   ```bash
   cd backend
   npm run test-email
   ```

---

## 🆘 VẪN KHÔNG ĐƯỢC?

1. **Kiểm tra console logs** khi gửi email
2. **Chạy test script:** `npm run test-email`
3. **Kiểm tra `.env` file** có đúng format không
4. **Thử với email khác** (Gmail khác, Outlook, etc.)
5. **Kiểm tra firewall/antivirus** có chặn không

---

**Nếu vẫn không được, hãy gửi log lỗi từ console để tôi kiểm tra!**










