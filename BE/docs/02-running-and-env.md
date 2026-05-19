# 02) Chạy BE và cấu hình `.env`

## Chạy BE

Trong thư mục `BE/`:

- Dev (tự reload khi sửa file): `npm run dev`
- Chạy bình thường: `npm start`
- Đổ dữ liệu mẫu: `npm run seed`

## `.env` dùng để làm gì?

`.env` là nơi chứa các cấu hình “tùy theo máy/ môi trường”, ví dụ:

- BE chạy port nào
- Kết nối database ở đâu
- Khoá để ký token đăng nhập (JWT)
- Cấu hình PayOS / email / Gemini

File tham khảo là `.env.example`.

## Các biến quan trọng (giải thích dễ hiểu)

### Nhóm cơ bản

- `PORT`: cổng BE (mặc định 3001)
- `MONGODB_URI`: link MongoDB (local hoặc Atlas)
- `NODE_ENV`: nếu là `production` thì BE sẽ “khó tính” hơn (ví dụ bắt buộc có `JWT_SECRET`)

### Nhóm đăng nhập

- `JWT_SECRET`: khoá để tạo/kiểm tra token đăng nhập
- `EMAIL_VERIFY_SECRET`: khoá riêng cho link xác thực email (nếu không set thì dùng `JWT_SECRET`)

### Nhóm CORS (ai được gọi API từ browser)

- `FE_BASE_URL`: URL của FE (dùng để:
  - cho phép CORS mặc định
  - tạo link return/cancel PayOS
  - tạo link xác thực email
  )
- `CORS_ORIGINS`: danh sách origin được phép (phân tách bởi dấu phẩy)

### Nhóm email (gửi mail xác thực)

- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`
- `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_SMTP_INSECURE_TLS`: chỉ dùng dev khi gặp TLS lỗi (**không bật production**)

### Nhóm PayOS

- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`

### Nhóm chatbot Gemini

- `GEMINI_API_KEY`

### Nhóm server-to-server (Power Automate)

- `API_KEY`: nếu set, có thể gọi một số endpoint admin bằng header `x-api-key`
  - Lưu ý: **không phải endpoint nào cũng cho phép** (có allowlist trong `middleware/auth.js`)

### Nhóm Supabase Storage (upload ảnh sản phẩm)

- `SUPABASE_URL`: URL project Supabase (vd. `https://abcxyz.supabase.co`)
- `SUPABASE_SERVICE_KEY`: Service Role Key — có toàn quyền, **chỉ dùng ở BE** (không đưa ra FE)
- `SUPABASE_BUCKET`: tên bucket đã tạo trên Supabase (mặc định `product-images`)

Setup:

1. Tạo project tại [supabase.com](https://supabase.com)
2. Vào **Storage** → tạo bucket `product-images` → bật **public**
3. Vào **Settings → API** → copy **Project URL** và **service_role key**
4. Điền vào `BE/.env`
