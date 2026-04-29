import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
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

