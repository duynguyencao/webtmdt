import { Router } from 'express'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import Coupon from '../models/Coupon.js'
import { verifyToken, requireRole } from '../middleware/auth.js'
import { PayOS } from '@payos/node'
import OrderCounter from '../models/OrderCounter.js'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'
import { validateBody } from '../validation/validate.js'
import { orderCreateSchema } from '../validation/schemas.js'

const router = Router()

const defaultSkuForProductId = (productId) => `P${productId}-DEFAULT`

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false
})

const createPayOSClient = () => {
  const clientId = String(process.env.PAYOS_CLIENT_ID || '').trim()
  const apiKey = String(process.env.PAYOS_API_KEY || '').trim()
  const checksumKey = String(process.env.PAYOS_CHECKSUM_KEY || '').trim()
  if (!clientId || !apiKey || !checksumKey) {
    throw new Error('PayOS chưa cấu hình: thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong .env')
  }
  return new PayOS({ clientId, apiKey, checksumKey })
}

const getReturnCancelUrls = (req, orderId) => {
  const origin = String(req.headers.origin || process.env.FE_BASE_URL || '').trim().replace(/\/$/, '')
  const base = origin || 'http://localhost:5173'
  const url = `${base}/orders/${encodeURIComponent(orderId)}`
  return { returnUrl: url, cancelUrl: url }
}

// POST /api/orders — đặt hàng (bắt buộc đăng nhập, lưu userId)
router.post('/', orderLimiter, verifyToken, validateBody(orderCreateSchema), async (req, res) => {
  try {
    const { customer, items, paymentMethod, note, couponCode } = req.body
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin: customer, items (mảng)' })
    }
    if (!customer.name || !customer.phone) {
      return res.status(400).json({ error: 'Thiếu tên hoặc số điện thoại trong customer' })
    }
    const method = (paymentMethod || 'cod').toLowerCase()
    if (!['cod', 'payos'].includes(method)) {
      return res.status(400).json({ error: 'Phương thức thanh toán chỉ hỗ trợ: cod, payos' })
    }

    // Sinh orderId an toàn, tránh trùng do race condition (trước đây dùng countDocuments()).
    const last = await Order.findOne({ orderId: /^ORD\d+$/ }).sort({ orderId: -1 }).select('orderId').lean()
    const lastSeq = last?.orderId ? parseInt(String(last.orderId).replace(/^ORD/, ''), 10) : 0

    // 2 bước để tránh conflict operator "$setOnInsert" + "$inc" lên cùng field "seq"
    await OrderCounter.updateOne(
      { name: 'orders' },
      { $setOnInsert: { seq: lastSeq } },
      { upsert: true }
    )

    const counter = await OrderCounter.findOneAndUpdate(
      { name: 'orders' },
      { $inc: { seq: 1 } },
      { new: true }
    )

    const orderId = `ORD${String(counter?.seq ?? lastSeq + 1).padStart(6, '0')}`
    const paymentStatus = method === 'payos' ? 'pending_payment' : null

    const session = await mongoose.startSession()
    let createdOrder = null
    let normalizedItems = []
    let subtotal = 0
    let discount = 0
    let couponUsed = null
    let couponDoc = null
    const initialStatus = 'pending'

    const run = async () => {
      subtotal = 0
      normalizedItems = []

      for (const item of items) {
        const productId = item?.id != null ? Number(item.id) : null
        if (productId == null) continue
        const sku = String(item?.sku || '').trim() || defaultSkuForProductId(productId)
        const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1))

        const product = await Product.findOne({ id: productId, isDeleted: { $ne: true } }).session(session)
        if (!product) continue
        const variants = Array.isArray(product.variants) ? product.variants : []
        const variant = variants.find((v) => String(v.sku || '').trim() === sku)
        if (!variant) {
          throw new Error(`Biến thể (SKU) không tồn tại cho sản phẩm "${product.name}"`)
        }
        const unitPrice = variant.priceOverride != null ? Number(variant.priceOverride) || 0 : (Number(product.price) || 0)

        // Add-on đan cước (tuỳ chọn)
        let addOn = null
        if (item?.addOn && product.stringingAddOn?.enabled) {
          const stringId = String(item.addOn.stringId || '').trim()
          const tensionKg = Number(item.addOn.tensionKg) || 0
          const list = Array.isArray(product.stringingAddOn?.strings) ? product.stringingAddOn.strings : []
          const picked = list.find((s) => String(s.id || '').trim() === stringId)
          if (!picked) throw new Error('Loại cước không hợp lệ')
          addOn = {
            stringId,
            stringName: String(picked.name || ''),
            tensionKg,
            price: Math.max(0, Number(picked.price) || 0)
          }
        }

        subtotal += unitPrice * qty + (addOn ? (addOn.price * qty) : 0)
        normalizedItems.push({
          id: product.id,
          sku,
          name: product.name,
          brand: product.brand,
          image: product.image || '',
          price: unitPrice,
          quantity: qty,
          addOn: addOn || undefined
        })
      }

      if (!normalizedItems.length) {
        throw new Error('Không có sản phẩm hợp lệ để đặt hàng')
      }

      if (couponCode) {
        const code = String(couponCode).trim().toUpperCase()
        const coupon = await Coupon.findOne({ code }).session(session)
        if (!coupon) throw new Error('Mã giảm giá không tồn tại')
        const availability = coupon.isAvailable(subtotal)
        if (!availability.ok) throw new Error(availability.reason)
        discount = coupon.calcDiscount(subtotal)
        couponUsed = code
        couponDoc = coupon
      }

      // Trừ tồn kho atomically theo SKU (chống oversell)
      for (const it of normalizedItems) {
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
        const sku = String(it.sku || '').trim() || defaultSkuForProductId(it.id)
        const r = await Product.updateOne(
          { id: it.id, isDeleted: { $ne: true }, variants: { $elemMatch: { sku, stock: { $gte: qty } } } },
          { $inc: { 'variants.$.stock': -qty } }
        ).session(session)
        if (!r?.modifiedCount) {
          throw new Error(`Biến thể "${sku}" đã hết hàng hoặc không đủ số lượng`)
        }
      }

      const orderTotal = Math.max(0, subtotal - discount)

      createdOrder = await Order.create([{
        orderId,
        userId: req.userId,
        customer: customer || {},
        items: normalizedItems,
        subtotal,
        discount,
        couponCode: couponUsed,
        total: orderTotal,
        paymentMethod: method,
        paymentStatus,
        note: note || '',
        status: initialStatus
      }], { session }).then((arr) => arr[0])

      if (couponDoc && method !== 'payos') {
        couponDoc.usedCount = (couponDoc.usedCount || 0) + 1
        await couponDoc.save({ session })
        createdOrder.couponConsumed = true
        await createdOrder.save({ session })
      }
    }

    // Transaction nếu môi trường hỗ trợ; nếu không thì vẫn chạy (atomic update) nhưng không full-transaction.
    try {
      await session.withTransaction(async () => run())
    } catch (err) {
      const msg = String(err?.message || '')
      const isTxnUnsupported = msg.includes('Transaction') || msg.includes('replica set') || msg.includes('not supported')
      if (!isTxnUnsupported) throw err
      await run()
    } finally {
      session.endSession()
    }

    const orderTotal = createdOrder?.total ?? Math.max(0, subtotal - discount)

    if (method !== 'payos') {
      res.status(201).json({ orderId, message: 'Đặt hàng thành công. Đang chờ admin xác nhận (COD).' })
      return
    }

    // Tạo link thanh toán PayOS ngay sau khi tạo đơn
    let paymentUrl = null
    try {
      const payOS = createPayOSClient()
      const { returnUrl, cancelUrl } = getReturnCancelUrls(req, orderId)

      const payosOrderCode = parseInt(String(orderId).replace(/^ORD/, ''), 10)

      const paymentData = {
        orderCode: payosOrderCode,
        amount: Math.round(orderTotal),
        description: orderId,
        items: (normalizedItems || []).map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: Math.round(it.price)
        })),
        cancelUrl,
        returnUrl
      }

      const paymentLink = await payOS.paymentRequests.create(paymentData)
      paymentUrl = paymentLink?.checkoutUrl || null

      createdOrder.payosOrderCode = payosOrderCode
      createdOrder.payosPaymentLinkId = paymentLink?.paymentLinkId || paymentLink?.id || null
      createdOrder.payosReference = paymentLink?.reference || null
      await createdOrder.save()
    } catch (err) {
      // Không tạo được paymentUrl thì vẫn trả về orderId để webhook cập nhật sau (tránh mất đơn)
      console.warn('PayOS: không tạo được payment link:', err?.message || err)
    }

    res.status(201).json({
      orderId,
      message: 'Đặt hàng thành công. Vui lòng thanh toán qua PayOS.',
      paymentUrl
    })
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
    const page = Math.max(1, Number(req.query.page) || 0)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 0))
    const usePaging = Boolean(req.query.page || req.query.limit)

    const baseQuery = Order.find({ userId: req.userId }).sort({ createdAt: -1 })
    const [list, total] = await Promise.all([
      usePaging ? baseQuery.skip((page - 1) * limit).limit(limit).lean() : baseQuery.lean(),
      usePaging ? Order.countDocuments({ userId: req.userId }) : Promise.resolve(0)
    ])
    const json = list.map(({ _id, __v, userId, ...rest }) => ({
      ...rest,
      status: rest.status || 'pending',
      paymentStatus: rest.paymentStatus ?? null
    }))
    if (!usePaging) {
      res.json(json)
      return
    }
    res.json({ items: json, page, limit, total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// PATCH /api/orders/:orderId/confirm — xác nhận đơn (chỉ admin), chỉ khi status = pending
router.patch('/:orderId/confirm', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    const current = order.status || 'pending'
    if (current !== 'pending') {
      return res.status(400).json({ error: 'Chỉ xác nhận được đơn đang chờ xác nhận' })
    }
    if (String(order.paymentMethod || '').toLowerCase() !== 'cod') {
      return res.status(400).json({ error: 'Chỉ xác nhận đơn COD' })
    }
    order.status = 'confirmed'
    // Với COD: xem như đã thanh toán khi admin xác nhận.
    if (String(order.paymentMethod || '').toLowerCase() === 'cod') {
      order.paymentStatus = 'paid'
    }
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã xác nhận đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/cancel — hủy đơn (chỉ admin), khi pending hoặc confirmed; hoàn stock
router.patch('/:orderId/cancel', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    const current = order.status || 'pending'
    if (!['pending', 'confirmed'].includes(current)) {
      return res.status(400).json({ error: 'Chỉ hủy được đơn đang chờ xác nhận hoặc đã xác nhận' })
    }

    // Hoàn lại lượt dùng coupon nếu đơn COD đã tính và bị hủy.
    // Không hoàn nếu PayOS đã thanh toán (tránh lợi dụng).
    if (order.couponCode && order.couponConsumed) {
      const method = String(order.paymentMethod || '').toLowerCase()
      const canRefundCoupon = method === 'cod' || order.paymentStatus !== 'paid'
      if (canRefundCoupon) {
        const coupon = await Coupon.findOne({ code: order.couponCode })
        if (coupon) {
          coupon.usedCount = Math.max(0, (coupon.usedCount || 0) - 1)
          await coupon.save()
          order.couponConsumed = false
        }
      }
    }

    for (const item of (order.items || [])) {
      const productId = item.id != null ? Number(item.id) : null
      if (productId == null) continue
      const qty = Math.max(0, Number(item.quantity) || 0)
      if (!qty) continue
      const sku = String(item.sku || '').trim() || defaultSkuForProductId(productId)
      await Product.updateOne(
        { id: productId, isDeleted: { $ne: true }, 'variants.sku': sku },
        { $inc: { 'variants.$.stock': qty } }
      )
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã hủy đơn hàng và hoàn lại tồn kho' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/cancel-by-buyer — người mua hủy đơn (chỉ khi pending và đúng đơn của mình); hoàn stock
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

    if (order.couponCode && order.couponConsumed) {
      const method = String(order.paymentMethod || '').toLowerCase()
      const canRefundCoupon = method === 'cod' || order.paymentStatus !== 'paid'
      if (canRefundCoupon) {
        const coupon = await Coupon.findOne({ code: order.couponCode })
        if (coupon) {
          coupon.usedCount = Math.max(0, (coupon.usedCount || 0) - 1)
          await coupon.save()
          order.couponConsumed = false
        }
      }
    }

    for (const item of (order.items || [])) {
      const productId = item.id != null ? Number(item.id) : null
      if (productId == null) continue
      const qty = Math.max(0, Number(item.quantity) || 0)
      if (!qty) continue
      const sku = String(item.sku || '').trim() || defaultSkuForProductId(productId)
      await Product.updateOne(
        { id: productId, isDeleted: { $ne: true }, 'variants.sku': sku },
        { $inc: { 'variants.$.stock': qty } }
      )
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
    const page = Math.max(1, Number(req.query.page) || 0)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 0))
    const usePaging = Boolean(req.query.page || req.query.limit)

    const baseQuery = Order.find(filter).sort({ createdAt: -1 })
    const [list, total] = await Promise.all([
      usePaging ? baseQuery.skip((page - 1) * limit).limit(limit).lean() : baseQuery.lean(),
      usePaging ? Order.countDocuments(filter) : Promise.resolve(0)
    ])
    const json = list.map(({ _id, __v, ...rest }) => ({ ...rest, status: rest.status || 'pending', paymentStatus: rest.paymentStatus ?? null }))
    if (!usePaging) {
      res.json(json)
      return
    }
    res.json({ items: json, page, limit, total })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
