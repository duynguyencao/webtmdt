# Service gọi Gemini (`services/geminiService.js`)

File: `BE/services/geminiService.js`

## Mục tiêu

File này nhận:

- `productContext` (text danh sách sản phẩm từ DB)
- `userMessage` (tin nhắn khách)
- `history` (các tin nhắn trước đó)

Và trả về:

- câu trả lời của bot (text)

## 1) MODEL_NAME

- `MODEL_NAME = 'gemini-2.5-flash'`

Đây là model Gemini mà BE đang dùng.

## 2) SYSTEM_INSTRUCTION (luật bắt buộc)

Đây là “luật” nhét vào system instruction để bot phải:

- dùng danh sách sản phẩm có `[id:...]`
- không được nói “chưa có dữ liệu” nếu danh sách đã có
- format giá kiểu `3.500.000đ`
- nếu hỏi kiến thức cầu lông thì trả kiến thức chung + có thể gợi ý sản phẩm

Nói ngắn gọn: **bot bị ép phải bám DB**.

## 3) `getApiKey()` — lấy `GEMINI_API_KEY`

Điểm đặc biệt:

- Code đọc trực tiếp file `BE/.env` bằng `fs.readFileSync`.

Lý do thường gặp:

- Trong một số môi trường chạy, `process.env` có thể không “như mong đợi”.
- Đọc trực tiếp `.env` giúp tránh “key bị cache/sai”.

Fallback:

- nếu đọc file fail → dùng `process.env.GEMINI_API_KEY`.

## 4) `generateChatReply(productContext, userMessage, history)`

### 4.1) Kiểm tra API key

- Nếu key rỗng hoặc quá ngắn → throw error hướng dẫn lấy key.

### 4.2) Tạo productBlock

Tạo block:

- `DANH SÁCH SẢN PHẨM TỪ DATABASE ...`

### 4.3) Xử lý multi-turn history

Code tạo `contents` theo format Gemini:

- `[{ role: 'user'|'model', parts: [{ text }] }, ...]`

Điểm quan trọng:

- **Chỉ gắn productBlock vào tin nhắn user đầu tiên**.
  - mục tiêu: bot luôn thấy sản phẩm mà không lặp quá nhiều lần.

### 4.4) Gọi SDK

Luồng:

1. `new GoogleGenerativeAI(apiKey)`
2. `getGenerativeModel({ model: MODEL_NAME, systemInstruction: SYSTEM_INSTRUCTION })`
3. `model.generateContent({ contents })`
4. Lấy `text` và trim

### 4.5) Bắt lỗi và đổi message cho dễ hiểu

Code map một số lỗi phổ biến:

- API key sai → message “API key không hợp lệ”
- hết quota → message “vượt giới hạn”
- safety block → message “nội dung bị chặn”

Nếu không thuộc các case trên → throw lỗi gốc.

