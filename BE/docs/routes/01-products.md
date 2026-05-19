# Route Sản phẩm (`routes/productRouter.js`)

File: `BE/routes/productRouter.js`

## Route này dùng để làm gì?

Nó cung cấp API cho:

- FE hiển thị danh sách sản phẩm
- FE tìm kiếm
- FE lấy chi tiết sản phẩm
- FE lấy nhóm sản phẩm đặc biệt (newest, sale, best-sellers, related)
- Admin thêm/sửa/xóa mềm sản phẩm

## Điểm “đặc biệt” của project này: chỉ dùng category `vot`

Trong file có:

- `const ONLY_CATEGORY = 'vot'`

Nghĩa là:

- Dù FE có truyền category khác, BE cũng sẽ trả rỗng (hoặc ép về `vot`).
- Khi admin thêm/sửa sản phẩm, BE sẽ set `next.category = ONLY_CATEGORY`.

Lý do thường gặp:

- Shop hiện chỉ triển khai 1 danh mục chính (vợt), chưa mở rộng sang giày/áo…

## Helper quan trọng

### `escapeRegex(value)`

Khi search bằng `RegExp`, cần “escape” ký tự đặc biệt để tránh regex bị sai.

### `normalizeProductBody(body)`

Mục đích: chuẩn hóa dữ liệu sản phẩm khi admin gửi lên.

Đặc biệt là logic giảm giá:

- Nếu có `discountPercent`:
  - tính `price` từ `originalPrice` và `% giảm`
  - set `sale = true`
  - giữ `originalPrice`
- Nếu không giảm:
  - xóa `originalPrice`
  - set `sale = false`
- Luôn ép `category = 'vot'`

## Các endpoint công khai

### 1) `GET /api/products/suggestions`

Mục tiêu: gợi ý nhanh cho ô search.

- Nhận `query` (từ khóa) và `limit`
- Tìm theo `name` hoặc `brand` (regex, không phân biệt hoa thường)
- Trả về danh sách gọn: `id, name, brand, price, sale, stock, image`

### 2) `GET /api/products`

Mục tiêu: list sản phẩm.

Query hỗ trợ:

- `search`: tìm theo name/brand
- `featured=true`: lấy một nhóm ID cố định `[1..6]`
- `page`, `limit`: bật phân trang nếu có

Filter mặc định:

- `category: 'vot'`
- `isDeleted != true`

Response:

- Nếu không paging: trả mảng sản phẩm
- Nếu paging: trả `{ items, page, limit, total }`

Mỗi item được bổ sung:

- `stock` chuẩn hóa về số >= 0
- `inStock` = stock > 0
- `image` fallback từ `images[0]` nếu thiếu

### 3) `GET /api/products/best-sellers`

Mục tiêu: top bán chạy.

- Dựa trên bảng `Order`
- Chỉ tính các đơn đã “chắc chắn bán” (`confirmed/shipped/delivered`)
- Aggregate: cộng tổng số lượng bán theo `items.id`
- Lấy product theo ids đó và trả kèm `unitsSold`, `revenue`

### 4) `GET /api/products/newest`

Lấy sản phẩm mới (sort id giảm dần) giới hạn `limit`.

### 5) `GET /api/products/discounted`

Lấy sản phẩm đang sale (`sale=true`).

### 6) `GET /api/products/related/:id`

Lấy sản phẩm liên quan:

1. Tìm “sản phẩm gốc” theo `id`
2. Ưu tiên các sản phẩm cùng `brand`
3. Nếu chưa đủ `limit`, lấy thêm sản phẩm khác (trừ id gốc và trừ các id đã lấy)

### 7) `GET /api/products/:id`

Chi tiết 1 sản phẩm.

- Nếu thiếu `images`, code sẽ “đệm” 3 ảnh giống nhau để FE khỏi lỗi UI.

## Các endpoint admin (cần đăng nhập + role admin)

Các endpoint này dùng:

- `verifyToken`
- `requireRole('admin')`
- (thêm validate body bằng zod cho POST/PUT)

### 1) `POST /api/products`

Thêm sản phẩm.

Điểm quan trọng:

- BE tự sinh `id` mới bằng cách lấy `max.id + 1`
- `stock` được ép về số >= 0
- Trường `image` chứa URL ảnh — FE upload ảnh lên Supabase trước (qua `POST /api/upload/image`), rồi truyền URL trả về vào body
- Trả 201 với product mới

Chi tiết upload ảnh: xem `routes/12-upload.md` và `services/03-supabase-storage.md`

### 2) `PUT /api/products/:id`

Sửa sản phẩm.

- Không cho đổi `id` (`delete body.id`)
- Update theo `id` (không theo `_id`)

### 3) `DELETE /api/products/:id`

Xóa mềm:

- Set `isDeleted=true`
- Không xóa cứng để tránh ảnh hưởng lịch sử đơn

