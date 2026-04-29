import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { connectDB } from './db/dbConnect.js'
import productRouter from './routes/productRouter.js'
import userRouter from './routes/userRouter.js'
import orderRouter from './routes/orderRouter.js'
import categoryRouter from './routes/categoryRouter.js'
import chatRouter from './routes/chatRouter.js'
import couponRouter from './routes/couponRouter.js'
import siteConfigRouter from './routes/siteConfigRouter.js'
import payosRouter from './routes/payosRouter.js'
import cartRouter from './routes/cartRouter.js'
import { startAutoCancelPendingPayOSJob } from './jobs/autoCancelPendingPayOS.js'
import reviewRouter from './routes/reviewRouter.js'
import shippingRouter from './routes/shippingRouter.js'

const app = express()
const PORT = process.env.PORT || 3001

let dbReady = false
connectDB()
  .then(() => {
    dbReady = true
    // Cron job: hủy đơn PayOS pending quá hạn và hoàn kho
    startAutoCancelPendingPayOSJob()
  })
  .catch((err) => {
    console.error('Không thể kết nối MongoDB. Chạy MongoDB và thử lại.', err.message)
  })

app.set('trust proxy', 1)
const normalizeOrigin = (v) => String(v || '').trim().replace(/\/$/, '')
const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase()

const envOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => normalizeOrigin(s))
  .filter(Boolean)

const feBase = normalizeOrigin(process.env.FE_BASE_URL)
const devDefaults = nodeEnv === 'production'
  ? []
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']

const allowedOrigins = Array.from(new Set([
  ...envOrigins,
  ...(feBase ? [feBase] : []),
  ...devDefaults
]))

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (curl, server-to-server) that don't send Origin
    if (!origin) return cb(null, true)
    const o = normalizeOrigin(origin)
    if (allowedOrigins.includes(o)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'), false)
  }
}))
app.use(helmet({
  crossOriginResourcePolicy: false
}))

// Rate limit tầng app (chặn spam chung). Các endpoint nhạy cảm có limiter riêng.
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false
}))
app.use(express.json())

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
// Chatbot cần DB để lấy danh sách sản phẩm — nếu DB chưa kết nối thì báo lỗi rõ
app.use('/api/chat', (req, res, next) => {
  if (!dbReady) {
    return res.status(503).json({ error: 'Database chưa sẵn sàng. Vui lòng thử lại sau vài giây.' })
  }
  next()
}, chatRouter)

app.listen(PORT, () => {
  const geminiKey = (process.env.GEMINI_API_KEY || '').replace(/\r/g, '').trim()
  console.log('Server listening on port', PORT)
  if (geminiKey.length >= 20) {
    console.log('Chatbot: Gemini đã cấu hình (gemini-2.5-flash)')
  } else {
    console.warn('Chatbot: GEMINI_API_KEY chưa cấu hình trong BE/.env')
  }
})
