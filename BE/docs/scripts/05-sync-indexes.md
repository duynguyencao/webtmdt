# Sync indexes (`scripts/sync_indexes.js`)

File: `BE/scripts/sync_indexes.js`

## Mục tiêu

Đảm bảo các index trong MongoDB khớp với index đã khai báo trong schema Mongoose.

Ví dụ:

- `Order` có index theo `userId, createdAt`
- `Review` có unique index theo `(productId, userId, orderId)`

Nếu DB không có index đúng:

- query có thể chậm
- unique constraint có thể không hoạt động như mong đợi

## Script làm gì?

1. Nạp `.env`
2. Connect MongoDB
3. Gọi `syncIndexes()` cho các model:
   - `Order`, `Review`, `Product`, `Cart`
4. Log kết quả
5. Disconnect

## Cách chạy

Trong `BE/`:

- `node scripts/sync_indexes.js`

