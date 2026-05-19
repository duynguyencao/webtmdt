/**
 * models/Cart.js — Schema giỏ hàng (server-side).
 *
 * Mỗi user có 1 cart duy nhất (userId: unique).
 * Giỏ hàng lưu trên server để đồng bộ giữa các thiết bị.
 * FE cũng lưu bản sao trong localStorage để hiển thị nhanh.
 *
 * items: danh sách { productId, quantity }.
 *   - productId: trỏ đến Product.id (Number, không phải _id).
 *   - quantity: số lượng (tối thiểu 1).
 */

import mongoose from 'mongoose'

/** Schema cho từng item trong giỏ hàng */
const cartItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },  // Product.id
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false })  // Không tạo _id riêng cho từng item

const cartSchema = new mongoose.Schema({
  // Mỗi user chỉ có 1 cart (unique)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: { type: [cartItemSchema], default: [] }
}, { timestamps: true })

cartSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Cart', cartSchema)
