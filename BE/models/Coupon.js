/**
 * models/Coupon.js — Schema mã giảm giá.
 *
 * Hai loại giảm giá:
 *   - 'percent': giảm theo phần trăm (vd: value=10 → giảm 10%)
 *   - 'fixed': giảm số tiền cố định (vd: value=50000 → giảm 50,000đ)
 *
 * Điều kiện áp dụng:
 *   - active: coupon phải đang bật (admin có thể tắt bất cứ lúc nào)
 *   - startAt / endAt: khoảng thời gian hiệu lực (null = không giới hạn)
 *   - usageLimit: giới hạn số lượt dùng (0 = không giới hạn)
 *   - minOrderTotal: đơn hàng tối thiểu để áp dụng
 *   - maxDiscount: giảm tối đa (chỉ có ý nghĩa với loại 'percent', tránh giảm quá nhiều)
 */

import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  // Mã coupon: tự động uppercase + trim (vd: "SALE2024")
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  // Loại giảm giá: 'percent' (%) hoặc 'fixed' (VNĐ)
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  // Giá trị giảm: nếu percent thì là %, nếu fixed thì là số tiền
  value: { type: Number, required: true, min: 0 },
  // Đơn hàng tối thiểu để được dùng coupon
  minOrderTotal: { type: Number, default: 0, min: 0 },
  // Giảm tối đa (chỉ áp dụng khi type='percent', tránh giảm quá nhiều cho đơn lớn)
  maxDiscount: { type: Number, default: 0, min: 0 },
  // Thời gian bắt đầu và kết thúc hiệu lực (null = không giới hạn)
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  // Giới hạn số lượt dùng (0 = không giới hạn)
  usageLimit: { type: Number, default: 0, min: 0 },
  // Số lượt đã dùng (tăng khi đơn confirmed, giảm khi đơn bị hủy)
  usedCount: { type: Number, default: 0, min: 0 },
  // Admin có thể tắt coupon bất cứ lúc nào
  active: { type: Boolean, default: true }
}, { timestamps: true })

/**
 * Kiểm tra coupon có thể áp dụng cho đơn hàng không.
 * @param {number} orderTotal - Tổng tiền đơn hàng (trước giảm).
 * @returns {{ ok: boolean, reason?: string }} - ok=true nếu hợp lệ, ok=false kèm lý do.
 */
couponSchema.methods.isAvailable = function isAvailable(orderTotal = 0) {
  const now = new Date()
  if (!this.active) return { ok: false, reason: 'Mã giảm giá đã bị khóa' }
  if (this.startAt && now < this.startAt) return { ok: false, reason: 'Mã giảm giá chưa bắt đầu' }
  if (this.endAt && now > this.endAt) return { ok: false, reason: 'Mã giảm giá đã hết hạn' }
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) return { ok: false, reason: 'Mã giảm giá đã hết lượt dùng' }
  if ((Number(orderTotal) || 0) < (this.minOrderTotal || 0)) {
    return { ok: false, reason: `Đơn tối thiểu ${this.minOrderTotal}đ để áp dụng mã` }
  }
  return { ok: true }
}

/**
 * Tính số tiền được giảm cho đơn hàng.
 * @param {number} orderTotal - Tổng tiền đơn hàng.
 * @returns {number} - Số tiền giảm (đã cap bởi maxDiscount và tổng đơn).
 */
couponSchema.methods.calcDiscount = function calcDiscount(orderTotal = 0) {
  const total = Math.max(0, Number(orderTotal) || 0)
  if (total <= 0) return 0
  // Tính giảm giá theo loại
  let discount = this.type === 'fixed'
    ? Math.max(0, Number(this.value) || 0)                                     // Giảm cố định
    : Math.round(total * (Math.max(0, Number(this.value) || 0) / 100))         // Giảm %
  // Cap bởi maxDiscount (nếu có)
  if (this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount)
  // Không giảm quá tổng đơn
  return Math.min(total, discount)
}

couponSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Coupon', couponSchema)
