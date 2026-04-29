# ShopTD - Website thương mại điện tử cầu lông

Dự án gồm **FE** (React + Vite) và **BE** (Node.js + Express + MongoDB).

## Cấu trúc

```
WEB TMDT/
├── FE/          # Frontend (React, Vite)
├── BE/          # Backend (Express, MongoDB, JWT)
└── README.md
```

## Cách chạy (lần đầu)

### 1. MongoDB

- Cài và **bật MongoDB** (local hoặc dùng Atlas).
- Nếu dùng Atlas: sửa `BE/.env` → `MONGODB_URI=mongodb+srv://...`

### 2. Backend

```bash
cd BE
npm install
npm run seed      # Chỉ chạy 1 lần để tạo dữ liệu mẫu + user admin/buyer
npm run dev       # Chạy API tại http://localhost:3001
```

### 3. Frontend

Mở terminal mới:

```bash
cd FE
npm install
npm run dev       # Chạy web tại http://localhost:3000
```

### 4. Kiểm tra

- Mở trình duyệt: **http://localhost:3000**
- Trang chủ: danh mục + sản phẩm nổi bật (từ API).
- Đăng nhập: **Đăng nhập** (góc trên) → `/login`.  
  Tài khoản mẫu (sau khi seed):  
  - Người mua: `buyer@caulong.vn` / `buyer123`  
  - Admin: `admin@caulong.vn` / `admin123`
- Mua hàng: thêm giỏ → Giỏ hàng → **Thanh toán (yêu cầu đăng nhập)** với phương thức **COD** hoặc **PayOS**.

## Cấu hình

- **BE:** file `BE/.env`: `PORT`, `MONGODB_URI`, `JWT_SECRET` (+ PayOS / Gmail SMTP nếu dùng).
- **FE:** file `FE/.env`: `VITE_API_URL=http://localhost:3001` (đổi nếu BE chạy port khác).

## Lưu ý

- Phải chạy **MongoDB** và **BE** trước khi dùng FE (trang chủ, sản phẩm, đặt hàng gọi API).
- Nếu trang báo "Không tải được dữ liệu" → kiểm tra BE đang chạy và MongoDB đã kết nối.
