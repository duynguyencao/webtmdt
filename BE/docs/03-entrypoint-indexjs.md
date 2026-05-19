# 03) `index.js` — file chạy đầu tiên của BE

File: `BE/index.js`

Mục tiêu của file này là:

- Đọc `.env`
- Kết nối MongoDB
- Tạo server Express
- Bật các lớp bảo vệ cơ bản (CORS, helmet, rate-limit)
- Gắn các router `/api/...`
- Chạy job định kỳ (cron)

## 1) Đọc `.env`

Ở đầu file có đoạn tạo `__dirname` và gọi `dotenv.config(...)`.

Ý nghĩa:

- Vì project dùng ES Module (`"type": "module"`), nên không có sẵn `__dirname`.
- Code tự tính `__dirname` rồi nạp `.env` đúng đường dẫn `BE/.env`.

Kết quả: từ đây trở đi có thể dùng `process.env.X`.

Đối chiếu code `BE/index.js`:

- L1–L6:
  - L5: tự tạo `__dirname` cho ES Module
  - L6: `dotenv.config({ path: path.join(__dirname, '.env') })` để đọc đúng `BE/.env`

## 2) Tạo app Express và port

- `const app = express()`: tạo server.
- `const PORT = process.env.PORT || 3001`: nếu không set PORT thì dùng 3001.

Đối chiếu code:

- L26: `const app = express()`
- L27: `const PORT = process.env.PORT || 3001`

## 3) Kết nối DB và biến `dbReady`

`dbReady` là cờ (true/false) để biết MongoDB đã kết nối chưa.

- Nếu `connectDB()` thành công:
  - set `dbReady = true`
  - chạy `startAutoCancelPendingPayOSJob()` (job tự hủy đơn PayOS pending lâu)
- Nếu thất bại:
  - log lỗi rõ ràng để người chạy biết cần bật MongoDB

Đối chiếu code:

- L29: `dbReady` bắt đầu là `false`
- L30–L38:
  - connectDB thành công → `dbReady=true` + start cron job
  - connectDB fail → log lỗi (server vẫn chạy nhưng `/api/health` báo disconnected và `/api/chat` bị chặn)

## 4) `trust proxy`

`app.set('trust proxy', 1)` thường dùng khi BE chạy sau proxy/load balancer (ví dụ deploy).

Mục đích: Express hiểu đúng IP thật và một số header liên quan.

Đối chiếu code:

- L40: `app.set('trust proxy', 1)`

## 5) CORS (cho phép FE gọi API)

File có các helper:

- `normalizeOrigin(...)`: chuẩn hóa origin (bỏ dấu `/` cuối)
- `allowedOrigins`: tổng hợp từ:
  - `CORS_ORIGINS` (nếu set)
  - `FE_BASE_URL` (nếu set)
  - một số localhost mặc định (khi không phải production)

Middleware `cors({ origin: (origin, cb) => ... })`:

- Nếu request không có `Origin` (curl, server-to-server) → cho qua.
- Nếu có origin:
  - nằm trong `allowedOrigins` → cho qua
  - không nằm trong list → chặn với lỗi CORS

Đối chiếu code:

- L41–L58: xây `allowedOrigins`
  - L44–L48: lấy thêm từ `CORS_ORIGINS`
  - L49: lấy từ `FE_BASE_URL`
  - L50–L53: dev default allow localhost
  - L54–L58: hợp nhất và remove trùng
- L60–L68: cors middleware
  - L63: không có Origin → cho qua (curl, server-to-server)
  - L65: có trong allowlist → cho qua
  - L66: không có → cb Error “Not allowed by CORS”

## 6) Helmet

`helmet(...)` thêm một số header an toàn cơ bản.

Ở đây `crossOriginResourcePolicy: false` để tránh chặn một số tài nguyên khi dev.

Đối chiếu code:

- L69–L71: `helmet({ crossOriginResourcePolicy: false })`

## 7) Rate limit (chống spam chung)

`rateLimit({ windowMs: 60s, limit: 240 })`

Nghĩa là: 1 phút tối đa 240 request / 1 IP (tầng chung).

Một số route nhạy cảm như login/register còn có limiter riêng.

Đối chiếu code:

- L73–L79: limiter chung 240 req / phút / IP

## 8) Parse JSON

`app.use(express.json())` để BE nhận body dạng JSON từ FE.

Đối chiếu code:

- L80: `app.use(express.json())`

## 9) 2 endpoint kiểm tra nhanh

- `GET /`: trả message “Hello…”
- `GET /api/health`: trả trạng thái API + mongodb connected/disconnected

Đối chiếu code:

- L82–L84: `GET /`
- L86–L92: `GET /api/health` (dựa vào `dbReady`)

## 10) Gắn các router chính

Ví dụ:

- `/api/products` → `routes/productRouter.js`
- `/api/user` → `routes/userRouter.js`
- `/api/orders` → `routes/orderRouter.js`
- …

Riêng `/api/chat` có lớp chặn:

- Nếu `dbReady=false` → trả 503 “Database chưa sẵn sàng”
- Nếu DB sẵn sàng → mới chuyển sang `chatRouter`

Đối chiếu code:

- L94–L104: gắn các router (bao gồm `/api/upload` cho upload ảnh sản phẩm)
- L105–L111: gắn `/api/chat` kèm middleware chặn khi `dbReady=false`

## 11) Start server

`app.listen(PORT, ...)` mở cổng và log:

- Server đang nghe port nào
- Gemini key đã cấu hình chưa (để biết chatbot có chạy được hay không)

Đối chiếu code:

- L112–L120:
  - log port
  - check độ dài `GEMINI_API_KEY` để cảnh báo cấu hình chatbot

