/**
 * routes/shippingRouter.js — API tính phí vận chuyển.
 *
 * GET /api/shipping/quote?city=&district=&ward=&itemsCount= — Công khai.
 *
 * Phase 1: trả fee=0 (miễn phí ship, tính manual).
 * Có thể mở rộng sang GHN/GHTK API trong tương lai.
 */

import { Router } from 'express'

const router = Router()

// GET /api/shipping/quote?city=&district=&ward=&itemsCount=
router.get('/quote', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim()
    const district = String(req.query.district || '').trim()
    const ward = String(req.query.ward || '').trim()

    // Phase 1: fallback manual (fee=0). Có thể đổi sang provider GHN/GHTK sau.
    const fee = 0

    res.json({
      provider: 'manual',
      fee,
      currency: 'VND',
      address: { city, district, ward }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

