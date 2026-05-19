/**
 * routes/siteConfigRouter.js — API cấu hình giao diện trang chủ.
 *
 * GET    /api/site-config              — Công khai. Lấy config hiện tại.
 * PUT    /api/site-config              — Admin. Cập nhật config (upsert).
 * POST   /api/site-config/banners      — Admin. Thêm URL ảnh vào thư viện banners.
 * DELETE /api/site-config/banners      — Admin. Xóa URL ảnh khỏi thư viện banners.
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

// GET / — Công khai, lấy config hiện tại
router.get('/', async (req, res) => {
  try {
    const cfg = await SiteConfig.findOne({ key: 'home' }).lean()
    res.json(cfg || { key: 'home', banners: [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT / — Admin cập nhật config (heroTitle, heroSubtitle, heroImage, saleTitle, productGridCols)
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

// POST /banners — Admin thêm URL ảnh vào thư viện banners
router.post('/banners', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const url = String(req.body.url || '').trim()
    if (!url) return res.status(400).json({ error: 'Thiếu URL ảnh' })

    const updated = await SiteConfig.findOneAndUpdate(
      { key: 'home' },
      { $addToSet: { banners: url }, $setOnInsert: { key: 'home' } },
      { new: true, upsert: true }
    ).lean()
    res.json({ banners: updated.banners || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /banners — Admin xóa URL ảnh khỏi thư viện banners
router.delete('/banners', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const url = String(req.body.url || '').trim()
    if (!url) return res.status(400).json({ error: 'Thiếu URL ảnh cần xóa' })

    const cfg = await SiteConfig.findOne({ key: 'home' })
    if (!cfg) return res.status(404).json({ error: 'Chưa có config' })

    cfg.banners = (cfg.banners || []).filter((b) => b !== url)
    // Nếu xóa ảnh đang dùng làm hero → xóa luôn heroImage
    if (cfg.heroImage === url) cfg.heroImage = ''
    await cfg.save()

    res.json({ banners: cfg.banners, heroImage: cfg.heroImage })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
