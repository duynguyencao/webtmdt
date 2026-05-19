# Route User (`routes/userRouter.js`)

File: `BE/routes/userRouter.js`

## Route này làm gì?

Nó xử lý:

- đăng ký tài khoản
- gửi email xác thực
- xác thực email qua link
- đăng nhập
- lấy/cập nhật thông tin user hiện tại

## Các “mảnh ghép” liên quan

- Model: `models/User.js`
- Auth:
  - tạo token đăng nhập: `middleware/auth.js` (`createToken`)
  - middleware check đăng nhập: `verifyToken`
- Email:
  - gửi mail bằng `nodemailer`
- Rate limit:
  - chặn spam register/login bằng `express-rate-limit`

## 1) Cấu hình xác thực email

Trong file có:

- `EMAIL_VERIFY_SECRET = process.env.EMAIL_VERIFY_SECRET || process.env.JWT_SECRET`

Ý nghĩa:

- Nếu có secret riêng cho verify email thì dùng.
- Nếu không có thì dùng luôn `JWT_SECRET`.

Vì sao verify email cần secret?

- Link verify có token, BE phải kiểm tra token đó có đúng do BE tạo ra không.

## 2) `createEmailTransporter()` — tạo “kênh” gửi mail

Hàm này đọc các biến môi trường:

- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`
- `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`
- `EMAIL_FROM`

Nếu thiếu user/pass/from → throw error.

Có hỗ trợ `EMAIL_SMTP_INSECURE_TLS=true` (chỉ dev):

- dùng khi mail server bị lỗi chứng chỉ TLS.
- code chặn không cho bật ở production.

## 3) `sendEmailVerification(...)` — gửi mail verify

Nó tạo link:

- `verifyUrl = FE_BASE_URL + /verify-email?token=...`

Rồi gửi:

- text email (dễ debug)
- html email (đẹp hơn)

## 4) `authLimiter` — chống spam

Giới hạn:

- 10 request / 1 phút cho các route auth.

## 5) `POST /api/user/register`

Luồng xử lý:

1. Validate body bằng `registerSchema` (zod).
2. Kiểm tra có `EMAIL_VERIFY_SECRET` không.
3. Chuẩn hóa:
   - email lowercase + trim
   - name trim
4. Tìm `User` theo email.

Trường hợp A: email đã tồn tại và **chưa verify**

- Tạo token verify mới (24h)
- Gửi lại email verify
- Trả 201 với message “đã gửi lại link”

Trường hợp B: email đã tồn tại và đã verify

- Trả 400 “Email đã được sử dụng”

Trường hợp C: email chưa tồn tại

- Tạo user mới:
  - role `buyer`
  - `emailVerified=false`
- Tạo token verify (24h)
- Gửi email verify
- Trả 201 “Đăng ký thành công…”

Vì sao không auto-login sau register?

- Vì hệ thống yêu cầu **emailVerified=true** trước khi login.

## 6) `POST /api/user/login`

Luồng xử lý:

1. Validate body bằng `loginSchema`.
2. Tìm user theo email.
3. So password bằng `user.comparePassword`.
4. Nếu `emailVerified=false` → chặn với 403.
5. Nếu `isLocked=true` → chặn với 403 ("Tài khoản đã bị khóa").
6. Nếu OK:
   - tạo token bằng `createToken(user)`
   - trả `{ token, user }`

## 7) `GET /api/user/verify-email?token=...`

Luồng:

1. Lấy token từ query.
2. `jwt.verify(token, EMAIL_VERIFY_SECRET)`.
3. Check `decoded.purpose === 'emailVerify'`.
4. Tìm user theo `decoded.userId`.
5. Set `user.emailVerified=true` (nếu chưa).
6. Trả token đăng nhập (JWT) để FE tự login luôn.

Ghi chú:

- Nếu token sai/hết hạn → trả 400.

## 8) `GET /api/user/me` (cần đăng nhập)

Middleware:

- `verifyToken`

Luồng:

- lấy user theo `req.userId`
- trả `user.toJSON()`

## 9) `PUT /api/user/me` (cần đăng nhập)

Mục tiêu:

- cập nhật name/phone/address

Đặc điểm:

- Route đọc từng field nếu client gửi lên thì mới set.
- Có cả field mới (code/name hành chính) và field cũ (legacy).

## 10) Admin — Quản lý tài khoản

Tất cả endpoints dưới đây yêu cầu JWT + role `admin`:

### `GET /api/user/admin/list`

- Lấy danh sách tất cả tài khoản.
- Hỗ trợ query params:
  - `search`: tìm theo tên hoặc email (regex case-insensitive).
  - `role`: lọc theo role (`buyer`, `admin`, `shipper`).
  - `page`, `limit`: phân trang (nếu không truyền → trả tất cả).
- Trả về mảng user (không có password).

### `GET /api/user/admin/:id`

- Lấy chi tiết 1 tài khoản theo ID.
- Trả 404 nếu không tìm thấy.

### `PATCH /api/user/admin/:id/lock`

- Khóa tài khoản (`isLocked=true`).
- Chặn: không cho khóa tài khoản có role `admin`.
- Chặn: nếu tài khoản đã bị khóa trước đó.
- Khi bị khóa, user không thể đăng nhập.

### `PATCH /api/user/admin/:id/unlock`

- Mở khóa tài khoản (`isLocked=false`).
- Chặn: nếu tài khoản hiện không bị khóa.

### `DELETE /api/user/admin/:id`

- Xóa vĩnh viễn tài khoản.
- Chặn: không cho xóa tài khoản có role `admin`.
- Chặn: nếu user còn đơn hàng đang xử lý (`pending`, `confirmed`, `shipped`).
- Dùng `Order.countDocuments` để kiểm tra trước khi xóa.

