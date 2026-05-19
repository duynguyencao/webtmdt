# Route Categories (`routes/categoryRouter.js`)

File: `BE/routes/categoryRouter.js`

## Route này làm gì?

Trả danh mục sản phẩm cho FE (công khai).

Hiện tại hệ thống “đơn giản hoá”:

- Chỉ có 1 danh mục: **Vợt Cầu Lông** (value `vot`)

## Endpoint: `GET /api/categories`

Luồng:

1. Đếm số product có `category: 'vot'`
2. Nếu không có sản phẩm → trả `[]`
3. Nếu có → trả mảng 1 phần tử:
   - `name`: Vợt Cầu Lông
   - `value`: vot
   - `path`: /products
   - `image`: ảnh minh hoạ
   - `count`: số lượng sản phẩm

Vì sao phải count?

- FE có thể hiển thị “danh mục có bao nhiêu sản phẩm”.

