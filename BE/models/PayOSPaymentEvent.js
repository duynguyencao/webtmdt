import mongoose from 'mongoose'

const payOSPaymentEventSchema = new mongoose.Schema({
  orderId: { type: String, index: true },
  orderCode: { type: Number, index: true },
  paymentLinkId: { type: String, index: true },
  amount: { type: Number },
  code: { type: String },
  desc: { type: String },
  eventType: { type: String, default: 'webhook' }, // webhook | buyer_cancel | cron_cancel | unknown
  receivedAt: { type: Date, default: Date.now },
  raw: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

payOSPaymentEventSchema.index({ receivedAt: -1 })

export default mongoose.model('PayOSPaymentEvent', payOSPaymentEventSchema)

