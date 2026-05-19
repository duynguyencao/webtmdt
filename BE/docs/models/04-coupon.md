# Model `Coupon` (`models/Coupon.js`)

File: `BE/models/Coupon.js`

## Coupon là gì?

Coupon là “mã giảm giá” mà người mua nhập khi đặt hàng.

Coupon có thể:

- giảm theo **%** (percent)
- giảm theo **số tiền cố định** (fixed)

## Field và ý nghĩa

- `code` (String, unique)
  - Mã coupon, luôn uppercase + trim.

- `type` (String, enum `percent|fixed`)
  - percent: giảm theo %
  - fixed: giảm số tiền cố định

- `value` (Number)
  - Nếu percent: value là % (ví dụ 10 = giảm 10%)
  - Nếu fixed: value là số tiền giảm

- `minOrderTotal` (Number)
  - Đơn tối thiểu bao nhiêu mới được áp mã.

- `maxDiscount` (Number)
  - Trần giảm tối đa (đặc biệt hữu ích khi giảm theo %).

- `startAt`, `endAt` (Date | null)
  - Thời gian bắt đầu/kết thúc hiệu lực.

- `usageLimit` (Number)
  - Tổng lượt dùng tối đa (0 nghĩa là không giới hạn).

- `usedCount` (Number)
  - Đã dùng bao nhiêu lượt.

- `active` (Boolean)
  - Admin có thể khoá/mở coupon.

## Method 1: `isAvailable(orderTotal)`

Hàm này trả về:

- `{ ok: true }` nếu dùng được
- `{ ok: false, reason: '...' }` nếu không dùng được

Nó kiểm tra theo thứ tự:

- coupon có active không
- đã tới ngày bắt đầu chưa
- đã qua ngày kết thúc chưa
- có vượt usageLimit không
- đơn có đủ `minOrderTotal` không

## Method 2: `calcDiscount(orderTotal)`

Hàm này tính ra **số tiền giảm**.

Quy tắc chính:

- percent: `discount = round(total * value/100)`
- fixed: `discount = value`
- áp `maxDiscount` nếu có
- không bao giờ giảm quá `orderTotal`

## `toJSON.transform`

Xoá `_id`, `__v` cho gọn response.

