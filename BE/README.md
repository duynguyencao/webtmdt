# Backend API - Shop Cầu Lông

API REST cho website thương mại điện tử cầu lông. Dùng **MongoDB**, **Express**, **JWT** (đăng nhập). Cấu trúc: `db`, `models`, `routes`, `middleware`.

## Docs dễ hiểu (khuyến nghị đọc)

Xem docs chi tiết theo từng phần (dạng thư mục): `docs/README.md`.

## Cấu trúc thư mục

```
BE/
├── db/
│   └── dbConnect.js      # Kết nối MongoDB
├── models/
│   ├── Product.js
│   ├── Order.js
│   ├── Coupon.js
│   ├── SiteConfig.js
│   ├── OrderCounter.js
│   └── User.js           # Người dùng (buyer / admin) + profile giao hàng
├── routes/
│   ├── productRouter.js  # CRUD sản phẩm
│   ├── userRouter.js     # Đăng ký, đăng nhập
│   ├── orderRouter.js    # Đơn hàng
│   ├── categoryRouter.js
│   ├── couponRouter.js
│   ├── siteConfigRouter.js
│   ├── payosRouter.js
│   └── chatRouter.js
├── middleware/
│   └── auth.js           # JWT, kiểm tra quyền (admin)
├── seed/
│   ├── index.js          # Chạy seed: products, users
│   ├── productsSeed.js   # Danh sách sản phẩm mẫu (đẩy vào DB)
│   └── usersSeed.js      # Danh sách user mẫu (admin, buyer)
├── scripts/
│   └── makeAdmin.js       # Khôi phục / tạo admin (role=admin, emailVerified=true)
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

# FE base url (dùng để tạo link quan trọng như PayOS return/cancel + email verify)
FE_BASE_URL=http://localhost:5173

# CORS allowlist (optional). Nếu set, chỉ origin trong list mới được gọi API từ browser.
# Nếu không set, server sẽ auto-allow FE_BASE_URL + localhost (dev).
# CORS_ORIGINS=https://your-fe.com,https://admin.your-fe.com

# Khuyến nghị set riêng (nếu không set sẽ fallback dùng JWT_SECRET)
# EMAIL_VERIFY_SECRET=your-email-verify-secret

# SMTP (nếu bật gửi mail xác thực)
# EMAIL_SMTP_HOST=smtp.gmail.com
# EMAIL_SMTP_PORT=587
# EMAIL_SMTP_USER=your_email@gmail.com
# EMAIL_SMTP_PASS=your_app_password
# EMAIL_FROM=your_email@gmail.com
#
# Chỉ dùng DEV khi TLS mail server có vấn đề (KHÔNG bật production)
# EMAIL_SMTP_INSECURE_TLS=true

# Power Automate / server-to-server: gửi header x-api-key thay cho JWT (admin)
# Lưu ý: API key chỉ được phép gọi 1 số endpoint admin (allowlist) trong middleware/auth.js
# API_KEY=your-api-key-secret
```

## Seed (lần đầu)

Sau khi MongoDB đang chạy:

```bash
npm run seed
```

- **productsSeed.js**: Xóa toàn bộ sản phẩm cũ, thêm 18 sản phẩm mẫu (để shop có hàng hiển thị).
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
| GET | `/api/site-config` | Lấy cấu hình trang chủ |
| GET | `/api/products/best-sellers` | Top bán chạy |
| GET | `/api/products/newest` | Sản phẩm mới |
| GET | `/api/products/discounted` | Đang giảm giá |
| GET | `/api/products/related/:id` | Sản phẩm liên quan |
| GET | `/api/coupons/validate` | Kiểm tra coupon |
| POST | `/api/user/register` | Đăng ký (gửi email xác thực) |
| GET | `/api/user/verify-email` | Xác thực email (trả JWT để auto login) |
| POST | `/api/user/login` | Đăng nhập (chỉ cho phép khi emailVerified=true) |

### Cần auth (Header: `Authorization: Bearer <token>`)

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|--------|--------|
| GET | `/api/user/me` | bất kỳ user đã login | Lấy thông tin user hiện tại (để FE kiểm tra đã đăng nhập) |
| PUT | `/api/user/me` | bất kỳ user đã login | Cập nhật profile (SĐT/địa chỉ) |
| POST | `/api/orders` | buyer | Tạo đơn hàng (COD/PayOS) |
| GET | `/api/orders/me` | buyer | Đơn hàng của tôi |
| POST | `/api/products` | admin | Thêm sản phẩm |
| PUT | `/api/products/:id` | admin | Sửa sản phẩm |
| DELETE | `/api/products/:id` | admin | Xóa sản phẩm |
| GET | `/api/orders` | admin | Danh sách đơn hàng |
| PATCH | `/api/orders/:orderId/confirm` | admin | Xác nhận đơn COD |
| PATCH | `/api/orders/:orderId/cancel` | admin | Hủy đơn (hoàn stock) |
| GET | `/api/coupons` | admin | Danh sách coupon |
| POST | `/api/coupons` | admin | Tạo coupon |
| PUT | `/api/coupons/:code` | admin | Sửa coupon |
| DELETE | `/api/coupons/:code` | admin | Xóa coupon |
| PUT | `/api/site-config` | admin | Cập nhật cấu hình trang chủ |

## Ví dụ

- Đăng nhập: `POST /api/user/login` → nhận `token`.
- Thêm sản phẩm: `POST /api/products` với header `Authorization: Bearer <token>` và body JSON (name, brand, category, price, image, ...).
