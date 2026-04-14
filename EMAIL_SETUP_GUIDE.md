# 📧 HƯỚNG DẪN CẤU HÌNH EMAIL SERVICE

## ✅ ĐÃ TRIỂN KHAI

### 1. Email Verification
- ✅ Gửi email xác thực khi đăng ký
- ✅ Verify email với token
- ✅ Resend verification email
- ✅ Check email verification khi login (optional)

### 2. Password Reset
- ✅ Forgot password flow
- ✅ Reset password với token
- ✅ Token expiration (1 giờ)
- ✅ Email confirmation sau khi reset

### 3. Email Templates
- ✅ HTML email templates đẹp mắt
- ✅ Verification email template
- ✅ Password reset email template
- ✅ Password reset success template

---

## 🔧 CẤU HÌNH EMAIL

### Bước 1: Thêm biến môi trường vào `.env`

Mở file `backend/.env` và thêm các biến sau:

#### Option 1: Gmail (Khuyến nghị cho development)

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (cho links trong email)
FRONTEND_URL=http://localhost:5173

# Optional: Yêu cầu xác thực email trước khi login
REQUIRE_EMAIL_VERIFICATION=false
```

**Lưu ý:** Với Gmail, bạn cần tạo **App Password**:
1. Vào [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification (bật nếu chưa có)
3. App passwords → Generate new app password
4. Copy password và dán vào `EMAIL_PASSWORD`

#### Option 2: Custom SMTP

```env
# Email Configuration
EMAIL_SERVICE=custom
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
REQUIRE_EMAIL_VERIFICATION=false
```

### Bước 2: Kiểm tra cấu hình

Khi khởi động server, bạn sẽ thấy:
- ✅ `Email service configured successfully` - Email đã được cấu hình
- ⚠️ `Email service not configured` - Email chưa được cấu hình (tính năng sẽ bị tắt)

---

## 📡 API ENDPOINTS

### Email Verification

#### 1. Verify Email
```
GET /api/auth/verify-email?token=<verification_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Email đã được xác thực thành công!"
}
```

#### 2. Resend Verification Email
```
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư của bạn."
}
```

### Password Reset

#### 1. Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn."
}
```

#### 2. Reset Password
```
PUT /api/auth/reset-password
Content-Type: application/json

{
  "token": "<reset_token>",
  "password": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

---

## 🔄 FLOW HOẠT ĐỘNG

### Email Verification Flow

1. **User đăng ký** → Backend tạo user với `emailVerified: false`
2. **Backend gửi email** với verification link
3. **User click link** → Frontend gọi `/api/auth/verify-email?token=...`
4. **Backend verify** → Set `emailVerified: true`
5. **User có thể login** (nếu `REQUIRE_EMAIL_VERIFICATION=true`)

### Password Reset Flow

1. **User quên mật khẩu** → Gọi `/api/auth/forgot-password`
2. **Backend tạo reset token** (expires sau 1 giờ)
3. **Backend gửi email** với reset link
4. **User click link** → Frontend hiển thị form reset password
5. **User nhập mật khẩu mới** → Gọi `/api/auth/reset-password`
6. **Backend reset password** → Gửi email xác nhận

---

## 🎨 EMAIL TEMPLATES

Các email templates đã được tạo trong `backend/utils/emailService.js`:

1. **Verification Email** - Xác thực email khi đăng ký
2. **Password Reset Email** - Đặt lại mật khẩu
3. **Password Reset Success** - Xác nhận đã reset thành công

Tất cả templates đều:
- ✅ Responsive design
- ✅ HTML đẹp mắt
- ✅ Có text fallback
- ✅ Branding DNU Social

---

## ⚙️ CẤU HÌNH NÂNG CAO

### Yêu cầu Email Verification trước khi Login

Thêm vào `.env`:
```env
REQUIRE_EMAIL_VERIFICATION=true
```

Khi bật, user phải verify email trước khi có thể login.

### Thay đổi thời gian hết hạn Token

**Email Verification Token** (24 giờ):
```javascript
// backend/models/User.model.js
this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
```

**Password Reset Token** (1 giờ):
```javascript
// backend/models/User.model.js
this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
```

---

## 🐛 TROUBLESHOOTING

### Email không được gửi

1. **Kiểm tra `.env`** - Đảm bảo `EMAIL_USER` và `EMAIL_PASSWORD` đã được set
2. **Kiểm tra App Password** - Với Gmail, phải dùng App Password, không phải mật khẩu thường
3. **Kiểm tra logs** - Xem console để biết lỗi cụ thể
4. **Test email service** - Server sẽ log khi khởi động

### Token không hợp lệ

1. **Token đã hết hạn** - Verification token hết hạn sau 24h, reset token hết hạn sau 1h
2. **Token đã được sử dụng** - Mỗi token chỉ dùng được 1 lần
3. **URL không đúng** - Đảm bảo `FRONTEND_URL` trong `.env` đúng

### Email vào Spam

- Kiểm tra SPF/DKIM records (nếu dùng custom domain)
- Thêm email vào whitelist
- Kiểm tra spam folder

---

## 📝 LƯU Ý

1. **Development:** Có thể dùng Gmail với App Password
2. **Production:** Nên dùng email service chuyên nghiệp (SendGrid, Mailgun, AWS SES)
3. **Security:** Không commit `.env` file vào git
4. **Testing:** Email sẽ không được gửi nếu không cấu hình, nhưng API vẫn hoạt động

---

## ✅ KIỂM TRA

Sau khi cấu hình, test các tính năng:

1. **Đăng ký tài khoản mới** → Kiểm tra email xác thực
2. **Click link trong email** → Verify email thành công
3. **Quên mật khẩu** → Kiểm tra email reset password
4. **Reset password** → Kiểm tra email xác nhận

---

**Tất cả tính năng email đã sẵn sàng! 🎉**










