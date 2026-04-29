import Product from '../models/Product.js'

/** Giới hạn số sản phẩm đưa vào prompt để tránh vượt token Gemini */
const MAX_PRODUCTS_IN_CONTEXT = 150

/**
 * Lấy danh sách sản phẩm và danh mục từ DB, format thành text cho prompt Gemini.
 * Giới hạn mô tả để không vượt quá token.
 */
export async function getProductContextForChat() {
  const [products] = await Promise.all([
    Product.find().select('id name brand category price originalPrice sale description').lean().limit(MAX_PRODUCTS_IN_CONTEXT),
  ])

  const categoryList = `- Vợt Cầu Lông (path: /products)`

  const productLines = products.map((p) => {
    const desc = p.description ? String(p.description).slice(0, 200) : ''
    const priceStr = p.originalPrice ? `${p.price} (gốc ${p.originalPrice})` : `${p.price}`
    const saleStr = p.sale ? ' [ĐANG SALE]' : ''
    return `[id:${p.id}] ${p.name} | ${p.brand} | ${p.category} | ${priceStr} VND${saleStr}${desc ? ` | Mô tả: ${desc}` : ''}`
  })

  const productBlock =
    productLines.length > 0
      ? productLines.join('\n')
      : '(Hiện shop chưa có sản phẩm nào trong kho — trả lời khách là đang cập nhật.)'

  return `
## DANH MỤC
${categoryList || '(Chưa có)'}

## DANH SÁCH SẢN PHẨM TỪ DATABASE (bắt buộc dùng để gợi ý/so sánh)
${productBlock}
`.trim()
}

/** Cache in-memory — không gọi DB mỗi tin nhắn, chỉ refresh sau TTL */
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 phút
let cachedContext = null
let cachedAt = 0

/**
 * Trả về product context; dùng cache nếu còn hiệu lực, không thì gọi DB và cập nhật cache.
 */
export async function getProductContextCached() {
  const now = Date.now()
  if (cachedContext !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedContext
  }
  cachedContext = await getProductContextForChat()
  cachedAt = now
  return cachedContext
}
