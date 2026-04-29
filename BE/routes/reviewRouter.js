import { Router } from 'express'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Product from '../models/Product.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

const clampRating = (value) => {
  const n = Number(value) || 0
  if (!Number.isFinite(n)) return 0
  return Math.max(1, Math.min(5, Math.round(n)))
}

const compactName = (name) => String(name || '').trim().replace(/\s+/g, ' ')

const recomputeProductRating = async (productId) => {
  const agg = await Review.aggregate([
    { $match: { productId: Number(productId) } },
    {
      $group: {
        _id: '$productId',
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ])
  const row = agg?.[0] || null
  const avg = row?.avg ? Math.round(Number(row.avg) * 10) / 10 : 0
  const count = Number(row?.count) || 0
  await Product.updateOne(
    { id: Number(productId) },
    { $set: { rating: avg, reviews: count } }
  )
  return { rating: avg, reviews: count }
}

// GET /api/reviews/product/:productId — công khai
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10)
    if (Number.isNaN(productId)) return res.status(400).json({ error: 'productId không hợp lệ' })
    const list = await Review.find({ productId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .lean()
    const json = list.map(({ _id, __v, userId, ...rest }) => ({
      ...rest,
      id: String(_id),
      userId: userId?._id ? String(userId._id) : (userId ? String(userId) : null),
      userName: compactName(userId?.name || '')
    }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const pickDeliveredOrderId = async (userId, productId, preferredOrderId) => {
  if (preferredOrderId) {
    const exists = await Order.exists({
      userId,
      orderId: String(preferredOrderId).trim(),
      status: 'delivered',
      'items.id': Number(productId)
    })
    if (exists) return String(preferredOrderId).trim()
    return null
  }

  const latest = await Order.findOne({
    userId,
    status: 'delivered',
    'items.id': Number(productId)
  })
    .sort({ createdAt: -1 })
    .select('orderId')
    .lean()
  return latest?.orderId ? String(latest.orderId) : null
}

// POST /api/reviews — buyer (JWT), chỉ khi đã delivered; 1 lần mua (orderId) chỉ được 1 review/sản phẩm
router.post('/', verifyToken, async (req, res) => {
  try {
    const productId = Number(req.body?.productId)
    const preferredOrderId = String(req.body?.orderId || '').trim() || null
    const rating = clampRating(req.body?.rating)
    const comment = String(req.body?.comment || '').trim().slice(0, 1500)

    if (!productId || !Number.isFinite(productId)) return res.status(400).json({ error: 'productId không hợp lệ' })
    if (!rating) return res.status(400).json({ error: 'rating không hợp lệ (1-5)' })

    const orderId = await pickDeliveredOrderId(req.userId, productId, preferredOrderId)
    if (!orderId) {
      return res.status(403).json({ error: 'Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công.' })
    }

    const user = await User.findById(req.userId).select('name').lean()
    const userName = compactName(user?.name || '')

    const existing = await Review.findOne({ productId, userId: req.userId, orderId }).lean()
    if (existing) {
      return res.status(409).json({ error: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.' })
    }

    const review = await Review.create({
      productId,
      userId: req.userId,
      orderId,
      rating,
      comment,
      verified: true
    })

    const summary = await recomputeProductRating(productId)
    res.status(201).json({ ...review.toJSON(), userName, product: summary })
  } catch (err) {
    // unique index conflict edge-case
    if (String(err?.code) === '11000') {
      return res.status(409).json({ error: 'Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.' })
    }
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/reviews/:id — sửa đánh giá (chỉ chủ review)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    const rating = clampRating(req.body?.rating)
    const comment = String(req.body?.comment || '').trim().slice(0, 1500)
    if (!id) return res.status(400).json({ error: 'id không hợp lệ' })
    if (!rating) return res.status(400).json({ error: 'rating không hợp lệ (1-5)' })

    const review = await Review.findById(id)
    if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá' })
    if (String(review.userId) !== String(req.userId)) return res.status(403).json({ error: 'Bạn không có quyền sửa đánh giá này' })

    review.rating = rating
    review.comment = comment
    await review.save()

    const user = await User.findById(req.userId).select('name').lean()
    const userName = compactName(user?.name || '')
    const summary = await recomputeProductRating(review.productId)
    res.json({ ...review.toJSON(), userName, product: summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/reviews/:id — xóa đánh giá (chỉ chủ review)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).json({ error: 'id không hợp lệ' })

    const review = await Review.findById(id).lean()
    if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá' })
    if (String(review.userId) !== String(req.userId)) return res.status(403).json({ error: 'Bạn không có quyền xóa đánh giá này' })

    await Review.deleteOne({ _id: id })
    const summary = await recomputeProductRating(review.productId)
    res.json({ message: 'Đã xóa đánh giá', product: summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

