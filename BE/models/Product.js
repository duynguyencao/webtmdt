import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  attrs: {
    weight: { type: String, default: '', trim: true }, // 3U/4U...
    grip: { type: String, default: '', trim: true } // G5/G6...
  },
  priceOverride: { type: Number, default: null },
  stock: { type: Number, default: 0, min: 0 },
  inStock: { type: Boolean, default: true }
}, { _id: false })

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
  // Biến thể (SKU) + tồn kho theo biến thể.
  variants: { type: [variantSchema], default: [] },
  // Add-on đan cước (tuỳ chọn)
  stringingAddOn: {
    enabled: { type: Boolean, default: false },
    strings: { type: [{ id: String, name: String, price: Number }], default: [] },
    tension: {
      minKg: { type: Number, default: 0 },
      maxKg: { type: Number, default: 0 },
      stepKg: { type: Number, default: 0 }
    }
  },
  // Legacy fields (giữ để tương thích dữ liệu cũ; sẽ migrate sang variants)
  inStock: { type: Boolean, default: true },
  stock: { type: Number, default: 0 }
}, { timestamps: true, id: false })

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Product', productSchema)
