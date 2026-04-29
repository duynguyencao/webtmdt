# Tài liệu chi tiết Backend – ShopTD

## Mục lục

1. [Tổng quan kiến trúc Backend](#1-tổng-quan-kiến-trúc-backend)
2. [Danh sách package và vai trò](#2-danh-sách-package-và-vai-trò)
3. [Biến môi trường (.env)](#3-biến-môi-trường-env)
4. [Cấu trúc thư mục](#4-cấu-trúc-thư-mục)
5. [File index.js – Điểm khởi chạy server](#5-file-indexjs--điểm-khởi-chạy-server)
6. [Kết nối cơ sở dữ liệu – db/dbConnect.js](#6-kết-nối-cơ-sở-dữ-liệu--dbdbconnectjs)
7. [Middleware xác thực – middleware/auth.js](#7-middleware-xác-thực--middlewareauthjs)
8. [Mô hình dữ liệu (Models)](#8-mô-hình-dữ-liệu-models)
9. [Router – Xử lý API](#9-router--xử-lý-api)
10. [Services – Chatbot Gemini](#10-services--chatbot-gemini)
11. [Seed – Dữ liệu khởi tạo](#11-seed--dữ-liệu-khởi-tạo)
12. [Bảng tổng hợp API Endpoints](#12-bảng-tổng-hợp-api-endpoints)
13. [Sơ đồ luồng xử lý chính](#13-sơ-đồ-luồng-xử-lý-chính)

---

## 1. Tổng quan kiến trúc Backend

Backend của ShopTD là một **REST API server** chạy trên **Node.js**, dùng framework **Express** để định nghĩa các endpoint. Dữ liệu được lưu trữ trong **MongoDB** thông qua thư viện ODM **Mongoose**. Hệ thống xác thực dùng **JWT** (JSON Web Token) kết hợp **bcrypt** để băm mật khẩu. Chatbot AI tích hợp **Google Gemini** thông qua SDK `@google/generative-ai`.

```
Client (FE)        REST API (Express)        MongoDB
   │                      │                      │
   │── HTTP Request ─────>│                      │
   │                      │── Mongoose Query ───>│
   │                      │<── Document(s) ──────│
   │<── JSON Response ────│                      │
   │                      │                      │
   │                      │     Google Gemini    │
   │                      │── generateContent ──>│ (AI)
   │                      │<── text reply ───────│
```

**Nguyên lý hoạt động**:
- FE gửi HTTP request (GET/POST/PATCH/PUT/DELETE) tới các endpoint `/api/...`.
- Express nhận request, qua middleware (CORS, JSON parser, auth) rồi vào router tương ứng.
- Router thực hiện logic nghiệp vụ: đọc/ghi MongoDB qua Mongoose model, trả JSON về FE.
- Với chatbot: router gọi service lấy context sản phẩm từ DB → gọi Gemini API → trả reply.

---

## 2. Danh sách package và vai trò

| Package | Phiên bản | Vai trò |
|---------|-----------|---------|
| `express` | ^4.18.2 | Framework web, tạo server HTTP, định nghĩa route, middleware |
| `mongoose` | ^8.0.3 | ODM cho MongoDB – khai báo schema, validate, query, CRUD |
| `dotenv` | ^16.6.1 | Đọc biến cấu hình từ file `.env` vào `process.env` |
| `cors` | ^2.8.5 | Cho phép FE ở domain/port khác gọi API (Cross-Origin Resource Sharing) |
| `bcrypt` | ^5.1.1 | Băm (hash) và so sánh mật khẩu người dùng một cách an toàn |
| `jsonwebtoken` | ^9.0.3 | Tạo và xác minh JWT – token xác thực cho mỗi request cần đăng nhập |
| `@google/generative-ai` | ^0.24.1 | SDK chính thức để gọi Google Gemini API (chatbot AI) |

**Không dùng thêm framework phức tạp** – toàn bộ BE chỉ cần 7 package trên.

---

## 3. Biến môi trường (.env)

File `BE/.env` chứa các cấu hình nhạy cảm, **không được commit lên git**.  
File mẫu `BE/.env.example` cho biết cần những biến nào:

| Biến | Mô tả | Ví dụ |
|------|--------|-------|
| `PORT` | Cổng server lắng nghe | `3001` |
| `MONGODB_URI` | URI kết nối MongoDB (local hoặc Atlas) | `mongodb://127.0.0.1:27017/caulong-shop` |
| `JWT_SECRET` | Chuỗi bí mật dùng ký và verify JWT | `my-super-secret-key` |
| `API_KEY` | *(Tuỳ chọn)* Key cho Power Automate / server-to-server gọi API admin | `your-api-key-secret` |
| `BANK_NAME` | Tên ngân hàng hiển thị cho khách | `Vietcombank` |
| `BANK_ACCOUNT_NUMBER` | Số tài khoản nhận chuyển khoản | `1234567890` |
| `BANK_ACCOUNT_HOLDER` | Tên chủ tài khoản | `NGUYEN VAN A` |
| `BANK_BIN` | Mã BIN ngân hàng (dùng cho VietQR) | `970436` |
| `GEMINI_API_KEY` | API key của Google Gemini (lấy tại aistudio.google.com) | `AIza...` |

**Cách hoạt động**: `dotenv.config()` được gọi đầu tiên trong `index.js`, đọc file `.env` và đưa tất cả biến vào `process.env`. Các module khác truy cập qua `process.env.MONGODB_URI`, `process.env.JWT_SECRET`, v.v.

---

## 4. Cấu trúc thư mục

```
BE/
├── index.js                   # Điểm khởi chạy server
├── package.json               # Khai báo dependency, scripts
├── .env                       # Biến môi trường (không commit)
├── .env.example               # Mẫu biến môi trường
│
├── db/
│   └── dbConnect.js           # Hàm kết nối MongoDB
│
├── middleware/
│   └── auth.js                # Tạo JWT, verify JWT/API key, phân quyền
│
├── models/
│   ├── User.js                # Schema người dùng
│   ├── Product.js             # Schema sản phẩm
│   ├── Category.js            # Schema danh mục
│   └── Order.js               # Schema đơn hàng
│
├── routes/
│   ├── userRouter.js          # Đăng ký, đăng nhập, lấy thông tin user
│   ├── productRouter.js       # CRUD sản phẩm
│   ├── categoryRouter.js      # Lấy danh mục
│   ├── orderRouter.js         # Tạo/quản lý đơn hàng, xác nhận thanh toán
│   └── chatRouter.js          # Chatbot AI (Gemini)
│
├── services/
│   ├── geminiService.js       # Gọi Gemini API, xử lý prompt/response
│   └── productContext.js      # Lấy sản phẩm từ DB, format thành text cho prompt
│
└── seed/
    ├── index.js               # Script seed chính (chạy: npm run seed)
    ├── productsSeed.js        # Dữ liệu sản phẩm mẫu
    └── usersSeed.js           # Tài khoản mẫu (admin + buyer)
```

---

## 5. File `index.js` – Điểm khởi chạy server

Đây là file đầu tiên Node.js thực thi khi chạy `npm start` hoặc `npm run dev`.

### 5.1. Khởi tạo dotenv

```js
import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '.env') })
```

- **Vì sao cần**: các module import sau đó (ví dụ `auth.js` đọc `JWT_SECRET`) cần `process.env` đã được nạp giá trị.
- **Cách hoạt động**: `dotenv` đọc file `BE/.env`, parse từng dòng `KEY=VALUE`, gán vào `process.env.KEY`.
- Dùng `path.join(__dirname, '.env')` để đảm bảo tìm đúng file bất kể thư mục chạy lệnh.

### 5.2. Kết nối MongoDB

```js
let dbReady = false
connectDB()
  .then(() => { dbReady = true })
  .catch((err) => { console.error('Không thể kết nối MongoDB...', err.message) })
```

- Gọi `connectDB()` (từ `db/dbConnect.js`) ngay khi server khởi động.
- Biến `dbReady` dùng để kiểm tra DB đã sẵn sàng chưa trước khi cho phép chatbot hoạt động.
- **Kết nối bất đồng bộ**: server vẫn `listen` ngay, không chờ DB xong mới listen. Điều này giúp server khởi động nhanh; nếu DB chưa kịp kết nối, các request sẽ tự báo lỗi (Mongoose trả lỗi nếu chưa connected).

### 5.3. Cấu hình middleware Express

```js
app.use(cors({ origin: true }))
app.use(express.json())
```

- **`cors({ origin: true })`**: cho phép mọi origin gọi API. Trong môi trường production nên giới hạn chỉ domain FE.
- **`express.json()`**: parse body request có Content-Type `application/json` thành object JS (`req.body`).

### 5.4. Route tĩnh

- **`GET /`**: trả `{ message: 'Hello from Shop Cầu Lông API!' }` – dùng kiểm tra server có chạy không.
- **`GET /api/health`**: trả trạng thái server + trạng thái kết nối MongoDB (`connected` hay `disconnected`).
- **`GET /api/bank/info`**: đọc 4 biến ngân hàng từ `.env`, trả JSON:

  ```json
  {
    "name": "Vietcombank",
    "accountNumber": "1234567890",
    "accountHolder": "NGUYEN VAN A",
    "bin": "970436"
  }
  ```

  FE dùng dữ liệu này để hiển thị thông tin chuyển khoản và sinh mã QR VietQR.

### 5.5. Mount router

```js
app.use('/api/products', productRouter)
app.use('/api/user', userRouter)
app.use('/api/orders', orderRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/chat', (req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database chưa sẵn sàng...' })
  next()
}, chatRouter)
```

- Mỗi nhóm API được gán vào prefix riêng.
- Riêng `/api/chat` có thêm middleware kiểm tra `dbReady` – vì chatbot cần query sản phẩm từ DB, nếu DB chưa kết nối thì trả 503 ngay.

### 5.6. Listen và thông báo

```js
app.listen(PORT, () => {
  console.log('Server listening on port', PORT)
  // Kiểm tra GEMINI_API_KEY có cấu hình chưa và thông báo
})
```

---

## 6. Kết nối cơ sở dữ liệu – `db/dbConnect.js`

```js
import mongoose from 'mongoose'

const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

export async function connectDB() {
  const uri = process.env.MONGODB_URI || defaultUri
  await mongoose.connect(uri)
  console.log('Đã kết nối MongoDB:', mongoose.connection.name, ...)
}
```

**Chi tiết hoạt động**:

1. Đọc `MONGODB_URI` từ `.env`. Nếu không có → dùng URI mặc định trỏ tới MongoDB local, database tên `caulong-shop`.
2. Gọi `mongoose.connect(uri)`:
   - Mongoose mở connection pool tới MongoDB server.
   - Nếu là Atlas (URL chứa `mongodb.net`) → dùng DNS SRV + TLS tự động.
   - Nếu là local (`127.0.0.1`) → kết nối trực tiếp không mã hoá.
3. Sau khi kết nối thành công, `mongoose.connection.name` trả tên database đang dùng.
4. Nếu MongoDB chưa chạy hoặc URI sai → `mongoose.connect` throw error, hàm `connectDB` throw tiếp lên `index.js`.

**Tại sao tách thành file riêng**: dùng lại trong `seed/index.js` (script seed cũng cần kết nối DB).

---

## 7. Middleware xác thực – `middleware/auth.js`

File này export 3 hàm: `createToken`, `verifyToken`, `requireRole`.

### 7.1. `createToken(user)` – Tạo JWT

```js
export function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}
```

- **Input**: object user từ Mongoose (có `_id` và `role`).
- **Output**: chuỗi JWT chứa payload `{ userId, role }`, ký bằng `JWT_SECRET`, hết hạn sau 7 ngày.
- **Cách ký**: dùng thuật toán HMAC SHA-256 (mặc định của `jsonwebtoken`).

**Khi nào gọi**: sau khi user đăng ký hoặc đăng nhập thành công.

### 7.2. `verifyToken(req, res, next)` – Xác minh request

Middleware này kiểm tra **2 cách xác thực**:

**Cách 1: API Key (header `x-api-key`)**

```js
const apiKey = process.env.API_KEY || ''
const keyHeader = req.headers['x-api-key']
if (apiKey && keyHeader && keyHeader === apiKey.trim()) {
  req.userId = 'system'
  req.userRole = 'admin'
  return next()
}
```

- So sánh header `x-api-key` với biến `API_KEY` trong `.env`.
- Nếu khớp → coi như admin hệ thống, gán `req.userId = 'system'`, `req.userRole = 'admin'`.
- Mục đích: cho Power Automate hoặc hệ thống bên ngoài gọi API admin mà không cần đăng nhập.

**Cách 2: Bearer Token (JWT)**

```js
const authHeader = req.headers.authorization
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' })

const payload = jwt.verify(token, JWT_SECRET)
req.userId = payload.userId
req.userRole = payload.role
next()
```

- Lấy token từ header `Authorization: Bearer <token>`.
- Dùng `jwt.verify` để giải mã:
  - Nếu hợp lệ → gắn `req.userId` và `req.userRole` vào request.
  - Nếu sai chữ ký hoặc hết hạn → trả 401.

### 7.3. `requireRole(...roles)` – Phân quyền

```js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' })
    }
    next()
  }
}
```

- Nhận danh sách role được phép (ví dụ `'admin'`).
- Kiểm tra `req.userRole` (đã được gán bởi `verifyToken`) có nằm trong danh sách không.
- Nếu không → trả 403 Forbidden.
- **Cách dùng**: `router.patch('/confirm', verifyToken, requireRole('admin'), handler)` → chỉ admin mới gọi được.

---

## 8. Mô hình dữ liệu (Models)

### 8.1. `models/User.js` – Người dùng

**Schema**:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | String, required | Tên hiển thị |
| `email` | String, required, unique, lowercase | Email đăng nhập (tự chuyển thường) |
| `password` | String, required, minlength: 6 | Mật khẩu (lưu dạng hash) |
| `role` | String, enum: `['buyer', 'admin']` | Vai trò: người mua hoặc quản trị |
| `createdAt`, `updatedAt` | Date | Tự động bởi `timestamps: true` |

**Middleware pre-save (băm mật khẩu)**:

```js
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})
```

- Hook này chạy **trước mỗi lần `save()`** document User.
- Kiểm tra `this.isModified('password')`:
  - Nếu password không thay đổi (ví dụ chỉ sửa tên) → bỏ qua, không hash lại.
  - Nếu password mới (đăng ký, hoặc đổi mật khẩu) → băm bằng bcrypt với salt round = 10.
- Sau hook này, trường `password` trong DB luôn là chuỗi hash (ví dụ `$2b$10$...`), không bao giờ lưu plaintext.

**Method so sánh mật khẩu**:

```js
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}
```

- Khi đăng nhập, gọi `user.comparePassword(plainPassword)`.
- `bcrypt.compare` tự trích salt từ hash đã lưu và so sánh → trả `true`/`false`.

**Transform JSON** (ẩn thông tin nhạy cảm):

```js
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.password    // Không bao giờ trả password ra API
    return ret
  }
})
```

### 8.2. `models/Product.js` – Sản phẩm

**Schema**:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | Number, required, unique | ID sản phẩm dùng trên FE (1, 2, 3...) |
| `name` | String, required | Tên sản phẩm |
| `brand` | String, required | Thương hiệu (Yonex, Victor, Lining...) |
| `category` | String, required | Danh mục: `vot`, `giay`, `ao`, `quan`, `tui`, `balo`, `phu-kien` |
| `price` | Number, required | Giá bán hiện tại (VND) |
| `originalPrice` | Number | Giá gốc trước giảm (hiển thị gạch ngang trên FE) |
| `image` | String, required | URL ảnh đại diện |
| `images` | [String] | Mảng URL ảnh chi tiết (gallery) |
| `rating` | Number, default: 0 | Điểm đánh giá trung bình |
| `reviews` | Number, default: 0 | Số lượng đánh giá |
| `sale` | Boolean, default: false | Đang khuyến mãi hay không |
| `description` | String | Mô tả sản phẩm (text dài) |
| `specifications` | Mixed | Object thông số kỹ thuật (key-value tuỳ ý) |
| `inStock` | Boolean, default: true | Còn hàng hay không |
| `stock` | Number, default: 0 | Số lượng tồn kho |

- **`id: false`** trong schema options: tắt trường `id` ảo mà Mongoose tự tạo từ `_id`, vì ta đã có trường `id` riêng (kiểu Number).
- **`specifications: Mixed`**: cho phép lưu object bất kỳ, ví dụ `{ "Độ Cứng": "Cứng", "Trọng Lượng": "4U" }` – phù hợp với dữ liệu crawl có cấu trúc khác nhau tuỳ sản phẩm.

### 8.3. `models/Category.js` – Danh mục

**Schema**:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `name` | String, required | Tên danh mục (VD: "Vợt Cầu Lông") |
| `path` | String, required | Đường dẫn FE (VD: `/products?category=vot`) |
| `image` | String, required | URL ảnh đại diện danh mục |
| `count` | Number, default: 0 | Số sản phẩm trong danh mục (tính khi seed) |

### 8.4. `models/Order.js` – Đơn hàng

**Schema đơn hàng (orderSchema)**:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `orderId` | String, required, unique | Mã đơn tự sinh: `ORD000001`, `ORD000002`... |
| `userId` | ObjectId, ref: 'User' | ID người mua (từ JWT khi tạo đơn) |
| `customer` | Object | Thông tin giao hàng: `name`, `phone`, `email`, `address` |
| `items` | [orderItemSchema] | Danh sách sản phẩm trong đơn |
| `total` | Number, required | Tổng tiền (bao gồm phí ship) |
| `paymentMethod` | String, enum: `['cod', 'bank_transfer']` | Phương thức thanh toán |
| `paymentStatus` | String, enum: `['pending_payment', 'paid']`, default: null | Trạng thái thanh toán |
| `note` | String | Ghi chú đơn hàng |
| `status` | String, enum: `['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']` | Trạng thái đơn hàng |

**Schema item đơn hàng (orderItemSchema)**:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | Number | ID sản phẩm |
| `name` | String | Tên sản phẩm |
| `brand` | String | Thương hiệu |
| `image` | String | URL ảnh |
| `price` | Number | Giá tại thời điểm đặt |
| `quantity` | Number | Số lượng |

**Thiết kế thanh toán**:

- `paymentMethod` quyết định phương thức:
  - `'cod'`: thanh toán khi nhận hàng → `paymentStatus = null` (không cần theo dõi).
  - `'bank_transfer'`: chuyển khoản → `paymentStatus = 'pending_payment'` khi mới tạo → chờ admin xác nhận → `'paid'`.
- `status` theo dõi vòng đời đơn hàng, **độc lập** với `paymentStatus`:
  - `pending` → `confirmed` → `shipped` → `delivered` (hoặc `cancelled` bất cứ lúc nào trước shipped).

---

## 9. Router – Xử lý API

### 9.1. `routes/userRouter.js` – Xác thực người dùng

#### `POST /api/user/register` – Đăng ký

**Quyền**: công khai (không cần đăng nhập).

**Luồng xử lý chi tiết**:

1. Nhận `req.body`: `{ name, email, password }`.
2. **Validate**:
   - Kiểm tra `name`, `email`, `password` đều không trống → nếu thiếu trả 400.
   - Kiểm tra `password.length >= 6` → nếu ngắn trả 400.
3. Kiểm tra email trùng:
   - `User.findOne({ email: email.toLowerCase() })`.
   - Nếu đã tồn tại → trả 400 "Email đã được sử dụng".
4. Tạo user mới:
   - `User.create({ name, email, password, role: 'buyer' })`.
   - Khi `create` gọi `.save()`, hook `pre('save')` tự động **hash password** bằng bcrypt.
   - User luôn được tạo với role `'buyer'` (người mua).
5. Phát JWT:
   - `createToken(user)` → token chứa `{ userId, role: 'buyer' }`, hạn 7 ngày.
6. Trả response 201:
   ```json
   {
     "message": "Đăng ký thành công",
     "token": "eyJhbG...",
     "user": { "id": "...", "name": "...", "email": "...", "role": "buyer" }
   }
   ```

#### `POST /api/user/login` – Đăng nhập

**Quyền**: công khai.

**Luồng xử lý**:

1. Nhận `{ email, password }`.
2. Tìm user: `User.findOne({ email: email.toLowerCase() })`.
   - Không tìm thấy → trả 401 "Email hoặc mật khẩu sai".
3. So sánh mật khẩu: `user.comparePassword(password)`.
   - `bcrypt.compare(plainPassword, hashedPassword)` → `true`/`false`.
   - Sai → trả 401 "Email hoặc mật khẩu sai" (cùng message để không tiết lộ email có tồn tại).
4. Đúng → `createToken(user)` → trả token + user info.

#### `GET /api/user/me` – Lấy thông tin user hiện tại

**Quyền**: cần đăng nhập (middleware `verifyToken`).

**Luồng**: `verifyToken` giải mã JWT → `req.userId` → `User.findById(req.userId).select('-password')` → trả user JSON (không có password).

### 9.2. `routes/productRouter.js` – Sản phẩm

#### `GET /api/products` – Danh sách sản phẩm

**Quyền**: công khai.

**Query params hỗ trợ**:

| Param | Mô tả | Ví dụ |
|-------|--------|-------|
| `category` | Lọc theo danh mục | `?category=vot` |
| `search` | Tìm kiếm tên hoặc brand (regex, không phân biệt hoa thường) | `?search=yonex` |
| `featured` | Lấy sản phẩm nổi bật (id 1-6) | `?featured=true` |

**Luồng**:

1. Build object `filter` từ query params:
   - Nếu có `category` → `filter.category = category`.
   - Nếu có `search` → `filter.$or = [{ name: regex }, { brand: regex }]`.
   - Nếu `featured=true` → `filter.id = { $in: [1,2,3,4,5,6] }`.
2. Query: `Product.find(filter).select('id name brand category price originalPrice image images rating reviews sale').lean()`.
   - `.select(...)`: chỉ lấy các field cần cho danh sách (không lấy description, specs... để giảm payload).
   - `.lean()`: trả plain JS object (nhanh hơn Mongoose document).
3. Map lại kết quả:
   - Đảm bảo `image` luôn có giá trị: `rest.image || images[0] || ''`.
   - Xoá `_id`, `__v`.
4. Trả mảng JSON.

#### `GET /api/products/:id` – Chi tiết sản phẩm

**Quyền**: công khai.

**Luồng**:

1. Parse `req.params.id` thành số nguyên.
2. `Product.findOne({ id }).lean()` → tìm theo `id` (Number), không phải `_id` (ObjectId).
3. Nếu sản phẩm không có `images` hoặc mảng rỗng → fallback: `[image, image, image]` (tạo 3 ảnh từ ảnh đại diện để FE không bị trống gallery).
4. Trả toàn bộ field (bao gồm description, specifications, stock...).

#### `POST /api/products` – Thêm sản phẩm (admin)

**Quyền**: `verifyToken` + `requireRole('admin')`.

**Luồng**:

1. Validate: kiểm tra `name`, `brand`, `category`, `price`, `image` không trống.
2. Sinh `id` mới:
   - `Product.findOne().sort({ id: -1 })` → lấy sản phẩm có id lớn nhất.
   - `nextId = max.id + 1`.
3. `Product.create({ ...req.body, id: nextId })`.
4. Trả sản phẩm vừa tạo (201).

#### `PUT /api/products/:id` – Cập nhật sản phẩm (admin)

**Quyền**: admin.

**Luồng**:

1. Không cho phép đổi trường `id` (`delete body.id`).
2. `Product.findOneAndUpdate({ id }, { $set: body }, { new: true, runValidators: true })`.
   - `new: true`: trả document sau khi update (thay vì trước).
   - `runValidators: true`: chạy lại validation khi update.

#### `DELETE /api/products/:id` – Xoá sản phẩm (admin)

**Quyền**: admin.

**Luồng**: `Product.findOneAndDelete({ id })` → xoá và trả message.

### 9.3. `routes/categoryRouter.js` – Danh mục

#### `GET /api/categories` – Danh sách danh mục

**Quyền**: công khai.

**Luồng**: `Category.find().lean()` → map xoá `_id`, `__v` → trả mảng JSON.

Đơn giản vì danh mục hiện chỉ cần đọc (tạo/sửa qua seed).

### 9.4. `routes/orderRouter.js` – Đơn hàng

#### `POST /api/orders` – Tạo đơn hàng

**Quyền**: `verifyToken` (bắt buộc đăng nhập).

**Luồng chi tiết**:

1. Nhận `{ customer, items, total, paymentMethod, note }`.
2. **Validate**:
   - `customer` phải có `name` và `phone`.
   - `items` phải là mảng, không rỗng.
   - `paymentMethod` chỉ nhận `'cod'` hoặc `'bank_transfer'` → nếu không hợp lệ trả 400.
3. Tính `total`:
   - Nếu FE gửi `total` → dùng luôn.
   - Nếu không → tính từ `items`: `Σ(price × quantity)`.
4. Sinh `orderId`:
   - Đếm tổng số đơn trong DB: `Order.countDocuments()`.
   - `orderId = 'ORD' + (count + 1).padStart(6, '0')` → VD: `ORD000001`.
5. Xác định `paymentStatus`:
   - `bank_transfer` → `'pending_payment'` (chờ khách chuyển khoản).
   - `cod` → `null` (không theo dõi thanh toán riêng).
6. `Order.create(...)` → lưu đơn mới với `status = 'pending'`.
7. Trả 201: `{ orderId, message: 'Đặt hàng thành công' }`.

#### `GET /api/orders/me` – Đơn hàng của tôi (buyer)

**Quyền**: `verifyToken` (JWT, **không** chấp nhận API key).

**Luồng**:

1. Middleware đặc biệt: nếu có header `x-api-key` → trả 401 (buộc phải dùng Bearer token).
2. `Order.find({ userId: req.userId }).sort({ createdAt: -1 })` → lấy đơn của user, mới nhất trước.
3. Trả mảng JSON (xoá `_id`, `__v`, `userId`).

#### `GET /api/orders/:orderId` – Chi tiết một đơn

**Quyền**: `verifyToken` (JWT, không chấp nhận API key).

**Phân quyền đọc**:

- Admin (`req.userRole === 'admin'`) → xem bất kỳ đơn nào.
- Buyer → chỉ xem đơn có `userId` trùng với `req.userId`.
- Không phải chủ đơn cũng không phải admin → trả 403.

#### `GET /api/orders` – Tất cả đơn (admin)

**Quyền**: `verifyToken` + `requireRole('admin')`.

**Hỗ trợ tìm kiếm**: query `?orderId=ORD000` → lọc bằng regex (tìm kiếm gần đúng).

#### `PATCH /api/orders/:orderId/confirm` – Xác nhận đơn (admin)

**Điều kiện**: `status === 'pending'`.

**Luồng**:

1. Tìm đơn theo `orderId`.
2. Kiểm tra `status` đang `pending`.
3. **Trừ tồn kho**:
   - Duyệt qua từng `item` trong đơn.
   - Tìm `Product.findOne({ id: item.id })`.
   - `newStock = max(0, product.stock - item.quantity)`.
   - `product.inStock = newStock > 0`.
   - `product.save()`.
4. Đặt `order.status = 'confirmed'` → `order.save()`.

#### `PATCH /api/orders/:orderId/cancel` – Hủy đơn (admin)

**Điều kiện**: `status` đang `'pending'` hoặc `'confirmed'`.

**Luồng**: đổi `status = 'cancelled'`, không hoàn tồn kho (có thể bổ sung sau).

#### `PATCH /api/orders/:orderId/cancel-by-buyer` – Buyer tự hủy đơn

**Điều kiện**:
- `order.userId === req.userId` (đúng đơn của mình).
- `status === 'pending'` (chỉ hủy khi chưa xác nhận).

**Khác với cancel của admin**: buyer không thể hủy đơn đã confirmed.

#### `PATCH /api/orders/:orderId/mark-paid` – Xác nhận đã thanh toán (admin)

**Điều kiện**:
- `paymentMethod === 'bank_transfer'`.
- `paymentStatus !== 'paid'` (chưa xác nhận trước đó).

**Luồng chi tiết**:

1. Đặt `order.paymentStatus = 'paid'`.
2. **Nếu đơn đang `pending`** (chưa xác nhận đơn):
   - Tự động trừ tồn kho (giống flow confirm).
   - Tự động đặt `order.status = 'confirmed'`.
   - Mục đích: admin chỉ cần bấm **1 nút** "Xác nhận đã thanh toán" là đơn vừa được đánh dấu đã nhận tiền, vừa được xác nhận luôn.
3. Nếu đơn đã confirmed/shipped rồi → chỉ cập nhật `paymentStatus`, không đổi `status`.
4. Trả response với message phù hợp.

---

## 10. Services – Chatbot Gemini

### 10.1. `services/productContext.js` – Chuẩn bị context sản phẩm

**Mục đích**: lấy danh sách sản phẩm + danh mục từ MongoDB, format thành đoạn text ngắn gọn để đưa vào prompt Gemini.

#### Hàm `getProductContextForChat()`

```js
const [products, categories] = await Promise.all([
  Product.find()
    .select('id name brand category price originalPrice sale description')
    .lean()
    .limit(MAX_PRODUCTS_IN_CONTEXT),    // Tối đa 150 sản phẩm
  Category.find().select('name path').lean()
])
```

- Query **song song** cả products lẫn categories (dùng `Promise.all` để nhanh hơn).
- Chỉ lấy field cần thiết cho prompt (không lấy images, specs... tốn token).
- Giới hạn 150 sản phẩm để không vượt context window của Gemini.

**Format sản phẩm thành text**:

```
[id:1] Vợt cầu lông Yonex Astrox 100 Tour VA | Yonex | vot | 4469000 (gốc 5362800) VND [ĐANG SALE] | Mô tả: ...
```

- Mỗi sản phẩm 1 dòng, chứa: id, tên, brand, category, giá, nhãn sale, mô tả cắt 200 ký tự.
- Gemini sẽ đọc khối text này và dùng nó làm "nguồn sự thật" để tư vấn.

**Kết quả cuối cùng**:

```
## DANH MỤC
- Vợt Cầu Lông (path: /products?category=vot)
- Giày Cầu Lông (path: /products?category=giay)
...

## DANH SÁCH SẢN PHẨM TỪ DATABASE (bắt buộc dùng để gợi ý/so sánh)
[id:1] Vợt cầu lông Yonex Astrox 100 Tour VA | Yonex | vot | 4469000 VND [ĐANG SALE]
[id:2] ...
```

#### Hàm `getProductContextCached()` – Cache in-memory

```js
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 phút
let cachedContext = null
let cachedAt = 0

export async function getProductContextCached() {
  const now = Date.now()
  if (cachedContext !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedContext   // Trả cache, không query DB
  }
  cachedContext = await getProductContextForChat()
  cachedAt = now
  return cachedContext
}
```

- **Vì sao cần cache**: mỗi tin nhắn chat đều cần context sản phẩm. Nếu gọi DB mỗi lần → chậm và tốn tài nguyên.
- Cache lưu trong biến JS (in-memory), tồn tại suốt đời server.
- Sau 5 phút, lần gọi tiếp theo sẽ query DB lại → cập nhật cache.
- Nếu admin thêm/sửa/xoá sản phẩm → chatbot sẽ biết sau tối đa 5 phút.

### 10.2. `services/geminiService.js` – Gọi Gemini AI

#### Đọc API Key

```js
function getApiKey() {
  const content = fs.readFileSync(ENV_PATH, 'utf8')
  const line = content.split('\n').find((l) => l.startsWith('GEMINI_API_KEY='))
  // parse và trả key đã trim
}
```

- **Đọc trực tiếp từ file `.env`** thay vì dùng `process.env.GEMINI_API_KEY`.
- Lý do: trong một số trường hợp `process.env` có thể bị cache khi module load, đặc biệt với ESM. Đọc file đảm bảo luôn lấy giá trị mới nhất.

#### System Instruction

```
Bạn là trợ lý tư vấn của ShopTD (shop cầu lông). Quy tắc BẮT BUỘC:
1. Nếu có dòng [id:SỐ] trong danh sách → đó là sản phẩm THẬT → PHẢI dùng để gợi ý.
2. Chỉ khi ghi "(Hiện shop chưa có sản phẩm)" → mới được nói đang cập nhật.
3. Gợi ý kèm tên + giá (format: 3.500.000đ).
4. Hỏi kỹ thuật/luật cầu lông → trả lời kiến thức chung, gợi ý xem sản phẩm tại shop.
```

- Đây là **prompt cố định** gửi kèm mọi request, hướng dẫn Gemini cách ứng xử.
- Quy tắc 1-2 rất quan trọng: ngăn Gemini trả lời "không có dữ liệu" khi thực tế đã có.

#### Hàm `generateChatReply(productContext, userMessage, history)`

**Xây dựng `contents` (multi-turn conversation)**:

```
contents = [
  { role: 'user', parts: [{ text: '[CONTEXT SẢN PHẨM]\n---\nCÂU HỎI: tin nhắn 1 của user' }] },
  { role: 'model', parts: [{ text: 'câu trả lời 1 của bot' }] },
  { role: 'user', parts: [{ text: 'tin nhắn 2 của user' }] },
  { role: 'model', parts: [{ text: 'câu trả lời 2 của bot' }] },
  ...
  { role: 'user', parts: [{ text: 'tin nhắn hiện tại' }] }
]
```

- **Context sản phẩm chỉ gắn vào tin `user` ĐẦU TIÊN** trong lịch sử → tránh lặp lại context ở mỗi lượt, tiết kiệm token.
- Nếu không có history (tin nhắn đầu tiên) → gắn context vào tin hiện tại.

**Gọi Gemini**:

```js
const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_INSTRUCTION
})
const result = await model.generateContent({ contents })
const text = result.response?.text?.()
return text.trim()
```

- Dùng `gemini-2.5-flash` – model nhanh, phù hợp chatbot realtime.
- `systemInstruction` được truyền riêng (không nằm trong `contents`) – đây là cách Gemini SDK xử lý system prompt.

**Xử lý lỗi**:

| Loại lỗi | Nhận diện | Thông báo cho user |
|-----------|-----------|-------------------|
| API key sai | message chứa `'API key'`, `'invalid'` | "API key Gemini không hợp lệ..." |
| Hết quota | `'quota'`, `'RESOURCE_EXHAUSTED'` | "Đã vượt giới hạn sử dụng Gemini..." |
| Bị chặn an toàn | `'SAFETY'`, `'blocked'` | "Nội dung bị chặn bởi bộ lọc an toàn..." |
| Khác | | Throw lỗi gốc |

---

## 11. Seed – Dữ liệu khởi tạo

### 11.1. `seed/index.js` – Script chính

Chạy bằng `npm run seed` (tức `node seed/index.js`).

**Luồng**:

1. `import 'dotenv/config'` → nạp `.env`.
2. `connectDB()` → kết nối MongoDB.
3. Đếm số sản phẩm mỗi danh mục từ `productsSeed`.
4. **Xoá toàn bộ Product cũ** → insert lại từ `productsSeed`.
5. **Xoá toàn bộ Category cũ** → insert lại từ `categoriesSeed` (kèm `count` đã tính).
6. **Tạo user mẫu** (nếu chưa tồn tại):
   - `admin@caulong.vn` / `admin123` / role: `admin`
   - `buyer@caulong.vn` / `buyer123` / role: `buyer`
7. `process.exit(0)`.

### 11.2. `seed/productsSeed.js`

- Mảng ~150 sản phẩm cầu lông (vợt, giày, áo, quần, túi, phụ kiện).
- Dữ liệu crawl từ site tham khảo, đã chỉnh brand.
- Mỗi sản phẩm có đầy đủ: `id`, `name`, `brand`, `category`, `price`, `originalPrice`, `image`, `images`, `description`, `specifications`, `stock`, `sale`, `rating`, `reviews`.

### 11.3. `seed/usersSeed.js`

```js
export const usersSeed = [
  { name: 'Admin', email: 'admin@caulong.vn', password: 'admin123', role: 'admin' },
  { name: 'Người mua 1', email: 'buyer@caulong.vn', password: 'buyer123', role: 'buyer' }
]
```

- Password ở đây là **plaintext** – khi `User.create(u)` được gọi, hook `pre('save')` sẽ tự hash bằng bcrypt trước khi lưu vào DB.

---

## 12. Bảng tổng hợp API Endpoints

### Công khai (không cần đăng nhập)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Kiểm tra server chạy |
| GET | `/api/health` | Trạng thái server + MongoDB |
| GET | `/api/bank/info` | Thông tin ngân hàng (cho VietQR) |
| GET | `/api/products` | Danh sách sản phẩm (hỗ trợ filter) |
| GET | `/api/products/:id` | Chi tiết 1 sản phẩm |
| GET | `/api/categories` | Danh sách danh mục |
| POST | `/api/user/register` | Đăng ký tài khoản |
| POST | `/api/user/login` | Đăng nhập |
| POST | `/api/chat` | Gửi tin nhắn cho chatbot AI |

### Cần đăng nhập (JWT)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| GET | `/api/user/me` | buyer/admin | Lấy thông tin user hiện tại |
| POST | `/api/orders` | buyer/admin | Tạo đơn hàng mới |
| GET | `/api/orders/me` | buyer | Danh sách đơn của tôi |
| GET | `/api/orders/:orderId` | buyer (chủ đơn) / admin | Chi tiết 1 đơn |
| PATCH | `/api/orders/:orderId/cancel-by-buyer` | buyer (chủ đơn) | Hủy đơn khi pending |

### Chỉ admin (JWT hoặc API Key)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/orders` | Tất cả đơn hàng (hỗ trợ tìm theo orderId) |
| PATCH | `/api/orders/:orderId/confirm` | Xác nhận đơn + trừ tồn kho |
| PATCH | `/api/orders/:orderId/cancel` | Hủy đơn |
| PATCH | `/api/orders/:orderId/mark-paid` | Xác nhận đã nhận tiền chuyển khoản |
| POST | `/api/products` | Thêm sản phẩm |
| PUT | `/api/products/:id` | Sửa sản phẩm |
| DELETE | `/api/products/:id` | Xoá sản phẩm |

---

## 13. Sơ đồ luồng xử lý chính

### 13.1. Luồng đăng ký

```
FE: POST /api/user/register { name, email, password }
        │
        ▼
Router: validate → kiểm tra email trùng → User.create()
        │                                      │
        │                          pre('save') hook:
        │                          bcrypt.hash(password, 10)
        │                                      │
        ▼                                      ▼
   createToken(user) ← ─ ─ ─ ─ ─ User saved (password = hash)
        │
        ▼
FE nhận: { token, user }
```

### 13.2. Luồng đặt hàng chuyển khoản

```
FE: POST /api/orders { customer, items, total, paymentMethod: 'bank_transfer' }
        │
        ▼
Router: validate → sinh orderId → paymentStatus = 'pending_payment'
        │
        ▼
   Order.create() → DB lưu đơn (status: pending, paymentStatus: pending_payment)
        │
        ▼
FE nhận: { orderId } → hiển thị BankTransferInfo
        │
        ▼ (FE gọi GET /api/bank/info)
   Hiển thị: QR VietQR + STK + nội dung "Thanh toan don ORD000123"
        │
        ▼ (Khách chuyển khoản qua app ngân hàng)
        │
        ▼ (Admin thấy tiền về)
Admin FE: PATCH /api/orders/ORD000123/mark-paid
        │
        ▼
Router: paymentStatus → 'paid'
        nếu status = 'pending' → trừ tồn kho + status → 'confirmed'
        │
        ▼
   Order saved → FE hiển thị "Đã thanh toán"
```

### 13.3. Luồng chatbot

```
FE: POST /api/chat { message: "Vợt nào cho người mới?", history: [...] }
        │
        ▼
chatRouter: validate message → getProductContextCached()
        │                              │
        │                    (Cache hit? → trả ngay)
        │                    (Cache miss? → Product.find() + Category.find()
        │                                   → format text → lưu cache)
        │                              │
        ▼                              ▼
   generateChatReply(context, message, history)
        │
        ▼
   Build contents: gắn context vào tin user đầu → ghép history → tin hiện tại
        │
        ▼
   GoogleGenerativeAI → model.generateContent({ contents })
        │
        ▼
   Gemini trả text → trim → return
        │
        ▼
FE nhận: { reply: "Với người mới chơi, bạn có thể tham khảo vợt..." }
```
