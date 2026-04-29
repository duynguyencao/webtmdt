import { Router } from 'express'
import SiteConfig from '../models/SiteConfig.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

const sanitize = (body = {}) => ({
  heroTitle: String(body.heroTitle || '').trim(),
  heroSubtitle: String(body.heroSubtitle || '').trim(),
  heroImage: String(body.heroImage || '').trim(),
  saleTitle: String(body.saleTitle || '').trim(),
  productGridCols: Math.min(6, Math.max(2, Number(body.productGridCols) || 4))
})

router.get('/', async (req, res) => {
  try {
    const cfg = await SiteConfig.findOne({ key: 'home' }).lean()
    res.json(cfg || { key: 'home' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const body = sanitize(req.body)
    const updated = await SiteConfig.findOneAndUpdate(
      { key: 'home' },
      { $set: body, $setOnInsert: { key: 'home' } },
      { new: true, upsert: true }
    ).lean()
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
