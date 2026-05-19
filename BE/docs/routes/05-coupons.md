# Route Coupon (`routes/couponRouter.js`)

File: `BE/routes/couponRouter.js`

## Route này làm gì?

- Cho FE kiểm tra mã giảm giá trước khi đặt hàng
- Cho admin quản lý coupon (tạo/sửa/xóa/list)

Model liên quan: `models/Coupon.js`

## Helper: `normalizeCode(code)`

Chuẩn hóa code:

- trim
- uppercase

Để tránh case FE gửi `sale10` nhưng DB lưu `SALE10`.

## 1) `GET /api/coupons/validate` (công khai)

Query:

- `code`: mã coupon
- `orderTotal`: tổng tiền hàng (để check minOrderTotal và tính discount)

Luồng:

1. Check `code` có không
2. Tìm coupon theo `code`
3. Gọi `coupon.isAvailable(orderTotal)`:
   - nếu không ok → trả 400 + reason
4. Tính `discount = coupon.calcDiscount(orderTotal)`
5. Trả JSON:
   - code, type, value, discount, finalTotal

## 2) Admin endpoints (cần đăng nhập + role admin)

Middleware dùng:

- `verifyToken`
- `requireRole('admin')`

### 2.1) `GET /api/coupons`

- List toàn bộ coupon (sort mới nhất trước).

### 2.2) `POST /api/coupons`

Tạo coupon mới.

Body hỗ trợ:

- `code` (bắt buộc)
- `type`: `fixed` hoặc mặc định percent
- `value`
- `minOrderTotal`
- `maxDiscount`
- `startAt`, `endAt`
- `usageLimit`
- `active`

Có validate business rule:

- value > 0
- percent <= 90

### 2.3) `PUT /api/coupons/:code`

Sửa coupon.

Đặc điểm:

- Nếu FE không gửi `startAt/endAt` thì giữ nguyên giá trị cũ.
- Validate tương tự create.

### 2.4) `DELETE /api/coupons/:code`

Xóa coupon khỏi DB.

Lưu ý:

- Đây là xóa cứng (khác với product là xóa mềm).

