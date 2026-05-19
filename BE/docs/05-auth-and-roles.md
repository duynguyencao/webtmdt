# 05) Đăng nhập, phân quyền (`middleware/auth.js`)

File: `BE/middleware/auth.js`

## Mục tiêu của file này

1. **Tạo token đăng nhập** (để FE lưu và gửi lại mỗi lần gọi API)
2. **Kiểm tra token** ở các API cần đăng nhập
3. **Chặn theo quyền** (role) như `admin`, `buyer`, `shipper`
4. Hỗ trợ gọi admin API bằng **`x-api-key`** (server-to-server)

## Khái niệm tối thiểu

- **Token**: một chuỗi ký tự BE tạo ra sau khi login. FE gửi token lại ở header.
- **JWT**: kiểu token có chữ ký, BE kiểm tra chữ ký để biết token có bị sửa không.
- **Role**: vai trò người dùng: buyer/admin/shipper.

## 1) Lấy `JWT_SECRET` đúng cách

Hàm `getJwtSecret()`:

- Nếu `.env` có `JWT_SECRET` → dùng luôn.
- Nếu production mà thiếu `JWT_SECRET` → báo lỗi để tránh chạy “hớ hênh”.
- Nếu dev mà thiếu → dùng fallback `'dev-jwt-secret'` để không chặn dev.

Đối chiếu code `BE/middleware/auth.js`:

- L3–L12: `getJwtSecret()`
  - L4–L6: đọc `JWT_SECRET`, nếu có thì return luôn.
  - L7–L9: production mà thiếu secret → throw (bắt buộc cấu hình).
  - L10–L11: dev fallback `'dev-jwt-secret'` (chỉ để tiện chạy local).
- L14: `JWT_SECRET` được “chốt” một lần khi module load.

Tại sao cần secret?

- Secret là “chìa khóa” để ký token.
- Nếu secret yếu/để lộ → người khác có thể giả mạo token.

## 2) `createToken(user)` tạo token thế nào?

`createToken(user)` tạo JWT có payload:

- `userId`: id của user trong DB
- `role`: buyer/admin/shipper

Token có hạn `7d` (7 ngày).

Đối chiếu code:

- L16–L22: `createToken(user)`
  - Payload gồm:
    - `userId`: `user._id.toString()`
    - `role`: `user.role`
  - `expiresIn: '7d'`

## 3) `verifyToken` — middleware kiểm tra đăng nhập

Đây là middleware được gắn vào các route cần đăng nhập.

Nó có 2 “cách qua cửa”:

### Cách A: `x-api-key` (server-to-server)

- Nếu `.env` có `API_KEY`
- Và request gửi header `x-api-key` đúng

Thì BE cho qua **NHƯNG** chỉ với một số endpoint có trong `allowApiKeyForThisRoute(req)`.

Vì sao có allowlist?

- API key không gắn với user cụ thể, nên nếu mở quá rộng sẽ rất nguy hiểm.
- Allowlist giúp giới hạn: chỉ vài API admin được phép gọi bằng API key.

Đối chiếu code `allowApiKeyForThisRoute` (L28–L42):

- L29–L31: lấy `method` và `url`
- L33: `/api/products` với `POST|PUT|DELETE` → cho phép
- L34: `/api/coupons` → cho phép
- L35: `/api/site-config` với `PUT` → cho phép
- L38–L39: một số API admin của order:
  - `GET /api/orders`
  - `PATCH /api/orders/:id/confirm|cancel`
- Ngoài list trên → không cho phép

Nếu qua bằng API key:

- `req.userId = 'system'`
- `req.userRole = 'admin'`

Đối chiếu code (L44–L51):

- Nếu `apiKey` tồn tại và header `x-api-key` đúng:
  - check allowlist
  - set `req.userId='system'`
  - set `req.userRole='admin'`
  - `next()`

### Cách B: Bearer token (cách dùng cho FE)

- FE gửi header:
  - `Authorization: Bearer <token>`

`verifyToken` sẽ:

1. Tách token khỏi header
2. `jwt.verify(token, JWT_SECRET)` để kiểm tra token
3. Nếu OK: set `req.userId`, `req.userRole`
4. Nếu fail: trả 401

Đối chiếu code (L52–L65):

- L52–L56:
  - đọc `Authorization`
  - chỉ nhận dạng `Bearer <token>`
  - thiếu token → 401 “Chưa đăng nhập”
- L57–L64:
  - `jwt.verify(token, JWT_SECRET)`
  - gán `req.userId`, `req.userRole`
  - nếu verify fail → 401 “Token không hợp lệ hoặc hết hạn”

## 4) `requireRole(...roles)` — middleware chặn theo quyền

Ví dụ:

- Route admin sẽ gắn `requireRole('admin')`
- Route shipper sẽ gắn `requireRole('shipper')`

Nếu role không khớp → trả 403 (không có quyền).

Đối chiếu code (L67–L75):

- Nếu `req.userRole` không nằm trong `roles` → 403.
- Nếu ok → `next()`.

