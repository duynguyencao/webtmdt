import { Router } from 'express'
import { getProductContextCached } from '../services/productContext.js'
import { generateChatReply } from '../services/geminiService.js'

const router = Router()

const MAX_MESSAGE_LENGTH = 1000

// POST /api/chat — chatbot (công khai); dùng cache context, nhận history để bot nhớ tin trước
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Thiếu message hoặc message không hợp lệ' })
    }
    const trimmed = message.trim()
    if (!trimmed) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống' })
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự` })
    }
    const safeHistory = Array.isArray(history)
      ? history
          .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
          .slice(-20)
          .map((h) => ({ role: h.role, text: String(h.text).slice(0, 2000) }))
      : []

    const productContext = await getProductContextCached()
    const reply = await generateChatReply(productContext, trimmed, safeHistory)
    res.json({ reply })
  } catch (err) {
    console.error('Chat error (Gemini):', err.message)
    const message = err.message || 'Lỗi xử lý tin nhắn. Vui lòng thử lại.'
    res.status(500).json({ error: message })
  }
})

export default router
