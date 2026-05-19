# Model `SiteConfig` (`models/SiteConfig.js`)

File: `BE/models/SiteConfig.js`

## SiteConfig dùng để làm gì?

`SiteConfig` lưu cấu hình hiển thị trang chủ (để admin chỉnh mà không cần sửa code FE).

Hiện tại hệ thống dùng 1 bản config chính với:

- `key: 'home'`

## Field và ý nghĩa

- `key` (String, unique, default `'home'`)
  - Khóa để phân biệt nhiều loại config (nếu sau này mở rộng).

- `heroTitle`
  - Tiêu đề banner lớn.

- `heroSubtitle`
  - Dòng mô tả dưới tiêu đề.

- `heroImage`
  - Link ảnh banner.

- `saleTitle`
  - Tiêu đề khu vực sale.

- `productGridCols` (Number, 2..6)
  - Số cột lưới sản phẩm hiển thị trên trang.

## Lưu ý

Route liên quan:

- `GET /api/site-config` (công khai)
- `PUT /api/site-config` (admin)

Xem thêm: `docs/routes/06-site-config.md`

