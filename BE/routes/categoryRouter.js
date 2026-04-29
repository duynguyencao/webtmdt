import { Router } from 'express'
import Product from '../models/Product.js'

const router = Router()

// GET /api/categories — công khai
router.get('/', async (req, res) => {
  try {
    const count = await Product.countDocuments({ category: 'vot' })
    if (!count) return res.json([])
    res.json([{
      name: 'Vợt Cầu Lông',
      value: 'vot',
      path: '/products',
      image: 'https://cdn.shopvnb.com/uploads/gallery/set-vot-cau-long-yonex-nanoflare-1000z-nguyen-thuy-linh-chinh-hang_1760491235.webp',
      count
    }])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
