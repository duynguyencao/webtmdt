# Route Upload ảnh (`routes/uploadRouter.js`)

File: `BE/routes/uploadRouter.js`

## Route này dùng để làm gì?

Cung cấp API để admin **upload ảnh sản phẩm** lên Supabase Storage. Trả về URL công khai của ảnh — FE dùng URL này khi tạo/sửa sản phẩm (lưu vào MongoDB).

## Tại sao cần route riêng cho upload?

- Express mặc định chỉ nhận JSON (`express.json()`). File ảnh cần gửi dạng **multipart/form-data**.
- Route dùng `multer` để parse file trước khi xử lý.
- Logic upload tách riêng khỏi route products → dễ tái sử dụng cho mục đích khác (ví dụ: avatar, banner).

## Middleware bảo vệ

Endpoint chỉ cho **admin**:

- `verifyToken` — kiểm tra JWT hoặc API key
- `requireRole('admin')` — chặn user thường

## `multer` cấu hình thế nào?

- **Storage**: `memoryStorage()` — file ảnh lưu tạm trong RAM (buffer), không ghi đĩa.
- **Giới hạn size**: 5 MB (`limits.fileSize`).
- **Bộ lọc**: chỉ chấp nhận JPEG, PNG, WebP, GIF.

## Endpoint

### `POST /api/upload/image`

**Request:** `multipart/form-data` với field `image` chứa file ảnh.

**Luồng xử lý:**

1. `multer` parse file → `req.file` chứa `buffer`, `originalname`, `mimetype`.
2. Gọi `uploadImage(buffer, originalname, mimetype)` từ service `supabaseStorage.js`.
3. Service upload lên Supabase Storage → trả public URL.
4. Endpoint trả `{ url: "https://xxx.supabase.co/storage/v1/object/public/..." }`.

**Response thành công (200):**

```json
{
  "url": "https://abcxyz.supabase.co/storage/v1/object/public/product-images/products/1716100000_abc123.jpg"
}
```

**Response lỗi:**

| Status | Lý do |
|--------|-------|
| 400 | Không tìm thấy file (quên field `image` hoặc gửi rỗng) |
| 401 | Chưa đăng nhập |
| 403 | Không phải admin |
| 500 | Upload Supabase thất bại (sai key, bucket không tồn tại, hết dung lượng…) |

## Tích hợp với FE

FE gọi API upload **trước** khi tạo/sửa sản phẩm:

```
Admin chọn ảnh → FE gọi POST /api/upload/image → nhận URL
                → FE gọi POST /api/products { image: URL, ... } → lưu MongoDB
```

Ảnh hiển thị trên web = trình duyệt tải trực tiếp từ Supabase URL (không qua BE).
