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
  - URL ảnh banner đang hiển thị. Admin chọn từ thư viện `banners` hoặc upload mới.

- `banners` (Array of String, default `[]`)
  - Thư viện URL ảnh banner đã upload lên Supabase.
  - Admin có thể upload nhiều ảnh, chọn 1 ảnh làm `heroImage`, hoặc xóa ảnh không dùng nữa.
  - Khi xóa ảnh đang dùng làm `heroImage` → hệ thống tự reset `heroImage` thành rỗng.

- `saleTitle`
  - Tiêu đề khu vực sale.

- `productGridCols` (Number, 2..8)
  - Số cột lưới sản phẩm hiển thị trên trang.

## Lưu ý

Route liên quan:

- `GET /api/site-config` (công khai)
- `PUT /api/site-config` (admin)
- `POST /api/site-config/banners` (admin — thêm ảnh vào thư viện)
- `DELETE /api/site-config/banners` (admin — xóa ảnh khỏi thư viện)

Xem thêm: `docs/routes/06-site-config.md`

