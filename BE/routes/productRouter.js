import { Router } from 'express'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()
const ONLY_CATEGORY = 'vot'
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeProductBody = (body) => {
  const next = { ...body }
  const rawPrice = Number(next.price) || 0
  const rawOriginalPrice = Number(next.originalPrice) || 0
  const rawDiscount = Math.min(90, Math.max(0, Number(next.discountPercent) || 0))
  const hasDiscount = rawDiscount > 0
  const originalPrice = rawOriginalPrice || rawPrice
  const price = hasDiscount ? Math.round(originalPrice * (1 - rawDiscount / 100)) : rawPrice

  next.price = Math.max(0, price)
  if (hasDiscount) {
    next.originalPrice = Math.max(0, originalPrice)
    next.sale = true
  } else {
    delete next.originalPrice
    next.sale = false
  }

  delete next.discountPercent
  next.category = ONLY_CATEGORY
  return next
}

// GET /api/products?category=&search=&featured= — công khai
router.get('/', async (req, res) => {
  try {
    const { category, search, featured } = req.query
    const filter = { category: ONLY_CATEGORY }
    if (category && category !== ONLY_CATEGORY) return res.json([])
    if (search) {
      const q = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: q }, { brand: q }]
    }
    if (featured === 'true') filter.id = { $in: [1, 2, 3, 4, 5, 6] }

    const list = await Product.find(filter)
      .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
      .lean()

    const json = list.map(({ _id, __v, ...rest }) => {
      const images = Array.isArray(rest.images) ? rest.images : []
      const image = rest.image || images[0] || ''
      return {
        ...rest,
        image
      }
    })

    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/best-sellers — công khai (top theo số lượng bán)
router.get('/best-sellers', async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 8)
    const agg = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.id',
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: limit }
    ])

    const ids = agg.map((x) => x._id).filter((x) => typeof x === 'number')
    const products = await Product.find({ id: { $in: ids }, category: ONLY_CATEGORY })
      .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
      .lean()

    const productMap = new Map(products.map((p) => [p.id, p]))
    const json = agg
      .map((x) => {
        const p = productMap.get(x._id)
        if (!p) return null
        return {
          ...p,
          unitsSold: x.unitsSold || 0,
          revenue: x.revenue || 0
        }
      })
      .filter(Boolean)

    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/newest — công khai
router.get('/newest', async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 8)
    const list = await Product.find({ category: ONLY_CATEGORY })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
      .lean()

    const json = list.map(({ _id, __v, ...rest }) => {
      const images = Array.isArray(rest.images) ? rest.images : []
      const image = rest.image || images[0] || ''
      return { ...rest, image }
    })
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/discounted — công khai
router.get('/discounted', async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit) || 8)
    const list = await Product.find({ category: ONLY_CATEGORY, sale: true })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
      .lean()

    const json = list.map(({ _id, __v, ...rest }) => {
      const images = Array.isArray(rest.images) ? rest.images : []
      const image = rest.image || images[0] || ''
      return { ...rest, image }
    })
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/related/:id — công khai
router.get('/related/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const limit = Math.max(1, Number(req.query.limit) || 8)

    const base = await Product.findOne({ id })
    if (!base) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })

    const primary = await Product.find({
      category: ONLY_CATEGORY,
      brand: base.brand,
      id: { $ne: base.id }
    })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
      .lean()

    let list = primary
    if (primary.length < limit) {
      const existingIds = primary.map((p) => p.id)
      const extra = await Product.find({
        category: ONLY_CATEGORY,
        id: { $ne: base.id, $nin: existingIds }
      })
        .sort({ id: -1 })
        .limit(limit - primary.length)
        .select('id name brand category price originalPrice image images rating reviews sale stock inStock')
        .lean()
      list = [...primary, ...extra]
    }

    const json = list.map(({ _id, __v, ...rest }) => {
      const images = Array.isArray(rest.images) ? rest.images : []
      const image = rest.image || images[0] || ''
      return { ...rest, image }
    })

    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products/:id — công khai
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const product = await Product.findOne({ id }).lean()
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    const { _id, __v, ...rest } = product
    if (!rest.images?.length) rest.images = [rest.image, rest.image, rest.image]
    res.json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products — thêm sản phẩm (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const body = normalizeProductBody(req.body)
    const { name, brand, category, price, image } = body
    if (!name || !brand || !category || price == null || !image) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: name, brand, category, price, image' })
    }
    const max = await Product.findOne().sort({ id: -1 }).select('id').lean()
    const nextId = (max?.id ?? 0) + 1
    const product = await Product.create({ ...body, id: nextId })
    const { _id, __v, ...rest } = product.toObject()
    res.status(201).json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/products/:id — cập nhật (admin)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const body = normalizeProductBody(req.body)
    delete body.id // không cho phép đổi id sản phẩm
    const product = await Product.findOneAndUpdate(
      { id },
      { $set: body },
      { new: true, runValidators: true }
    ).lean()
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    const { _id, __v, ...rest } = product
    res.json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/products/:id — xóa (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const result = await Product.findOneAndDelete({ id })
    if (!result) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    res.json({ message: 'Đã xóa sản phẩm' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
