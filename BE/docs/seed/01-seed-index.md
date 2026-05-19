# Seed entry (`seed/index.js`)

File: `BE/seed/index.js`

## File này dùng để làm gì?

Khi chạy:

- `npm run seed`

thì Node sẽ chạy `seed/index.js`.

File này:

1. kết nối MongoDB
2. xóa và seed lại bảng Product
3. tạo user mẫu nếu chưa tồn tại

## Luồng chạy theo đúng code

- `import 'dotenv/config'`
  - nạp `.env` vào `process.env` theo cách nhanh (dotenv config mặc định).

- `await connectDB()`
  - nối DB.

- `await Product.deleteMany({})`
  - xóa toàn bộ sản phẩm cũ.
  - Lưu ý: đây là xóa cứng, dùng cho môi trường dev/seed.

- `await Product.insertMany(productsSeed)`
  - đổ danh sách sản phẩm mẫu.

- Seed user:
  - loop qua `usersSeed`
  - `findOne` theo email (lowercase)
  - nếu chưa có → tạo user mới
  - nếu đã có → bỏ qua (không xóa user cũ)

- Kết thúc:
  - `process.exit(0)` nếu OK
  - `process.exit(1)` nếu lỗi

## Tại sao seed product lại xóa hết?

Vì product seed thường là “dữ liệu demo”.

Nếu không xóa:

- lần seed sau có thể trùng `Product.id` (unique) và fail.

