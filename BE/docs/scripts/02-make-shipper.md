# Script tạo/đổi user thành shipper (`scripts/makeShipper.js`)

File: `BE/scripts/makeShipper.js`

## Mục tiêu

Tạo user shipper hoặc nâng quyền user thành shipper.

## Cách chạy

Trong `BE/`:

- `node scripts/makeShipper.js <email> [password] [name]`

## Luồng xử lý

Giống `makeAdmin.js`, chỉ khác:

- set `role='shipper'`
- default name là `'Shipper'`

Trường hợp user chưa tồn tại:

- cần password để tạo mới
- set `emailVerified=true` để đăng nhập được ngay

