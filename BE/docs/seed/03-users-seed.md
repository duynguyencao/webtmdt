# Users seed (`seed/usersSeed.js`)

File: `BE/seed/usersSeed.js`

## File này là gì?

Danh sách user mẫu để tạo khi chạy:

- `npm run seed`

## Cách hoạt động trong `seed/index.js`

Seed user **không xóa user cũ**.

Nó làm:

- nếu email chưa tồn tại → tạo user
- nếu email đã tồn tại → bỏ qua

## Nội dung hiện tại

Mặc định có 1 user admin:

- email: `admin@caulong.vn`
- password: `admin123`
- role: `admin`
- `emailVerified: true`

## Mật khẩu có bị lưu thô không?

Không.

Vì khi tạo user, `models/User.js` có hook `pre('save')` sẽ hash password bằng bcrypt.

