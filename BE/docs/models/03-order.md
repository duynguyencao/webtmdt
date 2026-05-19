# Model `Order` (`models/Order.js`)

File: `BE/models/Order.js`

## `Order` là gì?

`Order` là một “đơn đặt hàng”.

Nó lưu:

- ai đặt
- đặt những sản phẩm nào
- tổng tiền
- trạng thái đơn (đang chờ / đã xác nhận / đang giao / đã giao / đã hủy)
- trạng thái thanh toán (COD hay PayOS, đã trả tiền chưa)

## Các field quan trọng

### 1) Mã đơn và liên kết người dùng

- `orderId` (String, unique, required)
  - Mã đơn dạng `ORD000001`.
  - Dùng để hiển thị và tra cứu.

- `userId` (ObjectId, ref `User`)
  - User đã đặt đơn.

- `shipperId` (ObjectId, ref `User`, default null)
  - Shipper đang “giữ” đơn (khi đã nhận giao).

### 2) Thông tin người nhận (snapshot)

`customer` là object gồm name/phone/email/address/city/district/ward…

Tại sao lưu “snapshot”?

- Nếu user sau này đổi địa chỉ trong profile thì **đơn cũ vẫn giữ đúng địa chỉ lúc đặt**.

### 3) Danh sách sản phẩm trong đơn

`items` là mảng `orderItemSchema` gồm:

- `id`: id sản phẩm (theo `Product.id`)
- `name`, `brand`, `image`: snapshot để lịch sử đơn không phụ thuộc việc product đổi tên/ảnh
- `price`: giá tại thời điểm đặt
- `quantity`: số lượng

### 4) Tiền

- `subtotal`: tổng tiền hàng (chưa trừ giảm)
- `discount`: số tiền giảm (từ coupon)
- `total`: tổng thanh toán cuối (subtotal - discount)

### 5) Coupon

- `couponCode`: mã coupon đã dùng (nếu có)
- `couponConsumed` (Boolean):
  - dùng để xử lý PayOS an toàn
  - PayOS: chỉ “consume” coupon khi thanh toán thành công (webhook)
  - COD: consume ngay khi tạo đơn

### 6) Thanh toán

- `paymentMethod`: `cod` hoặc `payos`
- `paymentStatus`: `pending_payment` hoặc `paid`
  - COD: thường `null` lúc tạo, đến khi giao thành công mới set paid
  - PayOS: lúc tạo đơn sẽ set `pending_payment`

### 7) Metadata PayOS

Các field này hỗ trợ đối soát webhook:

- `payosOrderCode` (Number)
- `payosPaymentLinkId` (String)
- `payosReference` (String)

### 8) Trạng thái đơn

`status` enum:

- `pending`: mới tạo, chờ xác nhận
- `confirmed`: admin xác nhận (COD) hoặc PayOS đã thanh toán
- `shipped`: shipper nhận giao
- `delivered`: giao thành công
- `cancelled`: bị hủy

## Indexes (tăng tốc query)

Trong file có các index “cho query hay dùng”:

- `{ userId: 1, createdAt: -1 }`: list đơn của tôi
- `{ status: 1, shipperId: 1, createdAt: -1 }`: list đơn theo shipper + trạng thái
- `{ paymentMethod: 1, paymentStatus: 1, status: 1, createdAt: -1 }`: quét đơn PayOS pending theo thời gian

## `toJSON.transform`

Khi trả order ra API:

- `ret.id` = `_id` dạng string
- xóa `_id`, `__v`

