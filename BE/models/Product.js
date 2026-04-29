import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  image: { type: String, required: true },
  images: [String],
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  sale: { type: Boolean, default: false },
  description: String,
  specifications: mongoose.Schema.Types.Mixed,
  // Soft delete: không xóa cứng để tránh hỏng lịch sử đơn hàng.
  isDeleted: { type: Boolean, default: false },
  // Tồn kho (source of truth)
  stock: { type: Number, default: 0, min: 0 }
}, { timestamps: true, id: false })

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Product', productSchema)
