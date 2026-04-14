# 🔍 KIỂM TRA API KEY VÀ PROJECT

## ⚠️ VẤN ĐỀ

API đã được enable trong Google Cloud Console, nhưng vẫn lỗi 404.

**Nguyên nhân có thể:**
- API key mới thuộc project khác với "Gemini API"
- Hoặc cần enable "Generative Language API" thay vì "Gemini API"

---

## 🔍 BƯỚC 1: Kiểm tra API key thuộc project nào

1. Vào: **https://aistudio.google.com/api-keys**
2. Tìm API key: `AIzaSyAINNAntvspDHxl2R4ctMfM3HxkHXpGdb0`
3. Click vào API key đó
4. Xem thông tin:
   - **Project:** Tên project (có thể khác "Gemini API")
   - **Client ID:** ID của project

**Ghi lại tên project này!**

---

## 🔍 BƯỚC 2: Kiểm tra và enable "Generative Language API"

### Nếu API key thuộc project "Gemini API":

1. Vào: **https://console.cloud.google.com/apis/library**
2. Chọn project **"Gemini API"** (góc trên bên trái)
3. Tìm: **"Generative Language API"** (KHÔNG phải "Gemini API")
4. Click vào "Generative Language API"
5. Kiểm tra:
   - Nếu thấy nút **"ENABLE"** → Click để enable
   - Nếu thấy **"API Enabled"** với dấu tích xanh → Đã enable rồi

### Nếu API key thuộc project KHÁC:

1. Vào: **https://console.cloud.google.com/apis/library**
2. Chọn project mà API key thuộc về (tên project bạn đã ghi ở Bước 1)
3. Tìm: **"Generative Language API"**
4. Click vào "Generative Language API"
5. Click nút **"ENABLE"** nếu chưa enable

---

## 🔍 BƯỚC 3: Kiểm tra cả hai API

Có thể cần enable **CẢ HAI** API:

1. **Gemini API** - Đã enable ✅
2. **Generative Language API** - Cần kiểm tra

### Kiểm tra "Generative Language API":

1. Vào: **https://console.cloud.google.com/apis/library**
2. Chọn project đúng (project của API key)
3. Tìm: **"Generative Language API"**
4. Xem trạng thái:
   - Nếu thấy **"ENABLE"** → Click để enable
   - Nếu thấy **"API Enabled"** → Đã enable rồi

---

## 🧪 BƯỚC 4: Test lại sau khi enable

Sau khi enable "Generative Language API":

1. **Restart server:**
   ```bash
   # Dừng server (Ctrl+C)
   cd backend
   npm run dev
   ```

2. **Test lại:**
   ```bash
   cd backend
   npm run test-api-key
   ```

---

## 📋 CHECKLIST

- [ ] Đã kiểm tra API key thuộc project nào
- [ ] Đã ghi lại tên project
- [ ] Đã chọn đúng project trong Google Cloud Console
- [ ] Đã tìm "Generative Language API" (KHÔNG phải "Gemini API")
- [ ] Đã enable "Generative Language API" nếu chưa enable
- [ ] Đã restart server
- [ ] Đã test lại bằng: `npm run test-api-key`
- [ ] Kết quả: ✅ API KEY HỢP LỆ!

---

## 💡 LƯU Ý QUAN TRỌNG

- **"Gemini API"** và **"Generative Language API"** là hai API khác nhau!
- Có thể cần enable **"Generative Language API"** mới hoạt động
- API key phải thuộc cùng project với API đã enable

---

**Hãy kiểm tra và enable "Generative Language API"!** 🚀








