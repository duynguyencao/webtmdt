# Model `User` (`models/User.js`)

File: `BE/models/User.js`

## User dùng để làm gì?

`User` đại diện cho một tài khoản đăng nhập trong hệ thống.

Một user có thể là:

- **buyer**: người mua (mặc định khi đăng ký)
- **admin**: quản trị / người bán (thường tạo bằng seed hoặc script)
- **shipper**: người giao hàng (tạo bằng script)

## Các field và ý nghĩa

### 1) Thông tin đăng nhập

- `name` (String, required)
  - Tên hiển thị.
  - `trim: true` để tự bỏ khoảng trắng thừa.

- `email` (String, required, unique)
  - Email là “tên đăng nhập”.
  - `lowercase: true`: tự chuyển email về chữ thường để tránh trùng kiểu `A@...` và `a@...`.

- `password` (String, required, minlength 6)
  - Lưu **mật khẩu đã được mã hóa** (hash) chứ không lưu mật khẩu thô.

### 2) Xác thực email

- `emailVerified` (Boolean, default false)
  - Khi đăng ký xong, user phải bấm link trong email để xác thực.
  - Nếu chưa verify thì route login sẽ chặn (xem `routes/userRouter.js`).

### 3) Thông tin liên hệ / giao hàng

- `phone` (String)
  - Số điện thoại.

- `address` (Object)
  - `line1`: địa chỉ cụ thể (số nhà, đường…)
  - `cityCode`, `districtCode`, `wardCode`: mã hành chính (để đồng nhất dữ liệu)
  - `cityName`, `districtName`, `wardName`: tên hiển thị nhanh (đỡ phải gọi API hành chính)
  - `city`, `district`, `ward`: field “legacy” để giữ tương thích dữ liệu cũ

### 4) Role (quyền)

- `role` (String)
  - enum: `buyer | admin | shipper`
  - default: `buyer`

### 5) Trạng thái tài khoản

- `isLocked` (Boolean, default false)
  - Admin có thể khóa tài khoản qua API `/api/user/admin/:id/lock`.
  - Khi `isLocked=true`, user không thể đăng nhập (route login trả 403).
  - Admin không thể khóa tài khoản có role `admin`.

## Hook `pre('save')` — tự hash mật khẩu

Đoạn:

- `userSchema.pre('save', async function (next) { ... })`

Ý nghĩa:

- Mỗi lần gọi `user.save()` hoặc `User.create()`:
  - Nếu field `password` **không thay đổi** → bỏ qua.
  - Nếu password mới → hash bằng `bcrypt.hash(password, 10)`.

Vì sao cần đoạn này?

- Đảm bảo không ai vô tình lưu “mật khẩu thô” vào DB.

## Method `comparePassword`

`comparePassword(candidate)`:

- Dùng `bcrypt.compare` để so:
  - mật khẩu người dùng nhập (candidate)
  - với password đã hash trong DB

## `toJSON.transform` — trả dữ liệu an toàn cho FE

Khi route trả `user.toJSON()`:

- thêm `id` = `_id` dạng string (dễ dùng ở FE)
- xóa `_id`, `__v`
- xóa `password` để không lộ ra ngoài API

