import { Router } from 'express'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

// GET /api/reviews/product/:productId — công khai
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10)
    if (Number.isNaN(productId)) return res.status(400).json({ error: 'productId không hợp lệ' })
    const list = await Review.find({ productId }).sort({ createdAt: -1 }).lean()
    const json = list.map(({ _id, __v, ...rest }) => ({ ...rest, id: String(_id) }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/reviews — buyer (JWT), chỉ khi đã delivered
router.post('/', verifyToken, async (req, res) => {
  try {
    const productId = Number(req.body?.productId)
    const rating = Math.max(1, Math.min(5, Number(req.body?.rating) || 0))
    const comment = String(req.body?.comment || '').trim()

    if (!productId || !Number.isFinite(productId)) return res.status(400).json({ error: 'productId không hợp lệ' })
    if (!rating) return res.status(400).json({ error: 'rating không hợp lệ (1-5)' })

    const hasDelivered = await Order.exists({
      userId: req.userId,
      status: 'delivered',
      'items.id': productId
    })
    if (!hasDelivered) {
      return res.status(403).json({ error: 'Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công.' })
    }

    const review = await Review.findOneAndUpdate(
      { productId, userId: req.userId },
      { $set: { rating, comment, verified: true } },
      { upsert: true, new: true, runValidators: true }
    )

    res.status(201).json(review.toJSON())
  } catch (err) {
    // unique index conflict edge-case
    if (String(err?.code) === '11000') {
      return res.status(409).json({ error: 'Bạn đã đánh giá sản phẩm này rồi.' })
    }
    res.status(500).json({ error: err.message })
  }
})

export default router

