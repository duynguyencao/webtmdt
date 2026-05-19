# Route Shipping (`routes/shippingRouter.js`)

File: `BE/routes/shippingRouter.js`

## Route này làm gì?

Nó trả “ước tính phí ship”.

Hiện tại đang ở **phase 1**:

- fee cố định = 0
- provider = manual

Ý nghĩa:

- BE đã có endpoint để FE gọi (đỡ phải hard-code ở FE)
- sau này có thể thay logic tính phí bằng GHN/GHTK… mà không đổi contract nhiều

## Endpoint: `GET /api/shipping/quote`

Query:

- `city`, `district`, `ward`
- `itemsCount` (hiện chưa dùng)

Response:

- `provider: 'manual'`
- `fee: 0`
- `currency: 'VND'`
- `address`: trả lại các field đã nhận (để FE debug/hiển thị)

