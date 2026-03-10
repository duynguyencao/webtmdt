# So sánh nghiệp vụ hiện tại với nền tảng TMĐT chuẩn

## 1. Đã có (FE + BE)

| Nhóm | Tính năng | Ghi chú |
|------|-----------|--------|
| **Auth** | Đăng ký, đăng nhập, JWT, role buyer/admin | Đủ cho shop nhỏ |
| **Sản phẩm** | Danh sách, chi tiết, tìm kiếm, lọc theo danh mục, CRUD (admin) | Có inStock, stock (chưa trừ tồn khi đặt) |
| **Giỏ hàng** | Thêm/sửa/xóa, context React | |
| **Thanh toán** | Form checkout, paymentMethod: `cod` / `bank_transfer` | Đã bỏ MoMo, dùng COD + chuyển khoản VietQR |
| **Đơn hàng** | Tạo đơn, trạng thái (pending→confirmed→shipped→delivered→cancelled), admin xác nhận/hủy, buyer hủy (khi pending) | Thiếu: trạng thái thanh toán cho chuyển khoản |
| **Chatbot** | Gemini + context sản phẩm, lịch sử chat | |
| **Admin** | Sản phẩm, đơn hàng, chi tiết đơn, xác nhận/hủy đơn | Thiếu: “Xác nhận đã thanh toán” cho đơn chuyển khoản |

---

## 2. Còn thiếu so với TMĐT chuẩn

### 2.1 Thanh toán (đang bổ sung)

| Thiếu | Mô tả | Cách bổ sung |
|-------|--------|---------------|
| Chỉ COD + chuyển khoản | Bỏ MoMo | FE: xóa lựa chọn MoMo; BE: chỉ chấp nhận paymentMethod = `cod` \| `bank_transfer` |
| Hướng dẫn chuyển khoản | Sau khi đặt đơn chọn bank, hiển thị STK + nội dung CK = mã đơn + QR VietQR | Cấu hình bank (BE, `.env` + `GET /api/bank/info`); trang “Đặt hàng thành công” và chi tiết đơn hiển thị block chuyển khoản khi paymentMethod = `bank_transfer` (component `BankTransferInfo`) |
| Trạng thái thanh toán | Đơn chuyển khoản: chưa/đã thanh toán | Order.paymentStatus: `pending_payment` \| `paid`; đơn `bank_transfer` mặc định `pending_payment`; admin có nút “Xác nhận đã thanh toán” (`PATCH /api/orders/:orderId/mark-paid`) |
| API cho Power Automate | Tự động xác nhận đơn, lên đơn, gửi mail | API key (x-api-key) cho admin; hoặc Power Automate dùng tài khoản service + JWT |

### 2.2 Đơn hàng & vận hành

| Thiếu | Mô tả | Ưu tiên |
|-------|--------|---------|
| Buyer xem chi tiết 1 đơn | Hiện chỉ có danh sách “Đơn của tôi” | Trung bình (Power Automate gửi mail có link là đủ) |
| Giảm tồn kho khi xác nhận đơn | Product.stock không trừ khi đặt / khi xác nhận | Tùy chọn (Power Automate “lên đơn” có thể đọc đơn rồi xử lý ngoài) |
| Mã vận đơn / trạng thái giao hàng | shipped/delivered chưa có số đơn vận chuyển | Có thể thêm sau (Order.trackingNumber) |

### 2.3 Khác (không bắt buộc cho MVP)

| Thiếu | Ghi chú |
|-------|--------|
| Gửi email trong app | Bạn dùng Power Automate → chỉ cần API trả đủ dữ liệu đơn (GET order detail) |
| Đổi/trả hàng | Có thể làm sau |
| Mã giảm giá | Có thể làm sau |
| Phân quyền chi tiết (nhiều admin) | Role đơn giản admin/buyer là đủ |

---

## 3. Hỗ trợ Power Automate (Microsoft)

### 3.1 Cách Power Automate tương tác với hệ thống

- **HTTP** (Actions “HTTP” / “Invoke REST API”): gọi API backend.
- **Xác thực**:
  - **Cách 1 – JWT:** Flow “Đăng nhập” (POST /api/user/login) → lấy token → gửi header `Authorization: Bearer <token>` cho mọi request sau. Cần xử lý hết hạn token (đăng nhập lại hoặc refresh).
  - **Cách 2 – API Key:** Backend hỗ trợ header `x-api-key: <API_KEY>` cho các route admin; không cần đăng nhập. Khuyến nghị cho automation.

### 3.2 API hữu ích cho Power Automate

| Mục đích | Method | Endpoint | Ghi chú |
|----------|--------|----------|--------|
| Lấy danh sách đơn (admin) | GET | /api/orders | Query: orderId (tùy chọn). Header: **Authorization: Bearer &lt;JWT&gt;** hoặc **x-api-key: &lt;API_KEY&gt;** |
| Chi tiết một đơn | GET | /api/orders/:orderId | Đủ thông tin để gửi mail, lên đơn. Cần admin (JWT hoặc x-api-key). |
| Xác nhận đơn | PATCH | /api/orders/:orderId/confirm | Chuyển pending → confirmed |
| Hủy đơn | PATCH | /api/orders/:orderId/cancel | Admin hủy |
| Xác nhận đã thanh toán (chuyển khoản) | PATCH | /api/orders/:orderId/mark-paid | Chỉ đơn paymentMethod = bank, paymentStatus = pending_payment |

**Cấu hình API Key (tùy chọn):** Trong BE/.env thêm `API_KEY=your-secret-key`. Power Automate gửi header `x-api-key: your-secret-key` thay cho JWT cho các route admin (GET /api/orders, GET /api/orders/:orderId, PATCH confirm/cancel/mark-paid). **Không** dùng x-api-key cho GET /api/orders/me (đơn của buyer — cần JWT).

### 3.3 Ví dụ luồng Power Automate

1. **Khi có đơn mới (định kỳ hoặc trigger):**
   - GET /api/orders (hoặc lấy đơn mới từ nguồn khác nếu có).
   - Lọc đơn `status = pending` (và nếu cần: paymentMethod = bank thì đợi paymentStatus = paid).
   - Gửi mail thông báo cho admin / khách (dùng GET /api/orders/:orderId để lấy nội dung).

2. **Xác nhận đơn / đã thanh toán:**
   - Sau khi kiểm tra (thủ công hoặc quy tắc): PATCH confirm hoặc PATCH mark-paid.
   - (Tùy chọn) Gửi mail “Đơn đã được xác nhận” cho khách.

3. **Lên đơn / xuất kho:**
   - Đọc GET /api/orders/:orderId (items, customer, address).
   - Dùng dữ liệu đó trong flow (tích hợp với hệ thống khác, in phiếu, v.v.).

---

## 4. Đã bổ sung trong code (tóm tắt, theo trạng thái hiện tại)

- **BE:** Chỉ chấp nhận paymentMethod = `cod` | `bank_transfer`; Order có `paymentStatus`; public `GET /api/bank/info` trả thông tin ngân hàng; `PATCH /api/orders/:orderId/mark-paid` cho đơn chuyển khoản; xác thực admin bằng JWT (và có thể mở rộng API key nếu cần cho Power Automate).
- **FE:** Bỏ MoMo; trang “Đặt hàng thành công” và chi tiết đơn hiển thị hướng dẫn chuyển khoản (QR VietQR + STK + nội dung = mã đơn) khi chọn `bank_transfer` (component `BankTransferInfo`); Admin có nút “Xác nhận đã thanh toán” cho đơn chuyển khoản chưa thanh toán.

Bạn có thể dùng Power Automate để tự động hóa xác nhận đơn, lên đơn, gửi mail và các bước khác dựa trên các API trên.
