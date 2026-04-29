import 'dotenv/config'
import mongoose from 'mongoose'
import Product from '../models/Product.js'

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.error('Missing MONGODB_URI in .env')
  process.exit(1)
}

await mongoose.connect(mongoUri)

const cursor = Product.find({ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] }).cursor()
let updated = 0

for await (const p of cursor) {
  const legacyStock = Math.max(0, Number(p.stock) || 0)
  const sku = `P${p.id}-DEFAULT`
  p.variants = [{
    sku,
    attrs: { weight: '', grip: '' },
    priceOverride: null,
    stock: legacyStock,
    inStock: legacyStock > 0
  }]
  p.stock = legacyStock
  p.inStock = legacyStock > 0
  await p.save()
  updated++
}

console.log('Migrated products to default variant:', updated)
await mongoose.disconnect()
process.exit(0)

