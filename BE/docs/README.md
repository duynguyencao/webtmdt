# Backend Docs (BE) — đọc theo từng phần

Mục tiêu: giải thích BE **chi tiết hơn**, chia thành **nhiều file** để dễ đọc/dễ tìm.

## Cách đọc nhanh (khuyến nghị)

- Mới bắt đầu: đọc `01-overview.md` → `02-running-and-env.md` → `03-entrypoint-indexjs.md`
- Muốn hiểu luồng đăng nhập: `05-auth-and-roles.md` → `routes/02-user.md`
- Muốn hiểu luồng đặt hàng: `routes/03-orders.md` → `routes/04-payos.md` → `jobs/01-auto-cancel-payos.md`

## Mục lục

### Tổng quan

- `01-overview.md`: BE làm gì, sơ đồ luồng tổng quát
- `02-running-and-env.md`: chạy BE, `.env`, các biến quan trọng
- `03-entrypoint-indexjs.md`: giải thích kỹ `index.js`

### Nền tảng (DB, validate, auth)

- `04-db.md`: kết nối MongoDB (`db/dbConnect.js`)
- `05-auth-and-roles.md`: JWT, API key allowlist (`middleware/auth.js`)
- `06-validation.md`: zod schemas + validate middleware (`validation/`)

### Models (dữ liệu trong DB)

- `models/README.md`: mục lục models
- `models/01-product.md`
- `models/02-user.md`
- `models/03-order.md`
- `models/04-coupon.md`
- `models/05-cart.md`
- `models/06-review.md`
- `models/07-site-config.md`
- `models/08-order-counter.md`
- `models/09-payos-payment-event.md`

### Routes (API)

- `routes/README.md`: mục lục routes
- `routes/01-products.md`
- `routes/02-user.md`
- `routes/03-orders.md`
- `routes/04-payos.md`
- `routes/05-coupons.md`
- `routes/06-site-config.md`
- `routes/07-cart.md`
- `routes/08-reviews.md`
- `routes/09-categories.md`
- `routes/10-shipping.md`
- `routes/11-chat.md`
- `routes/12-upload.md`

### Services / Jobs

- `services/README.md`
- `services/01-product-context.md`
- `services/02-gemini-service.md`
- `services/03-supabase-storage.md`
- `jobs/README.md`
- `jobs/01-auto-cancel-payos.md`

### Seed & Scripts

- `seed/README.md`
- `seed/01-seed-index.md`
- `seed/02-products-seed.md`
- `seed/03-users-seed.md`
- `scripts/README.md`
- `scripts/01-make-admin.md`
- `scripts/02-make-shipper.md`
- `scripts/03-migrate-review-indexes.md`
- `scripts/04-migrate-remove-variants-addon.md`
- `scripts/05-sync-indexes.md`

