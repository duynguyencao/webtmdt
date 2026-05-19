# 01) Tổng quan BE (Backend) làm gì?

BE là “phần server” đứng giữa FE (giao diện) và database (MongoDB).

Nói đơn giản: **FE bấm gì → gọi API → BE xử lý → đọc/ghi DB → trả JSON về FE**.

## BE đang cung cấp những nhóm chức năng nào?

- **Sản phẩm**: xem danh sách, xem chi tiết, tìm kiếm, gợi ý search, top bán chạy…
- **Tài khoản**: đăng ký, xác thực email, đăng nhập, lấy thông tin “tôi là ai”
- **Giỏ hàng**: lưu giỏ theo user
- **Đơn hàng**: đặt hàng (COD/PayOS), xem đơn của tôi, admin duyệt/hủy, shipper nhận & giao
- **Coupon**: validate mã giảm giá, admin CRUD coupon
- **PayOS**: nhận webhook “đã thanh toán”
- **Đánh giá (Review)**: người mua đánh giá sau khi giao thành công, cập nhật rating sản phẩm
- **Site config**: cấu hình trang chủ (hero title, ảnh…)
- **Chatbot**: Gemini tư vấn (dùng danh sách sản phẩm từ DB làm ngữ cảnh)

## Các khối chính trong code BE

- `index.js`: file chạy đầu tiên, dựng server và gắn router
- `db/`: kết nối MongoDB
- `models/`: định nghĩa dữ liệu (Product, Order, User, …)
- `routes/`: định nghĩa API endpoint và logic xử lý request/response
- `middleware/`: lớp chặn/kiểm tra trước khi vào route (đăng nhập, quyền…)
- `validation/`: kiểm tra dữ liệu FE gửi lên có đúng định dạng không
- `services/`: logic dùng chung (chatbot, lấy context sản phẩm)
- `jobs/`: công việc chạy định kỳ (cron)
- `seed/`, `scripts/`: đổ dữ liệu mẫu và các script quản trị/migrate

## Luồng chạy tổng quát (đọc theo thứ tự)

1. Chạy `node index.js` (hoặc `npm run dev`)
2. `index.js` đọc `.env`
3. `index.js` gọi `connectDB()` để nối MongoDB
4. `index.js` cấu hình bảo vệ cơ bản (CORS, helmet, rate-limit)
5. `index.js` gắn các router `/api/...`
6. Client gọi API:
   - Request đi qua middleware (nếu route yêu cầu đăng nhập/quyền)
   - Route đọc/ghi models
   - Trả JSON

