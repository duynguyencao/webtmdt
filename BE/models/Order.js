/**
 * models/Order.js — Schema đơn hàng.
 *
 * Luồng trạng thái (status):
 *   pending → confirmed → shipped → delivered
 *                ↓            ↓
 *           cancelled    cancelled (shipper fail + cancel)
 *
 * Payment:
 *   - COD: paymentStatus = null → 'paid' (khi shipper giao thành công)
 *   - PayOS: paymentStatus = 'pending_payment' → 'paid' (khi webhook PayOS xác nhận)
 *
 * Coupon:
 *   - couponCode: mã giảm giá đã áp dụng.
 *   - couponConsumed: đánh dấu đã trừ lượt dùng coupon chưa.
 *     + COD: trừ ngay khi tạo đơn.
 *     + PayOS: chỉ trừ khi thanh toán thành công (tránh hủy đơn mà mất lượt).
 *
 * PayOS metadata:
 *   - payosOrderCode: mã đơn gửi cho PayOS (parse từ orderId).
 *   - payosPaymentLinkId: ID link thanh toán (dùng để cancel / kiểm tra trạng thái).
 *   - payosReference: reference ID từ PayOS (đối soát).
 */

import mongoose from 'mongoose'

/** Schema cho từng sản phẩm trong đơn (snapshot thời điểm đặt) */
const orderItemSchema = new mongoose.Schema({
  id: Number,         // Product.id (không phải _id)
  name: String,       // Tên sản phẩm tại thời điểm đặt
  brand: String,      // Thương hiệu
  image: String,      // URL ảnh (snapshot, không bị ảnh hưởng nếu admin đổi ảnh sau)
  price: Number,      // Giá tại thời điểm đặt
  quantity: Number    // Số lượng mua
}, { _id: false })    // Không tạo _id riêng cho từng item

const orderSchema = new mongoose.Schema({
  // Mã đơn hàng hiển thị: ORD000001, ORD000002, ... (sinh bằng OrderCounter)
  orderId: { type: String, required: true, unique: true },
  // User đã đặt đơn (ref tới User._id)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Shipper đang giữ đơn (null nếu chưa có ai nhận giao)
  shipperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Thông tin người nhận (snapshot từ form checkout)
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String,        // Địa chỉ đầy đủ (dạng text)
    city: String,           // Mã tỉnh/thành
    cityName: String,       // Tên tỉnh/thành (hiển thị)
    district: String,       // Mã quận/huyện
    districtName: String,   // Tên quận/huyện
    ward: String,           // Mã phường/xã
    wardName: String        // Tên phường/xã
  },
  // Danh sách sản phẩm đã đặt (snapshot)
  items: [orderItemSchema],
  // Tổng tiền trước giảm giá
  subtotal: { type: Number, default: 0 },
  // Số tiền được giảm (từ coupon)
  discount: { type: Number, default: 0 },
  // Mã coupon đã dùng
  couponCode: { type: String, default: null },
  // Đã trừ lượt dùng coupon chưa (dùng để hoàn lại khi hủy đơn)
  couponConsumed: { type: Boolean, default: false },
  // Tổng tiền thực phải trả (subtotal - discount + shipping)
  total: { type: Number, required: true },
  // Phương thức thanh toán: 'cod' (nhận hàng trả tiền) | 'payos' (chuyển khoản)
  paymentMethod: { type: String, default: 'cod', enum: ['cod', 'payos'] },
  // Trạng thái thanh toán: null (COD chưa giao) | 'pending_payment' (PayOS chờ) | 'paid'
  paymentStatus: { type: String, enum: ['pending_payment', 'paid'], default: null },
  // Ghi chú của khách
  note: String,
  // === PayOS metadata (dùng để đối soát webhook) ===
  payosOrderCode: { type: Number, default: null },      // Mã đơn gửi PayOS
  payosPaymentLinkId: { type: String, default: null },   // ID link thanh toán
  payosReference: { type: String, default: null },       // Reference từ PayOS
  // Trạng thái đơn hàng
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true })

// Indexes tối ưu cho các truy vấn thường dùng
orderSchema.index({ userId: 1, createdAt: -1 })                                    // Đơn hàng của tôi (buyer)
orderSchema.index({ status: 1, shipperId: 1, createdAt: -1 })                      // Đơn chờ shipper / đơn shipper đang giữ
orderSchema.index({ paymentMethod: 1, paymentStatus: 1, status: 1, createdAt: -1 }) // Auto-cancel PayOS pending (cron job)

// Loại bỏ __v, chuyển _id thành id khi serialize JSON
orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export default mongoose.model('Order', orderSchema)
