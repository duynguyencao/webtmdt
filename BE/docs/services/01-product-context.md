# Service tạo “context sản phẩm” cho chatbot (`services/productContext.js`)

File: `BE/services/productContext.js`

## Mục tiêu

Gemini cần “dữ liệu sản phẩm thật” để:

- gợi ý đúng tên hàng
- nói đúng giá
- không bịa ra sản phẩm

File này làm nhiệm vụ:

1. query DB lấy danh sách sản phẩm
2. format thành text dễ nhét vào prompt
3. cache trong RAM để tiết kiệm query DB

## 1) Giới hạn số sản phẩm

- `MAX_PRODUCTS_IN_CONTEXT = 150`

Vì sao?

- Prompt quá dài sẽ tốn token và dễ bị fail/đắt/timeout.

## 2) `getProductContextForChat()`

Luồng:

- Query `Product.find()` và chỉ select các field cần:
  - `id name brand category price originalPrice sale description`
- `lean()` để trả plain object (nhanh hơn).
- `limit(MAX_PRODUCTS_IN_CONTEXT)`

Sau đó format:

- `categoryList`: hiện hard-code danh mục “Vợt Cầu Lông”
- `productLines`: mỗi sản phẩm 1 dòng dạng:
  - `[id:...] name | brand | category | price ... VND [ĐANG SALE] | Mô tả: ...`

Giới hạn mô tả:

- cắt `description` tối đa 200 ký tự để tránh dài.

Nếu không có sản phẩm:

- trả dòng: `(Hiện shop chưa có sản phẩm nào trong kho — trả lời khách là đang cập nhật.)`

Kết quả cuối:

- 1 block text có tiêu đề “DANH MỤC” và “DANH SÁCH SẢN PHẨM…”.

## 3) Cache in-memory (RAM)

Biến:

- `CACHE_TTL_MS = 5 phút`
- `cachedContext`, `cachedAt`

Hàm `getProductContextCached()`:

- nếu cache còn hạn → trả cache
- nếu hết hạn → gọi `getProductContextForChat()` rồi cập nhật cache

Lợi ích:

- chat liên tục không query DB mỗi tin nhắn
- giảm load MongoDB

