import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  emailVerified: { type: Boolean, default: false },
  phone: { type: String, default: '', trim: true },
  address: {
    line1: { type: String, default: '', trim: true },
    // Lưu mã hành chính để đồng nhất dữ liệu
    cityCode: { type: String, default: '', trim: true },
    districtCode: { type: String, default: '', trim: true },
    wardCode: { type: String, default: '', trim: true },
    // Lưu tên để hiển thị nhanh (không phải gọi API hành chính khi render)
    cityName: { type: String, default: '', trim: true },
    districtName: { type: String, default: '', trim: true },
    wardName: { type: String, default: '', trim: true },
    // Legacy fields (giữ tương thích dữ liệu cũ)
    city: { type: String, default: '', trim: true },
    district: { type: String, default: '', trim: true },
    ward: { type: String, default: '', trim: true }
  },
  role: {
    type: String,
    enum: ['buyer', 'admin', 'shipper'],
    default: 'buyer'
  }
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

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
