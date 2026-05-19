# Job tự hủy đơn PayOS pending (`jobs/autoCancelPendingPayOS.js`)

File: `BE/jobs/autoCancelPendingPayOS.js`

## Vì sao cần job này?

Với PayOS, có tình huống:

- User tạo đơn → BE trừ tồn kho → tạo link PayOS
- Nhưng user **không thanh toán** (thoát trang / quên)

Nếu không xử lý:

- Đơn “treo” mãi
- Tồn kho bị trừ oan
- Coupon có thể bị trừ sai (tuỳ logic)

Job này giải quyết bằng cách:

- quét các đơn PayOS pending lâu
- nếu vẫn chưa thanh toán thì huỷ, hoàn kho, hoàn coupon (nếu cần)

## Khi nào job chạy?

Cron: `*/5 * * * *` nghĩa là **mỗi 5 phút** chạy 1 lần.

## “Đơn nào” sẽ bị quét?

Job tìm:

- `paymentMethod: 'payos'`
- `paymentStatus: 'pending_payment'`
- `status: 'pending'`
- `createdAt < now - 15 phút`

Giới hạn mỗi lần xử lý tối đa `50` đơn để tránh quá tải.

## Luồng xử lý cho từng đơn

### Bước 1: kiểm tra “đã thanh toán thật chưa?”

Job gọi PayOS API để check trạng thái thật.

Mục đích:

- phòng trường hợp webhook đến trễ hoặc webhook lỗi
- tránh huỷ nhầm đơn đã trả tiền

Nếu PayOS báo **paid/success**:

- set `order.paymentStatus = 'paid'`
- nếu order đang pending thì set `order.status = 'confirmed'`
- nếu có coupon và chưa `couponConsumed` thì tăng `usedCount` và set `couponConsumed=true`
- save order

### Bước 2: nếu chưa paid → huỷ và hoàn

1. **Hoàn kho**: với mỗi item trong order:
   - `Product.stock += quantity`
2. **Hoàn coupon** (nếu đơn đã consume):
   - `Coupon.usedCount -= 1` (không âm)
   - set `order.couponConsumed=false`
3. **Best-effort cancel payment request** trên PayOS
4. set `order.status = 'cancelled'`
5. save

## Lưu ý thiết kế

- Job này ưu tiên “không huỷ nhầm” hơn là “huỷ cho nhanh”.
- Nếu PayOS API có lỗi tạm thời, job sẽ bỏ qua đơn đó để lần sau thử lại.

