import 'dotenv/config'
import { connectDB } from '../db/dbConnect.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { productsSeed } from './productsSeed.js'
import { usersSeed } from './usersSeed.js'

async function seed() {
  try {
    await connectDB()

    await Product.deleteMany({})
    await Product.insertMany(productsSeed)
    console.log('Đã seed', productsSeed.length, 'sản phẩm')

    for (const u of usersSeed) {
      const existing = await User.findOne({ email: u.email.toLowerCase() })
      if (!existing) {
        await User.create(u)
        console.log('Đã tạo user:', u.email, '/ mật khẩu:', u.password, '| role:', u.role)
      } else {
        console.log('User đã tồn tại (bỏ qua):', u.email)
      }
    }

    process.exit(0)
  } catch (err) {
    console.error('Lỗi seed:', err)
    process.exit(1)
  }
}

seed()
