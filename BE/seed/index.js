/**
 * seed/index.js — Script seed dữ liệu mẫu cho development.
 *
 * Chạy: npm run seed (hoặc node seed/index.js)
 *
 * Luồng:
 *   1. Xóa toàn bộ Product → import lại từ productsSeed.
 *   2. Tạo user mẫu (admin, buyer) nếu chưa có.
 *   3. Xóa toàn bộ Order → tạo 12 đơn hàng mẫu ở các trạng thái khác nhau.
 *   4. Xóa toàn bộ Review → tạo review mẫu + tính lại rating cho Product.
 *
 * ⚠ CẢNH BÁO: sẽ xóa toàn bộ dữ liệu hiện tại (Product, Order, Review).
 *   Chỉ dùng cho development/testing, KHÔNG chạy trên production.
 */

import 'dotenv/config'
import { connectDB } from '../db/dbConnect.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import Review from '../models/Review.js'
import OrderCounter from '../models/OrderCounter.js'
import { productsSeed } from './productsSeed.js'
import { usersSeed } from './usersSeed.js'
import { buildOrdersSeed } from './ordersSeed.js'
import { buildReviewsSeed } from './reviewsSeed.js'

async function seed() {
  try {
    await connectDB()

    await Product.deleteMany({})
    await Product.insertMany(productsSeed)
    console.log('Đã seed', productsSeed.length, 'sản phẩm')

    const usersByEmail = new Map()
    for (const u of usersSeed) {
      const existing = await User.findOne({ email: u.email.toLowerCase() })
      if (!existing) {
        const created = await User.create(u)
        usersByEmail.set(u.email.toLowerCase(), created)
        console.log('Đã tạo user:', u.email, '/ mật khẩu:', u.password, '| role:', u.role)
      } else {
        usersByEmail.set(u.email.toLowerCase(), existing)
        console.log('User đã tồn tại (bỏ qua):', u.email)
      }
    }

    const buyer = usersByEmail.get('buyer@caulong.vn')
    const seededProducts = await Product.find({}).lean()
    const ordersSeed = buildOrdersSeed({ buyerId: buyer._id, products: seededProducts })
    const reviewsSeed = buildReviewsSeed({ buyerId: buyer._id })

    await Order.deleteMany({})
    await Order.insertMany(ordersSeed)
    await OrderCounter.findOneAndUpdate(
      { name: 'orders' },
      { $set: { seq: ordersSeed.length } },
      { upsert: true }
    )
    console.log('Đã seed', ordersSeed.length, 'đơn hàng')

    await Review.deleteMany({})
    await Review.insertMany(reviewsSeed)
    const ratingRows = await Review.aggregate([
      {
        $group: {
          _id: '$productId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ])
    await Product.updateMany({}, { $set: { rating: 0, reviews: 0 } })
    await Promise.all(ratingRows.map((row) => Product.updateOne(
      { id: row._id },
      { $set: { rating: Math.round(Number(row.avg) * 10) / 10, reviews: row.count } }
    )))
    console.log('Đã seed', reviewsSeed.length, 'đánh giá')

    process.exit(0)
  } catch (err) {
    console.error('Lỗi seed:', err)
    process.exit(1)
  }
}

seed()
