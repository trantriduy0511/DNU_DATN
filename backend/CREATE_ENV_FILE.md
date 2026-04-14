# 📝 HƯỚNG DẪN TẠO FILE .env

## ❌ VẤN ĐỀ: Email service not configured

Nguyên nhân: File `.env` chưa được tạo hoặc chưa có đúng cấu hình.

---

## ✅ GIẢI PHÁP: Tạo file `.env`

### Bước 1: Tạo file `.env`

1. **Mở thư mục:** `backend/`
2. **Tạo file mới** tên: `.env` (chấm env, không có phần mở rộng)
3. **Copy nội dung sau vào file:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration - TÀI KHOẢN "NGƯỜI GỬI"
EMAIL_SERVICE=gmail
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

REQUIRE_EMAIL_VERIFICATION=false
GEMINI_API_KEY=your_gemini_api_key
```

4. **Lưu file**

---

### Bước 2: Kiểm tra file

**File phải:**
- ✅ Ở vị trí: `backend/.env` (không phải `backend/backend/.env`)
- ✅ Tên file: `.env` (có dấu chấm ở đầu)
- ✅ Không có phần mở rộng: `.env.txt` ❌ (sai)

---

### Bước 3: Restart Server

**QUAN TRỌNG:** Sau khi tạo/sửa `.env`, PHẢI restart server!

1. **Dừng server:** Nhấn `Ctrl+C`
2. **Chạy lại:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Kiểm tra console:**
   - ✅ `EMAIL_USER: ✅ SET (trantriduy2004ss@gmail.com)`
   - ✅ `EMAIL_PASSWORD: ✅ SET`
   - ✅ `Email service configured successfully`

---

### Bước 4: Test

```bash
cd backend
npm run debug-email
```

Hoặc test qua web:
1. Vào `/forgot-password`
2. Nhập email
3. Kiểm tra console logs

---

## 🔍 KIỂM TRA NHANH

**File `.env` có tồn tại?**
- Mở thư mục `backend/`
- Tìm file `.env` (có thể bị ẩn)

**Nếu không thấy:**
- Tạo file mới
- Đặt tên: `.env` (có dấu chấm)
- Copy nội dung ở trên

---

## ⚠️ LƯU Ý

1. **File `.env` phải ở:** `backend/.env`
2. **Không có khoảng trắng:** `EMAIL_USER = ...` ❌
3. **Đúng format:** `EMAIL_USER=...` ✅
4. **PHẢI restart server** sau khi tạo/sửa

---

**Sau khi làm đúng, lỗi sẽ biến mất! ✅**










