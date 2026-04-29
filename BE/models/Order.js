import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  id: Number,
  sku: { type: String, default: '' },
  name: String,
  brand: String,
  image: String,
  price: Number,
  quantity: Number,
  addOn: {
    stringId: { type: String, default: '' },
    stringName: { type: String, default: '' },
    tensionKg: { type: Number, default: 0 },
    price: { type: Number, default: 0 }
  }
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Shipper đang giữ đơn (nếu có)
  shipperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    cityName: String,
    district: String,
    districtName: String,
    ward: String,
    wardName: String
  },
  items: [orderItemSchema],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, default: null },
  // Dùng để tránh "trừ lượt dùng coupon" khi đơn chưa thanh toán xong (PayOS).
  couponConsumed: { type: Boolean, default: false },
  total: { type: Number, required: true },
  // paymentMethod: 'cod' (thanh toán khi nhận hàng) hoặc 'payos' (chuyển khoản qua PayOS)
  paymentMethod: { type: String, default: 'cod', enum: ['cod', 'payos'] },
  paymentStatus: { type: String, enum: ['pending_payment', 'paid'], default: null },
  note: String,
  // PayOS metadata (dùng để đối soát webhook)
  payosOrderCode: { type: Number, default: null },
  payosPaymentLinkId: { type: String, default: null },
  payosReference: { type: String, default: null },
  // Lưu checkoutUrl để "thanh toán lại" không phải tạo link mới
  payosCheckoutUrl: { type: String, default: null },
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
