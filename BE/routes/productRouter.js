import { Router } from 'express'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { verifyToken, requireRole } from '../middleware/auth.js'
import { validateBody } from '../validation/validate.js'
import { productUpsertSchema, productSuggestionsQuerySchema } from '../validation/schemas.js'

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

// GET /api/products/suggestions?query=... — công khai (siêu nhẹ cho thanh search)
router.get('/suggestions', async (req, res) => {
  try {
    const parsed = productSuggestionsQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.json([])
    const query = String(parsed.data.query || '').trim()
    if (!query) return res.json([])
    const limit = Math.min(10, Math.max(5, Number(parsed.data.limit) || 8))
    const q = new RegExp(escapeRegex(query), 'i')

    const list = await Product.find({
      category: ONLY_CATEGORY,
      isDeleted: { $ne: true },
      $or: [{ name: q }, { brand: q }]
    })
      .select('id name brand price originalPrice image images sale stock')
      .limit(limit)
      .lean()

    const json = list.map(({ _id, __v, ...rest0 }) => {
      const images = Array.isArray(rest0.images) ? rest0.images : []
      const image = rest0.image || images[0] || ''
      return {
        id: rest0.id,
        name: rest0.name,
        brand: rest0.brand,
        price: rest0.price,
        originalPrice: rest0.originalPrice,
        sale: rest0.sale,
        stock: Math.max(0, Number(rest0.stock) || 0),
        image
      }
    })

    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/products?category=&search=&featured= — công khai
router.get('/', async (req, res) => {
  try {
    const { category, search, featured } = req.query
    const filter = { category: ONLY_CATEGORY, isDeleted: { $ne: true } }
    if (category && category !== ONLY_CATEGORY) return res.json([])
    if (search) {
      const q = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: q }, { brand: q }]
    }
    if (featured === 'true') filter.id = { $in: [1, 2, 3, 4, 5, 6] }

    const page = Math.max(1, Number(req.query.page) || 0)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 0))
    const usePaging = Boolean(req.query.page || req.query.limit)

    const query = Product.find(filter)
      .select('id name brand category price originalPrice image images rating reviews sale stock')
      .sort({ id: -1 })

    const [list, total] = await Promise.all([
      usePaging ? query.skip((page - 1) * limit).limit(limit).lean() : query.lean(),
      usePaging ? Product.countDocuments(filter) : Promise.resolve(0)
    ])

    const json = list.map(({ _id, __v, ...rest0 }) => {
      const images = Array.isArray(rest0.images) ? rest0.images : []
      const image = rest0.image || images[0] || ''
      return {
        ...rest0,
        stock: Math.max(0, Number(rest0.stock) || 0),
        inStock: Math.max(0, Number(rest0.stock) || 0) > 0,
        image
      }
    })

    if (!usePaging) {
      res.json(json)
      return
    }
    res.json({ items: json, page, limit, total })
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
    const products = await Product.find({ id: { $in: ids }, category: ONLY_CATEGORY, isDeleted: { $ne: true } })
      .select('id name brand category price originalPrice image images rating reviews sale stock')
      .lean()

    const productMap = new Map(products.map((p) => [p.id, p]))
    const json = agg
      .map((x) => {
        const p = productMap.get(x._id) || null
        if (!p) return null
        const stock = Math.max(0, Number(p.stock) || 0)
        return {
          ...p,
          stock,
          inStock: stock > 0,
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
    const list = await Product.find({ category: ONLY_CATEGORY, isDeleted: { $ne: true } })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock')
      .lean()

    const json = list.map(({ _id, __v, ...rest0 }) => {
      const images = Array.isArray(rest0.images) ? rest0.images : []
      const image = rest0.image || images[0] || ''
      const stock = Math.max(0, Number(rest0.stock) || 0)
      return { ...rest0, stock, inStock: stock > 0, image }
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
    const list = await Product.find({ category: ONLY_CATEGORY, sale: true, isDeleted: { $ne: true } })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock')
      .lean()

    const json = list.map(({ _id, __v, ...rest0 }) => {
      const images = Array.isArray(rest0.images) ? rest0.images : []
      const image = rest0.image || images[0] || ''
      const stock = Math.max(0, Number(rest0.stock) || 0)
      return { ...rest0, stock, inStock: stock > 0, image }
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
      id: { $ne: base.id },
      isDeleted: { $ne: true }
    })
      .sort({ id: -1 })
      .limit(limit)
      .select('id name brand category price originalPrice image images rating reviews sale stock')
      .lean()

    let list = primary
    if (primary.length < limit) {
      const existingIds = primary.map((p) => p.id)
      const extra = await Product.find({
        category: ONLY_CATEGORY,
        id: { $ne: base.id, $nin: existingIds },
        isDeleted: { $ne: true }
      })
        .sort({ id: -1 })
        .limit(limit - primary.length)
        .select('id name brand category price originalPrice image images rating reviews sale stock')
        .lean()
      list = [...primary, ...extra]
    }

    const json = list.map(({ _id, __v, ...rest0 }) => {
      const images = Array.isArray(rest0.images) ? rest0.images : []
      const image = rest0.image || images[0] || ''
      const stock = Math.max(0, Number(rest0.stock) || 0)
      return { ...rest0, stock, inStock: stock > 0, image }
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
    const product0 = await Product.findOne({ id, isDeleted: { $ne: true } }).lean()
    if (!product0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    const { _id, __v, ...rest0 } = product0
    const stock = Math.max(0, Number(rest0.stock) || 0)
    const rest = { ...rest0, stock, inStock: stock > 0 }
    if (!rest.images?.length) rest.images = [rest.image, rest.image, rest.image]
    res.json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products — thêm sản phẩm (admin)
router.post('/', verifyToken, requireRole('admin'), validateBody(productUpsertSchema), async (req, res) => {
  try {
    const body = normalizeProductBody(req.body)
    const { name, brand, category, price, image } = body
    if (!name || !brand || !category || price == null || !image) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: name, brand, category, price, image' })
    }
    const max = await Product.findOne().sort({ id: -1 }).select('id').lean()
    const nextId = (max?.id ?? 0) + 1
    const stock = Math.max(0, Number(body.stock) || 0)
    const product = await Product.create({ ...body, id: nextId, stock })
    const { _id, __v, ...rest } = product.toObject()
    res.status(201).json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/products/:id — cập nhật (admin)
router.put('/:id', verifyToken, requireRole('admin'), validateBody(productUpsertSchema), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const body = normalizeProductBody(req.body)
    delete body.id // không cho phép đổi id sản phẩm
    const product = await Product.findOneAndUpdate(
      { id },
      { $set: { ...body, stock: Math.max(0, Number(body.stock) || 0) } },
      { new: true, runValidators: true }
    ).lean()
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    const { _id, __v, ...rest } = product
    res.json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/products/:id — soft delete (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID không hợp lệ' })
    const result = await Product.findOneAndUpdate({ id }, { $set: { isDeleted: true } }, { new: true }).lean()
    if (!result) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' })
    res.json({ message: 'Đã ẩn sản phẩm (soft delete)' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
