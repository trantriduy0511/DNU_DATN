# 🚀 HƯỚNG DẪN NHANH CẤU HÌNH EMAIL

## ⚡ CẤU HÌNH NHANH (5 PHÚT)

### Bước 1: Tạo Gmail App Password

1. Vào: https://myaccount.google.com/apppasswords
2. Nếu chưa bật 2-Step Verification:
   - Vào Security → 2-Step Verification → Turn on
3. Tạo App Password:
   - Select app: **Mail**
   - Select device: **Other (Custom name)** → Nhập: `DNU Social`
   - Click **Generate**
   - Copy password (16 ký tự, ví dụ: `abcd efgh ijkl mnop`)

### Bước 2: Thêm vào `.env`

Mở file `backend/.env` và thêm:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
FRONTEND_URL=http://localhost:5173
```

**Lưu ý:** 
- Thay `your-email@gmail.com` bằng email của bạn
- Thay `abcdefghijklmnop` bằng App Password (có thể xóa khoảng trắng)

### Bước 3: Test Email

```bash
cd backend
npm run test-email
```

Nếu thấy `✅ Test email sent successfully!` → Đã cấu hình đúng!

### Bước 4: Restart Server

```bash
# Dừng server (Ctrl+C)
# Sau đó chạy lại
npm run dev
```

Kiểm tra console, bạn sẽ thấy:
- ✅ `Email service configured successfully`

---

## 🧪 TEST NHANH

Sau khi cấu hình, test bằng cách:

1. Vào trang `/forgot-password`
2. Nhập email
3. Kiểm tra email của bạn
4. Bạn sẽ nhận được mã OTP 6 chữ số

---

## ❌ NẾU VẪN LỖI

### Kiểm tra nhanh:

1. **File `.env` có tồn tại?**
   - Path: `backend/.env`
   - Nếu không có, tạo file mới

2. **Email variables đã được set?**
   - Mở `backend/.env`
   - Kiểm tra có `EMAIL_USER` và `EMAIL_PASSWORD`

3. **Đã dùng App Password?**
   - ❌ KHÔNG dùng mật khẩu thường
   - ✅ PHẢI dùng App Password (16 ký tự)

4. **Đã restart server?**
   - Sau khi sửa `.env`, PHẢI restart server

5. **Chạy test script:**
   ```bash
   cd backend
   npm run test-email
   ```

---

## 📋 VÍ DỤ FILE `.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=duyso@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop

# Frontend
FRONTEND_URL=http://localhost:5173

# AI
GEMINI_API_KEY=your_gemini_key
```

---

## 🆘 VẪN KHÔNG ĐƯỢC?

1. **Kiểm tra console logs** khi gửi email
2. **Chạy:** `npm run test-email` và xem lỗi cụ thể
3. **Kiểm tra:** Email có vào Spam không?
4. **Thử:** Email khác (Outlook, Yahoo, etc.)

---

**Sau khi cấu hình xong, hãy test lại tính năng quên mật khẩu!**










