# Migrate dọn legacy variants/sku/addOn (`scripts/migrate_remove_variants_addon.js`)

File: `BE/scripts/migrate_remove_variants_addon.js`

## Mục tiêu

Dự án hiện dùng tồn kho đơn giản:

- chỉ dựa trên `Product.stock`

Trong dữ liệu cũ có thể còn các field:

- `variants`
- `stringingAddOn`
- hoặc item trong cart/order có `sku`, `addOn`

Script này dọn các field legacy đó để DB “sạch” và thống nhất.

## Luồng chạy

1. Nạp `.env`
2. Connect MongoDB
3. Products:
   - loop qua toàn bộ product
   - chuẩn hoá `stock` về số >= 0
   - `$unset` các field legacy: `variants`, `stringingAddOn`, `inStock`
4. Carts:
   - `updateMany` unset `items.$[].sku` và `items.$[].addOn`
5. Orders:
   - `updateMany` unset `items.$[].sku` và `items.$[].addOn`
6. Disconnect

## Cách chạy

Trong `BE/`:

- `node scripts/migrate_remove_variants_addon.js`

