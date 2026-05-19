# Route Site Config (`routes/siteConfigRouter.js`)

File: `BE/routes/siteConfigRouter.js`

## Mục tiêu

Cho phép:

- FE lấy cấu hình trang chủ (công khai)
- Admin cập nhật cấu hình trang chủ (có đăng nhập + role admin)

Model: `models/SiteConfig.js`

## Helper: `sanitize(body)`

Mục tiêu:

- ép các field về string trim
- ép `productGridCols` về khoảng 2..6

Vì sao cần sanitize?

- tránh FE gửi kiểu số thành chuỗi hoặc gửi rỗng
- tránh set số cột quá to gây vỡ layout FE

## 1) `GET /api/site-config` (công khai)

Luồng:

- tìm config `{ key: 'home' }`
- nếu chưa có → trả `{ key: 'home' }`

## 2) `PUT /api/site-config` (admin)

Middleware:

- `verifyToken`
- `requireRole('admin')`

Luồng:

- sanitize body
- `findOneAndUpdate` với:
  - filter: `{ key: 'home' }`
  - `$set: body`
  - `$setOnInsert: { key: 'home' }`
  - `upsert: true` để nếu chưa có thì tạo mới

