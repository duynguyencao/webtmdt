/**
 * models/Review.js — Schema đánh giá sản phẩm.
 *
 * Ràng buộc:
 *   - Mỗi user chỉ được đánh giá 1 lần cho 1 sản phẩm trong 1 đơn hàng.
 *     (compound unique index: productId + userId + orderId)
 *   - Chỉ đánh giá được sản phẩm đã mua và đơn đã giao (verified bởi BE).
 *
 * Khi thêm/sửa review:
 *   - reviewRouter tự tính lại trung bình rating và tổng reviews cho Product tương ứng.
 */

import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  // Sản phẩm được đánh giá (Product.id)
  productId: { type: Number, required: true, index: true },
  // Người đánh giá (User._id)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Mã đơn hàng — mỗi đơn chỉ được đánh giá 1 lần cho 1 sản phẩm
  orderId: { type: String, required: true, trim: true, index: true },
  // Số sao: 1-5
  rating: { type: Number, required: true, min: 1, max: 5 },
  // Nội dung đánh giá (tùy chọn)
  comment: { type: String, default: '', trim: true },
  // Đánh giá đã xác thực (user thực sự đã mua sản phẩm trong đơn đó)
  verified: { type: Boolean, default: false }
}, { timestamps: true })

// Đảm bảo mỗi user chỉ review 1 lần cho 1 sản phẩm trong 1 đơn
reviewSchema.index({ productId: 1, userId: 1, orderId: 1 }, { unique: true })

reviewSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Review', reviewSchema)
