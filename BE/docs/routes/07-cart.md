# Route Giỏ hàng (`routes/cartRouter.js`)

File: `BE/routes/cartRouter.js`

## Route này làm gì?

Giỏ hàng được lưu theo user đã đăng nhập.

Route cung cấp:

- lấy giỏ
- replace toàn bộ giỏ
- thêm/sửa 1 item
- xóa 1 item

Models:

- `Cart`
- `Product` (để expand item ra thông tin hiển thị)

## Khái niệm: “expand cart items”

DB chỉ lưu:

- `productId`
- `quantity`

Nhưng FE cần hiển thị:

- tên, giá, ảnh, sale, stock…

`expandCartItems(items)` sẽ:

1. gom danh sách productId unique
2. query Product theo list id
3. map productId → product
4. trả ra mảng item đã mở rộng:
   - `id`, `name`, `brand`, `image`, `price`, `sale`, `stock`, `quantity`

## Helper: `normalizeIncomingItems(items)`

Chấp nhận client gửi:

- `productId` hoặc `id`

Mục tiêu:

- normalize về `{ productId, quantity }`
- ép `quantity` về số nguyên >= 1

## 1) `GET /api/cart` (JWT)

Middleware: `verifyToken`

Luồng:

- tìm cart theo `userId`
- lấy `cart.items`
- `expandCartItems`
- trả `{ items: expanded }`

## 2) `PUT /api/cart` — replace toàn bộ

Middleware:

- `verifyToken`
- validate body `cartReplaceSchema`

Luồng:

- normalize items
- `findOneAndUpdate`:
  - filter: `{ userId }`
  - `$set: { items: incoming }`
  - `upsert: true` (chưa có cart thì tạo)
- expand và trả về

## 3) `POST /api/cart/items` — add/update 1 item

Middleware:

- `verifyToken`
- validate body `cartItemUpsertSchema`

Luồng:

- normalize item
- nếu cart chưa có:
  - tạo cart mới với 1 item
- nếu cart có:
  - nếu đã có productId → update quantity
  - nếu chưa có → push item mới
- save, expand, trả về

## 4) `DELETE /api/cart/items/:productId/:sku`

Middleware: `verifyToken`

Xóa item theo `productId`.

Ghi chú:

- Route có `:sku` nhưng hiện logic không dùng (legacy).

