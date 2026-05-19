# Script tạo/đổi user thành admin (`scripts/makeAdmin.js`)

File: `BE/scripts/makeAdmin.js`

## Mục tiêu

Tạo nhanh admin (hoặc nâng quyền user thành admin) bằng command line.

## Cách chạy

Trong thư mục `BE/`:

- `node scripts/makeAdmin.js <email> [password] [name]`

Ví dụ:

- `node scripts/makeAdmin.js admin2@shop.com admin123 "Admin 2"`

## Luồng xử lý

1. Đọc `email`, `password`, `name` từ `process.argv`.
2. Nếu thiếu email → in hướng dẫn và thoát.
3. Đọc `MONGODB_URI` từ `.env`
   - thiếu thì thoát (không biết connect DB).
4. Connect MongoDB.
5. Tìm user theo email.

Trường hợp A: user chưa tồn tại

- bắt buộc phải có `password`
- tạo user mới:
  - role = admin
  - emailVerified = true

Trường hợp B: user đã tồn tại

- set `role='admin'`
- set `emailVerified=true`
- nếu có `password` → reset password
- save

6. Disconnect DB và thoát.

## Lưu ý

- Reset password sẽ trigger hook hash password trong `models/User.js`.

