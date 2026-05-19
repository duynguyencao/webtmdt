# Model `PayOSPaymentEvent` (`models/PayOSPaymentEvent.js`)

File: `BE/models/PayOSPaymentEvent.js`

## Model này dùng để làm gì?

Đây là bảng log để lưu “sự kiện thanh toán PayOS”.

Nó giúp:

- đối soát khi có webhook đến muộn
- debug khi đơn đã bị xóa nhưng PayOS vẫn gửi webhook
- xem lịch sử các lần nhận webhook/cancel

## Field và ý nghĩa

- `orderId` (String)
  - Mã đơn `ORDxxxxxx`.

- `orderCode` (Number)
  - Mã số mà PayOS dùng.

- `paymentLinkId` (String)
  - ID của payment link trên PayOS.

- `amount` (Number)
  - Số tiền PayOS báo.

- `code`, `desc` (String)
  - Thông tin trả về (mô tả trạng thái).

- `eventType` (String)
  - `webhook` | `buyer_cancel` | `cron_cancel` | `unknown`

- `receivedAt` (Date)
  - Thời điểm nhận sự kiện.

- `raw` (Mixed)
  - Lưu payload thô để debug.

## Index

- index theo `receivedAt` giảm dần để xem log mới nhất nhanh.

