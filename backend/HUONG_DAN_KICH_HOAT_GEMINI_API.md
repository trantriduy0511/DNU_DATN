# 🔧 HƯỚNG DẪN KÍCH HOẠT GEMINI API

## ✅ BẠN ĐÃ CÓ API KEY TỪ GOOGLE AI STUDIO

Bạn đã lấy API key từ: **https://aistudio.google.com/api-keys** ✅

---

## ❌ LỖI: 404 Not Found - Model không tìm thấy

**Nguyên nhân:** API key chưa được kích hoạt cho **Generative Language API** trong Google Cloud Console.

**QUAN TRỌNG:** Chỉ có API key thôi chưa đủ, bạn **PHẢI** kích hoạt API trong Google Cloud Console!

---

## ✅ GIẢI PHÁP: Kích hoạt Generative Language API

### Bước 1: Vào Google Cloud Console

1. Truy cập: **https://console.cloud.google.com/apis/library**
2. Đăng nhập bằng tài khoản Google **cùng tài khoản** dùng để tạo API key tại Google AI Studio
   - Tài khoản của bạn: `trantriduy2004ss@gmail.com`

### Bước 1.5: Chọn Project đúng (QUAN TRỌNG!)

1. Ở góc trên cùng bên trái, click vào dropdown **"Select a project"**
2. Chọn project **"Gemini API"** (project có client ID: `gen-lang-client-0186933501`)
   - Đây là project mà API key của bạn đang thuộc về
   - **PHẢI** chọn đúng project này!

### Bước 2: Tìm và kích hoạt API

1. Trong thanh tìm kiếm, gõ: **"Generative Language API"**
2. Click vào kết quả **"Generative Language API"**
3. Click nút **"ENABLE"** (Kích hoạt)
4. Đợi vài giây để API được kích hoạt

### Bước 3: Kiểm tra API đã được kích hoạt

1. Sau khi enable, bạn sẽ thấy nút **"MANAGE"** thay vì "ENABLE"
2. Có thể xem trạng thái tại: **https://console.cloud.google.com/apis/dashboard**
3. Tìm "Generative Language API" trong danh sách, trạng thái phải là **"Enabled"**

### Bước 4: Restart Server (QUAN TRỌNG!)

**SAU KHI KÍCH HOẠT API, PHẢI RESTART SERVER!**

```bash
# 1. Dừng server backend (Ctrl+C trong cửa sổ PowerShell)

# 2. Chạy lại server
cd backend
npm run dev
```

### Bước 5: Kiểm tra lại

Sau khi restart server, chạy lại script test:

```bash
cd backend
npm run verify-gemini-key
```

---

## 🔄 HOẶC: Tạo API Key mới

Nếu vẫn không hoạt động, tạo API key mới:

### Bước 1: Tạo API Key mới

1. Truy cập: **https://aistudio.google.com/api-keys** ✅ (Khuyến nghị)
   - Hoặc: **https://makersuite.google.com/app/apikey**
2. Đăng nhập bằng Google
3. Click **"Create API Key"** hoặc **"Get API Key"**
4. Copy API key mới

### Bước 2: Cập nhật file .env

1. Mở file: `backend/.env`
2. Tìm dòng: `GEMINI_API_KEY=...`
3. Thay thế bằng API key mới:
   ```env
   GEMINI_API_KEY=AIzaSy...xxxxx
   ```
4. Lưu file

### Bước 3: Restart Server

**QUAN TRỌNG:** Sau khi cập nhật, PHẢI restart server!

```bash
# Dừng server (Ctrl+C)
# Chạy lại:
npm run dev
```

---

## 🧪 TEST API KEY

Sau khi kích hoạt API hoặc tạo key mới, test lại:

```bash
cd backend
npm run verify-gemini-key
```

Hoặc test danh sách model:

```bash
npm run list-gemini-models
```

---

## ⚠️ LƯU Ý

1. **API key phải được kích hoạt:**
   - Generative Language API phải được enable trong Google Cloud Console
   - Nếu chưa enable, sẽ bị lỗi 404

2. **Quota/Limit:**
   - Free tier có giới hạn số request
   - Kiểm tra quota tại: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

3. **Billing:**
   - Một số tính năng có thể cần billing account
   - Kiểm tra tại: https://console.cloud.google.com/billing

---

## 📋 CHECKLIST

- [ ] Đã vào Google Cloud Console
- [ ] Đã tìm "Generative Language API"
- [ ] Đã click "ENABLE"
- [ ] Đã chờ API được kích hoạt
- [ ] Đã test lại bằng: `npm run verify-gemini-key`
- [ ] Đã restart server sau khi cập nhật API key

---

**Sau khi kích hoạt API, hãy restart server và test lại!** 🚀

