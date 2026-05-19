# Model `Review` (`models/Review.js`)

File: `BE/models/Review.js`

## Review dùng để làm gì?

Review là đánh giá sản phẩm của người mua.

Điểm quan trọng của hệ thống này:

- Chỉ cho phép review khi **đơn hàng đã giao thành công** (status `delivered`) và trong đơn có sản phẩm đó (logic nằm ở `routes/reviewRouter.js`).

## Field và ý nghĩa

- `productId` (Number, required, index)
  - ID sản phẩm (theo `Product.id`).

- `userId` (ObjectId, ref `User`, required, index)
  - Ai review.

- `orderId` (String, required, index)
  - Mã đơn mà review này gắn vào.
  - Dùng để đảm bảo “mỗi lần mua chỉ review 1 lần”.

- `rating` (Number, 1..5)
  - Số sao.

- `comment` (String)
  - Nội dung đánh giá.

- `verified` (Boolean)
  - Trong code hiện tại, khi đã kiểm tra đơn delivered thì set `true`.

## Unique index: (productId, userId, orderId)

`reviewSchema.index({ productId: 1, userId: 1, orderId: 1 }, { unique: true })`

Nghĩa là:

- cùng 1 user, cùng 1 sản phẩm, cùng 1 order → chỉ có tối đa 1 review.

Lợi ích:

- chặn spam review (double submit)
- chặn user review nhiều lần cho 1 lần mua

## `toJSON.transform`

- Trả thêm `id` là `_id` dạng string
- Xóa `_id`, `__v`

