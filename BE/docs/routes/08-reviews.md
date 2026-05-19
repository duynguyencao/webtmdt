# Route Review (`routes/reviewRouter.js`)

File: `BE/routes/reviewRouter.js`

## Route này làm gì?

- Lấy danh sách review của một sản phẩm (công khai)
- Cho buyer đăng nhập đánh giá sau khi đã nhận hàng
- Cho chủ review sửa/xóa review
- Tự cập nhật `Product.rating` và `Product.reviews` sau mỗi thay đổi

Models:

- `Review`
- `Order` (để kiểm tra “đã mua và đã delivered chưa”)
- `User` (lấy tên hiển thị)
- `Product` (update rating/reviews)

## Helper 1: `clampRating(value)`

Ép rating về khoảng 1..5, làm tròn.

## Helper 2: `recomputeProductRating(productId)`

Luồng:

1. Aggregate Review theo `productId`:
   - tính `avg` rating
   - tính `count` review
2. Làm tròn avg 1 chữ số thập phân
3. Update Product:
   - `rating = avg`
   - `reviews = count`

Vì sao làm vậy?

- Product có thể hiển thị rating/reviews rất nhanh ở list page
- Không phải mỗi lần render lại aggregate toàn bộ review

## 1) `GET /api/reviews/product/:productId` (công khai)

Luồng:

- parse `productId`
- find Review theo productId, sort mới nhất trước
- populate `userId` lấy `name`
- trả JSON gồm:
  - id review
  - userName gọn (compact)

## Helper: chọn `orderId` hợp lệ để review

`pickDeliveredOrderId(userId, productId, preferredOrderId)`:

- Nếu client gửi `orderId`:
  - kiểm tra order đó có:
    - đúng user
    - status `delivered`
    - có chứa sản phẩm
  - nếu đúng thì dùng, không đúng trả null
- Nếu client không gửi:
  - tìm đơn delivered mới nhất có sản phẩm đó

Mục tiêu:

- đảm bảo chỉ review khi đã giao hàng thành công

## 2) `POST /api/reviews` (JWT)

Middleware: `verifyToken`

Body:

- `productId`
- `orderId` (optional)
- `rating`
- `comment`

Luồng:

1. validate `productId`, `rating`
2. tìm `orderId` delivered hợp lệ bằng helper
   - nếu không có → 403 “chỉ được đánh giá sau khi giao thành công”
3. check trùng review:
   - find Review theo (productId, userId, orderId)
   - nếu có → 409
4. tạo review (verified=true)
5. recomputeProductRating
6. trả review + userName + summary product

Nếu trùng do race (unique index):

- Mongo trả code 11000 → route trả 409.

## 3) `PUT /api/reviews/:id` (JWT)

Chỉ chủ review được sửa:

- find review
- check `review.userId === req.userId`
- update rating/comment
- save
- recomputeProductRating

## 4) `DELETE /api/reviews/:id` (JWT)

Chỉ chủ review được xóa:

- find review
- check owner
- delete
- recomputeProductRating

