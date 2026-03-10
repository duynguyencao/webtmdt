import { Router } from 'express'
import User from '../models/User.js'
import { createToken, verifyToken } from '../middleware/auth.js'

const router = Router()

// POST /api/user/register — công khai
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Thiếu name, email hoặc password' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' })
    }
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(400).json({ error: 'Email đã được sử dụng' })
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'buyer'
    })
    const token = createToken(user)
    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: user.toJSON()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/user/login — công khai
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc password' })
    }
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu sai' })
    const ok = await user.comparePassword(password)
    if (!ok) return res.status(401).json({ error: 'Email hoặc mật khẩu sai' })
    const token = createToken(user)
    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: user.toJSON()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/user/me — cần auth: trả về user hiện tại (để FE kiểm tra đã đăng nhập chưa)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' })
    res.json(user.toJSON())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
