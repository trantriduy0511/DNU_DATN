# 🔧 HƯỚNG DẪN KÍCH HOẠT GEMINI API - CHI TIẾT

## ✅ BẠN ĐÃ CÓ API KEY TỪ GOOGLE AI STUDIO

Bạn đã lấy API key từ: **https://aistudio.google.com/api-keys** ✅

API key của bạn: `AIzaSyDkGpTbEbfo-DRby_Gky17tKHXyEzEf50w`

---

## ⚠️ VẤN ĐỀ: Lỗi 404 Not Found

**Nguyên nhân:** API key chưa được kích hoạt cho **Generative Language API** trong Google Cloud Console.

---

## 🚀 GIẢI PHÁP: Kích hoạt Generative Language API

### Bước 1: Vào Google Cloud Console

1. Truy cập: **https://console.cloud.google.com/apis/library**
2. Đăng nhập bằng tài khoản Google **cùng tài khoản** dùng để tạo API key tại Google AI Studio
   - Tài khoản của bạn: `trantriduy2004ss@gmail.com`

### Bước 2: Chọn Project đúng

1. Ở góc trên cùng bên trái, click vào dropdown **"Select a project"**
2. Chọn project **"Gemini API"** (project có client ID: `gen-lang-client-0186933501`)
   - Đây là project mà API key của bạn đang thuộc về

### Bước 3: Tìm và kích hoạt API

1. Trong thanh tìm kiếm ở đầu trang, gõ: **"Generative Language API"**
2. Click vào kết quả **"Generative Language API"** (có icon màu xanh)
3. Trên trang chi tiết, click nút **"ENABLE"** (Kích hoạt) màu xanh
4. Đợi vài giây để API được kích hoạt (sẽ hiển thị "API enabled")

### Bước 4: Kiểm tra API đã được kích hoạt

1. Sau khi enable, bạn sẽ thấy nút **"MANAGE"** thay vì "ENABLE"
2. Có thể xem trạng thái tại: **https://console.cloud.google.com/apis/dashboard**
3. Tìm "Generative Language API" trong danh sách, trạng thái phải là **"Enabled"**

---

## 🧪 TEST LẠI SAU KHI KÍCH HOẠT

Sau khi kích hoạt API, **PHẢI RESTART SERVER** và test lại:

```bash
# 1. Dừng server backend (Ctrl+C trong cửa sổ PowerShell)

# 2. Chạy lại server
cd backend
npm run dev

# 3. Test API key (trong cửa sổ PowerShell khác)
cd backend
npm run verify-gemini-key
```

**Kết quả mong đợi:**
```
✅ Model "gemini-1.5-flash": HOẠT ĐỘNG
✅ API KEY HỢP LỆ!
```

---

## 🔍 KIỂM TRA NHANH

### Cách 1: Kiểm tra trong Google Cloud Console

1. Vào: **https://console.cloud.google.com/apis/dashboard**
2. Chọn project **"Gemini API"**
3. Tìm **"Generative Language API"** trong danh sách
4. Trạng thái phải là **"Enabled"** (màu xanh)

### Cách 2: Kiểm tra trong Google AI Studio

1. Vào: **https://aistudio.google.com/api-keys**
2. Click vào API key của bạn (key `...f50w`)
3. Xem thông tin project và quota
4. Nếu thấy "Set up billing" hoặc "Free tier", đó là bình thường

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Project phải đúng:**
   - API key phải thuộc project **"Gemini API"**
   - Phải enable API trong **cùng project** đó

2. **Tài khoản phải đúng:**
   - Phải đăng nhập bằng **cùng tài khoản Google** (`trantriduy2004ss@gmail.com`)
   - Tài khoản này phải có quyền truy cập project

3. **Restart server:**
   - Sau khi enable API, **BẮT BUỘC** phải restart server backend
   - Server chỉ đọc `.env` khi khởi động

4. **Quota/Billing:**
   - Free tier có giới hạn số request
   - Nếu vượt quá, có thể cần set up billing
   - Kiểm tra quota tại: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

---

## 📋 CHECKLIST

- [ ] Đã vào Google Cloud Console: https://console.cloud.google.com/apis/library
- [ ] Đã chọn đúng project: **"Gemini API"**
- [ ] Đã tìm "Generative Language API"
- [ ] Đã click "ENABLE"
- [ ] Đã đợi API được kích hoạt (hiển thị "API enabled")
- [ ] Đã restart server backend
- [ ] Đã test lại bằng: `npm run verify-gemini-key`
- [ ] Kết quả: ✅ API KEY HỢP LỆ!

---

## 🆘 NẾU VẪN LỖI

Nếu sau khi enable API và restart server vẫn lỗi:

1. **Kiểm tra lại project:**
   - Đảm bảo đã chọn đúng project "Gemini API"
   - API key phải thuộc project này

2. **Kiểm tra billing:**
   - Một số tính năng có thể cần billing account
   - Vào: https://console.cloud.google.com/billing

3. **Tạo API key mới:**
   - Vào: https://aistudio.google.com/api-keys
   - Click "Create API key"
   - Chọn project "Gemini API"
   - Copy API key mới và cập nhật vào `backend/.env`

4. **Kiểm tra quota:**
   - Vào: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
   - Xem có bị giới hạn không

---

**Sau khi kích hoạt API, hãy restart server và test lại!** 🚀








