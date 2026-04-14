# 📝 HƯỚNG DẪN TẠO FILE .env - BƯỚC 1

## ❌ LỖI: "Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file"

---

## ✅ BƯỚC 1: TẠO HOẶC SỬA FILE .env

### Vị trí file:
**File phải ở:** `backend/.env` (cùng thư mục với `package.json` của backend)

### Cách tạo:

1. **Mở thư mục:** `backend/`
2. **Tạo file mới** tên: `.env` (chấm env, không có phần mở rộng)
3. **Copy nội dung sau vào file:**

```env
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
```

**LƯU Ý QUAN TRỌNG:**
- ✅ Tên biến phải viết CHÍNH XÁC: `EMAIL_USER` và `EMAIL_PASSWORD` (viết hoa, gạch dưới)
- ✅ Không có khoảng trắng trước/sau dấu `=`
- ✅ `EMAIL_PASSWORD` đã xóa khoảng trắng: `ggqxtafanoxplhwp` (từ `ggqx tafa noxp lhwp`)

### File .env hoàn chỉnh (nếu muốn thêm các biến khác):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration - BẮT BUỘC
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp

FRONTEND_URL=http://localhost:5173
REQUIRE_EMAIL_VERIFICATION=false
GEMINI_API_KEY=your_gemini_api_key
```

4. **Lưu file**

---

## ✅ BƯỚC 2: LƯU FILE VÀ KHỞI ĐỘNG LẠI SERVER (BẮT BUỘC)

**QUAN TRỌNG:** File `.env` chỉ được đọc một lần khi server bắt đầu chạy!

### Cách làm:

1. **Vào terminal đang chạy Backend**
2. **Nhấn `Ctrl + C`** để dừng server
3. **Chạy lại server:**
   ```bash
   cd backend
   npm run dev
   ```

### Kiểm tra console logs:

Khi server khởi động, bạn sẽ thấy:

**✅ Nếu đã cấu hình đúng:**
```
🔍 Checking .env file configuration:
   File location: D:\ThongTinHocTap-DNU\backend\.env
   EMAIL_USER: ✅ SET (trantriduy2004ss@gmail.com)
   EMAIL_PASSWORD: ✅ SET (****)
✅ Email service configured successfully
   Using: trantriduy2004ss@gmail.com
✅ Email service ready
```

**❌ Nếu chưa cấu hình:**
```
🔍 Checking .env file configuration:
   File location: D:\ThongTinHocTap-DNU\backend\.env
   EMAIL_USER: ❌ NOT SET
   EMAIL_PASSWORD: ❌ NOT SET

⚠️  WARNING: Email configuration is missing!
   Please create backend/.env file with:
   EMAIL_USER=trantriduy2004ss@gmail.com
   EMAIL_PASSWORD=ggqxtafanoxplhwp
```

---

## ✅ BƯỚC 3: KIỂM TRA TÊN BIẾN TRONG CODE

Code đã được kiểm tra và đúng:

**File:** `backend/utils/emailService.js`

```javascript
auth: {
    user: process.env.EMAIL_USER,      // ✅ Đúng tên biến
    pass: process.env.EMAIL_PASSWORD   // ✅ Đúng tên biến
}
```

**File:** `backend/utils/emailService.js` (dòng 61)
```javascript
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    // Kiểm tra đúng tên biến
}
```

✅ **Code đã đúng, không cần sửa!**

---

## 📋 CHECKLIST

- [ ] File `backend/.env` đã được tạo
- [ ] Đã thêm `EMAIL_USER=trantriduy2004ss@gmail.com` (viết hoa, gạch dưới)
- [ ] Đã thêm `EMAIL_PASSWORD=ggqxtafanoxplhwp` (viết hoa, gạch dưới)
- [ ] Không có khoảng trắng trước/sau dấu `=`
- [ ] Đã lưu file `.env`
- [ ] Đã dừng server (Ctrl+C)
- [ ] Đã chạy lại server (`npm run dev`)
- [ ] Console hiển thị `EMAIL_USER: ✅ SET`

---

## 🧪 TEST SAU KHI CẤU HÌNH

1. **Vào trang:** `/forgot-password`
2. **Nhập email:** `trandui2004@gmail.com` (hoặc email bất kỳ)
3. **Click:** "Gửi mã xác thực"
4. **Kiểm tra console logs:**
   - ✅ `📧 Sending OTP email to ...`
   - ✅ `✅ Email sent successfully`
5. **Kiểm tra email inbox** → Sẽ nhận được mã OTP

---

## 🆘 NẾU VẪN LỖI

1. **Kiểm tra file `.env` có ở đúng vị trí không:**
   - Phải ở: `backend/.env`
   - Không phải: `backend/backend/.env`

2. **Kiểm tra tên biến có đúng không:**
   - ✅ `EMAIL_USER` (viết hoa, gạch dưới)
   - ❌ `email_user` (sai)
   - ❌ `EMAIL-USER` (sai)

3. **Kiểm tra đã restart server chưa:**
   - File `.env` chỉ được đọc khi server khởi động
   - PHẢI dừng và chạy lại server

4. **Chạy script debug:**
   ```bash
   cd backend
   npm run debug-email
   ```

---

**Sau khi làm đúng 3 bước trên, lỗi sẽ biến mất! ✅**










