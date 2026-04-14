# 🤖 HƯỚNG DẪN CẤU HÌNH GEMINI API KEY

## 📍 VỊ TRÍ CẤU HÌNH

**File cần sửa:** `backend/.env`

**Biến cần thêm:** `GEMINI_API_KEY`

---

## ✅ CÁCH 1: SỬ DỤNG SCRIPT TỰ ĐỘNG (KHUYẾN NGHỊ)

### Bước 1: Chạy script

```bash
cd backend
npm run add-gemini-key
```

Script sẽ:
- ✅ Tự động tạo file `.env` nếu chưa có
- ✅ Thêm `GEMINI_API_KEY` vào file `.env`
- ✅ Hiển thị hướng dẫn lấy API key

### Bước 2: Lấy Gemini API Key

1. **Truy cập:** https://aistudio.google.com/api-keys ✅ (Khuyến nghị)
   - Hoặc: https://makersuite.google.com/app/apikey
2. **Đăng nhập** bằng tài khoản Google
3. **Click "Create API Key"** hoặc **"Get API Key"**
4. **Copy API key** (dạng: `AIzaSy...xxxxx`)

### Bước 3: Cập nhật file .env

1. **Mở file:** `backend/.env`
2. **Tìm dòng:** `GEMINI_API_KEY=your_gemini_api_key_here`
3. **Thay thế bằng:** `GEMINI_API_KEY=AIzaSy...xxxxx` (API key thực tế của bạn)
4. **Lưu file**

### Bước 4: Restart Server

**QUAN TRỌNG:** Sau khi thêm API key, PHẢI restart server!

```bash
# Dừng server (Ctrl+C)
# Chạy lại:
npm run dev
```

---

## ✅ CÁCH 2: THÊM THỦ CÔNG

### Bước 1: Mở file .env

**Vị trí:** `backend/.env`

Nếu chưa có file, tạo file mới với nội dung:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

# AI Configuration - Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### Bước 2: Lấy Gemini API Key

1. Truy cập: **https://aistudio.google.com/api-keys** ✅ (Khuyến nghị)
   - Hoặc: **https://makersuite.google.com/app/apikey**
2. Đăng nhập bằng Google
3. Click **"Create API Key"**
4. Copy API key

### Bước 3: Thay thế trong file .env

Thay `your_gemini_api_key_here` bằng API key thực tế:

```env
GEMINI_API_KEY=AIzaSy...xxxxx
```

### Bước 4: Lưu và Restart Server

---

## 🔍 KIỂM TRA CẤU HÌNH

### Cách 1: Kiểm tra file .env

```bash
cd backend
npm run check-env
```

### Cách 2: Kiểm tra trong code

Khi server khởi động, kiểm tra console logs:
- ✅ Nếu thấy: `GEMINI_API_KEY: ✅ SET` → Đã cấu hình đúng
- ❌ Nếu thấy: `GEMINI_API_KEY: ❌ NOT SET` → Chưa cấu hình

### Cách 3: Test AI Chat

1. Đăng nhập vào hệ thống
2. Mở AI Chat (DNU Buddy)
3. Gửi một câu hỏi
4. Nếu AI trả lời → API key hoạt động ✅
5. Nếu báo lỗi "AI service chưa được cấu hình" → Kiểm tra lại API key ❌

---

## 📋 VÍ DỤ FILE .env HOÀN CHỈNH

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=dnu_social_secret_key_2024_change_this_in_production
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
FRONTEND_URL=http://localhost:5173

# AI Configuration - Google Gemini API
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **API Key là thông tin bảo mật:**
   - ❌ KHÔNG commit file `.env` lên Git
   - ❌ KHÔNG chia sẻ API key công khai
   - ✅ File `.env` đã có trong `.gitignore`

2. **Sau khi thêm API key:**
   - ✅ PHẢI restart server
   - ✅ Kiểm tra console logs
   - ✅ Test AI chat để xác nhận

3. **Nếu gặp lỗi:**
   - Kiểm tra API key có đúng format không
   - Kiểm tra API key còn hiệu lực không
   - Kiểm tra có quota/giới hạn không

---

## 🆘 TROUBLESHOOTING

### Lỗi: "AI service chưa được cấu hình"

**Nguyên nhân:**
- File `.env` chưa có `GEMINI_API_KEY`
- API key chưa được set hoặc sai format
- Server chưa được restart sau khi thêm API key

**Giải pháp:**
1. Kiểm tra file `backend/.env` có `GEMINI_API_KEY` không
2. Đảm bảo format đúng: `GEMINI_API_KEY=AIzaSy...` (không có khoảng trắng)
3. Restart server
4. Kiểm tra console logs

### Lỗi: "API_KEY_INVALID" hoặc "PERMISSION_DENIED"

**Nguyên nhân:**
- API key không hợp lệ
- API key đã bị thu hồi
- Tài khoản Google chưa kích hoạt Gemini API

**Giải pháp:**
1. Tạo API key mới tại: https://makersuite.google.com/app/apikey
2. Cập nhật lại trong file `.env`
3. Restart server

### Lỗi: "QUOTA_EXCEEDED"

**Nguyên nhân:**
- Đã vượt quá giới hạn sử dụng miễn phí

**Giải pháp:**
- Đợi reset quota (thường là theo ngày/tháng)
- Hoặc nâng cấp tài khoản Google Cloud

---

## 📚 TÀI LIỆU THAM KHẢO

- **Gemini API Documentation:** https://ai.google.dev/docs
- **Get API Key:** https://aistudio.google.com/api-keys ✅ (Khuyến nghị)
  - Hoặc: https://makersuite.google.com/app/apikey
- **Pricing:** https://ai.google.dev/pricing

---

**Sau khi cấu hình xong, hãy test lại tính năng AI Chat và AI Analytics!** 🚀

