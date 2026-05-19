/**
 * models/OrderCounter.js — Bộ đếm tuần tự sinh mã đơn hàng.
 *
 * Dùng findOneAndUpdate + $inc để đảm bảo mã orderId không bao giờ trùng,
 * kể cả khi có nhiều request đặt hàng đồng thời (race condition safe).
 *
 * Document duy nhất: { name: 'orders', seq: <số thứ tự hiện tại> }
 * Khi tạo đơn mới: $inc { seq: 1 } → orderId = `ORD${seq.padStart(6, '0')}`
 * Ví dụ: seq=1 → ORD000001, seq=42 → ORD000042
 */

import mongoose from 'mongoose'

const orderCounterSchema = new mongoose.Schema({
  // Tên bộ đếm (hiện chỉ dùng 'orders')
  name: { type: String, required: true, unique: true },
  // Số thứ tự hiện tại (tự tăng bằng $inc khi tạo đơn)
  seq: { type: Number, default: 0 }
})

export default mongoose.model('OrderCounter', orderCounterSchema)
