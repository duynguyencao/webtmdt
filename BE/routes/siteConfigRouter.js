/**
 * routes/siteConfigRouter.js — API cấu hình giao diện trang chủ.
 *
 * GET /api/site-config     — Công khai. Lấy config hiện tại (hero, sale title, grid cols).
 * PUT /api/site-config     — Admin. Cập nhật config (upsert nếu chưa có).
 *
 * Config chỉ có 1 document (key='home'). Admin thay đổi qua trang quản trị.
 */

import { Router } from 'express'
import SiteConfig from '../models/SiteConfig.js'
import { verifyToken, requireRole } from '../middleware/auth.js'

const router = Router()

const sanitizeGridCols = (value) => {
  const cols = Number(value)
  return Number.isInteger(cols) && cols >= 2 && cols <= 8 ? cols : 4
}

const sanitize = (body = {}) => ({
  heroTitle: String(body.heroTitle || '').trim(),
  heroSubtitle: String(body.heroSubtitle || '').trim(),
  heroImage: String(body.heroImage || '').trim(),
  saleTitle: String(body.saleTitle || '').trim(),
  productGridCols: sanitizeGridCols(body.productGridCols)
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
