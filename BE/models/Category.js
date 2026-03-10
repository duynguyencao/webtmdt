import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  image: { type: String, required: true },
  count: { type: Number, default: 0 }
}, { timestamps: true })

categorySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Category', categorySchema)
