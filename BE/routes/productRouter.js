import { Router } from 'express'
import Product from '../models/Product.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/products?category=&search=&featured= — công khai
router.get('/', async (req, res) => {
  try {
    const { category, search, featured } = req.query
    const filter = {}
    if (category) filter.category = category
    if (search) {
      const q = new RegExp(search, 'i')
      filter.$or = [{ name: q }, { brand: q }]
    }
    if (featured === 'true') filter.id = { $in: [1, 2, 3, 4, 5, 6] }

    const list = await Product.find(filter)
      .select('id name brand category price originalPrice image images rating reviews sale')
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
    const { name, brand, category, price, image } = req.body
    if (!name || !brand || !category || price == null || !image) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: name, brand, category, price, image' })
    }
    const max = await Product.findOne().sort({ id: -1 }).select('id').lean()
    const nextId = (max?.id ?? 0) + 1
    const product = await Product.create({ ...req.body, id: nextId })
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
    const body = { ...req.body }
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
