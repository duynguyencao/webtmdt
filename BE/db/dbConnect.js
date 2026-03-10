import mongoose from 'mongoose'

// Đọc URI khi gọi connectDB(), không khi load file — lúc đó dotenv đã chạy trong index.js
const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

export async function connectDB() {
  const uri = process.env.MONGODB_URI || defaultUri
  const isAtlas = uri.includes('mongodb.net')
  try {
    await mongoose.connect(uri)
    console.log('Đã kết nối MongoDB:', mongoose.connection.name, isAtlas ? '(Atlas)' : '(local)')
  } catch (err) {
    console.error('Lỗi kết nối MongoDB:', err.message)
    throw err
  }
}
