## Tổng quan kiến trúc hệ thống ShopTD

ShopTD là website thương mại điện tử bán đồ cầu lông, được chia thành hai phần chính:

- **Backend (`BE/`)**: API REST xây bằng **Node.js + Express**, lưu dữ liệu trên **MongoDB** với **Mongoose**, xác thực bằng **JWT**, tích hợp **Google Gemini** làm chatbot tư vấn.
- **Frontend (`FE/`)**: Single Page Application xây bằng **React 18 + Vite**, điều hướng bằng **React Router**, dùng **React Context** để quản lý giỏ hàng, CSS thuần cho giao diện, tích hợp thanh toán chuyển khoản **VietQR**.

---

## 1. Backend – Node.js, Express, MongoDB, Gemini

### 1.1. Công nghệ & package chính

- **Node.js**: môi trường chạy JavaScript trên server.
- **Express 4**: framework xây dựng REST API.
- **MongoDB**: cơ sở dữ liệu NoSQL dạng document.
- **Mongoose 8**: ODM (Object Data Modeling) để khai báo schema và thao tác MongoDB.
- **dotenv**: đọc biến môi trường từ file `.env`.
- **cors**: cho phép FE (domain/port khác) truy cập API.
- **bcrypt**: băm mật khẩu người dùng.
- **jsonwebtoken (JWT)**: phát hành và xác thực access token cho API yêu cầu đăng nhập.
- **@google/generative-ai**: SDK chính thức dùng để gọi model **Gemini 2.5 Flash** cho chatbot.

### 1.2. Cấu trúc thư mục Backend

```text
BE/
  index.js                # Khởi tạo Express, kết nối MongoDB, mount router
  package.json            # Khai báo dependency, script dev/seed
  .env / .env.example     # Cấu hình kết nối DB, JWT, ngân hàng, Gemini

  models/
    User.js               # Schema người dùng
    Product.js            # Schema sản phẩm
    Order.js              # Schema đơn hàng

  routes/
    userRouter.js         # Đăng ký / đăng nhập / lấy thông tin user
    productRouter.js      # Danh sách + chi tiết sản phẩm
    orderRouter.js        # Tạo + quản lý đơn hàng, thanh toán
    chatRouter.js         # Endpoint chatbot AI

  services/
    geminiService.js      # Gọi Gemini, sinh câu trả lời từ AI
    productContext.js     # Lấy và format context sản phẩm cho Gemini

  seed/
    index.js              # Script seed database (user, category, product)
    productsSeed.js       # Dữ liệu sản phẩm crawl dùng để seed
```

### 1.3. File `index.js` – khởi tạo server Express

- **Kết nối MongoDB**:
  - Đọc `MONGODB_URI` từ `BE/.env`.
  - Dùng `mongoose.connect(MONGODB_URI)` để kết nối một lần khi server khởi động.

- **Cấu hình middleware**:
  - `express.json()` để parse JSON body.
  - `cors()` để cho phép FE gọi API từ `http://localhost:3000` (hoặc domain khác).

- **Mount router**:
  - `/api/users` → `userRouter`
  - `/api/products` → `productRouter`
  - `/api/orders` → `orderRouter`
  - `/api/chat` → `chatRouter`

- **Route cấu hình ngân hàng**:

  - `GET /api/bank/info`  
    - Đọc từ biến môi trường:
      - `BANK_NAME`
      - `BANK_ACCOUNT_NUMBER`
      - `BANK_ACCOUNT_HOLDER`
      - `BANK_BIN`
    - Trả JSON cho FE dùng để hiển thị thông tin chuyển khoản và sinh QR VietQR.

### 1.4. Mô hình dữ liệu – Mongoose

#### 1.4.1. `models/User.js`

- Các trường chính:
  - `name`: tên hiển thị.
  - `email`: duy nhất, dùng đăng nhập.
  - `passwordHash`: mật khẩu đã băm bằng **bcrypt**.
  - `role`: `'buyer'` hoặc `'admin'` để phân quyền.
  - `createdAt`, `updatedAt`: do Mongoose tự quản lý với `timestamps`.

- **Công nghệ**:
  - Mongoose Schema + Model.
  - Băm mật khẩu ở router khi đăng ký: `bcrypt.hash(plainPassword, saltRounds)`.

#### 1.4.2. `models/Product.js`

- Đại diện cho mỗi sản phẩm bán trong shop, gồm:
  - `id`: số nguyên dùng cho FE (ví dụ 1001, 1002...).
  - `name`, `brand`, `category`.
  - `price`: giá bán hiện tại (VND).
  - `originalPrice`: giá niêm yết gốc (dùng gạch ngang nếu đang sale).
  - `image`: ảnh đại diện, FE đảm bảo luôn tồn tại bằng fallback.
  - `images`: mảng link ảnh chi tiết.
  - `description`: mô tả sản phẩm (text có thể dài, được FE rút gọn và lọc rác).
  - `specs` / `specifications`: object thông số kỹ thuật (key → value).
  - `stock`: tồn kho (số lượng).
  - `featured`: bool, dùng cho “Sản phẩm nổi bật”.
  - `sale`: bool hoặc thông tin sale.
  - `rating`: điểm trung bình.
  - `reviews`: số lượng đánh giá.

- **Lý do**:  
  - Phù hợp dữ liệu crawl từ trang tham chiếu, đồng thời đủ field để FE hiển thị card, chi tiết, lọc/sort.

#### 1.4.3. `models/Order.js`

- Các field quan trọng:
  - `orderId`: mã đơn dạng chuỗi (ví dụ `ORD000123`), tự sinh khi tạo đơn.
  - `customer`: object:
    - `name`, `phone`, `email`, `address`.
  - `items`: mảng:
    - `{ id, name, brand, image, price, quantity }`.
  - `total`: tổng tiền đơn (bao gồm phí ship).

- **Thanh toán & trạng thái**:
  - `paymentMethod`: Enum `'cod' | 'bank_transfer'`.
  - `paymentStatus`:  
    - `null`: với COD, không theo dõi thanh toán riêng.  
    - `'pending_payment'`: đơn chuyển khoản đã tạo nhưng chưa xác nhận đã nhận tiền.  
    - `'paid'`: admin đã xác nhận đã nhận đủ tiền chuyển khoản.
  - `status`: vòng đời đơn:
    - `'pending'` → `'confirmed'` → `'shipped'` → `'delivered'` hoặc `'cancelled'`.

- **Mục đích thiết kế**:
  - Tách rõ:
    - Trạng thái **đơn hàng** (`status`).
    - Trạng thái **thanh toán** (`paymentStatus`) cho đơn chuyển khoản.

### 1.5. Router – Express

#### 1.5.1. `routes/userRouter.js` – Auth & user

- **Công nghệ**:
  - `bcrypt` để kiểm tra mật khẩu.
  - `jsonwebtoken` để phát hành JWT.

- **Endpoint chính**:
  - `POST /api/users/register`:
    - Nhận `name`, `email`, `password`.
    - Kiểm tra trùng email, băm mật khẩu, tạo user role `buyer`.
  - `POST /api/users/login`:
    - Nhận `email`, `password`.
    - So sánh bằng `bcrypt.compare`.  
    - Nếu đúng → phát `token` JWT chứa `userId`, `role`.
  - `GET /api/users/me`:
    - Dùng middleware decode token từ header `Authorization: Bearer <token>`.
    - Trả về thông tin user (không bao gồm passwordHash).

#### 1.5.2. `routes/productRouter.js` – Sản phẩm

- **GET /api/products**
  - Hỗ trợ query filter (ví dụ: `category`, `featured`, `sale`).
  - Dùng `.select('id name brand category price originalPrice image images rating reviews sale')` để giảm payload.
  - Map lại list:
    - `image` luôn có giá trị:
      - Ưu tiên `image`, nếu thiếu dùng `images[0]`, cuối cùng là chuỗi rỗng.

- **GET /api/products/:id**
  - Trả về đầy đủ chi tiết (images, description, specs, stock, v.v.).
  - FE dùng để render trang chi tiết + tabs “Mô tả” / “Thông số kỹ thuật”.

#### 1.5.3. `routes/orderRouter.js` – Đơn hàng & thanh toán

- **Tạo đơn – `POST /api/orders`**
  - Yêu cầu user đã đăng nhập (JWT).
  - Dữ liệu nhận:
    - `customer`: tên, điện thoại, email, địa chỉ gộp (phường/xã, quận/huyện, tỉnh/thành phố).
    - `items`: thông tin sản phẩm (id, tên, brand, image, price, quantity).
    - `total`: tổng tiền (bao gồm phí ship 0 hoặc 30.000đ tuỳ giá trị).
    - `paymentMethod`: `'cod'` hoặc `'bank_transfer'`.
    - `note`: ghi chú tuỳ chọn.
  - Logic:
    - Tính và lưu `orderId` mới.
    - Nếu `paymentMethod === 'bank_transfer'`:
      - `paymentStatus = 'pending_payment'`.
    - Nếu `cod`:
      - `paymentStatus = null`.

- **Lấy đơn của user – `GET /api/orders/me`**
  - Dựa vào `userId` từ token.

- **Admin: danh sách & chi tiết – `GET /api/orders`, `GET /api/orders/:orderId`**
  - Yêu cầu role `admin`.

- **Thay đổi trạng thái đơn**:
  - `PATCH /api/orders/:orderId/confirm`
  - `PATCH /api/orders/:orderId/cancel`
  - `PATCH /api/orders/:orderId/ship`
  - `PATCH /api/orders/:orderId/deliver`

- **Đánh dấu đã thanh toán – `PATCH /api/orders/:orderId/mark-paid`**
  - Chỉ cho admin.
  - Điều kiện:
    - `paymentMethod === 'bank_transfer'`.
    - `paymentStatus !== 'paid'`.
  - Cập nhật:
    - `paymentStatus = 'paid'`.
    - (Tuỳ thiết kế, có thể đồng thời cập nhật `status` sang `'confirmed'`).

#### 1.5.4. `routes/chatRouter.js` – Chatbot AI

- **POST /api/chat**
  - Body:
    - `message: string` – câu hỏi hiện tại.
    - `history?: { role: 'user' | 'model', text: string }[]` – lịch sử hội thoại.
  - Logic:
    1. Gọi `productContext` để lấy danh sách sản phẩm đang có trong DB, format thành text.
    2. Gọi `generateChatReply(productContextText, message, history)` trong `geminiService.js`.
    3. Trả về `{ reply }` cho FE.

### 1.6. Dịch vụ Gemini – `services/geminiService.js`

- **Công nghệ**:
  - Package `@google/generative-ai`, model `gemini-2.5-flash`.
  - Đọc `GEMINI_API_KEY` từ `BE/.env` bằng cách đọc file trực tiếp (tránh cache `process.env`).

- **System instruction**:
  - Xác định bot là **trợ lý tư vấn của ShopTD – shop cầu lông**.
  - Quy tắc bắt buộc:
    - Phải tư vấn dựa trên danh sách sản phẩm `[id:...]` do backend cung cấp.
    - Không được nói “chưa có dữ liệu” nếu đã có danh sách.
    - Format giá tiền kiểu Việt Nam (ví dụ `3.500.000đ`).

- **Hàm `generateChatReply(productContext, userMessage, history)`**:
  - Ghép context:
    - Đưa block:  
      `DANH SÁCH SẢN PHẨM TỪ DATABASE ...`  
      vào tin user đầu tiên trong `contents`.
  - Gọi `model.generateContent({ contents })`.
  - Xử lý lỗi:
    - Thiếu API key, key sai, vượt quota, nội dung bị chặn bởi safety… → trả message rõ ràng cho FE.

---

## 2. Frontend – React, Vite, React Router, Context API

### 2.1. Công nghệ & package chính

- **React 18**: xây UI component-based.
- **React Router DOM v6**: điều hướng client-side giữa các trang.
- **Vite 5**: dev server nhanh, bundler cho production.
- **React Icons**: bộ icon (dùng `react-icons/fi`).
- **CSS3 thuần**: style qua file `.css` được import vào từng component.
- **Context API**: quản lý giỏ hàng (`CartContext`).

### 2.2. Cấu trúc thư mục Frontend

```text
FE/
  package.json         # Dependencies FE
  vite.config.js      # Cấu hình Vite

  src/
    main.jsx          # Entry React, render <App />
    App.jsx           # Khai báo router, layout chung
    index.css         # Global styles, CSS variables

    api/
      client.js       # Wrapper fetch gọi API backend

    context/
      CartContext.jsx # Quản lý giỏ hàng bằng Context

    components/
      Header.jsx / Header.css
      Footer.jsx / Footer.css
      ProductCard.jsx / ProductCard.css
      CategoryCard.jsx / CategoryCard.css
      BankTransferInfo.jsx
      ChatBot.jsx / ChatBot.css
      ScrollToTop.jsx

    pages/
      Home.jsx / Home.css
      Products.jsx / Products.css
      ProductDetail.jsx / ProductDetail.css
      Cart.jsx / Cart.css
      Checkout.jsx / Checkout.css
      Login.jsx / Auth.css
      Register.jsx / Auth.css
      MyOrders.jsx / MyOrderDetail.jsx
      AdminProducts.jsx / AdminOrders.jsx / AdminOrderDetail.jsx
      Contact.jsx / Contact.css
      ComingSoon.jsx
```

### 2.3. `src/api/client.js` – client gọi REST API

- **Công nghệ**:
  - Dùng `fetch` native, wrap lại thành hàm `request(path, options)`.
  - Sử dụng `import.meta.env.VITE_API_URL` làm `baseUrl`.

- **Quản lý token JWT**:
  - `getToken()` / `setToken(token)` / `logout()` – lưu/đọc từ `localStorage`.
  - Tự động gắn header `Authorization: Bearer <token>` cho các request cần đăng nhập.

- **Các nhóm hàm**:
  - Auth:
    - `login(email, password)`, `register(...)`, `getMe()`.
  - Products:
    - `getProducts(params)`, `getProductDetail(id)`, `getCategories()`.
  - Orders (buyer & admin):
    - `createOrder(data)`, `getMyOrders()`, `getMyOrderDetail(orderId)`.
    - `getAdminOrders(params)`, `getAdminOrderDetail(orderId)`.
    - `updateOrderStatus(orderId, status)`, `markOrderPaid(orderId)`.
  - Bank:
    - `getBankInfo()` → `GET /api/bank/info`.
  - Chatbot:
    - `postChat(message, history)` → `POST /api/chat`.

### 2.4. Context giỏ hàng – `context/CartContext.jsx`

- **Công nghệ**:
  - React Context + hook `useCart()` custom.
  - Lưu giỏ hàng vào `localStorage` để không mất khi refresh.

- **Chức năng**:
  - `addToCart(product, quantity)`
  - `removeFromCart(id)`
  - `updateQuantity(id, quantity)`
  - `clearCart()`
  - `getTotalPrice()`, `getTotalItems()`

### 2.5. Component giao diện chính

#### 2.5.1. `Header.jsx` – thanh điều hướng

- **Công nghệ**:
  - `useState`, `useEffect`, `useNavigate` từ React/React Router.
  - Icon từ `react-icons/fi`.
  - Gọi `api.getMe()` để hiển thị user/hệ thống admin.

- **Chức năng**:
  - Top bar: hiển thị hotline, “Vận chuyển toàn quốc”, nút đăng nhập/đăng ký hoặc menu user/admin.
  - Logo: “**ShopTD** – Cầu Lông Chuyên Nghiệp”.
  - Thanh search: tìm kiếm sản phẩm qua query `/products?search=...`.
  - Menu:
    - `Trang chủ`, `Sản phẩm` (mega-menu 7 danh mục), `Sale Off`, `Tin tức`, `Liên hệ`.
  - Responsive: có nút menu (hamburger) cho mobile.

#### 2.5.2. `Footer.jsx` – chân trang

- Thông tin:
  - “Về ShopTD” – mô tả ngắn về shop.
  - Danh mục sản phẩm chính.
  - Phần hỗ trợ: chính sách, hướng dẫn.
  - Liên hệ: hotline, email `contact@shoptd.vn`, địa chỉ `PTIT_HN`.
  - Bản quyền: `© 2026 ShopTD`.

#### 2.5.3. `ProductCard.jsx` – thẻ sản phẩm

- **Giao diện**:
  - Ảnh vuông (tỷ lệ 1:1), có hiệu ứng zoom nhẹ khi hover.
  - Tên sản phẩm (cắt tối đa 2 dòng), thương hiệu.
  - Giá gốc (nếu có) gạch ngang, giá hiện tại chữ đỏ lớn.
  - Rating bằng sao + số lượng đánh giá.
  - Nút “Thêm vào giỏ” gọi `addToCart`.

- **Kỹ thuật**:
  - Fallback ảnh:
    - `product.image` → `product.images[0]` → placeholder `'https://via.placeholder.com/400x400?text=No+Image'`.

#### 2.5.4. `BankTransferInfo.jsx` – thông tin chuyển khoản + VietQR

- **Công nghệ**:
  - `useState`, `useEffect`.
  - Gọi `api.getBankInfo()` khi component mount.
  - Build URL VietQR:

    ```js
    const base = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png`
    const params = new URLSearchParams({
      amount: String(Math.round(amount)),
      addInfo: `Thanh toan don ${orderId}`,
      accountName: bankInfo.accountHolder || bankInfo.name || ''
    })
    const qrUrl = `${base}?${params.toString()}`
    ```

- **Hiển thị**:
  - Hình QR (thẻ `<img>`).
  - Ngân hàng, số tài khoản, chủ tài khoản.
  - Số tiền format VND bằng `Intl.NumberFormat`.
  - Nội dung chuyển khoản: `Thanh toan don #${orderId}`.
  - Cảnh báo: bắt buộc ghi đúng nội dung để shop đối soát.

- **Nơi sử dụng**:
  - Trang **Checkout** sau khi đặt đơn chọn `bank_transfer`.
  - Trang **MyOrderDetail** cho các đơn thanh toán chuyển khoản.

#### 2.5.5. `ChatBot.jsx` – widget chatbot AI

- **Công nghệ**:
  - React state để quản lý:
    - `open` (mở/đóng chat),
    - `messages` (lịch sử tin nhắn),
    - `input` (nội dung đang nhập),
    - `loading` (đang chờ AI).
  - `useRef` + `scrollIntoView` để luôn cuộn xuống cuối.

- **Luồng hoạt động**:
  - Khi user gửi câu hỏi:
    1. Thêm tin nhắn user vào `messages`.
    2. Chuẩn bị `history` từ các tin nhắn trước (chuyển role `'bot'` → `'model'`).
    3. Gọi `api.postChat(text, history)` → `POST /api/chat`.
    4. Nhận `{ reply }` và thêm vào `messages` với role `'bot'`.

- **UI**:
  - Nút tròn góc phải dưới (icon tin nhắn).
  - Panel chat có header “Trợ lý ShopTD”.
  - Khung tin nhắn, input và nút gửi.

#### 2.5.6. `ScrollToTop.jsx`

- **Công nghệ**:
  - `useLocation` để lắng nghe thay đổi route.
  - `useEffect` gọi `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })`.

- **Mục đích**:
  - Khi chuyển trang, luôn cuộn lên đầu, tránh tình trạng giữ vị trí scroll cũ.

### 2.6. Các trang chính (`pages/`)

#### 2.6.1. `Home.jsx` – trang chủ

- Hero section giới thiệu shop.
- Grid danh mục (Card danh mục).
- Danh sách “Sản phẩm nổi bật”.
- Banner khuyến mãi (sale off tới 50%).

#### 2.6.2. `Products.jsx` – danh sách sản phẩm

- Giao diện:
  - Bên trái: **filters-sidebar** (danh mục, thương hiệu, khoảng giá).
  - Bên phải: danh sách sản phẩm dạng grid (`products-grid`).

- Công nghệ:
  - `useSearchParams` để đọc `category` / `search` trên URL.
  - State `filters` để lưu lựa chọn filter + sort.
  - `useEffect` filter, sort array sản phẩm trong FE.
  - **Sticky sidebar**:
    - CSS:
      - `position: sticky; top: 100px;`
      - `max-height: calc(100vh - 120px);`
      - `overflow-y: auto;`
      - Ẩn scrollbar: `scrollbar-width: none` + `::-webkit-scrollbar { display: none; }`.

#### 2.6.3. `ProductDetail.jsx` – chi tiết sản phẩm

- Hiển thị:
  - Ảnh lớn + thumbnail (có nút mũi tên trái/phải).
  - Thông tin cơ bản: tên, brand, giá, tồn kho.
  - Tabs:
    - “Mô tả sản phẩm”: mô tả đã lọc rác và cắt bớt dòng.
    - “Thông số kỹ thuật”: bảng specs với `table-layout: fixed`.

- Xử lý dữ liệu mô tả:
  - Tách `description` theo dòng, `trim()`.
  - Loại bỏ:
    - Các dòng chứa `hotline`, `mr.`, `chính sách`…
    - Các dòng chứa pattern số điện thoại (regex).
  - Chỉ giữ tối đa 40 dòng đầu để tránh trang quá dài.

- CSS:
  - `product-detail-page` ẩn trục X để tránh scroll ngang.
  - `product-detail` grid 2 cột với `max-width: 1120px; margin: 0 auto;`.

#### 2.6.4. `Checkout.jsx` – thanh toán

- Yêu cầu đăng nhập:
  - Nếu chưa có token → `navigate('/login?redirect=/checkout')`.

- Form:
  - Thông tin giao hàng (tên, điện thoại, email, địa chỉ chi tiết).
  - Phương thức thanh toán:
    - COD (thanh toán khi nhận hàng).
    - Chuyển khoản qua ngân hàng (QR) – `bank_transfer`.
  - Ghi chú đơn hàng.

- Sau khi đặt hàng thành công:
  - Hiển thị bước **“Đặt hàng thành công”**:
    - Mã đơn `#ORDERID`.
    - Nếu `paymentMethod === 'bank_transfer'`:
      - Block “Thông tin chuyển khoản” với component `BankTransferInfo`.
  - Xoá giỏ hàng (`clearCart()`).

#### 2.6.5. `MyOrders.jsx` & `MyOrderDetail.jsx`

- `MyOrders.jsx`:
  - Gọi `api.getMyOrders()` để hiển thị danh sách đơn người dùng.
  - Mỗi đơn có link tới `/orders/:orderId`.

- `MyOrderDetail.jsx`:
  - Gọi `api.getMyOrderDetail(orderId)`.
  - Hiển thị item list, tổng tiền, trạng thái đơn, trạng thái thanh toán.
  - Nếu `paymentMethod === 'bank_transfer'`:
    - Hiển thị lại `BankTransferInfo` để khách có thể chuyển khoản sau nếu chưa làm.

#### 2.6.6. Trang admin (`AdminProducts.jsx`, `AdminOrders.jsx`, `AdminOrderDetail.jsx`)

- **Yêu cầu admin**: chỉ vào được nếu user role `admin`.
- **Chức năng**:
  - Quản lý sản phẩm: thêm/sửa/xoá, bật/tắt featured, sale.
  - Quản lý đơn:
    - Xem danh sách, lọc theo trạng thái.
    - Cập nhật `status` (confirm, ship, deliver, cancel).
    - Đối với đơn chuyển khoản: nút **“Xác nhận đã thanh toán”** gọi API `mark-paid`.

#### 2.6.7. `Contact.jsx` – liên hệ

- Thông tin liên hệ:
  - Hotline, email, địa chỉ `PTIT_HN`.
  - Mô tả ngắn về ShopTD.
  - Gợi ý tìm “ShopTD PTIT_HN” trên Google Maps.

- Form liên hệ:
  - Họ tên, điện thoại, email, nội dung cần hỗ trợ.
  - Hiện tại chỉ **giả lập gửi** (dùng `setTimeout`); có thể nối backend trong tương lai.

#### 2.6.8. `ComingSoon.jsx`

- Dùng cho các route chưa triển khai đầy đủ như `/account`, `/track-order`, `/news`.

---

## 3. Tóm tắt luồng nghiệp vụ chính

### 3.1. Đặt hàng COD

1. Người dùng đăng nhập.
2. Thêm sản phẩm vào giỏ (`CartContext`).
3. Mở **Checkout**, điền thông tin giao hàng, chọn **“Thanh toán khi nhận hàng (COD)”**.
4. FE gọi `POST /api/orders` với `paymentMethod: 'cod'`.
5. BE tạo đơn, `paymentStatus = null`, `status = 'pending'`.
6. Admin xem đơn trong trang admin, xác nhận & cập nhật trạng thái.

### 3.2. Đặt hàng chuyển khoản VietQR

1. Người dùng đăng nhập, thêm sản phẩm vào giỏ.
2. Ở **Checkout**, chọn **“Chuyển khoản qua ngân hàng (QR)”**.
3. FE gọi `POST /api/orders` với `paymentMethod: 'bank_transfer'`.
4. BE tạo đơn, set:
   - `paymentMethod = 'bank_transfer'`
   - `paymentStatus = 'pending_payment'`.
5. FE hiển thị trang thành công:
   - Component `BankTransferInfo`:
     - Gọi `GET /api/bank/info`.
     - Sinh VietQR với BIN + STK + số tiền + nội dung `Thanh toan don {orderId}`.
6. Khách dùng app ngân hàng quét QR, chuyển khoản đúng nội dung.
7. Admin khi thấy tiền về:
   - Vào chi tiết đơn admin.
   - Ấn nút **“Xác nhận đã thanh toán”** → `PATCH /api/orders/:orderId/mark-paid`.
   - `paymentStatus` chuyển thành `'paid'`.

### 3.3. Chatbot AI hỗ trợ tư vấn

1. Người dùng mở widget chat ở góc phải dưới.
2. Nhập câu hỏi (vd: “Vợt nào cho người mới chơi?”).
3. FE gửi `POST /api/chat` với:
   - `message`
   - `history` (các tin nhắn trước đó).
4. BE:
   - Lấy danh sách sản phẩm từ MongoDB, format thành block `[id:...] Tên | Giá | ...`.
   - Gọi Gemini (`gemini-2.5-flash`) qua `geminiService.generateChatReply`.
   - Trả `reply` về.
5. FE hiển thị câu trả lời trong khung chat.

---

## 4. Hướng cải thiện trong tương lai

- **Bảo mật & ổn định**:
  - Thêm `helmet`, `express-rate-limit`.
  - Thêm logging (winston/pino).

- **Validation**:
  - Dùng `Joi`/`Zod` cho body của các endpoint (đặc biệt `/login`, `/register`, `/orders`).

- **Thanh toán**:
  - Cân nhắc tích hợp thêm ví điện tử (MoMo, ZaloPay…) nếu cần, dựa trên phần “nghiên cứu” trong `THANH_TOAN_NGHIEN_CUU.md`.

- **Chatbot**:
  - Tối ưu context sản phẩm (chỉ gửi sản phẩm phù hợp).
  - Cân nhắc bật Google Search grounding nếu có nhu cầu trả lời câu hỏi ngoài phạm vi sản phẩm.

File này mô tả chi tiết kiến trúc, công nghệ và luồng hoạt động hiện tại của hệ thống ShopTD, có thể dùng như tài liệu kỹ thuật để nộp đồ án hoặc bàn giao cho nhóm khác tiếp tục phát triển.

