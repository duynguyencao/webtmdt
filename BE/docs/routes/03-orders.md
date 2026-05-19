# Route Đơn hàng (`routes/orderRouter.js`)

File: `BE/routes/orderRouter.js`

Đây là file “nặng logic” nhất của BE vì nó xử lý:

- đặt hàng (COD / PayOS)
- trừ/hoàn tồn kho
- dùng/hoàn coupon
- trạng thái đơn (pending/confirmed/shipped/delivered/cancelled)
- luồng shipper nhận & giao

## 0.1) Đọc file theo “mốc dòng” (đối chiếu code)

Nếu bạn mở `BE/routes/orderRouter.js` và đọc theo thứ tự, có thể chia thành 5 cụm:

- **Cụm A (L1–L40)**: import + limiter + helper PayOS
- **Cụm B (L41–L160)**: API shipper (available / my-tasks / pickup / deliver / fail)
- **Cụm C (L161–L345)**: buyer tạo đơn `POST /api/orders`
- **Cụm D (L347–L375)**: buyer xem đơn `GET /api/orders/me` (có chặn `x-api-key`)
- **Cụm E (L378–L603)**: admin confirm/cancel + buyer cancel + xem chi tiết + admin list

## 0.2) Các model liên quan

- `Order`: lưu đơn
- `Product`: trừ/hoàn stock
- `Coupon`: validate và consume coupon
- `OrderCounter`: sinh `orderId` an toàn
- `PayOSPaymentEvent`: log khi buyer cancel PayOS & xóa đơn

---

## 1) Rate limit cho đặt hàng (L16–L21)

`orderLimiter`: 15 request / 1 phút.

Mục tiêu:

- tránh spam tạo đơn làm rác DB
- tránh abuse trừ stock

---

## 2) PayOS helpers (L23–L39)

### 2.1) `createPayOSClient()` (L23–L31)

- L23–L26: đọc 3 biến môi trường và `trim()`.
- L27–L29: thiếu key nào thì `throw` để báo cấu hình sai.
- L30: tạo `new PayOS({ clientId, apiKey, checksumKey })`.

### 2.2) `getReturnCancelUrls(req, orderId)` (L33–L39)

- L34: base lấy từ `FE_BASE_URL`, bỏ dấu `/` cuối, fallback `http://localhost:3000`.
- L35: `returnUrl` trỏ về FE trang đơn: `/orders/:orderId`.
- L37: `cancelUrl` trỏ về FE route huỷ: `/payos/cancel?orderId=...`.

---

## 3) Nhóm API cho shipper (L45–L159)

Các API shipper đều yêu cầu:

- `verifyToken`
- `requireRole('shipper')`

### 3.1) `GET /api/orders/shipper/available` (L45–L54)

- Query: `status='confirmed'` và `shipperId=null`.
- `lean()` để nhanh.
- map response để đảm bảo:
  - `status` luôn có (fallback `pending`)
  - `paymentStatus` luôn có (fallback `null`)

### 3.2) `GET /api/orders/shipper/my-tasks` (L56–L65)

- Query: `status='shipped'` và `shipperId=req.userId`.
- Mục tiêu: shipper chỉ thấy “đơn mình đang giữ”.

### 3.3) `PATCH /api/orders/:orderId/pickup` (L67–L83)

Điều kiện chặn:

- L71–L74: không tồn tại / không ở `confirmed` / đã có shipper nhận.

Hành động:

- L76–L79: set `shipperId` + set `status='shipped'` + save.

### 3.4) `PATCH /api/orders/:orderId/deliver` (L85–L105)

Điều kiện chặn:

- L91–L94: phải là đơn `shipped` và đúng shipper đang giữ.

Hành động:

- L96: set `status='delivered'`
- L97–L99: nếu COD thì set `paymentStatus='paid'`

### 3.5) `PATCH /api/orders/:orderId/fail` (L107–L159)

`action` có 2 kiểu:

- `return`: trả về `confirmed` để shipper khác nhận
- `cancel`: huỷ đơn

Chặn:

- L114: chỉ thao tác khi order đang `shipped`
- L115–L117: phải đúng shipper đang giữ
- L127–L129: nếu PayOS đã paid thì không cho shipper huỷ

Huỷ sẽ làm:

- L131–L141: hoàn kho bằng `$inc stock: +qty`
- L143–L151: hoàn coupon nếu:
  - đã consume
  - và `paymentStatus !== 'paid'`
- L153–L155: set `cancelled` và save

---

## 4) Buyer tạo đơn `POST /api/orders` (L161–L345)

Middleware:

- `orderLimiter`
- `verifyToken`
- `validateBody(orderCreateSchema)`

### 4.1) Check input cơ bản (L164–L174)

- Bắt buộc có `customer` và `items` (mảng, không rỗng).
- Bắt buộc `customer.name` và `customer.phone`.
- `paymentMethod` chỉ nhận `cod|payos`.

### 4.2) Sinh `orderId` (L176–L195)

Mục tiêu: tránh trùng khi nhiều người đặt cùng lúc.

- L176–L179: tìm orderId lớn nhất (để bootstrap counter).
- L180–L185: upsert counter `orders` (chỉ set seq khi insert).
- L187–L191: `$inc seq` để lấy số mới.
- L193: format `ORD` + 6 chữ số.
- L194: nếu PayOS thì `paymentStatus='pending_payment'`, COD thì `null`.

### 4.3) Vì sao có session/transaction? (L196–L295)

Đơn hàng đụng tới nhiều thứ:

- đọc Product để check stock
- trừ stock
- tạo Order
- có thể update Coupon

Nếu hệ thống hỗ trợ transaction (replica set) thì code chạy trong transaction để “đỡ lệch”.

Nếu môi trường không hỗ trợ transaction, code fallback chạy bình thường nhưng vẫn giữ update stock kiểu atomic.

### 4.4) `run()` — chuẩn hoá items + tính subtotal (L205–L235)

Với mỗi item:

- L210–L212: lấy `item.id` và ép qty về số nguyên >= 1.
- L214–L220: tìm Product (không deleted) và check `stock >= qty`.
- L222–L230: snapshot vào `normalizedItems` và cộng `subtotal`.

Nếu `normalizedItems` rỗng → throw (L233–L235).

### 4.5) Coupon (L237–L246)

Nếu có `couponCode`:

- normalize uppercase
- find coupon
- `coupon.isAvailable(subtotal)` để kiểm tra điều kiện
- `discount = coupon.calcDiscount(subtotal)` để tính số tiền giảm
- giữ `couponDoc` để xử lý consume sau đó

### 4.6) Trừ tồn kho “chống oversell” (L248–L258)

Trừ stock bằng update có điều kiện:

- filter: `stock >= qty`
- update: `$inc stock: -qty`

Nếu `modifiedCount` = 0 → báo hết hàng.

### 4.7) Tạo Order (L260–L275)

- `total = max(0, subtotal - discount)`
- tạo order với:
  - snapshot items
  - `userId=req.userId`
  - `paymentMethod`, `paymentStatus`
  - `status='pending'`

### 4.8) Consume coupon: COD vs PayOS (L277–L282)

- COD: tăng `coupon.usedCount` ngay và set `order.couponConsumed=true`.
- PayOS: KHÔNG consume ở đây, đợi webhook PayOS.

### 4.9) Nếu COD: trả response ngay (L299–L302)

Trả 201:

- `{ orderId, message: '... chờ admin xác nhận (COD)' }`

### 4.10) Nếu PayOS: tạo payment link (L304–L341)

- Tạo `paymentData` với:
  - `orderCode` (lấy từ số trong `ORDxxxxxx`)
  - `amount` (total)
  - `description` (orderId)
  - `items` (name/quantity/price)
  - `cancelUrl`, `returnUrl`
- Gọi `payOS.paymentRequests.create(...)`
- Lưu metadata vào order:
  - `payosOrderCode`, `payosPaymentLinkId`, `payosReference`
- Nếu fail: vẫn trả orderId (best-effort) để không mất đơn.

---

## 5) Buyer xem đơn `GET /api/orders/me` (L347–L375)

Điểm quan trọng:

- L349: chặn `x-api-key` (bắt buộc phải là Bearer token).
- Có paging:
  - không paging → trả mảng
  - có paging → trả `{ items, page, limit, total }`

---

## 6) Admin confirm / cancel (L378–L442)

### 6.1) `PATCH /:orderId/confirm` (L378–L398)

Chỉ confirm nếu:

- status hiện tại `pending`
- `paymentMethod='cod'`

Set:

- `status='confirmed'`

### 6.2) `PATCH /:orderId/cancel` (L400–L442)

Cho huỷ khi `pending|confirmed`.

Huỷ sẽ:

- hoàn coupon có điều kiện:
  - COD luôn hoàn được
  - PayOS chỉ hoàn nếu `paymentStatus !== 'paid'`
- hoàn stock bằng `$inc stock: +qty`
- set `status='cancelled'`

---

## 7) Buyer huỷ đơn (L444–L557)

### 7.1) `PATCH /:orderId/cancel-by-buyer` (L444–L487)

Buyer chỉ huỷ được khi:

- đơn thuộc về mình
- status đang `pending`

Huỷ sẽ hoàn coupon (nếu cần), hoàn stock, set cancelled.

### 7.2) `PATCH /:orderId/cancel-payos-and-delete` (L489–L557)

Case: buyer bấm huỷ trên PayOS.

Điều kiện:

- payos
- chưa paid
- status pending
- đúng chủ đơn

Hành động:

- best-effort cancel PayOS
- hoàn stock
- ghi tombstone log vào `PayOSPaymentEvent` (`eventType='buyer_cancel'`)
- xóa cứng order (`Order.deleteOne`)

---

## 8) Xem chi tiết đơn `GET /:orderId` (L559–L576)

- Chặn `x-api-key`.
- Admin xem mọi đơn.
- Buyer chỉ xem đơn của mình.

---

## 9) Admin list `GET /api/orders` (L578–L603)

- Search `orderId` bằng regex (có escape).
- Hỗ trợ paging.

