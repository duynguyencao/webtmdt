/**
 * index.js — Entry point chính của backend.
 *
 * Thứ tự khởi động:
 *   1. Load biến môi trường (.env) bằng dotenv.
 *   2. Import các module (Express, middleware, routes).
 *   3. Kết nối MongoDB → bật cron job auto-cancel PayOS.
 *   4. Cấu hình CORS, Helmet, rate limit, JSON parser.
 *   5. Gắn các route API.
 *   6. Start server trên PORT (mặc định 3001).
 *
 * Lưu ý quan trọng:
 *   - dotenv.config() phải chạy TRƯỚC các import route/service
 *     vì ES Module resolve tất cả import trước khi chạy code.
 *     Tuy nhiên top-level code trong các service đã dùng lazy init
 *     để tránh crash khi env chưa sẵn sàng.
 *   - dbReady flag: nếu MongoDB chưa kết nối thì chatbot trả 503.
 *     Các route khác vẫn chạy nhưng sẽ lỗi khi query DB.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Tính __dirname cho ES Module (ESM không có __dirname mặc định)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load .env vào process.env — PHẢI chạy trước mọi thứ khác
dotenv.config({ path: path.join(__dirname, '.env') })

// === Import thư viện và module ===
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

// Database
import { connectDB } from './db/dbConnect.js'

// Routes — mỗi file quản lý 1 nhóm endpoint
import productRouter from './routes/productRouter.js'       // /api/products
import userRouter from './routes/userRouter.js'             // /api/user
import orderRouter from './routes/orderRouter.js'           // /api/orders
import categoryRouter from './routes/categoryRouter.js'     // /api/categories
import chatRouter from './routes/chatRouter.js'             // /api/chat (chatbot AI)
import couponRouter from './routes/couponRouter.js'         // /api/coupons
import siteConfigRouter from './routes/siteConfigRouter.js' // /api/site-config
import payosRouter from './routes/payosRouter.js'           // /api/payos (webhook)
import cartRouter from './routes/cartRouter.js'             // /api/cart
import reviewRouter from './routes/reviewRouter.js'         // /api/reviews
import shippingRouter from './routes/shippingRouter.js'     // /api/shipping
import uploadRouter from './routes/uploadRouter.js'         // /api/upload (ảnh → Supabase)

// Cron jobs
import { startAutoCancelPendingPayOSJob } from './jobs/autoCancelPendingPayOS.js'

// === Khởi tạo Express ===
const app = express()
const PORT = process.env.PORT || 3001

// === Kết nối MongoDB ===
let dbReady = false  // Flag theo dõi trạng thái kết nối DB
connectDB()
  .then(() => {
    dbReady = true
    // Bật cron job: mỗi 5 phút quét và hủy đơn PayOS pending quá 15 phút
    startAutoCancelPendingPayOSJob()
  })
  .catch((err) => {
    // Server vẫn chạy nhưng các API cần DB sẽ lỗi
    console.error('Không thể kết nối MongoDB. Chạy MongoDB và thử lại.', err.message)
  })

// === CORS — Kiểm soát origin nào được gọi API ===
app.set('trust proxy', 1) // Tin tưởng proxy (cần cho rate limit khi deploy sau nginx/render)
const normalizeOrigin = (v) => String(v || '').trim().replace(/\/$/, '') // Bỏ trailing slash
const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase()

// Đọc danh sách origin từ .env (CORS_ORIGINS=https://fe1.com,https://fe2.com)
const envOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => normalizeOrigin(s))
  .filter(Boolean)

// FE_BASE_URL: origin chính của frontend
const feBase = normalizeOrigin(process.env.FE_BASE_URL)
// Dev: tự thêm localhost để không cần cấu hình khi dev local
const devDefaults = nodeEnv === 'production'
  ? []
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']

// Gộp tất cả origin cho phép (tự loại trùng)
const allowedOrigins = Array.from(new Set([
  ...envOrigins,
  ...(feBase ? [feBase] : []),
  ...devDefaults
]))

app.use(cors({
  origin: (origin, cb) => {
    // Cho phép request không có Origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true)
    const o = normalizeOrigin(origin)
    if (allowedOrigins.includes(o)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'), false)
  }
}))

// === Helmet — Bảo mật HTTP headers ===
app.use(helmet({
  crossOriginResourcePolicy: false // Cho phép ảnh cross-origin (Supabase CDN)
}))

// === Rate limit tầng app (chặn spam chung) ===
// Các endpoint nhạy cảm (login, đặt hàng) có limiter riêng chặt hơn
app.use(rateLimit({
  windowMs: 60 * 1000,    // 1 phút
  limit: 240,             // Tối đa 240 request/phút/IP
  standardHeaders: true,
  legacyHeaders: false
}))

// Parse JSON body
app.use(express.json())

// === Health check endpoints ===
app.get('/', (req, res) => {
  res.send({ message: 'Hello from Shop Cầu Lông API!' })
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'API đang chạy',
    mongodb: dbReady ? 'connected' : 'disconnected'
  })
})

// === Gắn các route API ===
app.use('/api/products', productRouter)
app.use('/api/user', userRouter)
app.use('/api/orders', orderRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/site-config', siteConfigRouter)
app.use('/api/payos', payosRouter)
app.use('/api/cart', cartRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/shipping', shippingRouter)
app.use('/api/upload', uploadRouter)

// Chatbot cần DB để lấy danh sách sản phẩm → chặn nếu DB chưa sẵn sàng
app.use('/api/chat', (req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ error: 'Database chưa sẵn sàng. Vui lòng thử lại sau vài giây.' })
  }
  next()
}, chatRouter)

// === Start server ===
app.listen(PORT, () => {
  const geminiKey = (process.env.GEMINI_API_KEY || '').replace(/\r/g, '').trim()
  console.log('Server listening on port', PORT)
  if (geminiKey.length >= 20) {
    console.log('Chatbot: Gemini đã cấu hình (gemini-2.5-flash)')
  } else {
    console.warn('Chatbot: GEMINI_API_KEY chưa cấu hình trong BE/.env')
  }
})
