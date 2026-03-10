import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  id: Number,
  name: String,
  brand: String,
  image: String,
  price: Number,
  quantity: Number
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    district: String,
    ward: String
  },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  // paymentMethod: 'cod' (thanh toán khi nhận hàng) hoặc 'bank_transfer' (chuyển khoản/QR ngân hàng)
  paymentMethod: { type: String, default: 'cod', enum: ['cod', 'bank_transfer'] },
  paymentStatus: { type: String, enum: ['pending_payment', 'paid'], default: null },
  note: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true })

orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Order', orderSchema)
