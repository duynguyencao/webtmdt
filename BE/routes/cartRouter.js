import { Router } from 'express'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

const defaultSkuForProductId = (productId) => `P${productId}-DEFAULT`

const expandCartItems = async (items = []) => {
  const productIds = [...new Set(items.map((it) => Number(it.productId)).filter((x) => Number.isFinite(x)))]
  const products = await Product.find({ id: { $in: productIds }, isDeleted: { $ne: true } })
    .select('id name brand image images price originalPrice sale variants')
    .lean()
  const map = new Map(products.map((p) => [p.id, p]))

  const expanded = items.map((it) => {
    const pid = Number(it.productId)
    const sku = String(it.sku || '').trim() || defaultSkuForProductId(pid)
    const p = map.get(pid)
    if (!p) return null
    const variants = Array.isArray(p.variants) ? p.variants : []
    const v = variants.find((x) => String(x.sku || '').trim() === sku) || variants[0] || null
    const stock = v ? Math.max(0, Number(v.stock) || 0) : 0
    const unitPrice = v && v.priceOverride != null ? (Number(v.priceOverride) || 0) : (Number(p.price) || 0)
    const images = Array.isArray(p.images) ? p.images : []
    const image = p.image || images[0] || ''
    return {
      id: pid,
      sku,
      name: p.name,
      brand: p.brand,
      image,
      price: unitPrice,
      originalPrice: p.originalPrice,
      sale: p.sale,
      stock,
      quantity: Math.max(1, Number(it.quantity) || 1),
      addOn: it.addOn || null
    }
  }).filter(Boolean)

  return expanded
}

const normalizeIncomingItems = (items = []) => {
  if (!Array.isArray(items)) return []
  return items
    .map((it) => {
      const productId = it?.productId != null ? Number(it.productId) : (it?.id != null ? Number(it.id) : null)
      if (productId == null || Number.isNaN(productId)) return null
      const sku = String(it?.sku || '').trim() || defaultSkuForProductId(productId)
      const quantity = Math.max(1, Math.floor(Number(it?.quantity) || 1))
      const addOn = it?.addOn && typeof it.addOn === 'object'
        ? {
          stringId: String(it.addOn.stringId || '').trim(),
          tensionKg: Number(it.addOn.tensionKg) || 0
        }
        : undefined
      return { productId, sku, quantity, addOn }
    })
    .filter(Boolean)
}

// GET /api/cart — lấy giỏ hàng theo user (JWT)
router.get('/', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId }).lean()
    const items = cart?.items || []
    const expanded = await expandCartItems(items)
    res.json({ items: expanded })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/cart — replace toàn bộ giỏ hàng
router.put('/', verifyToken, async (req, res) => {
  try {
    const incoming = normalizeIncomingItems(req.body?.items || [])
    const cart = await Cart.findOneAndUpdate(
      { userId: req.userId },
      { $set: { items: incoming } },
      { upsert: true, new: true }
    ).lean()
    const expanded = await expandCartItems(cart?.items || [])
    res.json({ message: 'Đã cập nhật giỏ hàng', items: expanded })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/cart/items — add/update 1 item
router.post('/items', verifyToken, async (req, res) => {
  try {
    const incoming = normalizeIncomingItems([req.body])[0]
    if (!incoming) return res.status(400).json({ error: 'Item không hợp lệ' })

    const cart = await Cart.findOne({ userId: req.userId })
    if (!cart) {
      const created = await Cart.create({ userId: req.userId, items: [incoming] })
      const expanded = await expandCartItems(created.items)
      return res.status(201).json({ message: 'Đã thêm vào giỏ hàng', items: expanded })
    }

    const idx = (cart.items || []).findIndex((x) => x.productId === incoming.productId && x.sku === incoming.sku)
    if (idx >= 0) {
      cart.items[idx].quantity = incoming.quantity
      cart.items[idx].addOn = incoming.addOn
    } else {
      cart.items.push(incoming)
    }
    await cart.save()
    const expanded = await expandCartItems(cart.items)
    return res.json({ message: 'Đã cập nhật giỏ hàng', items: expanded })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/cart/items/:productId/:sku — remove 1 item
router.delete('/items/:productId/:sku', verifyToken, async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    const sku = String(req.params.sku || '').trim()
    if (!productId || !sku) return res.status(400).json({ error: 'Thiếu productId hoặc sku' })
    const cart = await Cart.findOne({ userId: req.userId })
    if (!cart) return res.json({ message: 'OK', items: [] })
    cart.items = (cart.items || []).filter((x) => !(x.productId === productId && x.sku === sku))
    await cart.save()
    const expanded = await expandCartItems(cart.items)
    return res.json({ message: 'Đã xóa khỏi giỏ hàng', items: expanded })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

