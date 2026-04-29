import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  sku: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  addOn: {
    stringId: { type: String, default: '' },
    tensionKg: { type: Number, default: 0 }
  }
}, { _id: false })

const cartSchema = new mongoose.Schema({
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

