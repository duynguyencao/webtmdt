/**
 * models/Product.js — Schema sản phẩm (vợt cầu lông).
 *
 * Trường quan trọng:
 *   - id (Number): mã sản phẩm tự sinh (max+1), dùng thay _id của MongoDB.
 *   - price: giá bán thực tế (đã tính giảm giá nếu có).
 *   - originalPrice: giá gốc trước giảm (chỉ có khi sale=true).
 *   - image: URL ảnh chính (lưu link từ Supabase Storage hoặc bên ngoài).
 *   - images: danh sách URL ảnh phụ (gallery).
 *   - isDeleted: xóa mềm (soft delete) — sản phẩm bị ẩn nhưng không mất khỏi DB,
 *               tránh ảnh hưởng lịch sử đơn hàng đã tạo trước đó.
 *   - stock: số lượng tồn kho — source of truth, được trừ atomic khi đặt hàng.
 *
 * toJSON: loại bỏ _id và __v khi trả JSON cho FE.
 */

import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  // Mã sản phẩm tự sinh (không dùng ObjectId của Mongo)
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  // Hiện tại chỉ dùng 'vot' (vợt cầu lông), BE tự ép về 'vot' khi thêm/sửa
  category: { type: String, required: true },
  // Giá bán thực tế (đã trừ giảm giá nếu có)
  price: { type: Number, required: true },
  // Giá gốc trước giảm — chỉ có khi sale=true
  originalPrice: Number,
  // URL ảnh chính (từ Supabase Storage hoặc link ngoài)
  image: { type: String, required: true },
  // Danh sách ảnh phụ (gallery sản phẩm)
  images: [String],
  // Rating trung bình (tính từ reviews, cập nhật qua reviewRouter)
  rating: { type: Number, default: 0 },
  // Số lượng đánh giá
  reviews: { type: Number, default: 0 },
  // Có đang giảm giá không
  sale: { type: Boolean, default: false },
  description: String,
  // Thông số kỹ thuật (object linh hoạt)
  specifications: mongoose.Schema.Types.Mixed,
  // Soft delete: không xóa cứng để tránh hỏng lịch sử đơn hàng.
  isDeleted: { type: Boolean, default: false },
  // Tồn kho (source of truth) — trừ atomic bằng $inc khi đặt hàng
  stock: { type: Number, default: 0, min: 0 }
}, { timestamps: true, id: false })

// Loại bỏ _id và __v khi serialize JSON (FE không cần)
productSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Product', productSchema)
