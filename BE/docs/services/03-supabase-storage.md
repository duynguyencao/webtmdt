# Supabase Storage Service (`services/supabaseStorage.js`)

File: `BE/services/supabaseStorage.js`

## Service này dùng để làm gì?

Upload file ảnh (buffer) lên **Supabase Storage** — dịch vụ lưu trữ file đám mây miễn phí của Supabase. Trả về URL công khai để FE/client hiển thị ảnh.

## Tại sao dùng Supabase Storage?

| Tiêu chí | Supabase Storage | Lưu file vào server BE |
|----------|-----------------|----------------------|
| **Miễn phí** | 1 GB free | Tùy hosting |
| **CDN** | Có (Supabase CDN) | Không |
| **Scale** | Tự động | Phụ thuộc server |
| **Persist** | Lưu vĩnh viễn (cloud) | Mất nếu redeploy/restart |
| **Setup** | Cần tạo project + bucket | Chỉ cần thư mục |

→ Supabase phù hợp cho đồ án vì **miễn phí**, **dễ dùng**, và **ảnh không mất khi deploy lại server**.

## Cấu hình cần thiết

Cần 3 biến môi trường trong `BE/.env`:

| Biến | Ý nghĩa | Ví dụ |
|------|---------|-------|
| `SUPABASE_URL` | URL project Supabase | `https://abcxyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key (toàn quyền) | `eyJhbG...` |
| `SUPABASE_BUCKET` | Tên bucket đã tạo | `product-images` |

> ⚠️ **`SUPABASE_SERVICE_KEY`** là key có toàn quyền — KHÔNG bao giờ đưa ra FE. Chỉ dùng ở backend.

## Setup Supabase (1 lần)

1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào **Storage** → tạo bucket `product-images` → đặt **public**
3. Vào **Settings → API** → copy URL và service_role key vào `.env`

## Cách hoạt động

### Lazy init (quan trọng)

Vì project dùng ES Module (`"type": "module"`), tất cả `import` được resolve **trước** khi `dotenv.config()` chạy trong `index.js`. Nếu đọc `process.env.SUPABASE_*` ở top-level (đầu file), giá trị sẽ **luôn rỗng**.

→ Giải pháp: đọc env **bên trong function** `getClient()` và `getBucket()` — chỉ chạy khi thật sự cần upload, lúc đó `dotenv` đã load xong.

```
index.js
├── L6: dotenv.config()         ← load .env vào process.env
├── L25: import uploadRouter    ← supabaseStorage.js được import
│        (top-level code chạy, nhưng KHÔNG đọc env ở đây)
└── ...
    uploadImage() được gọi lúc runtime
    └── getClient()             ← ĐỌC process.env ở đây (đã có giá trị)
```

### Hàm `uploadImage(fileBuffer, originalName, mimeType)`

1. **Lấy Supabase client** qua `getClient()` — lazy init, tạo 1 lần duy nhất.
2. **Tạo tên file an toàn**: `{timestamp}_{random}.{ext}` — tránh trùng + ký tự đặc biệt.
3. **Đường dẫn trên bucket**: `products/{safeName}` — gom vào thư mục `products/`.
4. **Upload lên Supabase**: gọi `supabase.storage.from(bucket).upload(...)`.
5. **Lấy public URL**: gọi `supabase.storage.from(bucket).getPublicUrl(...)`.
6. **Trả về URL**: FE dùng URL này để hiển thị hoặc lưu vào MongoDB.

### Sơ đồ

```
[Buffer ảnh] → supabaseStorage.uploadImage()
                 ├── 1. getClient() → tạo Supabase client (lần đầu)
                 ├── 2. Sinh tên: 1716100000_abc123.jpg
                 ├── 3. Upload → Supabase bucket "product-images/products/"
                 ├── 4. Lấy public URL
                 └── 5. Return "https://xxx.supabase.co/storage/.../products/1716100000_abc123.jpg"
```

## Lưu ý

- Nếu `SUPABASE_URL` hoặc `SUPABASE_SERVICE_KEY` chưa set → server **vẫn chạy bình thường** — chỉ khi admin upload ảnh mới báo lỗi.
- Env vars được đọc **trong function** (không phải top-level) — đây là yêu cầu kỹ thuật do ES Module timing với dotenv.
- File luôn upload với `upsert: false` → nếu trùng tên sẽ lỗi (nhưng nhờ tên random nên gần như không xảy ra).
- Bucket phải đặt **public** thì URL mới truy cập được không cần auth.
