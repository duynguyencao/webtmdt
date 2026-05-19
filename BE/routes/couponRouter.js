/**
 * routes/couponRouter.js — API mã giảm giá.
 *
 * Endpoint công khai:
 *   GET /api/coupons/validate?code=...&orderTotal=... — Kiểm tra mã và tính giảm giá
 *
 * Endpoints admin:
 *   GET    /api/coupons         — Danh sách tất cả coupon
 *   POST   /api/coupons         — Tạo coupon mới
 *   PUT    /api/coupons/:code   — Sửa coupon
 *   DELETE /api/coupons/:code   — Xóa coupon
 */

import { Router } from 'express'
import Coupon from '../models/Coupon.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

const normalizeCode = (code) => String(code || '').trim().toUpperCase()

router.get('/validate', async (req, res) => {
  try {
    const code = normalizeCode(req.query.code)
    const orderTotal = Math.max(0, Number(req.query.orderTotal) || 0)
    if (!code) return res.status(400).json({ error: 'Thiếu mã giảm giá' })
    const coupon = await Coupon.findOne({ code })
    if (!coupon) return res.status(404).json({ error: 'Mã giảm giá không tồn tại' })
    const availability = coupon.isAvailable(orderTotal)
    if (!availability.ok) return res.status(400).json({ error: availability.reason })
    const discount = coupon.calcDiscount(orderTotal)
    res.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      finalTotal: Math.max(0, orderTotal - discount)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const list = await Coupon.find().sort({ createdAt: -1 }).lean()
    res.json(list.map(({ _id, __v, ...rest }) => rest))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const code = normalizeCode(req.body.code)
    if (!code) return res.status(400).json({ error: 'Code là bắt buộc' })
    const body = {
      code,
      type: req.body.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(req.body.value) || 0),
      minOrderTotal: Math.max(0, Number(req.body.minOrderTotal) || 0),
      maxDiscount: Math.max(0, Number(req.body.maxDiscount) || 0),
      startAt: req.body.startAt || null,
      endAt: req.body.endAt || null,
      usageLimit: Math.max(0, Number(req.body.usageLimit) || 0),
      active: req.body.active !== false
    }
    if (body.value <= 0) return res.status(400).json({ error: 'Giá trị giảm phải lớn hơn 0' })
    if (body.type === 'percent' && body.value > 90) return res.status(400).json({ error: 'Phần trăm giảm tối đa là 90%' })
    const created = await Coupon.create(body)
    res.status(201).json(created.toJSON())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:code', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const code = normalizeCode(req.params.code)
    if (!code) return res.status(400).json({ error: 'Code là bắt buộc' })

    const body = {
      type: req.body.type === 'fixed' ? 'fixed' : 'percent',
      value: Math.max(0, Number(req.body.value) || 0),
      minOrderTotal: Math.max(0, Number(req.body.minOrderTotal) || 0),
      maxDiscount: Math.max(0, Number(req.body.maxDiscount) || 0),
      usageLimit: Math.max(0, Number(req.body.usageLimit) || 0),
      active: req.body.active !== false
    }

    // Nếu FE không gửi startAt/endAt thì giữ nguyên giá trị cũ của coupon.
    if (Object.prototype.hasOwnProperty.call(req.body, 'startAt')) {
      body.startAt = req.body.startAt ? new Date(req.body.startAt) : null
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'endAt')) {
      body.endAt = req.body.endAt ? new Date(req.body.endAt) : null
    }

    if (body.value <= 0) return res.status(400).json({ error: 'Giá trị giảm phải lớn hơn 0' })
    if (body.type === 'percent' && body.value > 90) return res.status(400).json({ error: 'Phần trăm giảm tối đa là 90%' })
    const updated = await Coupon.findOneAndUpdate({ code }, body, { new: true, runValidators: true }).lean()
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy mã giảm giá' })
    const { _id, __v, ...rest } = updated
    res.json(rest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:code', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const code = normalizeCode(req.params.code)
    if (!code) return res.status(400).json({ error: 'Code là bắt buộc' })
    const deleted = await Coupon.findOneAndDelete({ code }).lean()
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy mã giảm giá' })
    res.json({ message: 'Đã xóa mã giảm giá', code })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
