import { Router } from 'express'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

// POST /api/orders — đặt hàng (bắt buộc đăng nhập, lưu userId)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { customer, items, total, paymentMethod, note } = req.body
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin: customer, items (mảng)' })
    }
    if (!customer.name || !customer.phone) {
      return res.status(400).json({ error: 'Thiếu tên hoặc số điện thoại trong customer' })
    }
    const method = (paymentMethod || 'cod').toLowerCase()
    if (method !== 'cod' && method !== 'bank_transfer') {
      return res.status(400).json({ error: 'Phương thức thanh toán chỉ hỗ trợ: cod, bank_transfer' })
    }
    const orderTotal = total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
    const count = await Order.countDocuments()
    const orderId = `ORD${String(count + 1).padStart(6, '0')}`
    // Đơn chuyển khoản ngân hàng: chờ thanh toán
    const paymentStatus = method === 'bank_transfer' ? 'pending_payment' : null
    await Order.create({
      orderId,
      userId: req.userId,
      customer: customer || {},
      items,
      total: orderTotal,
      paymentMethod: method,
      paymentStatus,
      note: note || '',
      status: 'pending'
    })
    res.status(201).json({ orderId, message: 'Đặt hàng thành công' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/me — đơn hàng của tôi (buyer, cần JWT; không chấp nhận API key)
router.get('/me', (req, res, next) => {
  if (req.headers['x-api-key']) return res.status(401).json({ error: 'Dùng Bearer token đăng nhập' })
  next()
}, verifyToken, async (req, res) => {
  try {
    const list = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).lean()
    const json = list.map(({ _id, __v, userId, ...rest }) => ({
      ...rest,
      status: rest.status || 'pending',
      paymentStatus: rest.paymentStatus ?? null
    }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/mark-paid — xác nhận đã thanh toán (admin), cho đơn chuyển khoản ngân hàng
router.patch('/:orderId/mark-paid', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if ((order.paymentMethod || '').toLowerCase() !== 'bank_transfer') {
      return res.status(400).json({ error: 'Chỉ đánh dấu đã thanh toán cho đơn chuyển khoản ngân hàng' })
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Đơn đã được xác nhận thanh toán' })
    }
    order.paymentStatus = 'paid'

    // Nếu đơn đang pending thì tự động xác nhận đơn + trừ tồn kho (để admin chỉ cần bấm 1 nút)
    const current = order.status || 'pending'
    if (current === 'pending') {
      const items = order.items || []
      for (const item of items) {
        const productId = item.id != null ? Number(item.id) : null
        if (productId == null) continue
        const product = await Product.findOne({ id: productId })
        if (!product) continue
        const qty = Math.max(0, Number(item.quantity) || 0)
        const newStock = Math.max(0, (product.stock ?? 0) - qty)
        product.stock = newStock
        product.inStock = newStock > 0
        await product.save()
      }
      order.status = 'confirmed'
    }

    await order.save()
    res.json({
      orderId,
      paymentStatus: order.paymentStatus,
      status: order.status || current,
      message: current === 'pending'
        ? 'Đã xác nhận thanh toán và xác nhận đơn hàng'
        : 'Đã xác nhận thanh toán'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/confirm — xác nhận đơn (chỉ admin), chỉ khi status = pending; trừ tồn kho
router.patch('/:orderId/confirm', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    const current = order.status || 'pending'
    if (current !== 'pending') {
      return res.status(400).json({ error: 'Chỉ xác nhận được đơn đang chờ xác nhận' })
    }
    // Trừ tồn kho theo từng sản phẩm trong đơn (item.id = product id)
    const items = order.items || []
    for (const item of items) {
      const productId = item.id != null ? Number(item.id) : null
      if (productId == null) continue
      const product = await Product.findOne({ id: productId })
      if (!product) continue
      const qty = Math.max(0, Number(item.quantity) || 0)
      const newStock = Math.max(0, (product.stock ?? 0) - qty)
      product.stock = newStock
      product.inStock = newStock > 0
      await product.save()
    }
    order.status = 'confirmed'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã xác nhận đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/cancel — hủy đơn (chỉ admin), khi pending hoặc confirmed
router.patch('/:orderId/cancel', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    const current = order.status || 'pending'
    if (!['pending', 'confirmed'].includes(current)) {
      return res.status(400).json({ error: 'Chỉ hủy được đơn đang chờ xác nhận hoặc đã xác nhận' })
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã hủy đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/cancel-by-buyer — người mua hủy đơn (chỉ khi pending và đúng đơn của mình)
router.patch('/:orderId/cancel-by-buyer', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if (String(order.userId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn này' })
    }
    const current = order.status || 'pending'
    if (current !== 'pending') {
      return res.status(400).json({ error: 'Chỉ hủy được đơn đang chờ xác nhận. Đơn đã được xác nhận vui lòng liên hệ shop.' })
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã hủy đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:orderId — chi tiết một đơn: admin xem mọi đơn, buyer chỉ xem đơn của mình (JWT, không dùng API key)
router.get('/:orderId', (req, res, next) => {
  if (req.headers['x-api-key']) return res.status(401).json({ error: 'Xem chi tiết đơn cần đăng nhập bằng Bearer token' })
  next()
}, verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId }).lean()
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    const isAdmin = req.userRole === 'admin'
    const isOwner = order.userId && String(order.userId) === String(req.userId)
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng này' })
    const { _id, __v, userId, ...rest } = order
    res.json({ ...rest, status: rest.status || 'pending', paymentStatus: rest.paymentStatus ?? null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders — tất cả đơn hoặc tìm theo mã đơn (chỉ admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const filter = {}
    if (req.query.orderId && String(req.query.orderId).trim()) {
      filter.orderId = new RegExp(String(req.query.orderId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }
    const list = await Order.find(filter).sort({ createdAt: -1 }).lean()
    const json = list.map(({ _id, __v, ...rest }) => ({ ...rest, status: rest.status || 'pending', paymentStatus: rest.paymentStatus ?? null }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
