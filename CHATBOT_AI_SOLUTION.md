# Giải pháp Chatbot AI hỗ trợ người mua (Gemini + MongoDB)

## 1. Tổng quan

### Mục tiêu
- Thêm một **chatbot AI** vào website, hỗ trợ người dùng:
  - Hỏi sản phẩm phù hợp (vd: "Vợt nào dành cho người mới chơi?", "Giày cầu lông cho người tập")
  - So sánh sản phẩm (vd: "So sánh vợt Yonex và Victor")
  - Hỏi thông tin chung (mô tả, giá, khuyến mãi) dựa trên dữ liệu thật từ database
  - Trả lời câu hỏi ngoài catalog (tip chơi cầu lông, quy định) nhờ **web search** (Gemini có thể dùng Google Search grounding)

### Công nghệ
- **AI**: Google Gemini API (model hiện dùng: `gemini-2.5-flash`)
- **Dữ liệu**: Sản phẩm, danh mục từ MongoDB (BE hiện tại)
- **Web search**: *Tuỳ chọn tương lai*. Code hiện tại **chỉ** dùng dữ liệu từ DB, chưa bật Google Search grounding.

---

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                │
│  - Widget chat (góc phải màn hình)                              │
│  - Gửi tin nhắn → POST /api/chat                                 │
│  - Nhận phản hồi streaming hoặc JSON                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Node/Express)                                          │
│  1. Nhận message từ user                                         │
│  2. Lấy danh sách sản phẩm (và/hoặc danh mục) từ MongoDB          │
│  3. Gọi Gemini API với:                                          │
│     - System prompt (vai trò: tư vấn ShopTD, chỉ dùng data đã cho)│
│     - Context: JSON sản phẩm (tên, giá, mô tả, danh mục...)      │
│     - User message                                                │
│     - (Tuỳ chọn) Bật Google Search grounding cho câu hỏi chung   │
│  4. Trả response về FE                                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MongoDB        │  │  Gemini API     │  │  Google Search  │
│  (products,     │  │  (generate      │  │  (grounding –   │
│   categories)   │  │   answer)       │  │   nếu dùng)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 3. Luồng dữ liệu chi tiết

### 3.1 Khi user gửi tin nhắn
1. **FE** gửi `POST /api/chat` với body: `{ message: "Vợt nào cho người mới?" }` (có thể thêm `conversationId` nếu muốn lưu lịch sử).
2. **BE**:
   - (Tùy chọn) Kiểm tra auth hoặc cho phép chat không cần đăng nhập.
   - Query MongoDB: lấy list sản phẩm (có thể giới hạn field: name, brand, category, price, description, sale…) + categories.
   - Chuẩn hóa thành text hoặc JSON để đưa vào prompt.
   - Gọi Gemini với:
     - **System instruction**: Bạn là trợ lý tư vấn của ShopTD (cầu lông). Chỉ tư vấn dựa trên danh sách sản phẩm dưới đây. Nếu user hỏi so sánh, gợi ý theo nhu cầu, hãy dựa vào data. Nếu hỏi ngoài sản phẩm (tip, luật chơi…) có thể dùng kiến thức chung hoặc web search.
     - **Context (user hoặc system)**: Đây là danh sách sản phẩm hiện có: [JSON hoặc text rút gọn].
     - **User message**: Tin nhắn của khách.
   - Gemini có thể bật **grounding với Google Search** để trả lời câu hỏi thời sự / kiến thức chung (vd: "Luật cầu lông mới nhất").
3. **BE** nhận response từ Gemini → trả về FE (JSON: `{ reply: "..." }` hoặc streaming).

### 3.2 Cách dùng dữ liệu DB trong bản hiện tại
- **Chỉ DB**: Câu hỏi về sản phẩm, giá, so sánh, gợi ý theo nhu cầu → backend luôn đưa danh sách sản phẩm (đã format) vào prompt, **không** gọi web search.
- Web search / Google Search grounding hiện được xem là **phần mở rộng**, chưa triển khai trong mã nguồn.

---

## 4. Backend (Node.js + Express)

### 4.1 Cài đặt (đã dùng)
- Package: `@google/generative-ai` (SDK chính thức Gemini).
- Biến môi trường: `GEMINI_API_KEY` (lưu trong `BE/.env`, **không** đưa key ra frontend; `geminiService.js` tự đọc từ file `.env`).

### 4.2 Endpoint đang dùng
- **POST /api/chat**
  - Body: `{ message: string, history?: { role: 'user' | 'model', text: string }[] }`
  - Response: `{ reply: string }`.
  - Logic:
    1. Lấy products (và categories) từ MongoDB (có thể cache 1–2 phút để giảm tải).
    2. Build system prompt + context (products dạng text).
    3. Gọi Gemini (model: `gemini-2.5-flash`, chưa bật Google Search grounding).
    4. Trả reply về.

### 4.3 Cấu trúc thư mục BE (thực tế)
```
BE/
  routes/
    chatRouter.js     # POST /api/chat
  services/
    geminiService.js  # Gọi Gemini, hàm generateChatReply(productContext, userMessage, history)
    productContext.js # Hàm lấy products/categories từ DB và format thành text cho prompt
  ...
```

### 4.4 Bảo mật & giới hạn
- **API key**: Chỉ dùng ở BE; không expose qua header/query cho FE.
- **Rate limit**: Giới hạn số request/chat theo IP hoặc theo user (vd: 20 tin/phút) để tránh lạm dụng.
- **Độ dài tin nhắn**: Giới hạn length `message` (vd: 500–1000 ký tự).
- **Content filter**: Có thể lọc từ nhạy cảm hoặc từ chối câu hỏi lệch mục đích (tùy chọn).

---

## 5. Frontend (React)

### 5.1 Vị trí & UI
- **Widget chat** cố định góc dưới bên phải màn hình (nút mở/đóng).
- Khi mở: khung chat (danh sách tin nhắn + ô nhập + nút gửi).
- Thiết kế: có thể dùng component riêng `ChatBot.jsx` + `ChatBot.css`, render trong `App.jsx` (hoặc Layout) để mọi trang đều dùng được.

### 5.2 Gọi API
- Gửi `POST /api/chat` với `{ message }`.
- Nhận `{ reply }` rồi hiển thị trong khung chat.
- (Tùy chọn) Lưu lịch sử trong state hoặc localStorage để giữ context trong phiên.

### 5.3 Trải nghiệm
- Loading: khi đang gửi, hiển thị "Đang suy nghĩ..." hoặc typing indicator.
- Lỗi mạng/API: thông báo "Không gửi được, vui lòng thử lại."

---

## 6. Thiết kế prompt (Gemini)

### 6.1 System instruction (mẫu)
```
Bạn là trợ lý tư vấn của ShopTD - shop chuyên dụng cầu lông. Nhiệm vụ:
- Tư vấn sản phẩm (vợt, giày, áo, quần, túi, phụ kiện) dựa ĐÚNG trên danh sách sản phẩm được cung cấp.
- Khi user hỏi "cho người mới", "so sánh", "rẻ nhất", "đang sale"... hãy dựa vào data (tên, giá, mô tả, danh mục) để trả lời.
- Trả lời ngắn gọn, thân thiện, có thể kèm tên sản phẩm và giá. Không bịa thông tin ngoài danh sách.
- Nếu user hỏi về kỹ thuật, luật chơi, tip cầu lông... bạn có thể dùng kiến thức chung hoặc tìm kiếm. Cuối câu có thể gợi ý xem thêm sản phẩm tại shop.
```

### 6.2 Context đưa vào mỗi request
- Lấy từ MongoDB (products + categories).
- Format ví dụ (rút gọn):
```
[DANH SÁCH SẢN PHẨM]
- (id, tên, thương hiệu, danh mục, giá, giá gốc nếu sale, mô tả ngắn)
...
```

Có thể cắt bớt mô tả quá dài để không vượt quá giới hạn token của Gemini (vd: 30k token cho context).

### 6.3 Bật Google Search grounding (Gemini)
- Trong API Gemini, một số model hỗ trợ **grounding với Google Search** (tìm kiếm thực tế).
- Khi bật: Gemini có thể trích dẫn kết quả tìm kiếm để trả lời câu hỏi mở (luật, tip, tin tức).
- Cần xem tài liệu Gemini mới nhất: tham số kiểu `tools: [ { googleSearch: {} } ]` hoặc tương đương trong `@google/generative-ai`.

---

## 7. Các bước triển khai gợi ý (theo phase)

### Phase 1 – Nền tảng
1. BE: Thêm `GEMINI_API_KEY` vào `.env`, cài `@google/generative-ai`.
2. BE: Tạo `geminiService.js` (khởi tạo model, hàm generate với system + user message).
3. BE: Tạo `productContext.js` (lấy products/categories từ DB, format text).
4. BE: Tạo `chatRouter.js` – POST /api/chat: lấy context → gọi Gemini → trả reply.
5. FE: Component ChatBot (nút mở, khung chat, input, gọi POST /api/chat, hiển thị reply).

### Phase 2 – Cải thiện prompt & context
6. Tinh chỉnh system prompt cho đúng giọng ShopTD và quy tắc chỉ dùng data.
7. Thêm ví dụ vài câu hỏi (so sánh, người mới) vào prompt nếu cần (few-shot).
8. Tối ưu context: chỉ đưa field cần thiết, giới hạn số sản phẩm hoặc token.

### Phase 3 – Web search (nếu dùng)
9. Kiểm tra Gemini API có hỗ trợ Google Search grounding không; bật trong request nếu có.
10. Cập nhật system prompt: "Với câu hỏi ngoài sản phẩm, bạn có thể tìm kiếm; với câu hỏi về sản phẩm chỉ dùng danh sách đã cho."

### Phase 4 – UX & bảo mật
11. Rate limit, giới hạn độ dài message, xử lý lỗi rõ ràng.
12. (Tùy chọn) Lưu lịch sử chat theo session hoặc user để context đa lượt.

---

## 8. Cấu trúc file đề xuất

```
BE/
  .env                    # Thêm GEMINI_API_KEY
  routes/
    chatRouter.js         # POST /api/chat
  services/
    geminiService.js      # Gọi Gemini API
    productContext.js     # Lấy & format products/categories
  index.js                # app.use('/api/chat', chatRouter)

FE/
  src/
    components/
      ChatBot.jsx         # Widget chat (nút + khung + input)
      ChatBot.css
    api/
      client.js           # Thêm postChat(message)
  App.jsx                 # Render <ChatBot />
```

---

## 9. Rủi ro & lưu ý

- **Token/chi phí**: Mỗi request gửi kèm toàn bộ product list → tốn token. Có thể giảm bằng cách chỉ gửi sản phẩm thuộc danh mục liên quan (phân tích sơ bộ từ câu hỏi) hoặc cache context và chỉ cập nhật khi DB đổi.
- **Độ trễ**: Query DB + gọi Gemini có thể 2–5 giây; cần loading/typing indicator rõ ràng.
- **Hallucination**: Nhấn mạnh trong prompt "chỉ trả lời dựa trên danh sách đã cho" để hạn chế bịa giá/tên sản phẩm.
- **Web search**: Nếu dùng grounding, cần kiểm tra điều khoản API và giới hạn số lần gọi.

---

## 10. Tóm tắt

| Thành phần   | Nội dung chính |
|-------------|----------------|
| **Mục tiêu** | Chatbot tư vấn sản phẩm + so sánh từ DB, câu hỏi chung nhờ web search (Gemini). |
| **BE**      | POST /api/chat; lấy products/categories từ MongoDB; gọi Gemini (system + context + user message); có thể bật Google Search grounding. |
| **FE**      | Widget chat góc phải; gửi message, nhận reply; loading & xử lý lỗi. |
| **Bảo mật** | API key chỉ ở BE; rate limit; giới hạn độ dài input. |
| **Triển khai** | Làm từng phase: BE Gemini + context → route chat → FE widget → tinh chỉnh prompt → (tuỳ chọn) web search. |

Sau khi bạn đồng ý với hướng đi trong file này, có thể bắt đầu implement theo Phase 1 (BE + FE cơ bản) rồi mở rộng dần.
