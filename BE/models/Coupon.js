import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, required: true, min: 0 },
  minOrderTotal: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true })

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

couponSchema.methods.calcDiscount = function calcDiscount(orderTotal = 0) {
  const total = Math.max(0, Number(orderTotal) || 0)
  if (total <= 0) return 0
  let discount = this.type === 'fixed'
    ? Math.max(0, Number(this.value) || 0)
    : Math.round(total * (Math.max(0, Number(this.value) || 0) / 100))
  if (this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount)
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
