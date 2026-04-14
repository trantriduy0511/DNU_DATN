# 🚀 Quick Start - Chạy trên VS Code

## Bước 1: Cài đặt Dependencies

Mở terminal trong VS Code (`Ctrl+``) và chạy:
```bash
npm run install-all
```

## Bước 2: Cấu hình Environment Variables

Tạo file `.env` trong thư mục `backend` với nội dung:
```env
MONGODB_URI=mongodb://localhost:27017/dnu-social
JWT_SECRET=your-secret-key-here
PORT=5000
```

## Bước 3: Chạy dự án

### Cách 1: Sử dụng Debug (F5)
1. Nhấn `F5` hoặc vào **Run > Start Debugging**
2. Chọn **"Debug Full Stack"**

### Cách 2: Sử dụng Terminal
Mở terminal và chạy:
```bash
npm run dev
```

### Cách 3: Sử dụng Tasks
1. `Ctrl+Shift+P`
2. Gõ "Tasks: Run Task"
3. Chọn **"Start Full Stack"**

## Truy cập ứng dụng

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## Lưu ý

- Đảm bảo MongoDB đang chạy
- Port 5000 và 5173 phải trống
- Nếu gặp lỗi, xem file `README_VSCODE.md` để biết thêm chi tiết








