import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'
import { connectDB } from './db/dbConnect.js'
import productRouter from './routes/productRouter.js'
import userRouter from './routes/userRouter.js'
import orderRouter from './routes/orderRouter.js'
import categoryRouter from './routes/categoryRouter.js'
import chatRouter from './routes/chatRouter.js'

const app = express()
const PORT = process.env.PORT || 3001

let dbReady = false
connectDB()
  .then(() => { dbReady = true })
  .catch((err) => {
    console.error('Không thể kết nối MongoDB. Chạy MongoDB và thử lại.', err.message)
  })

app.use(cors({ origin: true }))
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

app.get('/api/bank/info', (req, res) => {
  const name = (process.env.BANK_NAME || '').trim()
  const accountNumber = (process.env.BANK_ACCOUNT_NUMBER || '').trim()
  const accountHolder = (process.env.BANK_ACCOUNT_HOLDER || '').trim()
  const bin = (process.env.BANK_BIN || '').trim()
  res.json({ name, accountNumber, accountHolder, bin })
})

app.use('/api/products', productRouter)
app.use('/api/user', userRouter)
app.use('/api/orders', orderRouter)
app.use('/api/categories', categoryRouter)
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
