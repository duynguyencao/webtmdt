# Nghiên cứu: Thanh toán chuyển khoản ngân hàng (VietQR) cho ShopTD

## 1. Tổng quan lựa chọn hiện tại

| Phương thức | Cách làm phổ biến | Tự động hóa | Độ phức tạp |
|-------------|-------------------|-------------|-------------|
| **COD** | Đã có: thanh toán khi nhận hàng | Không cần | Đơn giản |
| **Chuyển khoản ngân hàng (VietQR)** | Hiển thị QR VietQR + STK + nội dung CK (mã đơn) → khách chuyển → admin xác nhận khi thấy tiền | Bán thủ công (admin ấn “Đã thanh toán”) | Trung bình |
| **Ví MoMo** | *Chỉ nghiên cứu, **chưa triển khai** trong code hiện tại* | Có (qua IPN, nếu sau này dùng) | Cao (cần đăng ký M4B, credentials) |

---

## 2. Chuyển khoản ngân hàng (đã triển khai)

### Quy trình thường dùng trên các sàn/website nhỏ

1. **Khách chọn “Chuyển khoản qua ngân hàng (QR)”** (`paymentMethod = 'bank_transfer'`) khi thanh toán.
2. **Sau khi đặt hàng thành công**, trang hiển thị block **Thông tin chuyển khoản** (component `BankTransferInfo` trên FE) gồm:
   - **Ngân hàng** (Vietcombank – cấu hình trong `BE/.env`)
   - **Số tài khoản**, **tên chủ tài khoản**
   - **Mã QR VietQR động** (`https://img.vietqr.io/...`) sinh từ BIN + STK + số tiền + nội dung
   - **Số tiền cần chuyển** (bằng tổng đơn)
   - **Nội dung chuyển khoản**: bắt buộc ghi **mã đơn** (vd: `ORD000001`) để đối soát.
3. **Khách tự chuyển** qua app/ngân hàng, có thể chụp biên lai (tùy shop).
4. **Admin** khi thấy tiền về (hoặc nhận ảnh biên lai) thì:
   - Vào chi tiết đơn (`/admin/orders/:orderId`) → dùng nút **“Xác nhận đã thanh toán”**,
   - Nút này gọi API `PATCH /api/orders/:orderId/mark-paid` để cập nhật **`paymentStatus: 'paid'`** (đơn bank chuyển từ `pending_payment` → `paid`).

### Kỹ thuật đã dùng (BE + FE)

- **BE**:
  - Lưu `paymentMethod` (hiện tại: `'cod' | 'bank_transfer'`).
  - Dùng `paymentStatus: null | 'pending_payment' | 'paid'` để tách “đã đặt hàng” và “đã nhận tiền” cho đơn chuyển khoản.
  - Cấu hình thông tin ngân hàng trong `BE/.env`: `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_HOLDER`, `BANK_BIN`.
  - Public API: `GET /api/bank/info` trả về thông tin trên cho FE.
- **FE**:
  - Ở trang Checkout: nếu chọn `"Chuyển khoản qua ngân hàng (QR)"` thì sau khi đặt hàng thành công, màn hình xác nhận hiển thị component `BankTransferInfo` (QR + thông tin tài khoản + nội dung = mã đơn).
  - Trang “Đơn hàng của tôi” + chi tiết đơn (`MyOrderDetail`) cũng hiển thị lại block chuyển khoản cho đơn `paymentMethod = 'bank_transfer'`.
- **Admin**: Trong chi tiết đơn, nếu đơn chọn chuyển khoản và `paymentStatus === 'pending_payment'` thì có nút **“Xác nhận đã thanh toán”** → gọi `PATCH /api/orders/:orderId/mark-paid` để cập nhật trạng thái.

**Không cần** kết nối trực tiếp API ngân hàng; chỉ cần dùng VietQR + quy trình xác nhận thủ công.

---

## 3. Ví MoMo (chỉ nghiên cứu, chưa dùng trong code)

### Luồng chuẩn (MoMo Developers)

1. **Đăng ký MoMo For Business (M4B)** và lấy thông tin tích hợp:
   - **Partner Code**
   - **Access Key**
   - **Secret Key**
2. **Tạo thanh toán (backend)**:
   - Gọi **POST** `https://test-payment.momo.vn/v2/gateway/api/create` (test) hoặc `https://payment.momo.vn/...` (production).
   - Body gồm: `partnerCode`, `requestId`, `orderId`, `amount`, `orderInfo`, `redirectUrl`, `ipnUrl`, `requestType: "captureWallet"`, `lang`, `signature`.
   - **Chữ ký**: HMAC SHA256 với chuỗi tham số được sắp xếp a-z (theo [tài liệu chữ ký MoMo](https://developers.momo.vn/v3/vi/docs/payment/api/other/signature)).
3. **MoMo trả về** `payUrl` (và có thể `deeplink`, `qrCodeUrl`). Redirect khách sang `payUrl`.
4. **Khách thanh toán** trên trang/app MoMo.
5. **Kết quả**:
   - **Redirect**: MoMo redirect khách về `redirectUrl` của bạn kèm query params (vd: `resultCode`, `orderId`, …).
   - **IPN (webhook)**: MoMo gọi `ipnUrl` (server-to-server) để báo kết quả. Backend **nên** cập nhật trạng thái đơn/thanh toán theo IPN (và kiểm tra chữ ký).

### Kỹ thuật gợi ý (BE + FE)

- **BE**:
  - Lưu cấu hình MoMo (partnerCode, accessKey, secretKey) trong `.env`, không commit lên git.
  - Endpoint ví dụ: `POST /api/orders/:orderId/create-momo-payment` (hoặc tạo đơn xong gọi luôn): tính `signature`, gọi MoMo `create`, trả về `payUrl` cho FE.
  - Endpoint `POST /api/payment/momo/ipn`: nhận callback từ MoMo, verify signature, cập nhật đơn (vd: đánh dấu đã thanh toán / trạng thái đơn). Trả về status 204/200 để MoMo biết đã nhận.
- **FE**:
  - Sau khi tạo đơn với `paymentMethod: 'momo'`, gọi API lấy `payUrl` rồi `window.location.href = payUrl`.
  - Trang “Return URL” (sau khi MoMo redirect về): đọc query params, hiển thị “Thanh toán thành công” / “Đã hủy” và link về “Đơn của tôi” hoặc trang chủ.

### Lưu ý

- **Test**: Dùng [MoMo sandbox/test](https://developers.momo.vn/v3/vi/docs/payment/onboarding/test-instructions), app MoMo Test và tài khoản test.
- **Production**: Đăng ký M4B, xác thực doanh nghiệp, bật môi trường production và dùng domain thật cho `redirectUrl` và `ipnUrl` (MoMo thường yêu cầu HTTPS).
- **Bảo mật**: Luôn kiểm tra chữ ký IPN; không tin chỉ query params từ redirect (có thể giả mạo).

---

## 4. Gợi ý triển khai theo giai đoạn

### Giai đoạn 1 – Nhanh (không phụ thuộc bên thứ 3)

- **Chuyển khoản ngân hàng**:
  - Thêm lựa chọn “Chuyển khoản ngân hàng” ở trang thanh toán.
  - Sau khi đặt hàng với phương thức này: hiển thị trang “Hướng dẫn chuyển khoản” (ngân hàng, STK, tên TK, số tiền, **nội dung chuyển khoản = mã đơn**).
  - Trong admin: thêm trạng thái/nút “Xác nhận đã thanh toán” cho đơn chọn bank, khi đã thấy tiền thì ấn xác nhận.

### Giai đoạn 2 – Tự động hóa MoMo

- Đăng ký M4B (test trước).
- Backend: endpoint tạo link MoMo + endpoint IPN, verify signature, cập nhật đơn.
- Frontend: chọn MoMo → tạo đơn (hoặc tạo đơn rồi chọn MoMo) → redirect sang MoMo → trang return xử lý và hiển thị kết quả.

---

## 5. Tóm tắt

| Nội dung | Chuyển khoản | MoMo |
|----------|--------------|------|
| **Cách làm tốt nhất** | Hiển thị STK + nội dung CK = mã đơn; admin xác nhận khi thấy tiền | Dùng API MoMo: tạo payUrl → redirect → xử lý IPN + return URL |
| **Tự động** | Bán thủ công (admin ấn “Đã thanh toán”) | Tự động (cập nhật theo IPN) |
| **Cần đăng ký** | Không (chỉ cần STK shop) | Có (MoMo For Business) |
| **Bảo mật** | Không phát sinh thêm API | Bắt buộc verify chữ ký MoMo (HMAC SHA256) |

Nếu bạn muốn, bước tiếp theo có thể là: (1) chỉ làm **chuyển khoản** (cấu hình bank, trang hướng dẫn, nút admin xác nhận đã thanh toán), hoặc (2) làm cả **chuyển khoản + MoMo** (thêm API tạo MoMo, IPN, và luồng redirect/return trên FE).
