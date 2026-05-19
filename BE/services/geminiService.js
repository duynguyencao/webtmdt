/**
 * services/geminiService.js — Gọi Google Gemini AI để chatbot tư vấn sản phẩm.
 *
 * Cách hoạt động:
 *   1. Đọc GEMINI_API_KEY từ file .env (đọc trực tiếp file, không qua process.env,
 *      để tránh cache sai khi hot-reload).
 *   2. Xây dựng multi-turn conversation (history) để bot nhớ ngữ cảnh.
 *   3. Gắn danh sách sản phẩm từ DB vào prompt (productContext) để bot biết shop bán gì.
 *   4. Gọi Gemini SDK → trả về text reply.
 *
 * Model: gemini-2.5-flash (nhanh, phù hợp chatbot realtime).
 *
 * Xử lý lỗi:
 *   - API key sai → báo lỗi rõ ràng kèm link lấy key mới.
 *   - Hết quota → thông báo thử lại sau.
 *   - Nội dung bị chặn (safety filter) → báo người dùng hỏi khác.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(__dirname, '..', '.env')

const MODEL_NAME = 'gemini-2.5-flash'

const SYSTEM_INSTRUCTION = `Bạn là trợ lý tư vấn của ShopTD (shop cầu lông). Quy tắc BẮT BUỘC:
1. Mỗi tin nhắn của khách có kèm block "DANH SÁCH SẢN PHẨM TỪ DATABASE". Nếu trong block đó có bất kỳ dòng nào dạng "[id:SỐ] Tên sản phẩm | ..." thì đó là sản phẩm THẬT của shop — bạn PHẢI dùng chính những sản phẩm đó để gợi ý, so sánh, nêu tên và giá. TUYỆT ĐỐI không được trả lời "chưa có danh sách sản phẩm" hoặc "chưa có dữ liệu" khi đã có các dòng [id:...] trong danh sách.
2. Chỉ khi block sản phẩm ghi rõ "(Hiện shop chưa có sản phẩm nào trong kho)" thì mới được trả lời là shop đang cập nhật.
3. Khi khách hỏi vợt/giày cho người mới, so sánh, đang sale...: chọn từ danh sách [id:...] và trả lời kèm tên, giá (ví dụ: 500.000đ).
4. Giá trong danh sách là VND; trả lời format ví dụ: 3.500.000đ.
5. Hỏi kỹ thuật/luật/tip cầu lông: trả lời kiến thức chung, có thể gợi ý xem sản phẩm tại shop.`

/** Đọc key từ BE/.env — tránh process.env bị cache/sai khi load module */
function getApiKey() {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf8')
    const line = content.split('\n').find((l) => l.startsWith('GEMINI_API_KEY='))
    if (!line) return process.env.GEMINI_API_KEY || ''
    const raw = line.replace(/^GEMINI_API_KEY=/, '').trim().replace(/^["']|["']$/g, '')
    return String(raw).replace(/\r/g, '').replace(/\s/g, '').trim()
  } catch {
    return process.env.GEMINI_API_KEY || ''
  }
}

/**
 * Gọi Gemini qua SDK @google/generative-ai.
 * history: [{ role: 'user'|'model', text }] — tin nhắn trước đó để bot nhớ cuộc hội thoại.
 */
export async function generateChatReply(productContext, userMessage, history = []) {
  const apiKey = getApiKey()
  if (!apiKey || apiKey.length < 20) {
    throw new Error('Thiếu hoặc sai cấu hình GEMINI_API_KEY trong file BE/.env. Lấy key tại https://aistudio.google.com/apikey')
  }

  const productBlock = `DANH SÁCH SẢN PHẨM TỪ DATABASE (dùng để gợi ý/so sánh):\n${productContext}`

  // Multi-turn: contents = [ user, model, user, model, ... ] + tin nhắn hiện tại; context sản phẩm chỉ gắn vào tin user đầu tiên
  const contents = []
  let isFirstUser = true
  for (const h of history) {
    const role = h.role === 'model' ? 'model' : 'user'
    const text = role === 'user' && isFirstUser
      ? `${productBlock}\n\n---\nCÂU HỎI CỦA KHÁCH:\n${h.text}`
      : h.text
    contents.push({ role, parts: [{ text }] })
    if (role === 'user') isFirstUser = false
  }
  const currentUserText = history.length === 0
    ? `${productBlock}\n\n---\nCÂU HỎI CỦA KHÁCH:\n${userMessage}`
    : userMessage
  contents.push({ role: 'user', parts: [{ text: currentUserText }] })

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION
    })

    const result = await model.generateContent({ contents })
    const text = result.response?.text?.()
    if (!text || typeof text !== 'string') {
      throw new Error('Gemini không trả về nội dung')
    }
    return text.trim()
  } catch (err) {
    const msg = err.message || ''
    if (msg.includes('API key') || msg.includes('API_KEY') || msg.includes('invalid') && msg.toLowerCase().includes('key')) {
      throw new Error('API key Gemini không hợp lệ. Kiểm tra GEMINI_API_KEY trong BE/.env. Lấy key mới tại https://aistudio.google.com/apikey')
    }
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Đã vượt giới hạn sử dụng Gemini. Vui lòng thử lại sau.')
    }
    if (msg.includes('SAFETY') || msg.includes('blocked')) {
      throw new Error('Nội dung bị chặn bởi bộ lọc an toàn. Vui lòng hỏi khác.')
    }
    throw err
  }
}
