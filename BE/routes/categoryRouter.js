import { Router } from 'express'
import Category from '../models/Category.js'

const router = Router()

// GET /api/categories — công khai
router.get('/', async (req, res) => {
  try {
    const list = await Category.find().lean()
    const json = list.map(({ _id, __v, ...rest }) => rest)
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
