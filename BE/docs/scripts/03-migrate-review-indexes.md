# Migrate review indexes (`scripts/migrate_review_indexes.js`)

File: `BE/scripts/migrate_review_indexes.js`

## Vì sao cần migrate này?

Trước đây hệ thống có thể đã dùng unique index:

- `(productId, userId)`

Nhưng hiện tại BE muốn cho phép:

- cùng user, cùng sản phẩm
- nhưng **mua nhiều lần** (nhiều `orderId`)
- thì mỗi lần mua có thể đánh giá 1 lần

Vì vậy index mới là:

- `(productId, userId, orderId)` unique

## Luồng chạy

1. Nạp `.env`
2. Connect MongoDB
3. Thử drop index cũ `productId_1_userId_1`
   - nếu không có thì bỏ qua
4. Tạo index mới:
   - `{ productId: 1, userId: 1, orderId: 1 }` unique
5. Disconnect

## Cách chạy

Trong `BE/`:

- `node scripts/migrate_review_indexes.js`

