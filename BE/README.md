# Backend API - Shop Cầu Lông

API REST cho website thương mại điện tử cầu lông. Dùng **MongoDB**, **Express**, **JWT** (đăng nhập). Cấu trúc: `db`, `models`, `routes`, `middleware`.

## Cấu trúc thư mục

```
BE/
├── db/
│   └── dbConnect.js      # Kết nối MongoDB
├── models/
│   ├── Product.js
│   ├── Category.js
│   ├── Order.js
│   └── User.js           # Người dùng (buyer / admin)
├── routes/
│   ├── productRouter.js  # CRUD sản phẩm
│   ├── userRouter.js     # Đăng ký, đăng nhập
│   ├── orderRouter.js    # Đơn hàng
│   └── categoryRouter.js
├── middleware/
│   └── auth.js           # JWT, kiểm tra quyền (admin)
├── seed/
│   ├── index.js          # Chạy seed: products, categories, users
│   ├── productsSeed.js   # Danh sách sản phẩm mẫu (đẩy vào DB)
│   └── usersSeed.js      # Danh sách user mẫu (admin, buyer)
├── index.js              # Entry point
├── package.json
└── .env.example
```

## Vai trò User

- **buyer**: Người mua — xem sản phẩm, đặt hàng (giao diện hiện tại). Đăng ký mới mặc định là buyer.
- **admin**: Người bán / quản trị — thêm/sửa/xóa sản phẩm, xem đơn hàng. Chỉ tạo qua seed (không đăng ký admin từ form).

## Yêu cầu

- Node.js 18+
- MongoDB (local hoặc Atlas)

## Cài đặt

```bash
cd BE
npm install
```

## Cấu hình

Tạo file `.env` (copy từ `.env.example`):

```
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/caulong-shop
JWT_SECRET=your-secret-key-change-in-production
```

## Seed (lần đầu)

Sau khi MongoDB đang chạy:

```bash
npm run seed
```

- **productsSeed.js**: Xóa toàn bộ sản phẩm cũ, thêm 18 sản phẩm mẫu (để shop có hàng hiển thị).
- **categoriesSeed** (trong index.js): Tạo 4 danh mục (Vợt, Giày, Áo, Phụ kiện) với số lượng theo products.
- **usersSeed.js**: Tạo user mẫu nếu chưa tồn tại (không xóa user cũ):

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| admin@caulong.vn | admin123 | admin (người bán) |
| buyer@caulong.vn | buyer123 | buyer (người mua) |

## Chạy

- **Production:** `npm start`
- **Development:** `npm run dev`

## API

### Công khai (không cần đăng nhập)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/health` | Kiểm tra API |
| GET | `/api/products` | Danh sách sản phẩm (`category`, `search`, `featured`) |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET | `/api/categories` | Danh mục |
| POST | `/api/orders` | Tạo đơn hàng (checkout) — **không cần đăng nhập**, khách có thể mua trực tiếp |
| POST | `/api/user/register` | Đăng ký (body: `name`, `email`, `password`) |
| POST | `/api/user/login` | Đăng nhập (body: `email`, `password`) → trả về `token`, `user` |

### Cần auth (Header: `Authorization: Bearer <token>`)

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|--------|--------|
| GET | `/api/user/me` | bất kỳ user đã login | Lấy thông tin user hiện tại (để FE kiểm tra đã đăng nhập) |
| POST | `/api/products` | admin | Thêm sản phẩm |
| PUT | `/api/products/:id` | admin | Sửa sản phẩm |
| DELETE | `/api/products/:id` | admin | Xóa sản phẩm |
| GET | `/api/orders` | admin | Danh sách đơn hàng |

## Ví dụ

- Đăng nhập: `POST /api/user/login` → nhận `token`.
- Thêm sản phẩm: `POST /api/products` với header `Authorization: Bearer <token>` và body JSON (name, brand, category, price, image, ...).
