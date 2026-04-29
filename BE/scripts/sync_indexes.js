import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Order from '../models/Order.js'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const defaultUri = 'mongodb://127.0.0.1:27017/caulong-shop'

async function main() {
  const uri = process.env.MONGODB_URI || defaultUri
  await mongoose.connect(uri)
  console.log('[syncIndexes] connected:', mongoose.connection.name)

  const models = [Order, Review, Product, Cart]
  for (const m of models) {
    try {
      const r = await m.syncIndexes()
      console.log('[syncIndexes]', m.modelName, r)
    } catch (err) {
      console.error('[syncIndexes] failed', m.modelName, err?.message || err)
    }
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[syncIndexes] fatal:', err?.message || err)
  process.exitCode = 1
})

