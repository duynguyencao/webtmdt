/**
 * models/User.js — Schema người dùng.
 *
 * Roles:
 *   - 'buyer': khách hàng (mặc định khi đăng ký)
 *   - 'admin': quản trị viên (thêm/sửa/xóa sản phẩm, quản lý đơn hàng)
 *   - 'shipper': nhân viên giao hàng (nhận đơn, giao đơn)
 *
 * Bảo mật:
 *   - Password được hash bằng bcrypt (salt rounds = 10) trước khi lưu.
 *   - toJSON tự động xóa password khi trả response (không bao giờ lộ ra FE).
 *
 * Address:
 *   - Lưu cả mã hành chính (code) và tên hiển thị (name) của tỉnh/quận/phường.
 *   - Có legacy fields (city, district, ward) để tương thích dữ liệu cũ.
 */

import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // Email unique, tự chuyển lowercase — dùng làm tài khoản đăng nhập
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Password: hash bằng bcrypt trước khi save (xem hook pre('save') bên dưới)
  password: { type: String, required: true, minlength: 6 },
  // Email đã xác thực chưa (qua link gửi mail)
  emailVerified: { type: Boolean, default: false },
  phone: { type: String, default: '', trim: true },
  address: {
    line1: { type: String, default: '', trim: true },
    // Mã hành chính (dùng để tính phí ship chính xác)
    cityCode: { type: String, default: '', trim: true },
    districtCode: { type: String, default: '', trim: true },
    wardCode: { type: String, default: '', trim: true },
    // Tên hiển thị (để render nhanh không cần gọi API hành chính)
    cityName: { type: String, default: '', trim: true },
    districtName: { type: String, default: '', trim: true },
    wardName: { type: String, default: '', trim: true },
    // Legacy fields (giữ tương thích dữ liệu cũ đã lưu trước refactor)
    city: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    ward: { type: String, default: '', trim: true }
  },
  // Role phân quyền: buyer (mặc định) | admin | shipper
  role: {
    type: String,
    enum: ['buyer', 'admin', 'shipper'],
    default: 'buyer'
  }
}, { timestamps: true })

/**
 * Hook pre-save: tự động hash password bằng bcrypt khi tạo mới hoặc đổi mật khẩu.
 * Nếu password không thay đổi (vd: chỉ update tên) → bỏ qua, không hash lại.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

/**
 * So sánh password người dùng nhập với hash đã lưu.
 * @param {string} candidate - Mật khẩu dạng plaintext người dùng nhập.
 * @returns {Promise<boolean>} - true nếu khớp.
 */
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Loại bỏ _id, __v, password khi serialize JSON (bảo mật: không lộ password ra FE)
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.password
    return ret
  }
})

export default mongoose.model('User', userSchema)
