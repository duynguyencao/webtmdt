import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  productId: { type: Number, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', trim: true },
  verified: { type: Boolean, default: false }
}, { timestamps: true })

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true })

reviewSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Review', reviewSchema)

