/**
 * db/dbConnect.js — Kết nối MongoDB.
 *
 * Hỗ trợ cả MongoDB local (mongodb://...) và MongoDB Atlas (mongodb+srv://...).
 * URI đọc từ biến môi trường MONGODB_URI (trong .env).
 *
 * Lưu ý: Hàm connectDB() đọc process.env lúc được gọi (không phải lúc import file),
 *         vì dotenv.config() chạy trong index.js trước khi gọi connectDB().
 */

import mongoose from 'mongoose'

// Fallback URI khi không set MONGODB_URI trong .env (dev local)
const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

/**
 * Kết nối đến MongoDB.
 * - Nếu thành công: log tên database và loại kết nối (Atlas / local).
 * - Nếu thất bại: throw error để index.js xử lý (server vẫn chạy nhưng dbReady = false).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || defaultUri
  // Phát hiện Atlas để log rõ hơn (giúp debug khi deploy)
  const isAtlas = uri.includes('mongodb.net')
  try {
    await mongoose.connect(uri)
    console.log('Đã kết nối MongoDB:', mongoose.connection.name, isAtlas ? '(Atlas)' : '(local)')
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err.message)
    throw err
  }
}
