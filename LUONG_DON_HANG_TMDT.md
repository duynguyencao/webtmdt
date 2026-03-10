# Luồng đơn hàng thương mại điện tử (tham khảo Shopee, Lazada, eBay)

## 1. Các trạng thái đơn hàng thường gặp

| Trạng thái        | Mô tả ngắn |
|-------------------|------------|
| **Chờ xác nhận**  | Đơn mới tạo, chờ shop/admin xác nhận (có hàng, địa chỉ hợp lệ). |
| **Đã xác nhận**   | Shop đã xác nhận, chuẩn bị đóng gói / giao cho vận chuyển. |
| **Đang giao**     | Đơn đã giao cho đơn vị vận chuyển, đang trên đường. |
| **Đã giao**       | Khách đã nhận hàng, hoàn tất. |
| **Đã hủy**        | Đơn bị hủy (do khách hoặc shop). |

Một số sàn còn có: **Chờ thanh toán**, **Đang xử lý**, **Trả hàng**, v.v. Với shop nhỏ có thể bắt đầu với 5 trạng thái trên.

---

## 2. Ai làm gì ở từng bước

### Khi khách nhấn « Đặt hàng »

- Hệ thống tạo đơn với trạng thái **Chờ xác nhận**.
- Admin thấy đơn mới trong trang quản lý đơn.

### Admin (shop)

- **Xác nhận đơn**: Chuyển trạng thái sang **Đã xác nhận** (đồng nghĩa shop chấp nhận đơn, sẽ xử lý).
- **Hủy đơn**: Chuyển sang **Đã hủy** (hết hàng, sai địa chỉ, khách yêu cầu hủy, v.v.).

Thông thường admin chỉ **xác nhận** hoặc **hủy** khi đơn còn ở **Chờ xác nhận** (hoặc **Đã xác nhận** trước khi giao). Sau khi **Đang giao** / **Đã giao** thì không cho hủy nữa (hoặc xử lý theo chính sách trả hàng).

### Người mua (buyer)

- **Hủy đơn**: Chỉ được khi đơn còn **Chờ xác nhận** (chưa bị admin xác nhận).
- Một số sàn (vd. Shopee) cho phép **yêu cầu hủy** khi đã **Chờ lấy hàng**; khi đó shop mới là người **đồng ý** hoặc **từ chối** hủy.

Quy tắc đơn giản cho shop nhỏ: **Chỉ cho khách hủy khi trạng thái = Chờ xác nhận**. Admin vẫn luôn có quyền **xác nhận** hoặc **hủy** khi đơn ở trạng thái cho phép.

---

## 3. Luồng tổng quát (sơ đồ)

```
[Khách đặt hàng]
       │
       ▼
  Chờ xác nhận
       │
       ├── Admin « Xác nhận » ──► Đã xác nhận ──► (sau này: Đang giao → Đã giao)
       │
       ├── Admin « Hủy đơn » ────► Đã hủy
       │
       └── Khách « Hủy đơn » ────► Đã hủy
```

Quy tắc gợi ý:

- **Chờ xác nhận** → Admin: được **Xác nhận** hoặc **Hủy**; Khách: được **Hủy**.
- **Đã xác nhận** trở đi → Khách không hủy nữa; Admin có thể quy định thêm (vd. chỉ hủy khi chưa “Đang giao”).

---

## 4. So với code hiện tại của bạn

- Model **Order** hiện **chưa có trường trạng thái** (vd. `status`).
- **orderRouter** chỉ có: tạo đơn (POST), xem đơn của tôi (GET /me), admin xem danh sách và chi tiết (GET /, GET /:orderId). **Chưa có** API xác nhận đơn hay hủy đơn.

Để làm đúng luồng trên, cần:

1. **Backend**
   - Thêm trường `status` vào Order (vd. `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`).
   - Mặc định khi tạo đơn: `status = 'pending'` (Chờ xác nhận).
   - API cho admin: **Xác nhận đơn** (chỉ khi `pending` → `confirmed`), **Hủy đơn** (chỉ khi `pending` hoặc `confirmed` → `cancelled`).
   - API cho buyer: **Hủy đơn** (chỉ khi `pending` → `cancelled`).

2. **Frontend**
   - Trang **Admin (quản lý đơn)**: mỗi đơn có nút **Xác nhận** và **Hủy** (ẩn/disable khi trạng thái không cho phép).
   - Trang **Đơn của tôi**: đơn **Chờ xác nhận** có nút **Hủy đơn**; sau khi hủy hoặc admin xác nhận thì cập nhật trạng thái hiển thị.

---

## 5. Tóm tắt

- Luồng chuẩn TMĐT: **Chờ xác nhận** → Admin **xác nhận** hoặc **hủy**, Khách có thể **hủy** khi còn chờ xác nhận.
- Dự án của bạn chưa có `status` và chưa có API/UI cho xác nhận/hủy; thêm các phần trên sẽ bám sát luồng mua bán trên sàn.

Nếu bạn muốn, bước tiếp theo có thể là: (1) thêm `status` vào Order và các API confirm/cancel, (2) cập nhật FE Admin + Đơn của tôi cho đúng luồng này.
