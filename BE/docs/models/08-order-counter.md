# Model `OrderCounter` (`models/OrderCounter.js`)

File: `BE/models/OrderCounter.js`

## Vì sao cần OrderCounter?

Nếu tạo `orderId` bằng kiểu “đếm số lượng đơn rồi +1” sẽ gặp lỗi khi:

- nhiều người đặt hàng cùng lúc
- 2 request cùng đọc “last number” giống nhau

Kết quả: trùng `orderId`.

`OrderCounter` là một “máy đếm” trong DB để sinh số thứ tự **an toàn hơn**.

## Cấu trúc

- `name` (String, unique)
  - tên counter, ở đây dùng `orders`.

- `seq` (Number)
  - số thứ tự hiện tại.

## Nó được dùng ở đâu?

Trong `routes/orderRouter.js`, khi tạo đơn:

- Upsert counter nếu chưa có
- `$inc: { seq: 1 }` để lấy số mới
- Format thành `ORD000001`

