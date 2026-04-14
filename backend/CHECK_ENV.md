# ✅ KIỂM TRA CẤU HÌNH EMAIL

## ❌ LỖI: "Email service not configured"

Lỗi này có nghĩa là server không đọc được `EMAIL_USER` hoặc `EMAIL_PASSWORD` từ file `.env`.

---

## 🔍 CÁCH KIỂM TRA

### Bước 1: Kiểm tra file `.env` có tồn tại

**File phải ở:** `backend/.env` (không phải `backend/backend/.env`)

**Kiểm tra:**
- Mở thư mục `backend/`
- Tìm file `.env` (có thể bị ẩn)
- Nếu không có, tạo file mới tên `.env`

---

### Bước 2: Kiểm tra nội dung file `.env`

**File phải có các dòng sau:**

```env
EMAIL_SERVICE=gmail
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173
```

**Lưu ý:**
- Không có khoảng trắng trước/sau dấu `=`
- Không có dấu ngoặc kép `"` quanh giá trị
- `EMAIL_PASSWORD` đã xóa khoảng trắng: `ggqxtafanoxplhwp`

---

### Bước 3: Restart Server

**QUAN TRỌNG:** Sau khi tạo/sửa `.env`, PHẢI restart server!

1. **Dừng server:**
   - Nhấn `Ctrl+C` trong terminal đang chạy server

2. **Chạy lại:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Kiểm tra console logs:**
   - ✅ `Email service configured successfully` → OK
   - ✅ `Using: trantriduy2004ss@gmail.com` → OK
   - ❌ `Email service not configured` → Kiểm tra lại `.env`

---

## 📝 TẠO FILE .env (Nếu chưa có)

1. **Tạo file mới:**
   - Trong thư mục `backend/`
   - Tạo file tên: `.env` (chấm env, không có phần mở rộng)

2. **Copy nội dung sau vào file:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

REQUIRE_EMAIL_VERIFICATION=false
GEMINI_API_KEY=your_gemini_api_key
```

3. **Lưu file**

4. **Restart server**

---

## 🧪 TEST SAU KHI CẤU HÌNH

### Cách 1: Chạy script debug
```bash
cd backend
npm run debug-email
```

### Cách 2: Test qua web
1. Vào `/forgot-password`
2. Nhập email
3. Kiểm tra console logs của server

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **File `.env` phải ở đúng vị trí:** `backend/.env`
2. **Không có khoảng trắng:** `EMAIL_USER = ...` ❌ (sai)
3. **Đúng format:** `EMAIL_USER=...` ✅ (đúng)
4. **PHẢI restart server** sau khi sửa `.env`
5. **Kiểm tra console** khi server khởi động

---

## 🔄 NẾU VẪN LỖI

1. **Kiểm tra file `.env` có đúng format không**
2. **Kiểm tra có restart server chưa**
3. **Kiểm tra console logs** khi server khởi động
4. **Chạy:** `npm run debug-email` để xem lỗi cụ thể

---

**Sau khi làm đúng các bước trên, lỗi sẽ biến mất! ✅**










