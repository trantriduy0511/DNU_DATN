# Hướng dẫn chạy dự án trên VS Code

## Cách 1: Sử dụng Debug Configuration (Khuyến nghị)

### Chạy Full Stack (Backend + Frontend)
1. Mở VS Code
2. Nhấn `F5` hoặc vào menu **Run > Start Debugging**
3. Chọn **"Debug Full Stack"** hoặc **"Debug Full Stack (Compound)"**
4. Backend sẽ chạy trên `http://localhost:5000`
5. Frontend sẽ chạy trên `http://localhost:5173`

### Chạy riêng Backend hoặc Frontend
1. Nhấn `F5` hoặc vào menu **Run > Start Debugging**
2. Chọn:
   - **"Debug Backend"** - Chỉ chạy backend
   - **"Debug Frontend"** - Chỉ chạy frontend

## Cách 2: Sử dụng Tasks

### Chạy Full Stack
1. Nhấn `Ctrl+Shift+P` (hoặc `Cmd+Shift+P` trên Mac)
2. Gõ "Tasks: Run Task"
3. Chọn **"Start Full Stack"**

### Chạy riêng từng phần
1. Nhấn `Ctrl+Shift+P`
2. Gõ "Tasks: Run Task"
3. Chọn:
   - **"Start Backend"** - Chỉ chạy backend
   - **"Start Frontend"** - Chỉ chạy frontend

## Cách 3: Sử dụng Terminal trong VS Code

### Chạy Full Stack
Mở terminal trong VS Code (`Ctrl+``) và chạy:
```bash
npm run dev
```

### Chạy riêng từng phần
**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Cài đặt Dependencies

Nếu chưa cài đặt dependencies:
1. Nhấn `Ctrl+Shift+P`
2. Gõ "Tasks: Run Task"
3. Chọn **"Install All Dependencies"**

Hoặc chạy thủ công:
```bash
npm run install-all
```

## Lưu ý

- Đảm bảo MongoDB đang chạy trước khi start backend
- File `.env` trong thư mục `backend` cần có biến `MONGODB_URI`
- Port 5000 (backend) và 5173 (frontend) cần trống

## Troubleshooting

### Lỗi "Cannot find package 'sharp'"
Chạy lại:
```bash
cd backend
npm install sharp
```

### Lỗi "Port already in use"
- Kiểm tra xem có process nào đang dùng port 5000 hoặc 5173 không
- Dừng process đó hoặc đổi port trong file cấu hình

### Lỗi MongoDB connection
- Kiểm tra MongoDB đang chạy
- Kiểm tra `MONGODB_URI` trong file `.env`








