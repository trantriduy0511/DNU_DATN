# 🔧 KHẮC PHỤC: Email không được gửi

## ❌ VẤN ĐỀ
Không có email nào được gửi đến khi yêu cầu quên mật khẩu.

---

## ✅ GIẢI PHÁP TỪNG BƯỚC

### BƯỚC 1: Chạy Script Debug

```bash
cd backend
npm run debug-email
```

Script này sẽ:
- ✅ Kiểm tra file `.env` có tồn tại không
- ✅ Kiểm tra biến môi trường EMAIL_USER và EMAIL_PASSWORD
- ✅ Test kết nối email service
- ✅ Gửi email test

**Nếu thấy lỗi, làm theo hướng dẫn trong output.**

---

### BƯỚC 2: Kiểm tra File .env

**File phải ở:** `backend/.env`

**Nội dung cần có:**

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:5173
```

**Lưu ý:**
- Thay `your-email@gmail.com` bằng email thật của bạn
- Thay `your-app-password` bằng App Password (không phải mật khẩu thường)

---

### BƯỚC 3: Lấy Gmail App Password

1. **Vào:** https://myaccount.google.com/apppasswords

2. **Bật 2-Step Verification** (nếu chưa có):
   - Vào Security → 2-Step Verification → Turn on

3. **Tạo App Password:**
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → Nhập: `DNU Social`
   - Click **Generate**
   - Copy password (16 ký tự, ví dụ: `abcd efgh ijkl mnop`)

4. **Dán vào `.env`:**
   ```env
   EMAIL_PASSWORD=abcdefghijklmnop
   ```
   (Có thể xóa khoảng trắng)

---

### BƯỚC 4: Restart Server

**QUAN TRỌNG:** Sau khi sửa `.env`, PHẢI restart server!

1. Dừng server (Ctrl+C)
2. Chạy lại:
   ```bash
   npm run dev
   ```

3. **Kiểm tra console logs:**
   - ✅ `Email service configured successfully` → OK
   - ❌ `Email service configuration error` → Kiểm tra lại `.env`

---

### BƯỚC 5: Test Gửi Email

**Cách 1: Dùng script test**
```bash
cd backend
npm run test-email
```

**Cách 2: Test qua web**
1. Vào trang `/forgot-password`
2. Nhập email
3. Kiểm tra console logs của server:
   - ✅ `📧 Sending OTP email to ...`
   - ✅ `✅ OTP email sent successfully`
   - ❌ `❌ Failed to send OTP email` → Xem lỗi cụ thể

---

## 🔍 KIỂM TRA LOGS

Khi gửi email, kiểm tra **console logs của server**:

### ✅ Thành công:
```
📧 Sending OTP email to user@example.com...
📧 Attempting to send email to user@example.com...
✅ Email sent successfully to user@example.com
   Message ID: <xxx@mail.gmail.com>
✅ OTP email sent successfully to user@example.com
```

### ❌ Lỗi - Chưa cấu hình:
```
⚠️  Email not configured. Skipping email send.
⚠️  For Gmail: Use App Password (not regular password)
```

**Giải pháp:** Thêm EMAIL_USER và EMAIL_PASSWORD vào `.env`

### ❌ Lỗi - Invalid login:
```
❌ Email service verification failed: Invalid login
💡 For Gmail, you must use App Password (not regular password)
```

**Giải pháp:** 
- Dùng App Password (không phải mật khẩu thường)
- Kiểm tra lại App Password đã copy đúng chưa

### ❌ Lỗi - Connection:
```
❌ Error sending email: ECONNECTION
Cannot connect to email server
```

**Giải pháp:**
- Kiểm tra internet
- Kiểm tra firewall
- Thử lại sau vài phút

---

## 📋 CHECKLIST

Trước khi báo lỗi, hãy kiểm tra:

- [ ] File `backend/.env` có tồn tại?
- [ ] `EMAIL_USER` đã được set trong `.env`?
- [ ] `EMAIL_PASSWORD` đã được set trong `.env`?
- [ ] Đã dùng **App Password** (không phải mật khẩu thường)?
- [ ] Đã **restart server** sau khi sửa `.env`?
- [ ] Console logs hiển thị gì khi gửi email?
- [ ] Đã kiểm tra thư mục **Spam**?

---

## 🧪 TEST NHANH

1. **Chạy debug script:**
   ```bash
   cd backend
   npm run debug-email
   ```

2. **Nếu script báo lỗi:**
   - Làm theo hướng dẫn trong output
   - Sửa `.env`
   - Chạy lại script

3. **Nếu script thành công:**
   - Kiểm tra email inbox
   - Nếu không thấy, kiểm tra Spam folder

---

## 🆘 VẪN KHÔNG ĐƯỢC?

1. **Chạy debug script và gửi output:**
   ```bash
   npm run debug-email
   ```

2. **Kiểm tra console logs khi gửi email:**
   - Copy toàn bộ logs từ console
   - Gửi cho tôi để kiểm tra

3. **Kiểm tra:**
   - Email có vào Spam không?
   - Đã thử email khác chưa?
   - Firewall/Antivirus có chặn không?

---

**Sau khi làm theo các bước trên, email sẽ được gửi thành công! 🎉**










