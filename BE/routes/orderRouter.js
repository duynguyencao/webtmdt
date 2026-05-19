/**
 * routes/orderRouter.js — API quản lý đơn hàng.
 *
 * Endpoints:
 *   POST   /api/orders                         — Đặt hàng (buyer, cần JWT)
 *   GET    /api/orders/me                      — Đơn hàng của tôi (buyer)
 *   GET    /api/orders/:orderId                — Chi tiết đơn (buyer xem đơn mình, admin xem mọi đơn)
 *   GET    /api/orders                         — Tất cả đơn (admin)
 *   PATCH  /api/orders/:orderId/confirm        — Xác nhận đơn COD (admin)
 *   PATCH  /api/orders/:orderId/cancel         — Hủy đơn (admin)
 *   PATCH  /api/orders/:orderId/cancel-by-buyer — Buyer tự hủy đơn pending
 *   PATCH  /api/orders/:orderId/cancel-payos-and-delete — Hủy đơn PayOS chưa thanh toán + xóa
 *
 * Shipper endpoints:
 *   GET    /api/orders/shipper/available        — Đơn chờ shipper nhận
 *   GET    /api/orders/shipper/my-tasks         — Đơn shipper đang giao
 *   PATCH  /api/orders/:orderId/pickup          — Nhận đơn giao
 *   PATCH  /api/orders/:orderId/deliver         — Giao thành công
 *   PATCH  /api/orders/:orderId/fail            — Giao thất bại (return/cancel)
 *
 * Luồng tạo đơn (POST /):
 *   1. Validate body (Zod schema).
 *   2. Sinh orderId (ORD000001) bằng OrderCounter (race-condition safe).
 *   3. Kiểm tra tồn kho + trừ stock atomic ($inc) trong transaction.
 *   4. Áp dụng coupon (nếu có).
 *   5. Tạo Order document.
 *   6. Nếu PayOS → tạo payment link → redirect FE.
 *   7. Nếu COD → trả 201 ngay.
 */

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
import PayOSPaymentEvent from '../models/PayOSPaymentEvent.js'

const router = Router()

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
  const base = String(process.env.FE_BASE_URL || '').trim().replace(/\/$/, '') || 'http://localhost:3000'
  const returnUrl = `${base}/orders/${encodeURIComponent(orderId)}`
  // Khi user bấm "Hủy thanh toán" trên PayOS => redirect về FE route để tự động hủy + xóa đơn
  const cancelUrl = `${base}/payos/cancel?orderId=${encodeURIComponent(orderId)}`
  return { returnUrl, cancelUrl }
}

// =========================
// Shipper APIs
// =========================

// GET /api/orders/shipper/available — đơn đã xác nhận, chưa có shipper
router.get('/shipper/available', verifyToken, requireRole('shipper'), async (req, res) => {
  try {
    const list = await Order.find({ status: 'confirmed', shipperId: null }).sort({ createdAt: -1 }).lean()
    const json = list.map(({ _id, __v, ...rest }) => ({ ...rest, status: rest.status || 'pending', paymentStatus: rest.paymentStatus ?? null }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/shipper/my-tasks — đơn shipper đang giữ (đang giao)
router.get('/shipper/my-tasks', verifyToken, requireRole('shipper'), async (req, res) => {
  try {
    const list = await Order.find({ status: 'shipped', shipperId: req.userId }).sort({ createdAt: -1 }).lean()
    const json = list.map(({ _id, __v, ...rest }) => ({ ...rest, status: rest.status || 'pending', paymentStatus: rest.paymentStatus ?? null }))
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/pickup — nhận đơn: confirmed -> shipped + gắn shipperId
router.patch('/:orderId/pickup', verifyToken, requireRole('shipper'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if ((order.status || 'pending') !== 'confirmed') return res.status(400).json({ error: 'Chỉ nhận được đơn đã xác nhận' })
    if (order.shipperId) return res.status(400).json({ error: 'Đơn hàng đã có shipper nhận' })

    order.shipperId = req.userId
    order.status = 'shipped'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã nhận giao đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/deliver — giao thành công: shipped -> delivered; COD => paid
router.patch('/:orderId/deliver', verifyToken, requireRole('shipper'), async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if ((order.status || 'pending') !== 'shipped') return res.status(400).json({ error: 'Chỉ giao được đơn đang giao' })
    if (!order.shipperId || String(order.shipperId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Bạn không giữ đơn này' })
    }

    order.status = 'delivered'
    if (String(order.paymentMethod || '').toLowerCase() === 'cod') {
      order.paymentStatus = 'paid'
    }
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã giao thành công' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/fail — giao thất bại (return/cancel)
router.patch('/:orderId/fail', verifyToken, requireRole('shipper'), async (req, res) => {
  try {
    const { orderId } = req.params
    const action = String(req.body?.action || 'return').toLowerCase() // return | cancel
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if ((order.status || 'pending') !== 'shipped') return res.status(400).json({ error: 'Chỉ thao tác được khi đơn đang giao' })
    if (!order.shipperId || String(order.shipperId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Bạn không giữ đơn này' })
    }

    if (action === 'return') {
      order.status = 'confirmed'
      order.shipperId = null
      await order.save()
      return res.json({ orderId, status: order.status, message: 'Đã trả đơn về trạng thái chờ shipper khác' })
    }

    if (action !== 'cancel') return res.status(400).json({ error: 'action chỉ hỗ trợ: return, cancel' })
    if (order.paymentStatus === 'paid' && String(order.paymentMethod || '').toLowerCase() === 'payos') {
      return res.status(400).json({ error: 'Đơn PayOS đã thanh toán không thể hủy bằng shipper' })
    }

    // Hoàn kho theo stock (1 biến thể duy nhất)
    for (const item of (order.items || [])) {
      const productId = item.id != null ? Number(item.id) : null
      if (productId == null) continue
      const qty = Math.max(0, Number(item.quantity) || 0)
      if (!qty) continue
      await Product.updateOne(
        { id: productId },
        { $inc: { stock: qty } }
      )
    }

    // Hoàn coupon nếu đã consume và chưa paid (an toàn)
    if (order.couponCode && order.couponConsumed && order.paymentStatus !== 'paid') {
      const coupon = await Coupon.findOne({ code: order.couponCode })
      if (coupon) {
        coupon.usedCount = Math.max(0, (coupon.usedCount || 0) - 1)
        await coupon.save()
        order.couponConsumed = false
      }
    }

    order.status = 'cancelled'
    await order.save()
    return res.json({ orderId, status: order.status, message: 'Đã hủy đơn và hoàn kho' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
        const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1))

        const product = await Product.findOne({ id: productId, isDeleted: { $ne: true } }).session(session)
        if (!product) continue
        const unitPrice = Number(product.price) || 0
        const stockNow = Math.max(0, Number(product.stock) || 0)
        if (stockNow < qty) {
          throw new Error(`Sản phẩm "${product.name}" đã hết hàng hoặc không đủ số lượng`)
        }

        subtotal += unitPrice * qty
        normalizedItems.push({
          id: product.id,
          name: product.name,
          brand: product.brand,
          image: product.image || '',
          price: unitPrice,
          quantity: qty
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

      // Trừ tồn kho atomically theo Product.stock (chống oversell)
      for (const it of normalizedItems) {
        const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
        const r = await Product.updateOne(
          { id: it.id, isDeleted: { $ne: true }, stock: { $gte: qty } },
          { $inc: { stock: -qty } }
        ).session(session)
        if (!r?.modifiedCount) {
          throw new Error('Sản phẩm đã hết hàng hoặc không đủ số lượng')
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
    // COD chỉ được xem là paid khi giao thành công (shipper deliver).
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
      await Product.updateOne(
        { id: productId },
        { $inc: { stock: qty } }
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
      await Product.updateOne(
        { id: productId },
        { $inc: { stock: qty } }
      )
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ orderId, status: order.status, message: 'Đã hủy đơn hàng' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:orderId/cancel-payos-and-delete
// Khi user hủy thanh toán trên PayOS: hoàn kho + best-effort cancel payment request + xóa đơn khỏi DB.
router.patch('/:orderId/cancel-payos-and-delete', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId })
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' })
    if (String(order.userId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn này' })
    }
    const method = String(order.paymentMethod || '').toLowerCase()
    if (method !== 'payos') return res.status(400).json({ error: 'Đơn hàng này không dùng PayOS' })
    if (order.paymentStatus === 'paid') return res.status(400).json({ error: 'Đơn hàng đã thanh toán' })
    if ((order.status || 'pending') !== 'pending') return res.status(400).json({ error: 'Chỉ hủy được đơn PayOS đang chờ xác nhận' })

    // Best-effort cancel payment request trên PayOS (không chặn flow nếu fail)
    try {
      const payOS = createPayOSClient()
      const paymentLinkId = String(order.payosPaymentLinkId || '').trim()
      if (paymentLinkId) {
        await payOS.paymentRequests.cancel(paymentLinkId, 'User cancelled on checkout page')
      }
    } catch {
      // ignore
    }

    // Hoàn kho theo Product.stock
    for (const item of (order.items || [])) {
      const productId = item.id != null ? Number(item.id) : null
      if (productId == null) continue
      const qty = Math.max(0, Number(item.quantity) || 0)
      if (!qty) continue
      await Product.updateOne(
        { id: productId },
        { $inc: { stock: qty } }
      )
    }

    // Coupon: với PayOS chưa paid thì chưa consume (hoặc nếu có cờ consume thì hoàn lại)
    if (order.couponCode && order.couponConsumed) {
      const coupon = await Coupon.findOne({ code: order.couponCode })
      if (coupon) {
        coupon.usedCount = Math.max(0, (coupon.usedCount || 0) - 1)
        await coupon.save()
      }
    }

    // Tombstone log để đối soát nếu webhook đến muộn sau khi hard-delete
    await PayOSPaymentEvent.create({
      orderId,
      orderCode: order.payosOrderCode ?? undefined,
      paymentLinkId: order.payosPaymentLinkId ?? undefined,
      amount: Math.round(Number(order.total) || 0) || undefined,
      eventType: 'buyer_cancel',
      desc: 'Buyer cancelled on PayOS checkout; order deleted',
      raw: {
        paymentStatus: order.paymentStatus,
        status: order.status,
        userId: String(order.userId || ''),
        createdAt: order.createdAt
      }
    }).catch(() => {})

    await Order.deleteOne({ orderId })
    return res.json({ orderId, message: 'Đã hủy thanh toán và xóa đơn hàng' })
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
