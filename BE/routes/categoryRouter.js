import { Router } from 'express'
import Category from '../models/Category.js'
import Product from '../models/Product.js'

const router = Router()

// GET /api/categories — công khai
router.get('/', async (req, res) => {
  try {
    const [list, counts] = await Promise.all([
      Category.find({ value: 'vot' }).lean(),
      Product.aggregate([
        { $match: { category: 'vot' } },
        { $group: { _id: '$category', total: { $sum: 1 } } }
      ])
    ])
    const countMap = counts.reduce((acc, item) => {
      acc[item._id] = item.total
      return acc
    }, {})
    const json = list
      .map(({ _id, __v, ...rest }) => ({ ...rest, count: countMap[rest.value] || 0 }))
      .filter((item) => item.count > 0)
    res.json(json)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
