# 06) Validation (kiểm tra dữ liệu đầu vào) — `validation/`

Thư mục: `BE/validation/`

Validation giúp BE:

- Nhận dữ liệu “đúng form” (đỡ lỗi vặt)
- Trả lỗi 400 sớm, message rõ ràng cho FE
- Tránh các trường hợp thiếu field hoặc kiểu dữ liệu sai

## 1) `validation/validate.js`

File này tạo middleware `validateBody(schema)`.

Luồng:

1. Route gọi `validateBody(someSchema)`
2. Middleware chạy `schema.parse(req.body)`
3. Nếu hợp lệ:
   - gán `req.body` bằng dữ liệu đã parse (đã được trim/đúng kiểu theo schema)
   - gọi `next()`
4. Nếu không hợp lệ:
   - trả `400` + message lỗi

## 2) `validation/schemas.js`

File này dùng `zod` để khai báo form chuẩn cho từng API.

Các schema hiện có:

- `registerSchema`: đăng ký (name/email/password)
- `loginSchema`: đăng nhập (email/password)
- `orderCreateSchema`: tạo đơn (customer, items, paymentMethod, coupon…)
- `cartItemUpsertSchema`, `cartReplaceSchema`: giỏ hàng
- `productUpsertSchema`: thêm/sửa sản phẩm
- `productSuggestionsQuerySchema`: query của `/products/suggestions`

Lưu ý quan trọng:

- Schema giúp BE “nhìn một phát biết FE phải gửi gì”.
- Nhưng route vẫn có thể check thêm (vd: check business rule, check tồn kho…).

