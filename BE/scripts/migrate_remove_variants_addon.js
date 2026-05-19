/**
 * scripts/migrate_remove_variants_addon.js — Migration xóa fields cũ.
 *
 * Chạy 1 lần khi cần:
 *   node scripts/migrate_remove_variants_addon.js
 *
 * Mục đích:
 *   - Xóa các field legacy (variants, stringingAddOn, inStock) khỏi Product.
 *   - Đảm bảo stock >= 0 cho tất cả sản phẩm.
 *   - Xóa sku/addOn khỏi items trong Cart và Order.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'
import Order from '../models/Order.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

async function main() {
  const uri = process.env.MONGODB_URI || defaultUri
  await mongoose.connect(uri)
  console.log('[migrate] connected:', mongoose.connection.name)

  // Products: ensure stock is valid number >= 0; remove legacy fields if still present
  const products = await Product.find({}).select('id stock').lean()
  console.log('[migrate] products:', products.length)
  for (const p of products) {
    const stock = Math.max(0, Number(p.stock) || 0)
    await Product.updateOne(
      { id: p.id },
      {
        $set: { stock },
        $unset: { variants: 1, stringingAddOn: 1, inStock: 1 }
      }
    )
  }

  // Carts: remove sku/addOn from stored items
  await Cart.updateMany({}, { $unset: { 'items.$[].sku': 1, 'items.$[].addOn': 1 } })
  console.log('[migrate] carts cleaned')

  // Orders: remove sku/addOn from stored order items
  await Order.updateMany({}, { $unset: { 'items.$[].sku': 1, 'items.$[].addOn': 1 } })
  console.log('[migrate] orders cleaned')

  console.log('[migrate] done')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[migrate] failed:', err?.message || err)
  process.exitCode = 1
})

