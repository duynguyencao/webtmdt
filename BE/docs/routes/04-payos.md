# Route PayOS webhook (`routes/payosRouter.js`)

File: `BE/routes/payosRouter.js`

## Đọc theo “mốc dòng” để đối chiếu code

Nếu mở file `BE/routes/payosRouter.js`, có thể đọc theo 3 cụm:

- **Cụm A (L1–L18)**: import + helper tạo PayOS client
- **Cụm B (L19–L152)**: endpoint webhook (toàn bộ logic)
- **Cụm C (L154)**: export router

## Route này làm gì?

PayOS sẽ gọi vào BE (webhook) khi:

- người mua thanh toán thành công
- hoặc có sự kiện trả về từ PayOS

BE dùng webhook để:

- đánh dấu đơn PayOS đã thanh toán (`paymentStatus='paid'`)
- chuyển trạng thái đơn từ pending → confirmed
- consume coupon (nếu có) theo đúng thời điểm
- ghi log sự kiện để đối soát

## Vì sao webhook cần verify chữ ký?

Webhook là request từ bên ngoài vào server.

Nếu không verify chữ ký:

- bất kỳ ai cũng có thể giả mạo request “đã thanh toán”
- dẫn đến đơn bị xác nhận sai

`payOS.webhooks.verify(req.body)` sẽ:

- kiểm tra checksum/signature
- nếu đúng thì trả dữ liệu đã parse

## Endpoint: `POST /api/payos/webhook`

Phần dưới đây bám sát theo đúng các đoạn trong code.

### 1) Tạo PayOS client

Gọi `createPayOSClient()` (đọc env).

Thiếu key sẽ throw và route trả 400.

Đoạn code tương ứng (L9–L17):

- L10–L12: đọc env + trim
- L13–L15: thiếu key → throw
- L16: return `new PayOS(...)`

### 2) Log gọn payload

Code log một số field để debug nhanh:

- description
- orderCode
- success

### 3) Verify và xác định “thành công”

Sau `verify(...)`, code cố gắng xác định thanh toán thành công bằng nhiều cách:

- `webhookData.success === true`
- hoặc `code === '00'`
- hoặc `desc` chứa “thành công”

Nếu không “thành công” → trả 200 ignored.

Lý do trả 200:

- để PayOS không retry liên tục cho các case không cần xử lý.

Đoạn code tương ứng (L29–L43):

- L30: `payOS.webhooks.verify(req.body)` (verify checksum/signature)
- L32–L39: xác định “thành công” theo nhiều field để tăng tương thích payload
- L41–L43: nếu không thành công → `{ received:true, ignored:true }`

### 4) Map về `orderId`

BE có 2 cách map orderId:

- Từ `description` (thường BE set description = orderId khi tạo payment link)
- Hoặc từ `orderCode` (đổi sang `ORDxxxxxx`)

Nếu không map được orderId → trả 200 ignored.

Đoạn code tương ứng (L45–L59):

- L45: ưu tiên lấy từ `description`
- L46–L49: fallback map từ `orderCode` sang `ORDxxxxxx`
- L51: chọn `orderId` theo ưu tiên description → orderCode
- L52–L59: nếu vẫn rỗng → log và ignore

### 5) Tìm order trong DB

Nếu không tìm thấy order:

- ghi log `PayOSPaymentEvent` (orderId + raw payload)
- trả 200 ignored

Case này hay xảy ra khi:

- buyer cancel và BE đã xóa order (`cancel-payos-and-delete`)
- nhưng PayOS webhook đến muộn

Đoạn code tương ứng (L61–L74):

- L61: `Order.findOne({ orderId })`
- L62–L73: nếu không có order:
  - ghi 1 bản `PayOSPaymentEvent` để đối soát
  - ignore với 200

### 6) Chỉ xử lý cho đơn thật sự là PayOS

Nếu `order.paymentMethod !== 'payos'`:

- ghi log event “Ignored: not payos”
- trả 200 ignored

Đoạn code tương ứng (L76–L80):

- Nếu `paymentMethod` không phải payos:
  - log event “Ignored: not payos”
  - ignore

### 7) Nếu order đã cancelled thì bỏ qua

Nếu status cancelled:

- ghi log event
- trả 200 ignored

Mục tiêu:

- không “hồi sinh” đơn đã hủy.

Đoạn code tương ứng (L82–L95):

- Nếu order đã cancelled:
  - log event (để biết webhook đến muộn)
  - ignore

### 8) Check amount (best-effort)

Nếu webhook có `amount`:

- so với `order.total`
- nếu mismatch:
  - ghi log
  - ignore

Mục tiêu:

- chặn tình huống webhook sai tiền (an toàn).

Đoạn code tương ứng (L97–L114):

- Nếu payload có `amount`:
  - so với `order.total`
  - lệch → log event `Amount mismatch...` rồi ignore

### 9) Mark paid + chuyển trạng thái

Nếu order chưa paid:

- set `paymentStatus='paid'`
- nếu status đang `pending` thì set `status='confirmed'`
- save

Đoạn code tương ứng (L116–L122):

- Chỉ set paid nếu chưa paid (để idempotent).
- Nếu status đang pending thì chuyển confirmed.

### 10) Consume coupon (đúng thời điểm)

Với PayOS, coupon chỉ consume khi đã paid:

- nếu `order.couponCode` tồn tại và `couponConsumed=false`
  - tăng `coupon.usedCount`
  - set `order.couponConsumed=true`

Đoạn code tương ứng (L136–L145):

- Chỉ consume khi:
  - `paymentStatus === 'paid'`
  - có `couponCode`
  - `couponConsumed === false`

### 11) Ghi log thành công (idempotency)

Cuối route có tạo `PayOSPaymentEvent` (best-effort) để:

- lưu lại event webhook
- phục vụ đối soát sau này

Đoạn code tương ứng (L124–L134):

- Luôn cố gắng ghi 1 event webhook (best-effort).
- Mục tiêu: debug và đối soát (không ảnh hưởng flow chính nếu log fail).

