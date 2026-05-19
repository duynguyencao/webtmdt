# Route Chatbot (`routes/chatRouter.js`)

File: `BE/routes/chatRouter.js`

## Route này làm gì?

Cho FE gọi chatbot tư vấn bằng Gemini.

Điểm đặc biệt:

- Bot được “nhồi” danh sách sản phẩm thật từ DB (để gợi ý đúng hàng đang bán)
- Có cache danh sách sản phẩm để không query DB mỗi tin nhắn

Files liên quan:

- `services/productContext.js`
- `services/geminiService.js`

## Endpoint: `POST /api/chat`

Body:

- `message` (string): tin nhắn của khách
- `history` (optional): mảng tin nhắn trước đó để bot nhớ ngữ cảnh
  - mỗi phần tử dạng `{ role: 'user'|'model', text: string }`

## Các bước xử lý chính

### 1) Validate message

Route check:

- có message và là string
- trim không rỗng
- độ dài không vượt `MAX_MESSAGE_LENGTH=1000`

Nếu fail → trả 400 với lỗi rõ ràng.

### 2) Làm sạch `history`

Nếu client gửi history:

- chỉ giữ phần tử có role hợp lệ và text là string
- chỉ lấy tối đa 20 message gần nhất
- cắt mỗi message tối đa 2000 ký tự

Mục đích:

- tránh payload quá lớn
- tránh gửi dữ liệu “bậy” vào Gemini

### 3) Lấy context sản phẩm (cache)

`getProductContextCached()`:

- nếu cache còn hạn (TTL 5 phút) → dùng luôn
- nếu hết hạn → query DB tạo context mới

### 4) Gọi Gemini

`generateChatReply(productContext, trimmed, safeHistory)`

Trả ra `reply` là text.

### 5) Response

Trả JSON:

- `{ reply }`

Nếu lỗi:

- log ra server
- trả 500 `{ error: message }`

