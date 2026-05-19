/**
 * scripts/makeShipper.js — Tạo hoặc nâng cấp user thành shipper.
 *
 * Cách dùng:
 *   node scripts/makeShipper.js <email> [password] [name]
 *
 * Ví dụ:
 *   node scripts/makeShipper.js shipper@shop.vn 123456 "Nguyễn Văn A"
 *   → Tạo user shipper mới hoặc đổi role thành shipper (nếu đã có).
 *
 * Yêu cầu: MONGODB_URI trong .env.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

const email = String(process.argv[2] || '').trim().toLowerCase()
const password = String(process.argv[3] || '').trim()
const name = String(process.argv[4] || 'Shipper').trim()

if (!email) {
  console.error('Usage: node scripts/makeShipper.js <email> [password] [name]')
  process.exit(1)
}

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error('Missing MONGODB_URI in .env')
  process.exit(1)
}

await mongoose.connect(mongoUri)

let user = await User.findOne({ email })
if (!user) {
  if (!password) {
    console.error('User not found. Provide password to create new shipper user.')
    process.exit(1)
  }
  user = await User.create({
    name,
    email,
    password,
    role: 'shipper',
    emailVerified: true
  })
  console.log('Created shipper user:', email)
} else {
  user.role = 'shipper'
  user.emailVerified = true
  if (password) user.password = password
  await user.save()
  console.log('Updated user to shipper:', email, password ? '(password reset)' : '')
}

await mongoose.disconnect()
process.exit(0)

