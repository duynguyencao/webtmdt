/**
 * models/PayOSPaymentEvent.js — Log sự kiện thanh toán PayOS (đối soát).
 *
 * Mục đích:
 *   - Ghi lại mọi webhook nhận từ PayOS để debug và đối soát.
 *   - Ghi lại khi buyer hủy đơn hoặc cron tự hủy đơn PayOS.
 *   - Giúp admin truy vết nếu có tranh chấp thanh toán.
 *
 * eventType:
 *   - 'webhook': sự kiện từ PayOS webhook (thanh toán thành công/thất bại)
 *   - 'buyer_cancel': buyer hủy thanh toán trên trang PayOS
 *   - 'cron_cancel': cron job tự hủy đơn PayOS quá hạn
 *   - 'unknown': không xác định
 */

import mongoose from 'mongoose'

const payOSPaymentEventSchema = new mongoose.Schema({
  // Mã đơn hàng (ORD000001, ...)
  orderId: { type: String, index: true },
  // Mã đơn gửi PayOS (parse từ orderId)
  orderCode: { type: Number, index: true },
  // ID link thanh toán PayOS
  paymentLinkId: { type: String, index: true },
  // Số tiền thanh toán
  amount: { type: Number },
  // Mã code từ PayOS (vd: '00' = thành công)
  code: { type: String },
  // Mô tả sự kiện
  desc: { type: String },
  // Loại sự kiện
  eventType: { type: String, default: 'webhook' },
  // Thời điểm nhận sự kiện
  receivedAt: { type: Date, default: Date.now },
  // Dữ liệu thô từ webhook (lưu nguyên để debug)
  raw: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

// Index theo thời gian để query log mới nhất nhanh
payOSPaymentEventSchema.index({ receivedAt: -1 })

export default mongoose.model('PayOSPaymentEvent', payOSPaymentEventSchema)
