# 📝 HƯỚNG DẪN TẠO FILE .env - CHI TIẾT

## ❌ LỖI: "Email service not configured"

**Nguyên nhân:** File `.env` chưa được tạo hoặc không được đọc đúng.

---

## ✅ BƯỚC 1: KIỂM TRA FILE .env

### Chạy script kiểm tra:

```bash
cd backend
npm run check-env
```

Script này sẽ:
- ✅ Kiểm tra file `.env` có tồn tại không
- ✅ Đọc nội dung file
- ✅ Kiểm tra biến EMAIL_USER và EMAIL_PASSWORD
- ✅ Test load với dotenv

---

## ✅ BƯỚC 2: TẠO FILE .env (Nếu chưa có)

### Cách 1: Tạo bằng Notepad/VS Code

1. **Mở thư mục:** `backend/`
2. **Tạo file mới** tên: `.env` (chấm env)
3. **Copy nội dung sau:**

```env
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
```

4. **Lưu file** (đảm bảo encoding là UTF-8)

### Cách 2: Tạo bằng Command Line

**Windows PowerShell:**
```powershell
cd backend
@"
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
"@ | Out-File -FilePath .env -Encoding utf8
```

**Hoặc tạo file thủ công:**
1. Mở Notepad
2. Copy nội dung ở trên
3. Save As → Chọn thư mục `backend/`
4. File name: `.env` (có dấu chấm)
5. Save as type: All Files (*.*)
6. Encoding: UTF-8

---

## ✅ BƯỚC 3: KIỂM TRA FORMAT FILE

**File `.env` phải:**

✅ **Đúng:**
```env
EMAIL_USER=trantriduy2004ss@gmail.com
EMAIL_PASSWORD=ggqxtafanoxplhwp
```

❌ **Sai:**
```env
EMAIL_USER = trantriduy2004ss@gmail.com  (có khoảng trắng)
EMAIL_USER="trantriduy2004ss@gmail.com" (có dấu ngoặc kép)
EMAIL_user=trantriduy2004ss@gmail.com   (viết thường)
```

**Lưu ý:**
- Không có khoảng trắng trước/sau dấu `=`
- Không có dấu ngoặc kép `"` hoặc `'`
- Tên biến phải viết hoa: `EMAIL_USER`, `EMAIL_PASSWORD`

---

## ✅ BƯỚC 4: RESTART SERVER

**QUAN TRỌNG:** Sau khi tạo/sửa `.env`, PHẢI restart server!

1. **Dừng server:** `Ctrl + C`
2. **Chạy lại:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Kiểm tra console:**
   ```
   ✅ File .env found at: D:\ThongTinHocTap-DNU\backend\.env
   ✅ Loaded 2 environment variables from .env
   🔍 Checking .env file configuration:
      EMAIL_USER: ✅ SET (trantriduy2004ss@gmail.com)
      EMAIL_PASSWORD: ✅ SET (****)
   ✅ Email service configured successfully
   ```

---

## 🧪 TEST

### Cách 1: Chạy script check-env
```bash
cd backend
npm run check-env
```

### Cách 2: Test qua web
1. Vào `/forgot-password`
2. Nhập email
3. Kiểm tra console logs

---

## 🔍 TROUBLESHOOTING

### Lỗi: "File .env không tồn tại"
**Giải pháp:**
- Tạo file `.env` trong thư mục `backend/`
- Đảm bảo tên file là `.env` (có dấu chấm)

### Lỗi: "EMAIL_USER: NOT SET"
**Nguyên nhân:**
- File `.env` có format sai
- Có khoảng trắng hoặc ký tự đặc biệt
- Encoding không phải UTF-8

**Giải pháp:**
- Kiểm tra lại format file
- Tạo lại file với encoding UTF-8
- Không có khoảng trắng trước/sau `=`

### Lỗi: "ERROR loading .env file"
**Nguyên nhân:**
- File có ký tự đặc biệt
- Encoding sai

**Giải pháp:**
- Tạo lại file với Notepad/VS Code
- Chọn encoding UTF-8 khi lưu

---

## 📋 CHECKLIST

- [ ] File `backend/.env` đã được tạo
- [ ] Tên file đúng: `.env` (có dấu chấm)
- [ ] Nội dung: `EMAIL_USER=trantriduy2004ss@gmail.com`
- [ ] Nội dung: `EMAIL_PASSWORD=ggqxtafanoxplhwp`
- [ ] Không có khoảng trắng trước/sau `=`
- [ ] Encoding: UTF-8
- [ ] Đã lưu file
- [ ] Đã restart server
- [ ] Console hiển thị `EMAIL_USER: ✅ SET`

---

**Sau khi làm đúng, chạy `npm run check-env` để kiểm tra! ✅**










