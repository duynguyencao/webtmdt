# Model `Cart` (`models/Cart.js`)

File: `BE/models/Cart.js`

## Cart dùng để làm gì?

Cart là “giỏ hàng” lưu theo từng user đã đăng nhập.

Ý tưởng:

- Khi user thêm sản phẩm vào giỏ, BE lưu lại.
- Khi user mở lại website, gọi API giỏ hàng sẽ thấy vẫn còn.

## Cấu trúc dữ liệu

### 1) `userId`

- `userId` (ObjectId, ref `User`, required, unique)
  - Mỗi user chỉ có 1 cart.

### 2) `items`

`items` là mảng `cartItemSchema`, mỗi item gồm:

- `productId` (Number): id của sản phẩm (`Product.id`)
- `quantity` (Number, min 1): số lượng

Lưu ý:

- Cart chỉ lưu `productId` + `quantity` để gọn.
- Khi trả API, `cartRouter.js` sẽ “expand” (lấy thêm name/price/stock từ `Product`).

## `timestamps`

Tự có `createdAt` và `updatedAt`.

## `toJSON.transform`

Xoá `_id`, `__v` để response gọn.

