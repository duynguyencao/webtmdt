/**
 * scripts/migrate_review_indexes.js — Migration cập nhật unique index cho reviews.
 *
 * Chạy 1 lần khi cần:
 *   node scripts/migrate_review_indexes.js
 *
 * Mục đích:
 *   - Xóa index cũ (productId + userId) — cho phép user review nhiều lần trên nhiều đơn.
 *   - Tạo index mới (productId + userId + orderId) — unique per order per product.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Review from '../models/Review.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

async function main() {
  const uri = process.env.MONGODB_URI || defaultUri
  await mongoose.connect(uri)
  console.log('[migrate] connected:', mongoose.connection.name)

  // Drop legacy unique index if present
  try {
    await Review.collection.dropIndex('productId_1_userId_1')
    console.log('[migrate] dropped legacy index productId_1_userId_1')
  } catch {
    console.log('[migrate] legacy index not found (ok)')
  }

  // Ensure new unique index
  await Review.collection.createIndex({ productId: 1, userId: 1, orderId: 1 }, { unique: true })
  console.log('[migrate] ensured index productId_1_userId_1_orderId_1 unique')

  console.log('[migrate] done')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[migrate] failed:', err?.message || err)
  process.exitCode = 1
})

