# Tài liệu Backend (BE) — giải thích dễ hiểu theo từng file

Tài liệu này giải thích **BE đang làm gì**, **mỗi file dùng để làm gì**, và “đọc code theo thứ tự” để bạn có thể tự lần theo luồng xử lý.

> Ghi chú nhỏ:
> - Mình cố tình viết **ít thuật ngữ**. Nếu có từ chuyên môn, mình giải thích ngay bên cạnh.
> - Với các file “dữ liệu mẫu” rất dài (như `seed/productsSeed.js`), mình giải thích **theo cấu trúc và mẫu dòng** thay vì mô tả từng dòng dữ liệu sản phẩm (vì hàng nghìn dòng chỉ là nội dung sản phẩm).

---

## Tổng quan BE chạy như thế nào?

Khi chạy BE, tiến trình sẽ:

1. Đọc cấu hình trong file `.env`.
2. Kết nối tới MongoDB (database).
3. Mở một server HTTP (Express) để FE gọi API.
4. Gắn các “đầu API” (routes) như `/api/products`, `/api/orders`, …
5. Chạy một job định kỳ để tự dọn các đơn PayOS bị “treo” quá lâu.

File trung tâm điều khiển các bước trên là `index.js`.

---

## 1) File gốc ở thư mục `BE/`

### `BE/package.json`

Mục đích: khai báo BE dùng thư viện gì và có lệnh chạy nào.

- Dòng `"type": "module"`: code dùng cú pháp `import ... from ...` thay vì `require(...)`.
- `scripts` bạn sẽ dùng nhiều:
  - `npm run dev`: chạy BE ở chế độ dev (tự reload khi sửa file).
  - `npm start`: chạy bình thường.
  - `npm run seed`: đổ dữ liệu mẫu sản phẩm vào DB.

### `BE/.env.example` và `BE/.env`

Mục đích: chứa cấu hình (port, link database, khoá bí mật…).

- `.env.example` là file mẫu để copy.
- `.env` là file thật (có thể chứa khoá bí mật). **Không nên đưa lên git công khai**.

### `BE/index.js` (entry point — file chạy đầu tiên)

Mục đích: dựng server Express, cấu hình bảo vệ cơ bản, nối DB, gắn router.

Đọc theo đoạn (tương ứng “từng cụm dòng”):

- **Đoạn 1 (import + dotenv)**: chuẩn bị `__dirname`, rồi nạp `.env` trước khi dùng `process.env`.
- **Đoạn 2 (tạo app + PORT)**: tạo `app`, lấy port.
- **Đoạn 3 (connectDB + dbReady)**:
  - `dbReady` dùng để biết DB đã sẵn sàng chưa.
  - Nếu kết nối DB OK thì chạy `startAutoCancelPendingPayOSJob()` (job tự hủy đơn PayOS pending quá lâu).
- **Đoạn 4 (CORS)**:
  - “CORS” là chặn/cho phép website nào được gọi API từ trình duyệt.
  - Code gom danh sách `allowedOrigins` từ `.env` + mặc định khi dev.
- **Đoạn 5 (helmet + rate limit + json)**:
  - `helmet`: thêm một số header an toàn cơ bản.
  - `rateLimit`: chặn spam chung.
  - `express.json()`: cho phép nhận body JSON.
- **Đoạn 6 (routes)**:
  - Gắn các router cho từng nhóm chức năng: sản phẩm, user, đơn hàng, coupon, …
  - Riêng `/api/chat` có chặn `dbReady`: nếu DB chưa kết nối thì trả 503 (để khỏi lỗi khó hiểu).
- **Đoạn 7 (listen)**:
  - Mở server và log trạng thái Gemini key.

---

## 2) Kết nối DB — `BE/db/`

### `BE/db/dbConnect.js`

Mục đích: kết nối tới MongoDB bằng Mongoose.

Giải thích theo “từng dòng/ý chính”:

- `import mongoose...`: dùng thư viện làm việc với MongoDB.
- `defaultUri`: nếu không có `MONGODB_URI` thì dùng DB local mặc định.
- `connectDB()`:
  - Lấy `uri` từ `.env`.
  - `await mongoose.connect(uri)`: kết nối DB.
  - Log DB name để biết đang vào DB nào.
  - Nếu lỗi thì in ra và `throw` để file gọi bên ngoài biết mà xử lý.

---

## 3) “Bảo vệ đăng nhập” — `BE/middleware/`

### `BE/middleware/auth.js`

Mục đích:

- Tạo token đăng nhập (JWT).
- Kiểm tra request có đăng nhập chưa.
- Chặn/cho phép theo role (buyer/admin/shipper).
- Hỗ trợ “x-api-key” cho một vài API admin (dùng server-to-server như Power Automate).

Giải thích theo đoạn:

- `getJwtSecret()`:
  - Lấy `JWT_SECRET` từ `.env`.
  - Nếu production mà thiếu secret thì **báo lỗi** (tránh chạy sai).
  - Dev thì có “secret tạm” để khỏi bị block khi test.
- `createToken(user)`:
  - Gói `userId` và `role` vào token, hạn 7 ngày.
- `verifyToken(req,res,next)`:
  - Nhánh 1: nếu có `x-api-key` và trùng `API_KEY` trong `.env`:
    - Chỉ cho phép một vài endpoint trong “allowlist”.
    - Gán `req.userRole = 'admin'` để đi tiếp như admin.
  - Nhánh 2: dùng Bearer token:
    - Đọc `Authorization: Bearer ...`
    - Verify token, set `req.userId` và `req.userRole`.
- `requireRole(...roles)`:
  - Nếu `req.userRole` không nằm trong danh sách cho phép thì trả 403.

---

## 4) Kiểm tra dữ liệu gửi lên (validate) — `BE/validation/`

### `BE/validation/schemas.js`

Mục đích: định nghĩa “form chuẩn” cho body/query để tránh FE gửi sai.

- `registerSchema`: name/email/password.
- `loginSchema`: email/password.
- `orderCreateSchema`: customer + items + paymentMethod + note + coupon.
- `cartItemUpsertSchema`, `cartReplaceSchema`: dữ liệu giỏ hàng.
- `productUpsertSchema`: dữ liệu sản phẩm khi admin thêm/sửa.

### `BE/validation/validate.js`

Mục đích: middleware dùng schema để kiểm tra body.

- `validateBody(schema)`:
  - `schema.parse(req.body)` nếu OK thì đi tiếp.
  - Nếu lỗi, trả 400 với lỗi dễ hiểu.

---

## 5) Models (bảng dữ liệu) — `BE/models/`

Mục tiêu chung: mô tả “mỗi loại dữ liệu lưu trong DB trông như thế nào”.

### `BE/models/Product.js`

- `id`: số id sản phẩm (unique).
- Thông tin hiển thị: `name`, `brand`, `category`, `price`, `image`, `images`, `description`.
- “Bán chạy/đánh giá”: `rating`, `reviews`.
- “Giảm giá”: `sale`, `originalPrice`.
- **`isDeleted`**: xoá mềm (ẩn đi, không xoá hẳn) để lịch sử đơn hàng không bị lỗi.
- **`stock`**: tồn kho (số lượng còn lại).

`toJSON.transform`: khi trả JSON ra API thì xoá `_id`, `__v` cho gọn.

### `BE/models/User.js`

- Tài khoản: `name`, `email`, `password`.
- `emailVerified`: bắt buộc xác thực email trước khi login.
- Thông tin giao hàng: `phone`, `address` (line1 + mã/tên tỉnh-huyện-xã).
- `role`: `buyer | admin | shipper`.
- `isLocked`: tài khoản bị khóa bởi admin → không thể đăng nhập.

Điểm quan trọng:

- `pre('save')`: nếu đổi password thì hash bằng bcrypt.
- `comparePassword`: so mật khẩu người dùng nhập với mật khẩu đã hash.
- `toJSON`: xoá `password` để không lộ ra API.

### `BE/models/Order.js`

Lưu đơn hàng:

- `orderId`: dạng `ORD000001`.
- `userId`: ai đặt.
- `shipperId`: shipper đang cầm đơn (nếu có).
- `customer`: thông tin người nhận.
- `items`: danh sách sản phẩm + số lượng.
- `subtotal`, `discount`, `total`.
- Coupon: `couponCode`, `couponConsumed` (đánh dấu đã trừ lượt dùng coupon chưa).
- Thanh toán:
  - `paymentMethod`: `cod` hoặc `payos`.
  - `paymentStatus`: `pending_payment` hoặc `paid`.
  - Trường liên quan PayOS: `payosOrderCode`, `payosPaymentLinkId`, `payosReference`.
- Trạng thái đơn: `pending/confirmed/shipped/delivered/cancelled`.

Có thêm index để query nhanh.

### `BE/models/Coupon.js`

Lưu mã giảm giá:

- `code`, `type` (percent/fixed), `value`.
- `minOrderTotal`, `maxDiscount`.
- `startAt`, `endAt`.
- `usageLimit`, `usedCount`.
- `active`.

2 hàm quan trọng:

- `isAvailable(orderTotal)`: mã có dùng được không, nếu không thì trả lý do.
- `calcDiscount(orderTotal)`: tính ra số tiền giảm.

### `BE/models/Cart.js`

Giỏ hàng theo user:

- `userId` (unique).
- `items`: mỗi item có `productId` + `quantity`.

### `BE/models/Review.js`

Đánh giá sản phẩm:

- `productId`, `userId`, `orderId`.
- `rating` (1-5), `comment`.
- `verified`: đã mua thật (ở đây set true khi đơn delivered).

Index unique `(productId, userId, orderId)` để 1 lần mua chỉ đánh giá 1 lần.

### `BE/models/SiteConfig.js`

Cấu hình trang chủ:

- `heroTitle`, `heroSubtitle`, `heroImage`, `saleTitle`, `productGridCols`.
- `banners`: mảng URL ảnh đã upload — thư viện ảnh banner để admin chọn lại hoặc xóa.

### `BE/models/OrderCounter.js`

Máy đếm để sinh số thứ tự `ORDxxxxxx` an toàn (tránh trùng khi nhiều người đặt cùng lúc).

### `BE/models/PayOSPaymentEvent.js`

Log sự kiện PayOS (webhook/cancel/cron cancel) để đối soát khi có tình huống “đơn bị xoá nhưng webhook đến muộn”.

---

## 6) Routes (các API) — `BE/routes/`

Nhìn nhanh: mỗi file router quản lý một nhóm endpoint.

### `BE/routes/productRouter.js`

Nhóm API sản phẩm.

Điểm đáng chú ý:

- `ONLY_CATEGORY = 'vot'`: hiện hệ thống cố định chỉ phục vụ danh mục “vợt”.
- Có các endpoint công khai:
  - `GET /suggestions`: gợi ý nhanh cho ô search.
  - `GET /`: list sản phẩm (có search + phân trang).
  - `GET /best-sellers`, `/newest`, `/discounted`, `/related/:id`, `/:id`.
- Endpoint admin:
  - `POST /`: thêm sản phẩm.
  - `PUT /:id`: sửa sản phẩm.
  - `DELETE /:id`: xoá mềm (set `isDeleted=true`).
- `normalizeProductBody`:
  - Tự tính `price` khi có `discountPercent`.
  - Set `sale` theo có giảm hay không.

### `BE/routes/userRouter.js`

Nhóm API user:

- `POST /register`:
  - Tạo user mới, role mặc định `buyer`.
  - Gửi email xác thực (token hiệu lực 24h).
  - Nếu email đã tồn tại nhưng chưa verify thì **gửi lại** mail verify.
- `POST /login`:
  - Check email + password.
  - Chặn nếu chưa verify email.
  - Chặn nếu tài khoản bị khóa (`isLocked`).
  - Trả token + user.
- `GET /verify-email?token=...`:
  - Verify token.
  - Set `emailVerified=true`.
  - Trả token login để FE tự đăng nhập.
- `GET /me`:
  - Cần đăng nhập, trả user hiện tại.
- `PUT /me`:
  - Cập nhật name/phone/address.

**Admin endpoints (cần JWT + role admin):**

- `GET /admin/list`: danh sách tất cả tài khoản (tìm kiếm theo tên/email, lọc role, phân trang).
- `GET /admin/:id`: chi tiết 1 tài khoản.
- `PATCH /admin/:id/lock`: khóa tài khoản (không cho phép khóa admin).
- `PATCH /admin/:id/unlock`: mở khóa tài khoản.
- `DELETE /admin/:id`: xóa tài khoản vĩnh viễn (chặn nếu còn đơn hàng đang xử lý, không cho xóa admin).

### `BE/routes/orderRouter.js`

Nhóm API đơn hàng.

Gồm 3 nhóm lớn:

- **API cho shipper**:
  - `GET /shipper/available`: đơn confirmed, chưa có shipper.
  - `GET /shipper/my-tasks`: đơn shipped của shipper.
  - `PATCH /:orderId/pickup`: nhận đơn (confirmed → shipped).
  - `PATCH /:orderId/deliver`: giao thành công (shipped → delivered; COD thì set paid).
  - `PATCH /:orderId/fail`: giao thất bại (return hoặc cancel).
- **API cho buyer (người mua)**:
  - `POST /`: tạo đơn (COD hoặc PayOS), tự trừ tồn kho.
  - `GET /me`: đơn của tôi.
  - `GET /:orderId`: xem chi tiết đơn của tôi.
  - `PATCH /:orderId/cancel-by-buyer`: buyer hủy khi còn pending.
  - `PATCH /:orderId/cancel-payos-and-delete`: buyer hủy thanh toán PayOS (hoàn kho + log + xoá đơn).
- **API cho admin**:
  - `GET /`: xem tất cả đơn.
  - `PATCH /:orderId/confirm`: xác nhận đơn COD (pending → confirmed).
  - `PATCH /:orderId/cancel`: admin huỷ đơn (hoàn kho + hoàn coupon nếu hợp lệ).

Điểm “logic quan trọng” của file này:

- Sinh `orderId` bằng `OrderCounter` để tránh trùng.
- Khi tạo đơn: kiểm tra stock rồi trừ stock bằng `$inc: -qty` có điều kiện `stock >= qty` để chống oversell.
- Coupon:
  - COD: dùng coupon ngay khi tạo đơn (tăng `usedCount`).
  - PayOS: chỉ “tiêu” coupon khi webhook báo đã thanh toán.

### `BE/routes/payosRouter.js`

Chỉ có webhook PayOS:

- `POST /webhook`:
  - Verify chữ ký webhook.
  - Map về `orderId` từ `description` hoặc `orderCode`.
  - Nếu đơn tồn tại và là PayOS:
    - Check amount (nếu có).
    - Set `paymentStatus='paid'` và nếu đang pending thì chuyển sang confirmed.
    - Nếu có coupon mà chưa consume thì tăng `usedCount`.
  - Nếu đơn không còn (đã xoá) thì ghi log `PayOSPaymentEvent`.

### `BE/routes/couponRouter.js`

- `GET /validate`: công khai, kiểm tra mã và trả discount.
- Admin CRUD:
  - `GET /`, `POST /`, `PUT /:code`, `DELETE /:code`.

### `BE/routes/siteConfigRouter.js`

- `GET /`: công khai, lấy config trang chủ (bao gồm `banners[]`).
- `PUT /`: admin cập nhật config (heroTitle, heroSubtitle, heroImage, saleTitle, productGridCols).
- `POST /banners`: admin thêm URL ảnh vào thư viện banners (dùng `$addToSet` tránh trùng).
- `DELETE /banners`: admin xóa URL ảnh khỏi thư viện. Nếu ảnh đang dùng làm `heroImage` → tự reset `heroImage` thành rỗng.

### `BE/routes/cartRouter.js`

Giỏ hàng theo user (cần đăng nhập):

- `GET /`: lấy giỏ hàng (trả “expanded item” kèm tên/giá/stock).
- `PUT /`: replace toàn bộ items.
- `POST /items`: add/update 1 item.
- `DELETE /items/:productId/:sku`: xoá item (tham số `sku` là legacy, hiện không dùng).

### `BE/routes/reviewRouter.js`

Đánh giá sản phẩm:

- `GET /product/:productId`: công khai, list review.
- `POST /`: buyer đăng nhập, chỉ được review nếu đã có đơn `delivered` có sản phẩm đó.
- `PUT /:id`, `DELETE /:id`: chỉ chủ review được sửa/xoá.

Sau khi tạo/sửa/xoá review, hệ thống tính lại `Product.rating` và `Product.reviews`.

### `BE/routes/categoryRouter.js`

Hiện trả 1 danh mục “Vợt Cầu Lông” nếu DB có sản phẩm category `vot`.

### `BE/routes/shippingRouter.js`

`GET /quote`: hiện đang “phase 1” tính phí thủ công = 0 (để sau có thể thay bằng GHN/GHTK).

### `BE/routes/chatRouter.js`

`POST /`: chatbot Gemini.

- Nhận `message` và `history`.
- Cắt bớt history để an toàn.
- Lấy “context sản phẩm” từ DB (có cache).
- Gọi Gemini để trả về `reply`.

---

## 7) Services (hỗ trợ) — `BE/services/`

### `BE/services/productContext.js`

Mục đích: tạo “block text danh sách sản phẩm” để đưa vào chatbot.

- Giới hạn `MAX_PRODUCTS_IN_CONTEXT = 150` để khỏi quá dài.
- `getProductContextForChat()`:
  - Query DB lấy sản phẩm.
  - Format thành từng dòng dạng `[id:1] Tên | Brand | Category | Giá ...`.
  - Nếu không có sản phẩm thì trả câu “shop chưa có sản phẩm”.
- Có cache RAM 5 phút (`getProductContextCached`) để chat nhiều không query DB liên tục.

### `BE/services/geminiService.js`

Mục đích: gọi Gemini bằng `@google/generative-ai`.

Điểm đáng chú ý:

- `SYSTEM_INSTRUCTION`: “luật bắt buộc” để bot phải dùng sản phẩm thật từ DB.
- `getApiKey()` đọc `GEMINI_API_KEY` từ `BE/.env` (đọc trực tiếp file) để tránh trường hợp env bị sai/cached.
- `generateChatReply(productContext, userMessage, history)`:
  - Ghép “danh sách sản phẩm” vào message user đầu tiên.
  - Gọi Gemini và trả text.
  - Bắt lỗi thường gặp (key sai, hết quota, safety block) và trả message dễ hiểu.

---

## 8) Jobs (chạy định kỳ) — `BE/jobs/`

### `BE/jobs/autoCancelPendingPayOS.js`

Mục đích: cứ 5 phút quét các đơn PayOS “đang chờ thanh toán” quá 15 phút.

Luồng xử lý:

1. Tìm đơn `paymentMethod='payos'`, `paymentStatus='pending_payment'`, `status='pending'`, `createdAt < cutoff`.
2. Với mỗi đơn:
   - Gọi PayOS kiểm tra thật sự đã paid chưa (phòng trường hợp webhook lỗi).
   - Nếu paid:
     - Set `paymentStatus='paid'`, `status='confirmed'` (nếu đang pending).
     - Consume coupon nếu chưa.
   - Nếu chưa paid:
     - Hoàn kho (`Product.stock` +qty).
     - Hoàn coupon nếu cần.
     - Best-effort cancel payment request trên PayOS.
     - Set `status='cancelled'`.

---

## 9) Seed và Scripts — `BE/seed/` và `BE/scripts/`

### `BE/seed/index.js`

Mục đích: chạy seed lần đầu.

- Kết nối DB.
- Xoá hết `Product` rồi `insertMany(productsSeed)`.
- Tạo user mẫu nếu chưa có.

### `BE/seed/usersSeed.js`

Mục đích: khai báo danh sách user mẫu.

Hiện có:

- `admin@caulong.vn` / `admin123` / role `admin` / `emailVerified=true`.

### `BE/seed/productsSeed.js` (file dữ liệu rất dài)

Mục đích: danh sách sản phẩm mẫu để `insertMany`.

Cấu trúc chung (mỗi sản phẩm là 1 object trong mảng):

- `id`, `name`, `brand`, `category`
- `price`, `originalPrice`, `sale`
- `image`, `images`
- `description`, `specifications`
- `stock`, `inStock`
- `sourceUrl`

Vì file này dài hàng nghìn dòng và phần lớn là **nội dung mô tả sản phẩm**, nên phần “giải thích từng dòng” ở đây hiểu theo nghĩa:

- Dòng đầu: comment mô tả file seed.
- Dòng `export const productsSeed = [`: bắt đầu mảng.
- Mỗi block `{ ... }`: là 1 sản phẩm.
- Các field trong `{ ... }` là thông tin để FE hiển thị.

### `BE/scripts/makeAdmin.js` và `BE/scripts/makeShipper.js`

Mục đích: tạo nhanh user admin/shipper qua dòng lệnh.

- Nhận `email` (bắt buộc), `password` (tuỳ), `name` (tuỳ).
- Nếu user chưa tồn tại:
  - bắt buộc phải có password để tạo mới.
- Nếu user đã tồn tại:
  - set role tương ứng + `emailVerified=true`.
  - nếu có password thì reset password.

### `BE/scripts/migrate_review_indexes.js`

Mục đích: sửa index review cũ (unique theo product+user) thành unique theo (product+user+orderId).

### `BE/scripts/migrate_remove_variants_addon.js`

Mục đích: dọn dữ liệu legacy (variants/sku/addOn) và chuẩn hoá stock.

### `BE/scripts/sync_indexes.js`

Mục đích: gọi `syncIndexes()` cho các model để DB khớp với index khai báo trong schema.

---

## 10) "Đọc luồng" theo nhu cầu (gợi ý)

- **FE gọi danh sách sản phẩm**: `index.js` → `routes/productRouter.js` → `models/Product.js`
- **Đăng ký / xác thực email / đăng nhập**: `routes/userRouter.js` → `models/User.js` → `middleware/auth.js`
- **Đặt hàng COD**: `routes/orderRouter.js` → `models/Order.js` + `models/Product.js` + `models/Coupon.js`
- **Đặt hàng PayOS**: `routes/orderRouter.js` (tạo payment link) → `routes/payosRouter.js` (webhook) → `jobs/autoCancelPendingPayOS.js` (dọn đơn treo)
- **Giỏ hàng**: `routes/cartRouter.js` → `models/Cart.js` + `models/Product.js`
- **Đánh giá**: `routes/reviewRouter.js` → `models/Review.js` + `models/Order.js` + update `models/Product.js`
- **Chatbot**: `routes/chatRouter.js` → `services/productContext.js` → `services/geminiService.js`
- **Quản lý tài khoản (admin)**: `routes/userRouter.js` (admin endpoints) → `models/User.js` (`isLocked`) + `models/Order.js` (kiểm tra đơn khi xóa)
- **Quản lý banner trang chủ**: `routes/siteConfigRouter.js` (`/banners`) → `models/SiteConfig.js` (`banners[]`, `heroImage`) → `routes/uploadRouter.js` (upload ảnh lên Supabase)
