# Products seed (`seed/productsSeed.js`)

File: `BE/seed/productsSeed.js`

## File này là gì?

Đây là **file dữ liệu** (data) chứa mảng `productsSeed` để đổ vào MongoDB khi chạy:

- `npm run seed`

Lưu ý:

- File này rất dài vì chứa mô tả + hình ảnh + thông số của nhiều sản phẩm.
- Phần lớn các dòng trong file chỉ là **nội dung sản phẩm**, không phải logic.

## Cấu trúc chung của file

- File export:
  - `export const productsSeed = [ ... ]`

Trong mảng:

- Mỗi phần tử `{ ... }` là **1 sản phẩm**.

## Cấu trúc 1 sản phẩm (các field thường gặp)

- `id` (Number)
  - ID của sản phẩm, dùng làm khóa chính theo kiểu “tự quản”.

- `name` (String)
  - Tên hiển thị.

- `brand` (String)
  - Thương hiệu.

- `category` (String)
  - Hiện đang là `vot` cho tất cả (vì BE fix category).

- `price` (Number)
  - Giá bán hiện tại.

- `originalPrice` (Number, optional)
  - Giá gốc (nếu sản phẩm sale).

- `sale` (Boolean)
  - Có sale không.

- `image` (String)
  - Ảnh đại diện.

- `images` (Array[String])
  - Danh sách ảnh chi tiết.

- `description` (String)
  - Mô tả dài (thường rất dài).

- `specifications` (Object)
  - Thông số sản phẩm dạng key-value.

- `stock` (Number)
  - Tồn kho ban đầu (seed).

- `inStock` (Boolean)
  - Field legacy/seed (BE hiện chủ yếu dùng `stock` để quyết định còn hàng).

- `sourceUrl` (String)
  - Link nguồn tham khảo.

## Quan hệ với model `Product`

Khi `insertMany(productsSeed)`:

- các field sẽ được lưu theo schema `models/Product.js`
- nếu seed có thêm field không nằm trong schema, Mongoose có thể bỏ qua (tuỳ strict mode).

Trong dự án hiện tại:

- `stock` là field quan trọng nhất để chạy luồng đặt hàng.

