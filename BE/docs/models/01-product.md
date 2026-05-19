# Model `Product` (`models/Product.js`)

File: `BE/models/Product.js`

## Product lưu gì?

`Product` là dữ liệu để FE:

- hiển thị danh sách sản phẩm
- hiển thị chi tiết sản phẩm
- biết sản phẩm còn hàng hay hết hàng
- hiển thị rating và số review

## Các field chính

- `id` (Number)
  - ID “tự quản” của sản phẩm (không dùng `_id` của MongoDB).
  - `unique: true` nghĩa là không được trùng.

- `name`, `brand`, `category` (String)
  - Thông tin cơ bản của sản phẩm.
  - Hiện BE đang “fix cứng” category là `vot` ở `productRouter.js`.

- `price` (Number)
  - Giá bán hiện tại.

- `originalPrice` (Number, optional)
  - Giá gốc, dùng khi sản phẩm đang sale.

- `image` (String) và `images` (Array[String])
  - Ảnh đại diện và danh sách ảnh.

- `description` (String)
  - Mô tả sản phẩm.

- `specifications` (Mixed)
  - Thông số kỹ thuật dạng “tự do”, vì mỗi sản phẩm có thể khác nhau.

- `rating` (Number, default 0) và `reviews` (Number, default 0)
  - BE cập nhật lại 2 giá trị này từ `reviewRouter.js` (tính trung bình rating và số lượng review).

- `sale` (Boolean, default false)
  - Có đang sale không.

- `stock` (Number, default 0)
  - **Nguồn sự thật về tồn kho**.
  - Các luồng đặt hàng / huỷ đơn / cron PayOS đều tăng/giảm field này.

- `isDeleted` (Boolean, default false)
  - Xoá mềm: admin “ẩn” sản phẩm để không hiện trên FE,
  - nhưng vẫn giữ lại trong DB để không làm hỏng lịch sử đơn hàng.

## `timestamps: true` có tác dụng gì?

Mongoose tự tạo thêm:

- `createdAt`: lúc tạo sản phẩm
- `updatedAt`: lúc cập nhật

## Vì sao có `toJSON.transform`?

Mặc định MongoDB có `_id` và `__v`.

API trả về cho FE thường không cần các field đó, nên code xoá đi để response gọn hơn.

